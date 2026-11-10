// SPDX-License-Identifier: MIT

/**
 * Explicit root types used to generate `schema/v1.json`. Keeping this entry
 * separate from `index.ts` prevents runtime helpers and bridge constants from
 * leaking into the published JSON Schema.
 */
export type { ApiVersion } from './version.js';
export type {
  Attribution,
  Chapter,
  ContentRating,
  ISODateString,
  MangaDetails,
  MangaStatus,
  MangaSummary,
  MangaSummaryPage,
  Page,
  SearchQuery,
  URLString,
} from './entities.js';
export type { HttpRequest, HttpResponse } from './http.js';
export type { AdapterManifest, RepositoryIndex } from './manifest.js';
export type { ExtractionStrategy, PagesConfig } from './strategies.js';
export type {
  SiteContext,
  ThemeAdapter,
  ThemeHooks,
  ThemeSelectors,
  ThemeSelectorsOverrides,
  ThemeSignature,
} from './theme.js';
