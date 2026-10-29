# @blankgrimoire/runtime API Reference

## ESM Exports (Node)

```ts
import {
  // Prelude (native bridge bindings)
  __apiVersion,
  __http,
  __parseHTML,
  __nativeInvoke,
  __timerFire,
  setTimeout,
  clearTimeout,
  console,
  type HttpRequest,
  type HttpResponse,
  
  // Engine
  dispatch,
  extractSearch,
  extractDetails,
  extractChapters,
  extractPages,
  extract,
  normalizeStatus,
  normalizeContentRating,
  resolveSelectors,
  type ThemeRuntimeOptions,
  type PageKeys,
  type ExtractionResult,
  
  // CSS Strategy
  extractCss,
  type CssStrategy,
  
  // Strategies
  extractScriptJSON,
  extractHydration,
  extractAjax,
  parseJSONText,
  readPath,
  runStrategy,
  toPages,
  type ScriptJSONStrategy,
  type HydrationStrategy,
  type AjaxStrategy,
  type StrategyEnvironment,
  
  // DOM
  type DocumentLike,
  type ElementLike,
  type ParseHTML,
  type WindowLike,
} from '@blankgrimoire/runtime';
```

## IIFE Global (JSC)

```ts
// Available as global BlankGrimoireRuntime after loading dist/runtime.js
interface BlankGrimoireRuntime {
  __apiVersion: 1;
  
  // JSON dispatcher (primary entry point)
  dispatch(runtime: ThemeRuntimeOptions, method: string, argsJSON: string): Promise<string>;
  
  // Direct extraction
  extractSearch(runtime: ThemeRuntimeOptions, query: SearchQuery): Promise<PagedResult<MangaSummary>>;
  extractDetails(runtime: ThemeRuntimeOptions, key: string): Promise<MangaDetails>;
  extractChapters(runtime: ThemeRuntimeOptions, key: string): Promise<Chapter[]>;
  extractPages(runtime: ThemeRuntimeOptions, keys: PageKeys): Promise<Page[]>;
  
  // Prelude
  __http(request: HttpRequest): Promise<HttpResponse>;
  __parseHTML(html: string): DocumentLike;
  __nativeInvoke(fn: string, ...args: unknown[]): unknown;
  __timerFire(id: number): void;
  setTimeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
  
  // Console (routes to __native)
  console: { log, error, warn };
  
  // Strategies
  extractCss, extractScriptJSON, extractHydration, extractAjax;
  parseJSONText, readPath, runStrategy, toPages;
  
  // Engine utilities
  resolveSelectors, normalizeStatus, normalizeContentRating;
  
  // Types (TypeScript only)
}
```

## Prelude (Native Bridge)

### `__http(request)`
```ts
function __http(request: HttpRequest): Promise<HttpResponse>;
// Delegates to __native.request(); throws if not implemented
```

### `__parseHTML(html)`
```ts
function __parseHTML(html: string): DocumentLike;
// Delegates to __native.parseHTML(); falls back to document.implementation.createHTMLDocument()
```

### `__nativeInvoke(fn, ...args)`
```ts
function __nativeInvoke(fn: string, ...args: unknown[]): unknown;
// Calls __native[fn](...args); throws if not implemented
```

### Timers
```ts
function setTimeout(cb: () => void, ms: number): number;
// If __native.setTimeout exists → schedules natively, returns id
// Else → stores callback, host must call __timerFire(id)

function clearTimeout(id: number): void;
// Clears stored callback; calls __native.clearTimeout if available

function __timerFire(id: number): void;
// Called by host when native timer fires; executes and removes callback
```

### Console
```ts
const console = {
  log: (...args) => __native.log?.(...args),
  error: (...args) => __native.error?.(...args),
  warn: (...args) => __native.warn?.(...args),
};
```

## Engine

### `dispatch(runtime, method, argsJSON)`
```ts
async function dispatch(
  runtime: ThemeRuntimeOptions,
  method: string,
  argsJSON: string
): Promise<string>;
// Primary host entry point; all exchange via JSON strings
// Methods: 'search' | 'details' | 'getMangaDetails' | 'chapters' | 'getChapters' | 'pages' | 'getPages'
```

### `extractSearch(runtime, query)`
```ts
async function extractSearch(
  runtime: ThemeRuntimeOptions,
  query: SearchQuery
): Promise<PagedResult<MangaSummary>>;
// Hook: adapter.hooks?.search(ctx, query) takes precedence
```

### `extractDetails(runtime, key)`
```ts
async function extractDetails(
  runtime: ThemeRuntimeOptions,
  key: string
): Promise<MangaDetails>;
// Hook: adapter.hooks?.getMangaDetails(ctx, key)
```

### `extractChapters(runtime, key)`
```ts
async function extractChapters(
  runtime: ThemeRuntimeOptions,
  key: string
): Promise<Chapter[]>;
// Hook: adapter.hooks?.getChapters(ctx, key)
```

### `extractPages(runtime, keys)`
```ts
async function extractPages(
  runtime: ThemeRuntimeOptions,
  keys: PageKeys
): Promise<Page[]>;
// Hook: adapter.hooks?.getPages(ctx, mangaKey, chapterKey)
// Runs strategies in order; first with pages wins
```

### `normalizeStatus(text)`
```ts
function normalizeStatus(text: string): MangaStatus;
// 'ongoing'/'publishing'/'in progress' → 'ongoing'
// 'completed'/'finished'/'ended' → 'completed'
// 'hiatus'/'on hold'/'paused' → 'hiatus'
// 'cancelled'/'canceled'/'dropped' → 'cancelled'
// else → 'unknown'
```

### `normalizeContentRating(text)`
```ts
function normalizeContentRating(text: string): ContentRating;
// 'safe'/'all ages'/'general' → 'safe'
// 'suggestive'/'teen'/'mature teen' → 'suggestive'
// 'mature'/'adult'/'explicit'/'18+' → 'mature'
// else → 'unknown'
```

### `resolveSelectors(base, overrides)`
```ts
function resolveSelectors(
  base: ThemeSelectors,
  overrides: ThemeSelectorsOverrides
): ThemeSelectors;
// Deep-partial merge; field-by-field; siblings preserved
```

## Strategies

### `runStrategy(strategy, document, environment, depth?)`
```ts
async function runStrategy(
  strategy: unknown,
  document: DocumentLike,
  environment: StrategyEnvironment,
  depth = 0
): Promise<Page[]>;
// Dispatches by strategy.kind: 'css' | 'scriptJSON' | 'hydration' | 'ajax'
// Returns [] if no match; max depth 5 for ajax
```

### `extractCss(strategy, document, baseURL)`
```ts
function extractCss(
  strategy: CssStrategy,
  document: DocumentLike,
  baseURL: string
): Page[];
// Finds all elements matching strategy.image
// Tries srcAttributes in order
// Returns Page[] with resolved absolute URLs
```

### `extractScriptJSON(strategy, document, baseURL, parseHTML?)`
```ts
async function extractScriptJSON(
  strategy: ScriptJSONStrategy,
  document: DocumentLike,
  baseURL: string,
  parseHTML?: ParseHTML
): Promise<Page[]>;
// Searches <script> elements matching pattern
// Fetches external scripts via __http if src matches
// Parses JSON (handles window.__DATA__ = {...})
// Follows path (dot/bracket notation)
// Normalizes via toPages()
```

### `extractHydration(strategy, document, baseURL, windowObj?)`
```ts
function extractHydration(
  strategy: HydrationStrategy,
  document: DocumentLike,
  baseURL: string,
  windowObj?: WindowLike
): Page[];
// Checks window.__NEXT_DATA__ / window.__NUXT__
// Falls back to #__NEXT_DATA__ / #__NUXT_DATA__ script tags
// Follows optional path
```

### `extractAjax(strategy, document, environment, depth)`
```ts
async function extractAjax(
  strategy: AjaxStrategy,
  document: DocumentLike,
  environment: StrategyEnvironment,
  depth = 0
): Promise<Page[]>;
// Fetches path (resolved vs baseURL) via __http
// Parses response HTML via parseHTML
// Runs nested 'then' strategy on parsed document
// Max depth 5
```

### `parseJSONText(text)`
```ts
function parseJSONText(text: string): unknown;
// Tries JSON.parse first
// Then finds first balanced {...} or [...] in text
// Handles nested braces/brackets and strings
```

### `readPath(value, path)`
```ts
function readPath(value: unknown, path: string): unknown;
// Dot/bracket path: 'props.pageProps.pages[0].url'
// Returns undefined if any segment missing
```

### `toPages(payload, baseURL, headers?)`
```ts
function toPages(
  payload: unknown,
  baseURL: string,
  headers?: Record<string, string>
): Page[];
// Normalizes string[] or object[] to Page[]
// Accepts: imageURL, url, src, image properties
// Resolves relative URLs
```

## DOM Types

```ts
interface DocumentLike {
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
  documentElement?: ElementLike | null;
  implementation?: { createHTMLDocument(title?: string): DocumentLike };
}

interface ElementLike {
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
  getAttribute(name: string): string | null;
  textContent: string | null;
  innerHTML?: string;
}

interface WindowLike {
  __NEXT_DATA__?: unknown;
  __NUXT__?: unknown;
}

type ParseHTML = (html: string) => DocumentLike;
```

## ThemeRuntimeOptions

```ts
interface ThemeRuntimeOptions {
  adapter: ThemeAdapter;
  context: SiteContext;
  document: DocumentLike;
  window?: WindowLike;
  parseHTML?: ParseHTML;  // For nested parsing (ajax)
}
```

## PageKeys

```ts
interface PageKeys {
  mangaKey: string;
  chapterKey: string;
}
```

## ExtractionResult

```ts
type ExtractionResult = Page[];
```

## Utility Functions

```ts
function resolveURL(value: string, baseURL: string): string;
// Self-contained URL resolver (no global URL required)
// Handles: absolute, protocol-relative, root-relative, relative, query, fragment
// Normalizes dot segments (../ ./)

function attr(element: ElementLike, name: string): string | null;
// Returns trimmed attribute or null if empty/missing

function firstAttribute(element: ElementLike, names: string[]): string | null;
// Returns first non-empty attribute from list

function queryAll(root: DocumentLike | ElementLike, selector: string): ElementLike[];
// Array.from(root.querySelectorAll(selector))

function textOf(element: ElementLike | null | undefined): string;
// Returns trimmed textContent or ''

function splitList(value: string | undefined): string[] | undefined;
// Splits by , | \n, trims, filters empty

function parseChapterNumber(value: string | undefined): number | undefined;
// Extracts first (\d+(?:\.\d+)?) from string
```

## Related Docs

- [Runtime Overview](../runtime/overview.md)
- [Testing API](../reference/testing-api.md)
- [Contract Overview](../contract/overview.md)