# @blankgrimoire/types API Reference

## Exports

```ts
import {
  // Version
  API_VERSION,
  type ApiVersion,
  
  // Entities
  type MangaSummary,
  type MangaDetails,
  type Chapter,
  type Page,
  type PagedResult,
  type SearchQuery,
  type MangaStatus,
  type ContentRating,
  type Attribution,
  type ISODateString,
  type URLString,
  type MangaSummaryPage,
  
  // HTTP
  type HttpRequest,
  type HttpResponse,
  
  // Strategies
  type ExtractionStrategy,
  type CssStrategy,
  type ScriptJSONStrategy,
  type HydrationStrategy,
  type AjaxStrategy,
  type PagesConfig,
  type StrategyEnvironment,
  
  // Theme
  type ThemeAdapter,
  type ThemeSelectors,
  type ThemeSelectorsOverrides,
  type ThemeSignature,
  type ThemeHooks,
  type SiteContext,
  defineTheme,
  
  // Manifest
  type AdapterManifest,
  type RepositoryIndex,
} from '@blankgrimoire/types';
```

## Version

```ts
export const API_VERSION = 1 as const;
export type ApiVersion = typeof API_VERSION; // 1
```

## Entities

### MangaSummary
```ts
interface MangaSummary {
  key: string;           // Opaque, stable identifier
  title: string;
  coverURL?: URLString;  // Relative or absolute
}
```

### MangaDetails
```ts
interface MangaDetails extends MangaSummary {
  altTitles?: string[];
  authors?: string[];
  artists?: string[];
  synopsis?: string;
  tags?: string[];
  status: MangaStatus;
  contentRating: ContentRating;
  attribution?: Attribution;
}
```

### Chapter
```ts
interface Chapter {
  key: string;
  title?: string;
  number?: number;
  volume?: number;
  language?: string;           // BCP-47
  publishedAt?: ISODateString; // ISO 8601
  group?: string;
}
```

### Page
```ts
interface Page {
  index: number;           // 0-based
  imageURL: URLString;     // Resolved absolute
  headers?: Record<string, string>;
}
```

### Enums
```ts
type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';
type ContentRating = 'safe' | 'suggestive' | 'mature' | 'unknown';
```

### PagedResult
```ts
interface PagedResult<T> {
  items: T[];
  hasNextPage: boolean;
}
```

### SearchQuery
```ts
interface SearchQuery {
  text?: string;
  page: number;
  filters?: Record<string, string>;
}
```

## HTTP

```ts
interface HttpRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

interface HttpResponse {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
}
```

## Strategies

```ts
type ExtractionStrategy =
  | CssStrategy
  | ScriptJSONStrategy
  | HydrationStrategy
  | AjaxStrategy;

interface CssStrategy {
  kind: 'css';
  image: string;
  srcAttributes: string[];
  headers?: Record<string, string>;
}

interface ScriptJSONStrategy {
  kind: 'scriptJSON';
  pattern: string;
  path: string;
  base64?: boolean;
}

interface HydrationStrategy {
  kind: 'hydration';
  framework: 'next' | 'nuxt';
  path?: string;
}

interface AjaxStrategy {
  kind: 'ajax';
  method: 'GET' | 'POST';
  path: string;
  body?: string;
  then: ExtractionStrategy;
}

type PagesConfig = { strategies: ExtractionStrategy[] };

interface StrategyEnvironment {
  baseURL: string;
  window?: WindowLike;
  parseHTML?: ParseHTML;
}
```

## Theme

### ThemeSignature
```ts
interface ThemeSignature {
  metaGenerator?: string;   // Regex vs <meta name="generator">
  selectors?: string[];     // CSS selectors that must exist
  scriptSrc?: string[];     // Regexes vs script src
  probePaths?: string[];    // Paths returning 2xx
  minScore: number;         // Detection threshold
}
```

### ThemeSelectors
```ts
interface ThemeSelectors {
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
    status?: string;
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
```

### ThemeSelectorsOverrides
```ts
interface ThemeSelectorsOverrides {
  search?: Partial<ThemeSelectors['search']>;
  details?: Partial<ThemeSelectors['details']>;
  chapters?: Partial<ThemeSelectors['chapters']>;
  pages?: { strategies?: ExtractionStrategy[] };
  attribution?: Partial<NonNullable<ThemeSelectors['attribution']>>;
}
```

### ThemeHooks
```ts
interface ThemeHooks {
  search?(ctx: SiteContext, q: SearchQuery): Promise<PagedResult<MangaSummary>>;
  getMangaDetails?(ctx: SiteContext, key: string): Promise<MangaDetails>;
  getChapters?(ctx: SiteContext, key: string): Promise<Chapter[]>;
  getPages?(ctx: SiteContext, mangaKey: string, chapterKey: string): Promise<Page[]>;
}
```

### ThemeAdapter
```ts
interface ThemeAdapter {
  id: string;
  name: string;
  version: string;
  detectionSignature: ThemeSignature;
  selectors: ThemeSelectors;
  hooks?: ThemeHooks;
}

function defineTheme(adapter: ThemeAdapter): ThemeAdapter & { apiVersion: ApiVersion };
// Attaches { apiVersion: 1 }
```

### SiteContext
```ts
interface SiteContext {
  baseURL: string;
  siteName: string;
  overrides: ThemeSelectorsOverrides;
}
```

## Manifest

### AdapterManifest
```ts
interface AdapterManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: ApiVersion;        // 1
  detectionSignature: ThemeSignature;
  sha256: string;                // 64 lowercase hex
}
```

### RepositoryIndex
```ts
interface RepositoryIndex {
  formatVersion: 1;
  name: string;
  publicKey: string;             // "ed25519:BASE64" (32 bytes)
  extensions: ExtensionEntry[];
}

interface ExtensionEntry {
  id: string;
  name: string;
  version: string;
  apiVersion: ApiVersion;        // 1
  bundleURL: string;             // Relative to index.json
  sha256: string;                // 64 lowercase hex
  bundleSignature: string;       // Base64 Ed25519 (64 bytes)
}
```

## Utility Functions

```ts
// From @blankgrimoire/runtime (also re-exported for convenience)
normalizeStatus(text: string): MangaStatus;
normalizeContentRating(text: string): ContentRating;
resolveURL(value: string, baseURL: string): string;  // Self-contained, no URL global
parseJSONText(text: string): unknown;                // Extracts JSON from script text
readPath(value: unknown, path: string): unknown;     // Dot/bracket path lookup
toPages(payload: unknown, baseURL: string, headers?: Record<string, string>): Page[];
```