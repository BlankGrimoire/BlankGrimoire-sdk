import { describe, expect, it } from 'vitest';
// @ts-ignore - jsdom has no bundled type declarations; imported for DOM parsing in tests
import { JSDOM } from 'jsdom';
import { extract } from '../src/engine.js';
import type { ThemeSelectors, ExtractionStrategy } from '@blankgrimoire/types';

function makeDocument(html: string): Document {
  const dom = new JSDOM(html);
  return dom.window.document;
}

const baseSelectors: ThemeSelectors = {
  search: { path: '/search', item: '.result', title: '.title', link: 'a' },
  details: { title: 'h1' },
  chapters: { item: '.chapter', link: 'a', order: 'desc' },
  pages: {
    strategies: [
      { kind: 'css', image: '.reader-area img', srcAttributes: ['data-src', 'src'] },
    ],
  },
};

const context = {
  baseURL: 'https://example.org/',
  siteName: 'Example',
  selectors: baseSelectors,
  overrides: {},
};

describe('extract', () => {
  it('returns null when no strategy matches', async () => {
    const doc = makeDocument('<html><body><p>nothing</p></body></html>');
    const sMissing: ExtractionStrategy = {
      kind: 'css',
      image: '.missing',
      srcAttributes: ['src'],
    };
    const result = await extract(
      { strategies: [sMissing], context },
      doc,
    );
    expect(result).toBe(null);
  });

  it('returns first non-empty result', async () => {
    const doc = makeDocument('<html><body><img src="a.jpg" /></body></html>');
    const result = await extract(
      {
        strategies: [
          { kind: 'css', image: '.nonexistent', srcAttributes: ['src'] } as ExtractionStrategy,
          { kind: 'css', image: 'img', srcAttributes: ['src'] } as ExtractionStrategy,
        ],
        context,
      },
      doc,
    );
    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('a.jpg');
    } else {
      throw new Error('unexpected result shape');
    }
  });

  it('applies user overrides to selectors', async () => {
    const doc = makeDocument('<html><body><img data-src="override.jpg" /></body></html>');
    const overriddenContext = {
      ...context,
      overrides: {
        pages: {
          strategies: [{ kind: 'css', image: 'img', srcAttributes: ['data-src'] } as ExtractionStrategy],
        },
      },
    };
    const result = await extract(
      {
        strategies: [{ kind: 'css', image: 'img', srcAttributes: ['src'] } as ExtractionStrategy],
        context: overriddenContext,
      },
      doc,
    );
    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('override.jpg');
    } else {
      throw new Error('unexpected result shape');
    }
  });
});
