import { describe, expect, it, beforeEach, afterEach } from 'vitest';
// @ts-ignore - jsdom has no bundled type declarations; imported for DOM parsing in tests
import { JSDOM } from 'jsdom';
import {
  extractScriptJSON,
  extractHydration,
  extractAjax,
} from '../src/strategies.js';
import type { ExtractionStrategy } from '@blankgrimoire/types';

function makeDocument(html: string): Document {
  const dom = new JSDOM(html);
  return dom.window.document;
}

describe('extractScriptJSON', () => {
  it('extracts JSON from script tag matching pattern', () => {
    const doc = makeDocument(
      '<html><body><script src="/assets/app.js">' +
        JSON.stringify({ pages: [{ key: 'p1', title: 'Page 1' }] }) +
        '</script></body></html>',
    );
    const result = extractScriptJSON(
      { kind: 'scriptJSON', pattern: 'app\\.js', path: 'pages.0' },
      doc,
    );
    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('p1');
      expect(result.data.title).toBe('Page 1');
    } else {
      throw new Error('unexpected result shape');
    }
  });

  it('returns null when no script matches pattern', () => {
    const doc = makeDocument(
      '<html><body><script src="/assets/other.js">"{\"foo\":\"bar\"}"</script></body></html>',
    );
    const result = extractScriptJSON(
      { kind: 'scriptJSON', pattern: 'app\\.js', path: 'pages.0' },
      doc,
    );
    expect(result).toBe(null);
  });

  it('returns null when path does not resolve', () => {
    const doc = makeDocument(
      '<html><body><script src="/assets/app.js">' +
        JSON.stringify({ foo: 'bar' }) +
        '</script></body></html>',
    );
    const result = extractScriptJSON(
      { kind: 'scriptJSON', pattern: 'app\\.js', path: 'pages.0' },
      doc,
    );
    expect(result).toBe(null);
  });
});

describe('extractHydration', () => {
  const originalGlobalThis = globalThis;

  beforeEach(() => {
    (globalThis as unknown as { __NEXT_DATA__?: unknown }).__NEXT_DATA__ =
      undefined;
    (globalThis as unknown as { __NUXT__?: unknown }).__NUXT__ = undefined;
  });

  afterEach(() => {
    (globalThis as unknown as { __NEXT_DATA__?: unknown }).__NEXT_DATA__ =
      undefined;
    (globalThis as unknown as { __NUXT__?: unknown }).__NUXT__ = undefined;
  });

  it('extracts from Next.js __NEXT_DATA__', () => {
    (globalThis as unknown as { __NEXT_DATA__?: unknown }).__NEXT_DATA__ = {
      page: { key: 'next-key', title: 'Next Page' },
    };
    const result = extractHydration(
      { kind: 'hydration', framework: 'next', path: 'page' },
      globalThis as unknown as Window & typeof globalThis,
    );
    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('next-key');
      expect(result.data.title).toBe('Next Page');
    } else {
      throw new Error('unexpected result shape');
    }
  });

  it('extracts from Nuxt __NUXT__', () => {
    (globalThis as unknown as { __NUXT__?: unknown }).__NUXT__ = {
      data: { key: 'nuxt-key', title: 'Nuxt Page' },
    };
    const result = extractHydration(
      { kind: 'hydration', framework: 'nuxt', path: 'data' },
      globalThis as unknown as Window & typeof globalThis,
    );
    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('nuxt-key');
      expect(result.data.title).toBe('Nuxt Page');
    } else {
      throw new Error('unexpected result shape');
    }
  });

  it('returns null when no hydration payload', () => {
    const result = extractHydration(
      { kind: 'hydration', framework: 'next', path: 'page' },
      globalThis as unknown as Window & typeof globalThis,
    );
    expect(result).toBe(null);
  });
});

describe('extractAjax', () => {
  const originalNative = (globalThis as unknown as {
    __native?: Record<string, (...args: unknown[]) => unknown>;
  }).__native;
  let capturedRequest: { url: string; method: string; body?: string } | null =
    null;

  beforeEach(() => {
    capturedRequest = null;
    (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> })
      .__native = {
        request: (...args: unknown[]) => {
          const req = args[0] as { url: string; method?: string; body?: string };
          capturedRequest = {
            url: req.url,
            method: req.method ?? 'GET',
            ...(req.body !== undefined ? { body: req.body } : {}),
          };
          return {
            status: 200,
            url: req.url,
            headers: { 'content-type': 'text/html' },
            body:
              '<html><body><div class="reader"><img src="https://example.org/ajax.jpg" /></div></body></html>',
          };
        },
      };
  });

  it('makes HTTP request and applies css strategy to response', async () => {
    const dom = new JSDOM('<html><body></body></html>');
    const doc = dom.window.document;

    const result = await extractAjax(
      {
        kind: 'ajax',
        method: 'GET',
        path: '/api/page',
        then: { kind: 'css', image: '.reader img', srcAttributes: ['src'] },
      },
      { baseURL: 'https://example.org/' },
      doc,
    );

    expect(capturedRequest).not.toBe(null);
    expect(capturedRequest!.url).toBe('https://example.org/api/page');
    expect(capturedRequest!.method).toBe('GET');

    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('https://example.org/ajax.jpg');
    } else {
      throw new Error('unexpected result shape');
    }
  });

  it('resolves relative path against baseURL', async () => {
    const dom = new JSDOM('<html><body></body></html>');
    const doc = dom.window.document;

    await extractAjax(
      {
        kind: 'ajax',
        method: 'GET',
        path: '/relative/path',
        then: { kind: 'css', image: '.x img', srcAttributes: ['src'] },
      },
      { baseURL: 'https://example.org/' },
      doc,
    );

    expect(capturedRequest!.url).toBe('https://example.org/relative/path');
  });

  it('returns null when __http fails', async () => {
    (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> })
      .__native = {
        request: () => {
          throw new Error('network error');
        },
      };

    const dom = new JSDOM('<html><body></body></html>');
    const doc = dom.window.document;

    const result = await extractAjax(
      {
        kind: 'ajax',
        method: 'GET',
        path: '/fail',
        then: { kind: 'css', image: '.x img', srcAttributes: ['src'] },
      },
      { baseURL: 'https://example.org/' },
      doc,
    );

    expect(result).toBe(null);
  });
});
