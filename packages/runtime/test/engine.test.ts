// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
// @ts-ignore - jsdom has no bundled type declarations
import { JSDOM } from 'jsdom';
import type { SiteContext, ThemeAdapter, ThemeSelectors } from '@blankgrimoire/types';
import {
  dispatch,
  extractChapters,
  extractDetails,
  extractPages,
  extractSearch,
  normalizeContentRating,
  normalizeStatus,
  resolveSelectors,
  type ThemeRuntimeOptions,
} from '../src/engine.js';
import type { DocumentLike } from '../src/dom.js';

const selectors: ThemeSelectors = {
  search: {
    path: '/search',
    item: '.result',
    title: '.result-title',
    link: 'a',
    cover: 'img',
    nextPage: '.next',
  },
  details: {
    title: 'h1.series-title',
    cover: '.series-cover img',
    synopsis: '.series-synopsis',
    authors: '.series-authors',
    artists: '.series-artists',
    altTitles: '.series-alt-titles',
    tags: '.series-tags',
    status: '.series-status',
    contentRating: '.series-rating',
  },
  chapters: {
    item: '.chapter',
    link: 'a',
    title: '.chapter-title',
    date: '.chapter-date',
    order: 'asc',
  },
  pages: {
    strategies: [
      { kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'] },
    ],
  },
  attribution: { logo: '.site-logo img', credits: '.site-credits' },
};

const adapter: ThemeAdapter = {
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: { selectors: ['.example-reader'], minScore: 2 },
  selectors,
};

const context: SiteContext = {
  baseURL: 'https://example.org/',
  siteName: 'Example Site',
  overrides: {},
};

function makeDocument(html: string): DocumentLike {
  return new JSDOM(html).window.document as unknown as DocumentLike;
}

function runtime(html: string, overrides: Partial<SiteContext> = {}): ThemeRuntimeOptions {
  return {
    adapter,
    context: { ...context, ...overrides },
    document: makeDocument(html),
  };
}

describe('resolveSelectors', () => {
  it('merges nested overrides field by field', () => {
    const resolved = resolveSelectors(selectors, {
      search: { title: '.custom-title' },
      details: { status: '.custom-status' },
      pages: { strategies: [{ kind: 'css', image: 'img', srcAttributes: ['src'] }] },
    });

    expect(resolved.search.title).toBe('.custom-title');
    expect(resolved.search.item).toBe('.result');
    expect(resolved.details.status).toBe('.custom-status');
    expect(resolved.details.title).toBe('h1.series-title');
    expect(resolved.pages.strategies).toHaveLength(1);
  });
});

describe('extractSearch', () => {
  it('extracts items, resolves URLs and detects the next page', async () => {
    const result = await extractSearch(
      runtime(
        '<html><body><div class="result">' +
          '<a href="/series/lorem"><span class="result-title">Lorem</span><img src="/covers/lorem.jpg" /></a>' +
          '</div><a class="next" href="/search?page=2">Next</a></body></html>',
      ),
      { text: 'lorem', page: 1 },
    );

    expect(result.hasNextPage).toBe(true);
    expect(result.items).toEqual([
      {
        key: 'https://example.org/series/lorem',
        title: 'Lorem',
        coverURL: 'https://example.org/covers/lorem.jpg',
      },
    ]);
  });

  it('honours search overrides without replacing sibling fields', async () => {
    const result = await extractSearch(
      runtime(
        '<html><body><div class="result"><a href="/series/lorem"><span class="other-title">Lorem</span></a></div></body></html>',
        { overrides: { search: { title: '.other-title' } } },
      ),
      { page: 1 },
    );
    expect(result.items[0]?.title).toBe('Lorem');
  });
});

describe('extractDetails', () => {
  it('builds a complete MangaDetails with normalised status and rating', async () => {
    const details = await extractDetails(
      runtime(
        '<html><body>' +
          '<h1 class="series-title">Lorem Ipsum</h1>' +
          '<div class="series-cover"><img src="/covers/lorem.jpg" /></div>' +
          '<p class="series-synopsis">Lorem ipsum dolor.</p>' +
          '<p class="series-authors">Lorem Author, Ipsum Author</p>' +
          '<p class="series-artists">Ipsum Artist</p>' +
          '<p class="series-alt-titles">Dolor Sit</p>' +
          '<p class="series-tags">lorem, ipsum</p>' +
          '<p class="series-status">Ongoing</p>' +
          '<p class="series-rating">Suggestive</p>' +
          '<div class="site-logo"><img src="/logo.png" /></div>' +
          '<p class="site-credits">Lorem credits</p>' +
          '</body></html>',
      ),
      'lorem-ipsum',
    );

    expect(details).toMatchObject({
      key: 'lorem-ipsum',
      title: 'Lorem Ipsum',
      status: 'ongoing',
      contentRating: 'suggestive',
      coverURL: 'https://example.org/covers/lorem.jpg',
      authors: ['Lorem Author', 'Ipsum Author'],
      artists: ['Ipsum Artist'],
      altTitles: ['Dolor Sit'],
      tags: ['lorem', 'ipsum'],
    });
    expect(details.attribution).toEqual({
      siteName: 'Example Site',
      siteURL: 'https://example.org/',
      logoURL: 'https://example.org/logo.png',
      credits: 'Lorem credits',
    });
  });

  it('falls back to unknown status and rating', async () => {
    const details = await extractDetails(
      runtime('<html><body><h1 class="series-title">Lorem</h1></body></html>'),
      'lorem',
    );
    expect(details.status).toBe('unknown');
    expect(details.contentRating).toBe('unknown');
  });
});

describe('normalisation helpers', () => {
  it('normalises statuses', () => {
    expect(normalizeStatus('Currently Publishing')).toBe('ongoing');
    expect(normalizeStatus('Completed')).toBe('completed');
    expect(normalizeStatus('On Hold')).toBe('hiatus');
    expect(normalizeStatus('Cancelled')).toBe('cancelled');
    expect(normalizeStatus('something-new')).toBe('unknown');
  });

  it('normalises content ratings', () => {
    expect(normalizeContentRating('All Ages')).toBe('safe');
    expect(normalizeContentRating('Mature Teen')).toBe('suggestive');
    expect(normalizeContentRating('18+')).toBe('mature');
    expect(normalizeContentRating('something-new')).toBe('unknown');
  });
});

describe('extractChapters', () => {
  it('extracts and sorts chapters by number', async () => {
    const chapters = await extractChapters(
      runtime(
        '<html><body>' +
          '<div class="chapter"><a href="/ch/2"><span class="chapter-title">Chapter 2</span></a><time class="chapter-date">2026-02-01T10:00:00Z</time></div>' +
          '<div class="chapter"><a href="/ch/1"><span class="chapter-title">Chapter 1</span></a><time class="chapter-date">2026-01-01T10:00:00Z</time></div>' +
          '</body></html>',
      ),
      'lorem',
    );

    expect(chapters.map((chapter) => chapter.key)).toEqual([
      'https://example.org/ch/1',
      'https://example.org/ch/2',
    ]);
    expect(chapters[0]).toMatchObject({
      title: 'Chapter 1',
      number: 1,
      publishedAt: '2026-01-01T10:00:00.000Z',
    });
  });
});

describe('extractPages', () => {
  it('uses the first strategy that returns pages', async () => {
    const pages = await extractPages(
      runtime(
        '<html><body><div class="reader"><img src="/001.jpg" /><img src="/002.jpg" /></div></body></html>',
      ),
      { mangaKey: 'lorem', chapterKey: 'chapter-1' },
    );

    expect(pages).toEqual([
      { index: 0, imageURL: 'https://example.org/001.jpg' },
      { index: 1, imageURL: 'https://example.org/002.jpg' },
    ]);
  });

  it('applies page strategy overrides', async () => {
    const pages = await extractPages(
      runtime(
        '<html><body><img class="override" src="https://example.org/override.jpg" /></body></html>',
        {
          overrides: {
            pages: {
              strategies: [
                { kind: 'css', image: '.override', srcAttributes: ['src'] },
              ],
            },
          },
        },
      ),
      { mangaKey: 'lorem', chapterKey: 'chapter-1' },
    );
    expect(pages[0]?.imageURL).toBe('https://example.org/override.jpg');
  });
});

describe('hooks', () => {
  const withHooks: ThemeAdapter = {
    ...adapter,
    hooks: {
      search: async () => ({ items: [{ key: 'hook', title: 'Hook' }], hasNextPage: false }),
      getMangaDetails: async (_ctx, key) => ({
        key,
        title: 'Hook Details',
        status: 'ongoing',
        contentRating: 'safe',
      }),
      getChapters: async () => [{ key: 'hook-chapter' }],
      getPages: async () => [{ index: 0, imageURL: 'https://example.org/hook.jpg' }],
    },
  };

  it('takes precedence over declarative selectors', async () => {
    const hooked: ThemeRuntimeOptions = {
      adapter: withHooks,
      context,
      document: makeDocument('<html><body></body></html>'),
    };

    expect((await extractSearch(hooked, { page: 1 })).items[0]?.title).toBe('Hook');
    expect((await extractDetails(hooked, 'key')).title).toBe('Hook Details');
    expect((await extractChapters(hooked, 'key'))[0]?.key).toBe('hook-chapter');
    expect(
      (await extractPages(hooked, { mangaKey: 'key', chapterKey: 'chapter' }))[0]?.imageURL,
    ).toBe('https://example.org/hook.jpg');
  });
});

describe('dispatch', () => {
  it('returns JSON strings for every operation', async () => {
    const hooked: ThemeRuntimeOptions = {
      adapter: {
        ...adapter,
        hooks: {
          search: async () => ({ items: [{ key: 'k', title: 'T' }], hasNextPage: false }),
          getMangaDetails: async (_ctx, key) => ({
            key,
            title: 'T',
            status: 'unknown',
            contentRating: 'unknown',
          }),
          getChapters: async () => [{ key: 'c' }],
          getPages: async () => [{ index: 0, imageURL: 'https://example.org/p.jpg' }],
        },
      },
      context,
      document: makeDocument('<html><body></body></html>'),
    };

    expect(JSON.parse(await dispatch(hooked, 'search', '{"page":2}'))).toEqual({
      items: [{ key: 'k', title: 'T' }],
      hasNextPage: false,
    });
    expect(JSON.parse(await dispatch(hooked, 'details', '{"key":"m"}'))).toMatchObject({
      key: 'm',
      title: 'T',
    });
    expect(JSON.parse(await dispatch(hooked, 'getChapters', '{"key":"m"}'))).toEqual([
      { key: 'c' },
    ]);
    expect(JSON.parse(await dispatch(hooked, 'getPages', '{}'))).toEqual([
      { index: 0, imageURL: 'https://example.org/p.jpg' },
    ]);
  });

  it('rejects unknown methods', async () => {
    await expect(dispatch(runtime('<html></html>'), 'unknown', '{}')).rejects.toThrow(
      /Unknown adapter method/,
    );
  });
});
