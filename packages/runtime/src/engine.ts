import type { ThemeSelectors } from '@blankgrimoire/types';
import { extractCss, type CssResult } from './css.js';
import { extractScriptJSON, type ScriptJSONStrategy } from './strategies.js';
import { extractHydration, type HydrationStrategy } from './strategies.js';
import { extractAjax, type AjaxStrategy } from './strategies.js';

export type ExtractionResult = CssResult;

export interface ThemeHooksLike {
  search?: (
    ctx: SiteContextLike,
    q: { text?: string; page: number; filters?: Record<string, string> },
  ) => Promise<{ items: MangaSummaryLike[]; hasNextPage: boolean }>;
  getMangaDetails?: (ctx: SiteContextLike, key: string) => Promise<MangaDetailsLike>;
  getChapters?: (ctx: SiteContextLike, key: string) => Promise<ChapterLike[]>;
  getPages?: (
    ctx: SiteContextLike,
    mangaKey: string,
    chapterKey: string,
  ) => Promise<PageLike[]>;
}

export interface MangaSummaryLike {
  key: string;
  title: string;
  coverURL?: string;
}

export interface MangaDetailsLike {
  key: string;
  title: string;
  coverURL?: string;
  altTitles?: string[];
  authors?: string[];
  artists?: string[];
  synopsis?: string;
  tags?: string[];
  status: string;
  contentRating: string;
  attribution?: {
    siteName: string;
    siteURL: string;
    logoURL?: string;
    credits?: string;
  };
}

export interface ChapterLike {
  key: string;
  title?: string;
  number?: number;
  volume?: number;
  language?: string;
  publishedAt?: string;
  group?: string;
}

export interface PageLike {
  index: number;
  imageURL: string;
  headers?: Record<string, string>;
}

export interface ExtractOptions {
  strategies: Array<{ kind: string }>;
  context: SiteContextLike;
  hooks?: ThemeHooksLike;
}

export interface SiteContextLike {
  baseURL: string;
  siteName: string;
  selectors: ThemeSelectors;
  overrides?: Partial<ThemeSelectors>;
}

/** Resolve selectors with user overrides applied (overrides take precedence). */
function resolveSelectors(base: ThemeSelectors, overrides: Partial<ThemeSelectors>): ThemeSelectors {
  return {
    search: { ...base.search, ...overrides.search },
    details: { ...base.details, ...overrides.details },
    chapters: { ...base.chapters, ...overrides.chapters },
    pages: {
      strategies: overrides.pages?.strategies ?? base.pages.strategies,
    },
    ...(overrides.attribution && { attribution: { ...base.attribution, ...overrides.attribution } }),
  };
}

/** Run extraction strategies in order; first non-empty result wins. */
export async function extract(
  options: ExtractOptions,
  document: Document,
): Promise<ExtractionResult | null> {
  const selectors = resolveSelectors(options.context.selectors, options.context.overrides ?? {});
  const strategies =
    options.context.overrides?.pages?.strategies ??
    options.strategies ??
    selectors.pages.strategies;

  for (const strategy of strategies) {
    const result = await runStrategy(strategy, document, selectors, options.context);
    if (result) {
      return result;
    }
  }
  return null;
}

async function runStrategy(
  strategy: { kind: string },
  document: Document,
  selectors: ThemeSelectors,
  context: SiteContextLike,
): Promise<ExtractionResult | null> {
  switch (strategy.kind) {
    case 'css':
      return extractCss(strategy as { kind: 'css'; image: string; srcAttributes: string[] }, document, selectors);
    case 'scriptJSON':
      return extractScriptJSON(strategy as ScriptJSONStrategy, document);
    case 'hydration':
      return extractHydration(strategy as HydrationStrategy, globalThis as unknown as Window & typeof globalThis);
    case 'ajax':
      return extractAjax(strategy as AjaxStrategy, { baseURL: context.baseURL }, document);
    default:
      return null;
  }
}
