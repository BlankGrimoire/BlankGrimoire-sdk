import type { Chapter, MangaDetails, MangaSummary, Page, PagedResult, SearchQuery } from './entities.js';
import type { PagesConfig } from './strategies.js';

/** The site is always chosen by the user, never by the adapter. */
export interface SiteContext {
  baseURL: string;
  siteName: string;
  overrides: Partial<ThemeSelectors>;
}

/**
 * Theme detection signature. Scoring is done in Swift:
 * - metaGenerator match: +3
 * - each matching selector: +2
 * - each matching scriptSrc regex: +1
 * - each probePath returning 2xx: +3
 */
export interface ThemeSignature {
  /** Regex matched against `<meta name="generator">`. */
  metaGenerator?: string;
  selectors?: string[];
  /** Regexes matched against script `src` attributes. */
  scriptSrc?: string[];
  probePaths?: string[];
  minScore: number;
}

export interface ThemeSelectors {
  search: {
    path: string;
    item: string;
    title: string;
    link: string;
    cover?: string;
    nextPage?: string;
  };
  details: {
    title: string;
    cover?: string;
    synopsis?: string;
    authors?: string;
    tags?: string;
    status?: string;
  };
  chapters: {
    item: string;
    link: string;
    title?: string;
    date?: string;
    order: 'asc' | 'desc';
  };
  pages: PagesConfig;
  attribution?: {
    logo?: string;
    credits?: string;
  };
}

export interface ThemeHooks {
  search?(ctx: SiteContext, q: SearchQuery): Promise<PagedResult<MangaSummary>>;
  getMangaDetails?(ctx: SiteContext, key: string): Promise<MangaDetails>;
  getChapters?(ctx: SiteContext, key: string): Promise<Chapter[]>;
  getPages?(ctx: SiteContext, mangaKey: string, chapterKey: string): Promise<Page[]>;
}

export interface ThemeAdapter {
  /** For example: "theme.example". */
  id: string;
  name: string;
  version: string;
  signature: ThemeSignature;
  selectors: ThemeSelectors;
  hooks?: ThemeHooks;
}

export function defineTheme(adapter: ThemeAdapter): ThemeAdapter & { apiVersion: 1 } {
  return Object.assign({}, adapter, { apiVersion: 1 as const });
}
