# Runtime Overview

The runtime (`@blankgrimoire/runtime`) is the declarative extraction engine that runs in:
- **JavaScriptCore** on iOS (via IIFE bundle `dist/runtime.js`)
- **Node.js** for testing (via ESM `dist/index.js`)

## Entry Points

### IIFE Bundle (for JSC)
```bash
# Built by: esbuild src/index.ts --bundle --format=iife --global-name=BlankGrimoireRuntime
dist/runtime.js  # Exposes global BlankGrimoireRuntime
```

### ESM (for Node tooling)
```ts
import { dispatch, extractSearch, ... } from '@blankgrimoire/runtime';
```

## Global API (IIFE)

```ts
interface BlankGrimoireRuntime {
  __apiVersion: 1;                    // Contract version
  
  // JSON dispatcher (primary entry point)
  dispatch(runtime: ThemeRuntimeOptions, method: string, argsJSON: string): Promise<string>;
  
  // Direct extraction functions (also exposed)
  extractSearch(runtime: ThemeRuntimeOptions, query: SearchQuery): Promise<PagedResult<MangaSummary>>;
  extractDetails(runtime: ThemeRuntimeOptions, key: string): Promise<MangaDetails>;
  extractChapters(runtime: ThemeRuntimeOptions, key: string): Promise<Chapter[]>;
  extractPages(runtime: ThemeRuntimeOptions, keys: PageKeys): Promise<Page[]>;
  
  // Prelude (native bridge bindings)
  __http(request: HttpRequest): Promise<HttpResponse>;
  __parseHTML(html: string): DocumentLike;
  __nativeInvoke(fn: string, ...args: unknown[]): unknown;
  __timerFire(id: number): void;
  setTimeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
  
  // Console (routes to native)
  console: { log, error, warn };
  
  // Strategy functions
  extractCss, extractScriptJSON, extractHydration, extractAjax;
  parseJSONText, readPath, runStrategy, toPages;
  
  // Utilities
  resolveSelectors, normalizeStatus, normalizeContentRating;
  
  // Types re-exported
  // ThemeRuntimeOptions, PageKeys, ExtractionResult, etc.
}
```

## Host Contract

The host (iOS app or test harness) **must** provide:

```ts
interface NativeHost {
  request?: (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;
  parseHTML?: (html: string) => DocumentLike;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  setTimeout?: (callback: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
}
```

Injected via `globalThis.__native = { ... }`.

### Required: `request` and `parseHTML`
- `request` — All network access; host enforces allowlist
- `parseHTML` — Returns `DocumentLike` (SwiftSoup on iOS, jsdom in tests)

### Optional: `setTimeout`/`clearTimeout`
If provided, runtime uses native timers; otherwise host must call `__timerFire(id)`.

## ThemeRuntimeOptions

```ts
interface ThemeRuntimeOptions {
  adapter: ThemeAdapter;           // defineTheme() output
  context: SiteContext;            // baseURL, siteName, overrides
  document: DocumentLike;          // Parsed HTML for current page
  window?: WindowLike;             // For hydration strategies
  parseHTML?: ParseHTML;           // Override for nested parsing (ajax)
}
```

## JSON Dispatcher

**Primary host entry point** — all exchange via JSON strings:

```ts
const result = await dispatch(runtime, 'search', JSON.stringify({ page: 1 }));
const data = JSON.parse(result) as PagedResult<MangaSummary>;
```

| Method | Aliases | Args | Returns |
|--------|---------|------|---------|
| `search` | — | `SearchQuery` | `PagedResult<MangaSummary>` |
| `details` | `getMangaDetails` | `{ key }` | `MangaDetails` |
| `chapters` | `getChapters` | `{ key }` | `Chapter[]` |
| `pages` | `getPages` | `{ mangaKey, chapterKey }` | `Page[]` |

## Extraction Pipeline

### 1. Search
```ts
// Declarative (ThemeSelectors.search)
for each item matching selectors.item:
  title = textOf(item.querySelector(selectors.title))
  href = attr(item.querySelector(selectors.link), 'href')
  key = resolveURL(href, baseURL)
  cover = readImageURL(item, selectors.cover, baseURL)
  → MangaSummary { key, title, coverURL? }

hasNextPage = document.querySelector(selectors.nextPage) !== null
```
**Hook precedence**: `adapter.hooks?.search(ctx, query)` runs first.

### 2. Details
```ts
// Declarative (ThemeSelectors.details)
details = {
  key,
  title: readText(doc, selectors.title) ?? key,
  status: normalizeStatus(readText(doc, selectors.status)),
  contentRating: normalizeContentRating(readText(doc, selectors.contentRating)),
  coverURL: readImageURL(doc, selectors.cover, baseURL),
  synopsis: readText(doc, selectors.synopsis),
  altTitles: splitList(readText(doc, selectors.altTitles)),
  authors: splitList(readText(doc, selectors.authors)),
  artists: splitList(readText(doc, selectors.artists)),
  tags: splitList(readText(doc, selectors.tags)),
  attribution: { siteName, siteURL, logoURL?, credits? }
}
```
**Hook**: `adapter.hooks?.getMangaDetails(ctx, key)`

### 3. Chapters
```ts
// Declarative (ThemeSelectors.chapters)
for each item matching selectors.item:
  href = attr(item.querySelector(selectors.link), 'href')
  key = resolveURL(href, baseURL)
  title = selectors.title ? readText(item, selectors.title) : textOf(link)
  number = parseChapterNumber(title)
  date = readText(item, selectors.date) → publishedAt
  → Chapter { key, title?, number?, publishedAt? }

Sort: if all have number → numeric sort (asc/desc)
       else → reverse for asc
```
**Hook**: `adapter.hooks?.getChapters(ctx, key)`

### 4. Pages (Strategies)
```ts
// ThemeSelectors.pages.strategies = ExtractionStrategy[]
for each strategy in order:
  pages = await runStrategy(strategy, document, { baseURL, window?, parseHTML? })
  if pages.length > 0: return pages
return []
```

## Strategy Types

### CSS Strategy
```ts
{ kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'], headers?: {...} }
```
- Finds all elements matching `image` selector
- Tries `srcAttributes` in order for each
- Returns `Page[]` with resolved absolute URLs

### ScriptJSON Strategy
```ts
{ kind: 'scriptJSON', pattern: 'window.__PAGES__', path: 'pages', base64?: false }
```
- Searches `<script>` elements (inline text or `src` fetch)
- Regex `pattern` matches script content or src
- Parses JSON, follows `path` (dot/bracket notation)
- Normalizes to `Page[]` via `toPages()`

### Hydration Strategy
```ts
{ kind: 'hydration', framework: 'next' | 'nuxt', path?: 'props.pageProps.pages' }
```
- Checks `window.__NEXT_DATA__` or `window.__NUXT__`
- Falls back to `#__NEXT_DATA__` / `#__NUXT_DATA__` script tags
- Follows optional `path` to page array

### AJAX Strategy
```ts
{ kind: 'ajax', method: 'GET', path: '/chapter/1', then: { kind: 'css', ... } }
```
- Fetches `path` (resolved against `baseURL`)
- Parses response HTML via `parseHTML`
- Runs nested `then` strategy on parsed document
- Max depth: 5 (prevents infinite loops)

## URL Resolution

**Self-contained** — no global `URL` constructor required (JavaScriptCore compatibility):

```ts
// Works without URL global
resolveURL('/pages/001.jpg', 'https://example.org/series/') 
// → 'https://example.org/pages/001.jpg'

resolveURL('../cover.jpg', 'https://example.org/series/chapter/')
// → 'https://example.org/cover.jpg'
```

Fallback order:
1. Native `URL` constructor (if available)
2. Pure JS resolver (RFC 3986 compliant)

## Status/Content Rating Normalization

```ts
normalizeStatus(text: string): MangaStatus
// 'ongoing', 'publishing', 'in progress' → 'ongoing'
// 'completed', 'finished', 'ended' → 'completed'
// 'hiatus', 'on hold', 'paused' → 'hiatus'
// 'cancelled', 'canceled', 'dropped' → 'cancelled'
// else → 'unknown'

normalizeContentRating(text: string): ContentRating
// 'safe', 'all ages', 'general' → 'safe'
// 'suggestive', 'teen', 'mature teen' → 'suggestive'
// 'mature', 'adult', 'explicit', '18+' → 'mature'
// else → 'unknown'
```

## Selector Overrides (Deep Merge)

```ts
// User provides partial overrides
overrides: {
  search: { title: '.custom-title' },      // Only replaces title
  details: { status: '.custom-status' },   // Only replaces status
  pages: { strategies: [...] }             // Replaces entire strategies array
}

// Result: field-by-field merge, siblings preserved
```

## Testing in Node

```ts
import { JSDOM } from 'jsdom';
import { dispatch, extractSearch } from '@blankgrimoire/runtime';

const dom = new JSDOM(html, { url: 'https://example.org/' });
const document = dom.window.document;

const runtime = {
  adapter,
  context: { baseURL: 'https://example.org/', siteName: 'Example', overrides: {} },
  document,
  window: dom.window,
};

const result = await dispatch(runtime, 'search', JSON.stringify({ page: 1 }));
```

## JavaScriptCore Compatibility

| Feature | JSC Status | Runtime Handling |
|---------|------------|------------------|
| `globalThis` | ✅ | Used for `__native` |
| `URL` | ❌ | Pure JS fallback |
| `fetch` | ❌ | Native `__http` |
| `DOM` | ❌ | `DocumentLike` via `__parseHTML` |
| `setTimeout` | ✅ | Native or `__timerFire` |
| `console` | ✅ | Routes to native |
| `JSON` | ✅ | Native |
| `RegExp` | ✅ | Native |
| `Map/Set` | ✅ | Native |
| `Promise` | ✅ | Native |
| `async/await` | ✅ | Native |
| `WeakRef` | ❌ | Not used |

## Performance Notes

- **Single-pass DOM traversal** where possible
- **Strategy short-circuit** — first matching strategy wins
- **No unnecessary allocations** — reuse arrays/objects
- **Streaming-friendly** — `__http` can be implemented with streaming

## Related Docs

- [Contract Overview](../contract/overview.md)
- [Testing Harness](../testing/overview.md)
- [CLI Build](../cli/overview.md)
- [Prelude API](../reference/prelude.md)