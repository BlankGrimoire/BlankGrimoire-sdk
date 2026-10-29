import { describe, expect, it } from 'vitest';
import { extractCss } from '../src/css.js';
import type { ThemeSelectors } from '@blankgrimoire/types';

function createElement(tag: string, className: string | null, attrs: Record<string, string>): Element {
  return {
    tagName: tag.toUpperCase(),
    getAttribute: (name: string) => attrs[name] ?? null,
    classList: {
      contains: (c: string) => className ? className.split(' ').includes(c) : false,
    },
  } as unknown as Element;
}

function makeDocument(elements: Element[]): Document {
  return {
    querySelector: () => elements[0] ?? null,
  } as unknown as Document;
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
    const doc = makeDocument([
      createElement('img', 'reader', { src: 'https://example.org/page.jpg' }),
    ]);
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
    const doc = makeDocument([
      createElement('img', 'reader', { 'data-src': 'https://example.org/fallback.jpg' }),
    ]);
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
    const doc = makeDocument([]);
    const result = extractCss(
      { kind: 'css', image: '.reader img', srcAttributes: ['src'] },
      doc,
      selectors,
    );
    expect(result).toBe(null);
  });

  it('returns null when element has no matching attribute', () => {
    const doc = makeDocument([
      createElement('img', 'reader', { alt: 'no-src' }),
    ]);
    const result = extractCss(
      { kind: 'css', image: '.reader img', srcAttributes: ['src', 'data-src'] },
      doc,
      selectors,
    );
    expect(result).toBe(null);
  });
});
