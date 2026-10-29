import { describe, expect, it } from 'vitest';
import { extract } from '../src/engine.js';
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
    querySelector: (selector: string) => {
      const classMatch = selector.match(/\.([\w-]+)/);
      if (classMatch) {
        return elements.find((el) => {
          const classAttr = (el as unknown as { getAttribute: (n: string) => string | null }).getAttribute('class');
          return classAttr?.split(' ').includes(classMatch[1]);
        }) ?? null;
      }
      const tagMatch = selector.match(/^([\w-]+)$/);
      if (tagMatch) {
        return elements.find((el) => el.tagName === tagMatch[1].toUpperCase()) ?? null;
      }
      return null;
    },
  } as unknown as Document;
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
    const doc = makeDocument([
      createElement('p', null, {}),
    ]);
    const result = await extract(
      { strategies: [{ kind: 'css', image: '.missing', srcAttributes: ['src'] }], context },
      doc,
    );
    expect(result).toBe(null);
  });

  it('returns first non-empty result', async () => {
    const doc = makeDocument([
      createElement('img', null, { src: 'a.jpg' }),
    ]);
    const result = await extract(
      {
        strategies: [
          { kind: 'css', image: '.nonexistent', srcAttributes: ['src'] },
          { kind: 'css', image: 'img', srcAttributes: ['src'] },
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
    const doc = makeDocument([
      createElement('img', null, { 'data-src': 'override.jpg' }),
    ]);
    const overriddenContext = {
      ...context,
      overrides: {
        pages: { strategies: [{ kind: 'css', image: 'img', srcAttributes: ['data-src'] }] },
      },
    };
    const result = await extract(
      {
        strategies: [{ kind: 'css', image: 'img', srcAttributes: ['src'] }],
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
