import { describe, expect, it } from 'vitest';
import { VMHarness } from '../src/vmHarness.js';

// Adapter sintetico: tema di esempio, nessuna dipendenza da siti reali
const syntheticAdapter = {
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  signature: {
    metaGenerator: '^ExampleCMS',
    selectors: ['.example-reader'],
    minScore: 3,
  },
  selectors: {
    search: {
      path: '/search',
      item: '.result',
      title: '.result-title',
      link: 'a',
    },
    details: {
      title: 'h1.series-title',
      cover: '.series-cover',
      synopsis: '.series-synopsis',
    },
    chapters: {
      item: '.chapter-list li',
      link: 'a',
      order: 'desc',
    },
    pages: {
      strategies: [
        { kind: 'css', image: '.reader-area img', srcAttributes: ['data-src', 'src'] },
      ],
    },
  },
  hooks: {
    getMangaDetails: async (_ctx: unknown, key: string) => ({
      key,
      title: 'Detected Series',
      coverURL: 'https://example.org/covers/detected.jpg',
      status: 'ongoing',
      contentRating: 'safe',
    }),
    getChapters: async (_ctx: unknown, _key: string) => [
      { key: 'ch-1', title: 'Chapter 1', number: 1 },
      { key: 'ch-2', title: 'Chapter 2', number: 2 },
    ],
    getPages: async (_ctx: unknown, _mangaKey: string, _chapterKey: string) => [
      { index: 0, imageURL: 'https://example.org/images/1/001.jpg' },
      { index: 1, imageURL: 'https://example.org/images/1/002.jpg' },
    ],
  },
} as unknown as { default: unknown; [key: string]: unknown };

// Corpo del runtime (senza parente esterne: new Function() le aggiunge già)
// In produzione questo è il contenuto di dist/runtime.js
const runtimeIIFE = `
  'use strict';
  window.__apiVersion = 1;
  window.__native = __native;
  window.engine = {
    version: 1,
  };
  return { apiVersion: 1, engine: window.engine };
` as const;

describe('VMHarness', () => {
  it('carica runtime IIFE ed esegue l\'adapter end-to-end', async () => {
    const harness = new VMHarness(['example.org'], runtimeIIFE, syntheticAdapter);

    const result = await harness.testTheme(
      '<html><head><meta name="generator" content="ExampleCMS v1"></head><body></body></html>',
      'https://example.org/',
    );

    expect(result.signature).toBeDefined();
    expect(result.signature.minScore).toBe(3);
    expect(result.details).toBeDefined();
    if (result.details && typeof result.details === 'object') {
      expect((result.details as any).key).toBe('lorem-ipsum');
      expect((result.details as any).title).toBe('Detected Series');
    }
    expect(result.chapters).toBeDefined();
    if (result.chapters && Array.isArray(result.chapters)) {
      expect(result.chapters.length).toBe(2);
      expect((result.chapters[0] as any).title).toBe('Chapter 1');
    }
    expect(result.pages).toBeDefined();
    if (result.pages && Array.isArray(result.pages)) {
      expect(result.pages.length).toBe(2);
      expect((result.pages[0] as any).imageURL).toContain('example.org');
    }
  });

  it('restituisce solo signature/selectors quando il tema non è rilevato', async () => {
    const harness = new VMHarness(['example.org'], runtimeIIFE, syntheticAdapter);

    const result = await harness.testTheme(
      '<html><head><meta name="generator" content="OtherCMS"></head><body></body></html>',
      'https://example.org/',
    );

    expect(result.signature).toBeDefined();
    expect(result.summary).toBeUndefined();
    expect(result.details).toBeUndefined();
    expect(result.chapters).toBeUndefined();
    expect(result.pages).toBeUndefined();
  });

  it('espone il bridge nativo per simulare risposte di rete', () => {
    const harness = new VMHarness(['example.org'], runtimeIIFE, syntheticAdapter);
    const bridge = harness.getNativeBridge();
    expect(bridge).toBeDefined();
    expect(typeof bridge.log).toBe('function');
    expect(typeof bridge.request).toBe('function');
  });
});
