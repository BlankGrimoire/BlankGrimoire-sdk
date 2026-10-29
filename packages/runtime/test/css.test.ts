import { describe, expect, it } from 'vitest';
// @ts-ignore - jsdom has no bundled type declarations; imported for DOM parsing in tests
import { JSDOM } from 'jsdom';
import { extractCss } from '../src/css.js';
import type { ThemeSelectors } from '@blankgrimoire/types';

function makeDocument(html: string): Document {
  const dom = new JSDOM(html);
  return dom.window.document;
}

const selectors: ThemeSelectors = {
  search: { path: '/search', item: '.result', title: '.title', link: 'a' },
  details: { title: 'h1' },
  chapters: { item: '.chapter', link: 'a', order: 'desc' },
  pages: {
    strategies: [{ kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'] }],
  },
};

describe('extractCss', () => {
  it('extracts src attribute from matching image', () => {
    const doc = makeDocument(
      '<html><body><div class="reader"><img src="https://example.org/page.jpg" /></div></body></html>',
    );
    const result = extractCss(
      { kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'] },
      doc,
      selectors,
    );
    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('https://example.org/page.jpg');
    } else {
      throw new Error('unexpected result shape');
    }
  });

  it('falls back to next attribute when first is missing', () => {
    const dom = new JSDOM(
      '<html><body><div class="reader"><img data-src="https://example.org/fallback.jpg" /></div></body></html>',
    );
    const doc = dom.window.document;
    const result = extractCss(
      { kind: 'css', image: '.reader img', srcAttributes: ['src', 'data-src'] },
      doc,
      selectors,
    );
    expect(result).not.toBe(null);
    if (result && result.kind === 'summary') {
      expect(result.data.key).toBe('https://example.org/fallback.jpg');
    } else {
      throw new Error('unexpected result shape');
    }
  });

  it('returns null when no element matches', () => {
    const doc = makeDocument('<html><body><p>no image</p></body></html>');
    const result = extractCss(
      { kind: 'css', image: '.reader img', srcAttributes: ['src'] },
      doc,
      selectors,
    );
    expect(result).toBe(null);
  });

  it('returns null when element has no matching attribute', () => {
    const doc = makeDocument(
      '<html><body><div class="reader"><img alt="no-src" /></div></body></html>',
    );
    const result = extractCss(
      { kind: 'css', image: '.reader img', srcAttributes: ['src', 'data-src'] },
      doc,
      selectors,
    );
    expect(result).toBe(null);
  });
});
