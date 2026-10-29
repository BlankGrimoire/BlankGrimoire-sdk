// SPDX-License-Identifier: MIT

import type { Chapter, MangaDetails, MangaSummary, Page, PagedResult, SearchQuery } from './entities.js';
import type { ExtractionStrategy, PagesConfig } from './strategies.js';
import { API_VERSION, type ApiVersion } from './version.js';

/**
 * Field-by-field overrides supplied by the user for one site. Unlike a
 * shallow `Partial`, nested selector groups may contain only the fields that
 * actually change.
 */
export interface ThemeSelectorsOverrides {
  search?: Partial<ThemeSelectors['search']>;
  details?: Partial<ThemeSelectors['details']>;
  chapters?: Partial<ThemeSelectors['chapters']>;
  pages?: {
    strategies?: ExtractionStrategy[];
  };
  attribution?: Partial<NonNullable<ThemeSelectors['attribution']>>;
}

/** The site is always chosen by the user, never by the adapter. */
export interface SiteContext {
  baseURL: string;
  siteName: string;
  overrides: ThemeSelectorsOverrides;
}

/**
 * Theme detection signature. Scoring is done by the host:
 * - metaGenerator match: +3
 * - each matching selector: +2
 * - each matching scriptSrc regex: +1
 * - each probePath returning 2xx: +3
 * The theme is detected when the total score is at least `minScore`.
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
    artists?: string;
    altTitles?: string;
    tags?: string;
    /** Text normalised by the runtime into `MangaStatus`. */
    status?: string;
    /** Text normalised by the runtime into `ContentRating`. */
    contentRating?: string;
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
  detectionSignature: ThemeSignature;
  selectors: ThemeSelectors;
  /**
   * Executable escape hatch for edge cases. Hooks live only in the bundle;
   * they are not serialised into JSON.
   */
  hooks?: ThemeHooks;
}

export function defineTheme(adapter: ThemeAdapter): ThemeAdapter & { apiVersion: ApiVersion } {
  return Object.assign({}, adapter, { apiVersion: API_VERSION });
}
