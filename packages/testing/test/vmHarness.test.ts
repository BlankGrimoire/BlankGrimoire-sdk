// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ThemeAdapter } from '@blankgrimoire/types';
import { VMHarness } from '../src/vmHarness.js';

const runtimeIIFE = readFileSync(
  new URL('../../runtime/dist/runtime.js', import.meta.url),
  'utf8',
);

const selectors = {
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
    cover: '.series-cover',
    synopsis: '.series-synopsis',
    status: '.series-status',
    contentRating: '.series-rating',
  },
  chapters: {
    item: '.chapter',
    link: 'a',
    title: '.chapter-title',
    order: 'desc' as const,
  },
  pages: {
    strategies: [
      {
        kind: 'css' as const,
        image: '.reader-area img',
        srcAttributes: ['data-src', 'src'],
      },
    ],
  },
};

const declarativeAdapter: ThemeAdapter = {
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: {
    metaGenerator: '^ExampleCMS',
    selectors: ['.example-reader'],
    minScore: 3,
  },
  selectors,
};

const hookedAdapter: ThemeAdapter = {
  ...declarativeAdapter,
  hooks: {
    search: async () => ({
      items: [{ key: 'https://example.org/series/lorem', title: 'Hooked' }],
      hasNextPage: false,
    }),
    getMangaDetails: async (_ctx, key) => ({
      key,
      title: 'Hooked Details',
      status: 'completed',
      contentRating: 'safe',
    }),
    getChapters: async () => [
      { key: 'https://example.org/series/lorem/chapter-1', title: 'Chapter 1' },
    ],
    getPages: async () => [
      { index: 0, imageURL: 'https://example.org/pages/hooked.jpg' },
    ],
  },
};

const pageHTML = `<!DOCTYPE html>
<html>
  <head><meta name="generator" content="ExampleCMS v2"></head>
  <body>
    <div class="example-reader">
      <div class="result">
        <a href="/series/lorem">
          <span class="result-title">Lorem</span>
          <img src="/covers/lorem.jpg" />
        </a>
      </div>
      <h1 class="series-title">Lorem Ipsum</h1>
      <div class="series-cover"><img src="/covers/lorem.jpg" /></div>
      <p class="series-synopsis">Lorem ipsum dolor sit amet.</p>
      <p class="series-status">Ongoing</p>
      <p class="series-rating">Safe</p>
      <ul class="chapters">
        <li class="chapter">
          <a href="/series/lorem/chapter-2"><span class="chapter-title">Chapter 2</span></a>
        </li>
        <li class="chapter">
          <a href="/series/lorem/chapter-1"><span class="chapter-title">Chapter 1</span></a>
        </li>
      </ul>
      <div class="reader-area">
        <img data-src="/pages/001.jpg" />
        <img src="/pages/002.jpg" />
      </div>
    </div>
  </body>
</html>`;

describe('VMHarness', () => {
  it('runs the real runtime bundle against declarative selectors', async () => {
    const harness = new VMHarness(
      ['example.org'],
      runtimeIIFE,
      declarativeAdapter,
    );

    const result = await harness.testTheme(pageHTML, 'https://example.org/', {
      mangaKey: 'lorem-ipsum',
    });

    expect(result.detected).toBe(true);
    expect(result.score).toBe(5);
    expect(result.detectionSignature.minScore).toBe(3);
    expect(result.search).toEqual({
      items: [
        {
          key: 'https://example.org/series/lorem',
          title: 'Lorem',
          coverURL: 'https://example.org/covers/lorem.jpg',
        },
      ],
      hasNextPage: false,
    });
    expect(result.details).toMatchObject({
      key: 'lorem-ipsum',
      title: 'Lorem Ipsum',
      status: 'ongoing',
      contentRating: 'safe',
      synopsis: 'Lorem ipsum dolor sit amet.',
    });
    expect(result.chapters?.map((chapter) => chapter.title)).toEqual([
      'Chapter 2',
      'Chapter 1',
    ]);
    expect(result.pages).toEqual([
      { index: 0, imageURL: 'https://example.org/pages/001.jpg' },
      { index: 1, imageURL: 'https://example.org/pages/002.jpg' },
    ]);
  });

  it('gives hooks precedence over declarative extraction', async () => {
    const harness = new VMHarness(['example.org'], runtimeIIFE, {
      default: hookedAdapter,
    });

    const result = await harness.testTheme(pageHTML, 'https://example.org/');

    expect(result.search?.items[0]?.title).toBe('Hooked');
    expect(result.details?.title).toBe('Hooked Details');
    expect(result.details?.status).toBe('completed');
    expect(result.chapters?.map((chapter) => chapter.title)).toEqual(['Chapter 1']);
    expect(result.pages?.[0]?.imageURL).toBe('https://example.org/pages/hooked.jpg');
  });

  it('returns only detection data when the theme does not match', async () => {
    const harness = new VMHarness(
      ['example.org'],
      runtimeIIFE,
      declarativeAdapter,
    );

    const result = await harness.testTheme(
      '<html><head><meta name="generator" content="OtherCMS"></head><body></body></html>',
      'https://example.org/',
    );

    expect(result.detected).toBe(false);
    expect(result.score).toBe(0);
    expect(result.search).toBeUndefined();
    expect(result.details).toBeUndefined();
    expect(result.chapters).toBeUndefined();
    expect(result.pages).toBeUndefined();
  });

  it('exposes the native bridge for network simulations', () => {
    const harness = new VMHarness(
      ['example.org'],
      runtimeIIFE,
      declarativeAdapter,
    );
    const bridge = harness.getNativeBridge();
    expect(typeof bridge.log).toBe('function');
    expect(typeof bridge.request).toBe('function');
    expect(typeof bridge.parseHTML).toBe('function');
  });

  it('rejects bundles with a different API version', () => {
    expect(
      () =>
        new VMHarness(
          ['example.org'],
          'var BlankGrimoireRuntime = { __apiVersion: 2, dispatch: async () => "{}" };',
          declarativeAdapter,
        ),
    ).toThrow(/API version/);
  });

  it('rejects bundles that do not expose the JSON dispatcher', () => {
    expect(
      () =>
        new VMHarness(
          ['example.org'],
          'var BlankGrimoireRuntime = { __apiVersion: 1 };',
          declarativeAdapter,
        ),
    ).toThrow(/dispatch/);

    expect(
      () => new VMHarness(['example.org'], 'var example = 1;', declarativeAdapter),
    ).toThrow(/BlankGrimoireRuntime/);
  });
});
