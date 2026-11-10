# Contract Overview

The contract is the **single source of truth** shared between the TypeScript SDK and the iOS app. It lives in `@blankgrimoire/types` and is published as:
- JSON Schema: `schema/v1.json`
- Canonical fixtures: `fixtures/v1/*.json`

## Versioning

- `API_VERSION = 1` (exported from `@blankgrimoire/types`)
- SDK major version = adapter `apiVersion`
- `defineTheme` attaches `apiVersion: 1`; the runtime rejects adapters whose
  `apiVersion` is missing or different
- Schema file: `schema/v1.json`
- Fixtures directory: `fixtures/v1/`

## Core Types

### ApiVersion
```ts
export const API_VERSION = 1 as const;
export type ApiVersion = typeof API_VERSION; // 1
```

### ThemeSignature (Detection)
```ts
interface ThemeSignature {
  metaGenerator?: string;      // Regex vs <meta name="generator">
  selectors?: string[];        // CSS selectors that must exist
  scriptSrc?: string[];        // Regexes vs script src attributes
  probePaths?: string[];       // Paths that must return 2xx
  minScore: number;            // Threshold for detection
}
```
Scoring: generator +3, each selector +2, each scriptSrc +1, each probe +3.

### ThemeSelectors (Declarative Extraction)
```ts
interface ThemeSelectors {
  search: {
    path: string;              // Search endpoint path
    item: string;              // Selector for each result item
    title: string;             // Selector for title within item
    link: string;              // Selector for link (href) within item
    cover?: string;            // Selector for cover image
    nextPage?: string;         // Selector for next page link
  };
  details: {
    title: string;
    cover?: string;
    synopsis?: string;
    authors?: string;
    artists?: string;
    altTitles?: string;
    tags?: string;
    status?: string;           // Text → normalized to MangaStatus
    contentRating?: string;    // Text → normalized to ContentRating
  };
  chapters: {
    item: string;              // Chapter list item selector
    link: string;              // Link selector within item
    title?: string;            // Chapter title selector
    date?: string;             // Publication date selector
    order: 'asc' | 'desc';     // Sort order
  };
  pages: PagesConfig;          // Array of extraction strategies
  attribution?: {
    logo?: string;
    credits?: string;
  };
}
```

### ThemeSelectorsOverrides (User Customization)
Deep-partial merge — only specified fields replaced:
```ts
interface ThemeSelectorsOverrides {
  search?: Partial<ThemeSelectors['search']>;
  details?: Partial<ThemeSelectors['details']>;
  chapters?: Partial<ThemeSelectors['chapters']>;
  pages?: { strategies?: ExtractionStrategy[] };
  attribution?: Partial<NonNullable<ThemeSelectors['attribution']>>;
}
```

### ThemeHooks (Escape Hatch)
```ts
interface ThemeHooks {
  search?(ctx: SiteContext, q: SearchQuery): Promise<PagedResult<MangaSummary>>;
  getMangaDetails?(ctx: SiteContext, key: string): Promise<MangaDetails>;
  getChapters?(ctx: SiteContext, key: string): Promise<Chapter[]>;
  getPages?(ctx: SiteContext, mangaKey: string, chapterKey: string): Promise<Page[]>;
}
```
- Hooks take precedence over declarative selectors
- Only in bundle, not serialized to JSON
- Receive `SiteContext` with `baseURL`, `siteName`, `overrides`

### ThemeAdapter (Complete)
```ts
interface ThemeAdapter {
  id: string;                    // e.g., "theme.example"
  name: string;                  // Display name
  version: string;               // Semver
  apiVersion?: 1;                // Attached by defineTheme; required at runtime
  detectionSignature: ThemeSignature;
  selectors: ThemeSelectors;
  hooks?: ThemeHooks;            // Optional
}
// defineTheme(adapter) attaches { apiVersion: 1 }
```

The runtime throws `UnsupportedApiVersionError` when an adapter does not
declare `apiVersion: 1`. The iOS host performs the same check when it loads a
bundle and when it decodes a manifest.

### SiteContext (Host → Adapter)
```ts
interface SiteContext {
  baseURL: string;               // Site origin + path, e.g., "https://example.org/"
  siteName: string;              // Display name
  overrides: ThemeSelectorsOverrides; // User customizations
}
```

## Native Bridge (Host ↔ Runtime)

The runtime does not provide `fetch`, timers, or a DOM. The host injects a
`__native` object into the JavaScriptCore global object. `@blankgrimoire/types`
exports `NativeBridgeHost` and `NATIVE_BRIDGE_METHODS` so the SDK, tests, and
host implementations share the same names.

```ts
interface NativeBridgeHost<TDocument = unknown, TTimerHandle = unknown> {
  request?: (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;
  parseHTML?: (html: string) => TDocument;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  setTimeout?: (callback: () => void, ms: number) => TTimerHandle;
  clearTimeout?: (handle: TTimerHandle) => void;
}
```

| Member | Required | Contract |
|--------|----------|----------|
| `request` | Yes | Performs the HTTP request, enforces the site allowlist, and returns `HttpResponse` (a promise is accepted). |
| `parseHTML` | Yes | Returns the host document type (`DocumentLike`); iOS uses its HTML parser. |
| `log` / `warn` / `error` | No | Receive variadic arguments from the runtime `console` shim. |
| `setTimeout` | No | Schedules `callback` after `ms` and returns a handle passed back to `clearTimeout`. |
| `clearTimeout` | No | Cancels the handle returned by `setTimeout`. |

When the host implements `setTimeout`, the runtime wraps the callback and
invokes the host handle. When it does not, the host must call
`BlankGrimoireRuntime.__timerFire(id)` when the timer expires.

The runtime IIFE exposes the global named by `RUNTIME_GLOBAL_NAME`
(`BlankGrimoireRuntime`). The iOS host looks up that exact name and then calls
`dispatch(runtime, method, argsJSON)`. The CLI uses the same constant when it
bundles an adapter.

## Entity Types

### MangaSummary
```ts
interface MangaSummary {
  key: string;                   // Opaque, stable identifier
  title: string;
  coverURL?: URLString;          // Relative or absolute
}
```

### MangaDetails (extends MangaSummary)
```ts
interface MangaDetails extends MangaSummary {
  altTitles?: string[];
  authors?: string[];
  artists?: string[];
  synopsis?: string;
  tags?: string[];
  status: MangaStatus;           // 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown'
  contentRating: ContentRating;  // 'safe' | 'suggestive' | 'mature' | 'unknown'
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
  language?: string;             // BCP-47
  publishedAt?: ISODateString;   // ISO 8601
  group?: string;                // Scanlation group
}
```

### Page
```ts
interface Page {
  index: number;                 // 0-based order
  imageURL: URLString;           // Resolved absolute URL
  headers?: Record<string, string>; // e.g., Referer
}
```

### Enums (Closed, with `unknown`)
```ts
type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled' | 'unknown';
type ContentRating = 'safe' | 'suggestive' | 'mature' | 'unknown';
```
- Host normalizes any unrecognized text to `unknown`
- Adapters should emit `unknown` when site doesn't expose value

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

## Manifest & Repository Index

### AdapterManifest (Published with Bundle)
```ts
interface AdapterManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: ApiVersion;        // Always 1
  detectionSignature: ThemeSignature;
  sha256: string;                // 64 lowercase hex chars
}
```

### RepositoryIndex (Published to GitHub Pages)
```ts
interface RepositoryIndex {
  formatVersion: 1;              // Independent from apiVersion
  name: string;                  // Repository display name
  publicKey: string;             // "ed25519:BASE64" (32-byte key)
  extensions: ExtensionEntry[];
}

interface ExtensionEntry {
  id: string;
  name: string;
  version: string;
  apiVersion: ApiVersion;        // Must be 1
  bundleURL: string;             // Relative to index.json
  sha256: string;                // 64 lowercase hex chars
  bundleSignature: string;       // Base64 Ed25519 signature (64 bytes)
}
```

## Extraction Strategies

```ts
type ExtractionStrategy =
  | CssStrategy
  | ScriptJSONStrategy
  | HydrationStrategy
  | AjaxStrategy;

interface CssStrategy {
  kind: 'css';
  image: string;                 // Selector for img elements
  srcAttributes: string[];       // Attributes tried in order (e.g., ['data-src', 'src'])
  headers?: Record<string, string>;
}

interface ScriptJSONStrategy {
  kind: 'scriptJSON';
  pattern: string;               // Regex vs script text or src
  path: string;                  // Dot/bracket path to array (e.g., 'props.pageProps.pages')
  base64?: boolean;
}

interface HydrationStrategy {
  kind: 'hydration';
  framework: 'next' | 'nuxt';
  path?: string;                 // Optional path from hydration payload
}

interface AjaxStrategy {
  kind: 'ajax';
  method: 'GET' | 'POST';
  path: string;                  // Relative to baseURL
  body?: string;
  then: ExtractionStrategy;      // Nested strategy for response HTML
}
```

Strategies tried **in order**; first returning ≥1 page wins.

## JSON Schema

Generated from the explicit contract roots in
`packages/types/src/schema.ts` via `ts-json-schema-generator`:
```bash
pnpm schema  # Regenerates schema/v1.json after type-checking @blankgrimoire/types
```

Key schema features:
- `additionalProperties: false` on all objects
- Format validators: `uri-reference`, `date-time`, regex patterns
- `enum` for closed unions (`MangaStatus`, `ContentRating`)
- `const: 1` for `ApiVersion`, `formatVersion`, `apiVersion` fields

## Fixtures

Canonical JSON examples in `fixtures/v1/`:
| File | Type |
|------|------|
| `theme-adapter.json` | `ThemeAdapter` |
| `theme-selectors.json` | `ThemeSelectors` |
| `theme-selectors-overrides.json` | `ThemeSelectorsOverrides` |
| `theme-signature.json` | `ThemeSignature` |
| `manifest.json` | `AdapterManifest` |
| `repository-index.json` | `RepositoryIndex` |
| `site-context.json` | `SiteContext` |
| `manga-summary.json` | `MangaSummary` |
| `manga-details.json` | `MangaDetails` |
| `manga-details-unknown-status.json` | `MangaDetails` (with `unknown`) |
| `chapter.json` | `Chapter` |
| `page.json` | `Page` |
| `paged-result.json` | `PagedResult<MangaSummary>` |
| `search-query.json` | `SearchQuery` |
| `extraction-strategy.json` | `ExtractionStrategy` |
| `pages-config.json` | `PagesConfig` |
| `http-request.json` | `HttpRequest` |
| `http-response.json` | `HttpResponse` |
| `attribution.json` | `Attribution` |

All use `example.org` / `example.com` / `127.0.0.1` only.

## Contract Tests

Located in `@blankgrimoire/types/test/contract.test.ts`:
- Validates **every** fixture against schema
- Rejects legacy fields (`signature` → `detectionSignature`/`bundleSignature`)
- Rejects unsupported `apiVersion` values
- Rejects malformed digests/signatures
- Validates `unknown` fallback for status/rating
- Runtime tests reject adapters with a missing or different `apiVersion`

## Changing the Contract

1. Modify `@blankgrimoire/types/src/*.ts`
2. Run `pnpm build && pnpm schema`
3. Update fixtures in `fixtures/v1/`
4. Add contract tests for new behavior
5. Label PR with `contract` + `breaking-change` if not backward compatible
6. Bump major version for breaking changes

## Related Docs

- [Architecture Overview](../architecture/overview.md)
- [Runtime Engine](../runtime/overview.md)
- [Schema Reference](../reference/schema.md)