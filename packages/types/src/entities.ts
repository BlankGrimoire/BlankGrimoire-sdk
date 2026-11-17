// SPDX-License-Identifier: MIT

/**
 * ISO 8601 date-time string.
 * @format date-time
 */
export type ISODateString = string;

/**
 * Absolute URL, or URL relative to the site `baseURL`.
 * @format uri-reference
 */
export type URLString = string;

/**
 * Publication status. Adapters may emit `unknown`; the iOS app maps any
 * unrecognised value to `unknown` as well.
 */
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';

/** Content rating. Adapters emit `unknown` when the site does not expose one. */
export type ContentRating = 'safe' | 'suggestive' | 'mature' | 'unknown';

/**
 * Shape of a chapter's payload.
 *
 * `image` chapters expose ordered page images; `text` chapters expose an HTML
 * or plain-text body fetched on demand. A missing value means `image`, so
 * existing adapters stay valid.
 */
export type ContentKind = 'image' | 'text';

/** Genre tag for cross-site filtering. Adapters should normalize to these. */
export type Genre = 
  | 'action' 
  | 'adventure' 
  | 'comedy' 
  | 'drama' 
  | 'fantasy' 
  | 'horror' 
  | 'isekai' 
  | 'romance' 
  | 'sci-fi' 
  | 'slice-of-life' 
  | 'sports' 
  | 'supernatural' 
  | 'thriller' 
  | 'historical' 
  | 'psychological' 
  | 'mystery' 
  | 'ecchi' 
  | 'harem' 
  | 'shounen' 
  | 'shoujo' 
  | 'seinen' 
  | 'josei' 
  | 'other';

export interface Attribution {
  siteName: string;
  siteURL: URLString;
  logoURL?: URLString;
  credits?: string;
}

export interface MangaSummary {
  /** Opaque, stable key chosen by the adapter. */
  key: string;
  title: string;
  coverURL?: URLString;
}

export interface MangaDetails extends MangaSummary {
  altTitles?: string[];
  authors?: string[];
  artists?: string[];
  synopsis?: string;
  tags?: string[];
  genres?: string[];
  status: MangaStatus;
  contentRating: ContentRating;
  /**
   * Whether chapters carry images or text. Missing means `image`, so the
   * field is optional for every existing adapter.
   */
  contentKind?: ContentKind;
  attribution?: Attribution;
}

export interface Chapter {
  key: string;
  title?: string;
  number?: number;
  volume?: number;
  /** BCP-47 language tag. */
  language?: string;
  publishedAt?: ISODateString;
  group?: string;
}

export interface Page {
  index: number;
  imageURL: URLString;
  headers?: Record<string, string>;
}

/**
 * Body of a text chapter.
 *
 * `html` keeps markup for rich rendering; `text` is plain text with
 * paragraphs already separated. Sanitisation is the host's job: the runtime
 * never strips scripts, frames or event handlers.
 */
export interface ChapterText {
  kind: 'html' | 'text';
  value: string;
}

/** Payload returned by the `content` dispatch method for a text chapter. */
export interface ChapterContent {
  /** Chapter key the body belongs to. */
  key: string;
  /** Title read from the page, when the adapter finds one. */
  title?: string;
  body: ChapterText;
  /** BCP-47 language tag. */
  language?: string;
  attribution?: Attribution;
}

export interface PagedResult<T> {
  items: T[];
  hasNextPage: boolean;
}

/** Concrete alias so the JSON Schema gets a named definition for fixtures. */
export type MangaSummaryPage = PagedResult<MangaSummary>;

/** A genre filter exposed by a specific site */
export interface SiteGenreFilter {
  /** Display name shown on the site (e.g., "Action", "Azione", "AKCJA") */
  displayName: string;
  /** Value to pass in URL/query param (e.g., "action", "azione", "akcja") */
  value: string;
  /** Direct URL to the genre page if navigable (optional) */
  url?: string;
}

/** Mapping configuration for extracting genre filters from a site */
export interface GenreMapping {
  /** CSS selector to extract genre elements (e.g., ".genre-list a") */
  source: string;
  /** Attribute for display name (default: "text") */
  displayNameAttr?: string;
  /** Attribute for filter value (default: "href" or "data-value") */
  valueAttr?: string;
  /** Regex pattern to extract value from href (e.g., "/genre/([^/]+)") */
  valuePattern?: string;
  /** Query parameter name for search URL (e.g., "genre") */
  filterParam?: string;
}

/** A unified genre (case-insensitive merge across sites) */
export interface UnifiedGenre {
  /** Lowercase key for comparison */
  id: string;
  /** Display name (capitalized for UI) */
  displayName: string;
  /** Site-specific filters keyed by siteProfileID */
  siteFilters: Record<string, SiteGenreFilter>;
}

/** Result of genre extraction from a page */
export interface ExtractedGenres {
  filters: SiteGenreFilter[];
}

export interface SearchQuery {
  text?: string;
  page: number;
  filters?: Record<string, string>;
  genres?: string[];
}
