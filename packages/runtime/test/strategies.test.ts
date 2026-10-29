// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
// @ts-ignore - jsdom has no bundled type declarations
import { JSDOM } from 'jsdom';
import type { Page } from '@blankgrimoire/types';
import {
  extractAjax,
  extractHydration,
  extractScriptJSON,
  parseJSONText,
  readPath,
  toPages,
} from '../src/strategies.js';
import type { DocumentLike } from '../src/dom.js';

function makeDocument(html: string): DocumentLike {
  return new JSDOM(html).window.document as unknown as DocumentLike;
}

describe('parseJSONText', () => {
  it('parses wrapped payloads with nested arrays', () => {
    expect(parseJSONText('window.__DATA__ = [[1, 2], [3]];')).toEqual([
      [1, 2],
      [3],
    ]);
  });

  it('parses plain JSON and ignores malformed wrappers', () => {
    expect(parseJSONText('{"pages":["/001.jpg"]}')).toEqual({
      pages: ['/001.jpg'],
    });
    expect(parseJSONText('window.__DATA__ = {broken')).toBeUndefined();
  });
});

describe('readPath', () => {
  it('supports dot and bracket paths', () => {
    const value = { props: { pageProps: { pages: [{ url: '/001.jpg' }] } } };
    expect(readPath(value, 'props.pageProps.pages[0].url')).toBe('/001.jpg');
  });

  it('returns undefined for missing paths', () => {
    expect(readPath({ a: 1 }, 'a.b.c')).toBeUndefined();
  });
});

describe('toPages', () => {
  it('accepts strings and page-like objects', () => {
    const pages = toPages(
      ['/001.jpg', { imageURL: '/002.jpg' }, { url: '/003.jpg' }],
      'https://example.org/chapter/',
    );
    expect(pages.map((page) => page.imageURL)).toEqual([
      'https://example.org/001.jpg',
      'https://example.org/002.jpg',
      'https://example.org/003.jpg',
    ]);
  });
});

describe('extractScriptJSON', () => {
  it('parses inline JSON and resolves page URLs', async () => {
    const document = makeDocument(
      `<html><body><script>window.__PAGES__ = ${JSON.stringify({
        pages: ['/001.jpg', '/002.jpg'],
      })}</script></body></html>`,
    );
    const pages = await extractScriptJSON(
      { kind: 'scriptJSON', pattern: '__PAGES__', path: 'pages' },
      document,
      'https://example.org/chapter/',
    );
    expect(pages.map((page) => page.imageURL)).toEqual([
      'https://example.org/001.jpg',
      'https://example.org/002.jpg',
    ]);
  });

  it('continues after malformed JSON and unresolved paths', async () => {
    const document = makeDocument(
      '<html><body>' +
        '<script>window.__PAGES__ = {broken</script>' +
        `<script>window.__PAGES__ = ${JSON.stringify({ other: [] })}</script>` +
        `<script>window.__PAGES__ = ${JSON.stringify({ pages: ['/003.jpg'] })}</script>` +
        '</body></html>',
    );
    const pages = await extractScriptJSON(
      { kind: 'scriptJSON', pattern: '__PAGES__', path: 'pages' },
      document,
      'https://example.org/',
    );
    expect(pages).toEqual([{ index: 0, imageURL: 'https://example.org/003.jpg' }]);
  });

  it('fetches a matching external script through the native bridge', async () => {
    const document = makeDocument(
      '<html><body><script src="/assets/app.js"></script></body></html>',
    );
    (globalThis as unknown as { __native?: Record<string, unknown> }).__native = {
      request: (request: { url: string }) => ({
        status: 200,
        url: request.url,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pages: ['/external.jpg'] }),
      }),
    };

    const pages = await extractScriptJSON(
      { kind: 'scriptJSON', pattern: 'app\\.js', path: 'pages' },
      document,
      'https://example.org/',
    );
    expect(pages).toEqual([{ index: 0, imageURL: 'https://example.org/external.jpg' }]);
    delete (globalThis as unknown as { __native?: unknown }).__native;
  });

  it('returns an empty list when a matching script has no usable payload', async () => {
    const document = makeDocument(
      '<html><body><script>window.__PAGES__ = "not-json"</script></body></html>',
    );
    expect(
      await extractScriptJSON(
        { kind: 'scriptJSON', pattern: '__PAGES__', path: 'pages' },
        document,
        'https://example.org/',
      ),
    ).toEqual([]);
  });
});

describe('extractHydration', () => {
  it('reads Next.js data from a script tag', () => {
    const document = makeDocument(
      `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
        props: { pageProps: { pages: ['/next.jpg'] } },
      })}</script></body></html>`,
    );
    const pages = extractHydration(
      { kind: 'hydration', framework: 'next', path: 'props.pageProps.pages' },
      document,
      'https://example.org/',
    );
    expect(pages).toEqual([{ index: 0, imageURL: 'https://example.org/next.jpg' }]);
  });

  it('reads Nuxt data from a window payload', () => {
    const document = makeDocument('<html><body></body></html>');
    const pages = extractHydration(
      { kind: 'hydration', framework: 'nuxt', path: 'data.pages' },
      document,
      'https://example.org/',
      { __NUXT__: { data: { pages: ['/nuxt.jpg'] } } },
    );
    expect(pages).toEqual([{ index: 0, imageURL: 'https://example.org/nuxt.jpg' }]);
  });

  it('returns an empty list without a payload', () => {
    expect(
      extractHydration(
        { kind: 'hydration', framework: 'next' },
        makeDocument('<html></html>'),
        'https://example.org/',
      ),
    ).toEqual([]);
  });
});

describe('extractAjax', () => {
  it('rejects non-2xx responses', async () => {
    (globalThis as unknown as { __native?: Record<string, unknown> }).__native = {
      request: () => ({ status: 404, url: 'https://example.org/api', headers: {}, body: '' }),
    };
    const pages = await extractAjax(
      {
        kind: 'ajax',
        method: 'GET',
        path: '/api',
        then: { kind: 'css', image: 'img', srcAttributes: ['src'] },
      },
      makeDocument('<html></html>'),
      { baseURL: 'https://example.org/' },
    );
    expect(pages).toEqual([]);
    delete (globalThis as unknown as { __native?: unknown }).__native;
  });

  it('parses the response and applies a nested strategy', async () => {
    (globalThis as unknown as { __native?: Record<string, unknown> }).__native = {
      request: (request: { url: string }) => ({
        status: 200,
        url: request.url,
        headers: { 'content-type': 'text/html' },
        body: '<html><body><div class="reader"><img src="/ajax.jpg" /></div></body></html>',
      }),
    };
    const pages = await extractAjax(
      {
        kind: 'ajax',
        method: 'GET',
        path: '/api',
        then: { kind: 'css', image: '.reader img', srcAttributes: ['src'] },
      },
      makeDocument('<html></html>'),
      {
        baseURL: 'https://example.org/',
        parseHTML: (html) => makeDocument(html),
      },
    );
    expect(pages).toEqual([{ index: 0, imageURL: 'https://example.org/ajax.jpg' }]);
    delete (globalThis as unknown as { __native?: unknown }).__native;
  });

  it('supports recursive ajax strategies up to the depth limit', async () => {
    let requests = 0;
    (globalThis as unknown as { __native?: Record<string, unknown> }).__native = {
      request: (request: { url: string }) => {
        requests += 1;
        return {
          status: 200,
          url: request.url,
          headers: {},
          body: '<html><body><img src="/nested.jpg" /></body></html>',
        };
      },
    };
    const pages: Page[] = await extractAjax(
      {
        kind: 'ajax',
        method: 'GET',
        path: '/one',
        then: {
          kind: 'ajax',
          method: 'GET',
          path: '/two',
          then: { kind: 'css', image: 'img', srcAttributes: ['src'] },
        },
      },
      makeDocument('<html></html>'),
      { baseURL: 'https://example.org/', parseHTML: (html) => makeDocument(html) },
    );
    expect(requests).toBe(2);
    expect(pages[0]?.imageURL).toBe('https://example.org/nested.jpg');
    delete (globalThis as unknown as { __native?: unknown }).__native;
  });
});
