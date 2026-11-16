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
 * - metaGenerator match: +30
 * - each matching selector: +15
 * - each matching scriptSrc regex: +20
 *
 * `probePaths` are not part of the score. The host fetches them only to break a
 * tie between adapters that scored equally.
 *
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
    /**
     * List-aware variant of `authors`. Every element matched by the selector
     * becomes one entry, in document order, with empties and duplicates
     * removed. When present it wins over `authors`, which stays available for
     * hosts that do not know this field.
     */
    authorsItem?: string;
    /** List-aware variant of `artists`. See `authorsItem`. */
    artistsItem?: string;
    /** List-aware variant of `altTitles`. See `authorsItem`. */
    altTitlesItem?: string;
    /** List-aware variant of `tags`. See `authorsItem`. */
    tagsItem?: string;
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
    /**
     * Selector evaluated **inside** every chapter row. A row where it matches is
     * dropped before the list is returned, so locked chapters never reach the
     * host: a coin badge, a lock icon or a premium class are all one selector.
     */
    excludeItem?: string;
    /**
     * Alias of `excludeItem` kept because adapters already ship it. When both
     * are present, `excludeItem` wins.
     */
    premiumMarker?: string;
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
  /**
   * Contract version attached by `defineTheme`. Hosts and the runtime reject
   * adapters whose value differs from the current `API_VERSION`.
   */
  apiVersion?: ApiVersion;
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
