/** ISO 8601 date-time string. Decoded with `.iso8601` in Swift. */
export type ISODateString = string;

/** Absolute URL, or URL relative to the site `baseURL`. */
export type URLString = string;

/** Publication status. Swift maps unknown values to `unknown`. */
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';

export type ContentRating = 'safe' | 'suggestive' | 'mature';

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
  status: MangaStatus;
  contentRating: ContentRating;
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

export interface PagedResult<T> {
  items: T[];
  hasNextPage: boolean;
}

/** Concrete alias so the JSON Schema gets a named definition for fixtures. */
export type MangaSummaryPage = PagedResult<MangaSummary>;

export interface SearchQuery {
  text?: string;
  page: number;
  filters?: Record<string, string>;
}
