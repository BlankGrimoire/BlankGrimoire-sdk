// SPDX-License-Identifier: MIT

import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  API_VERSION,
  defineTheme,
  type MangaDetails,
  type MangaSummary,
  type ThemeAdapter,
} from '../src/index.js';

const minimal = {
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: { minScore: 1 },
  selectors: {
    search: { path: '/search', item: '.result', title: '.title', link: 'a' },
    details: { title: 'h1' },
    chapters: { item: '.chapter', link: 'a', order: 'desc' },
    pages: { strategies: [{ kind: 'css', image: 'img', srcAttributes: ['src'] }] },
  },
} satisfies ThemeAdapter;

describe('defineTheme', () => {
  it('attaches apiVersion 1', () => {
    const adapter = defineTheme(minimal);
    expect(adapter.apiVersion).toBe(1);
    expect(API_VERSION).toBe(1);
    expect(adapter.id).toBe('theme.example');
  });

  it('accepts a minimal adapter (type-level)', () => {
    expectTypeOf(defineTheme(minimal)).toMatchTypeOf<ThemeAdapter & { apiVersion: 1 }>();
  });
});

describe('type relationships', () => {
  it('MangaDetails extends MangaSummary', () => {
    expectTypeOf<MangaDetails>().toMatchTypeOf<MangaSummary>();
  });
});
