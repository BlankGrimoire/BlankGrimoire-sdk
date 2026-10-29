import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  extractScriptJSON,
  extractHydration,
  extractAjax,
} from '../src/strategies.js';

function createElement(tag: string, className: string | null, attrs: Record<string, string>, textContent: string): Element {
  return {
    tagName: tag.toUpperCase(),
    getAttribute: (name: string) => attrs[name] ?? null,
    textContent,
    classList: {
      contains: (c: string) => className ? className.split(' ').includes(c) : false,
    },
  } as unknown as Element;
}

function makeDocument(elements: Element[]): Document {
  return {
    querySelectorAll: () => elements,
  } as unknown as Document;
}

describe('extractScriptJSON', () => {
  it('extracts JSON from script tag matching pattern', () => {
    const doc = makeDocument([
      createElement('script', null, { src: '/assets/app.js' }, JSON.stringify({ pages: [{ key: 'p1', title: 'Page 1' }] })),
    ]);
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
    const doc = makeDocument([
      createElement('script', null, { src: '/assets/other.js' }, '{}'),
    ]);
    const result = extractScriptJSON(
      { kind: 'scriptJSON', pattern: 'app\\.js', path: 'pages.0' },
      doc,
    );
    expect(result).toBe(null);
  });

  it('returns null when path does not resolve', () => {
    const doc = makeDocument([
      createElement('script', null, { src: '/assets/app.js' }, JSON.stringify({ foo: 'bar' })),
    ]);
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
    // Clean up hydration payloads before each test
    (globalThis as unknown as { __NEXT_DATA__?: unknown }).__NEXT_DATA__ = undefined;
    (globalThis as unknown as { __NUXT__?: unknown }).__NUXT__ = undefined;
  });

  afterEach(() => {
    (globalThis as unknown as { __NEXT_DATA__?: unknown }).__NEXT_DATA__ = undefined;
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
  const originalNative = (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native;
  let capturedRequest: { url: string; method: string; body?: string } | null = null;

  beforeEach(() => {
    capturedRequest = null;
    (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native = {
      request: (req: { url: string; method?: string; body?: string }) => {
        capturedRequest = { url: req.url, method: req.method ?? 'GET', body: req.body };
        return {
          status: 200,
          url: req.url,
          headers: { 'content-type': 'text/html' },
          body: '<html><body><img class="reader" src="https://example.org/ajax.jpg" /></body></html>',
        };
      },
    };
  });

  afterEach(() => {
    (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native = originalNative;
  });

  it('makes HTTP request and applies css strategy to response', async () => {
    const doc = {
      implementation: {
        createHTMLDocument: () => ({
          documentElement: { innerHTML: '' },
          querySelector: () => createElement('img', 'reader', { src: 'https://example.org/ajax.jpg' }, ''),
        }),
      },
    } as unknown as Document;

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
    const doc = {
      implementation: {
        createHTMLDocument: () => ({
          documentElement: { innerHTML: '' },
          querySelector: () => null,
        }),
      },
    } as unknown as Document;

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
    (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native = {
      request: () => {
        throw new Error('network error');
      },
    };

    const doc = {
      implementation: {
        createHTMLDocument: () => ({
          documentElement: { innerHTML: '' },
          querySelector: () => null,
        }),
      },
    } as unknown as Document;

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
