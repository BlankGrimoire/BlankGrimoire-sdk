# @blankgrimoire/testing API Reference

## Exports

```ts
import {
  NativeBridge,
  type NativeRequestOptions,
  type NativeResponse,
  type NativeParseResult,
  MockServer,
  isAllowed,
  hostFromInput,
  VMHarness,
  type ThemeTestOptions,
  type ThemeTestResult,
} from '@blankgrimoire/testing';
```

## NativeBridge

```ts
class NativeBridge {
  constructor(allowedHosts: string[]);
  
  async request(options: NativeRequestOptions): Promise<NativeResponse>;
  parseHTML(html: string): NativeParseResult;
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  setTimeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
}
```

### Constructor

```ts
new NativeBridge(allowedHosts: string[]);
// allowedHosts: bare hosts ('example.org') or full URLs ('https://www.example.org/path')
// Case-insensitive, subdomain-aware
```

### `request(options)`

```ts
interface NativeRequestOptions {
  url: string;                    // Full URL or bare host
  method?: 'GET' | 'POST';        // Default: 'GET'
  headers?: Record<string, string>;
  body?: string;
}

interface NativeResponse {
  status: number;
  url: string;                    // Final URL after redirects
  headers: Record<string, string>;
  body: string;
}
```

**Behavior**:
- Validates `url` against allowlist (normalizes input)
- Follows redirects (max 5), **revalidating each target** against allowlist
- Converts POST→GET on 301/302/303 redirects
- Only `http:` and `https:` protocols allowed
- Throws `E_ALLOWLIST_DENIED`, `E_REDIRECT_DENIED`, `E_UNSUPPORTED_PROTOCOL`

### `parseHTML(html)`

```ts
type NativeParseResult = DocumentLike;  // From @blankgrimoire/runtime

bridge.parseHTML(html: string): NativeParseResult;
// Returns jsdom document implementing DocumentLike
```

### `setTimeout` / `clearTimeout`

```ts
bridge.setTimeout(cb: () => void, ms: number): number;
bridge.clearTimeout(id: number): void;
// Wraps native setTimeout/clearTimeout; unrefs timer
```

### Logging

```ts
bridge.log(...args: unknown[]): void;
bridge.error(...args: unknown[]): void;
bridge.warn(...args: unknown[]): void;
// Delegates to console
```

## Allowlist Utilities

### `hostFromInput(input)`

```ts
function hostFromInput(input: string): string | null;
// Extracts hostname from URL or bare host
// Returns lowercase hostname, or null if invalid

hostFromInput('https://www.example.org/path');  // 'www.example.org'
hostFromInput('example.org');                    // 'example.org'
hostFromInput('http://127.0.0.1:8080/');         // '127.0.0.1'
hostFromInput('not a url');                      // null
```

### `isAllowed(input, allowedHosts)`

```ts
function isAllowed(input: string, allowedHosts: string[]): boolean;
// Checks if input host is allowed
// allowedHosts entries can be bare hosts or full URLs (normalized)
// Matching: exact or subdomain (example.org allows www.example.org)
// Case-insensitive

isAllowed('https://www.example.org/', ['example.org']);        // true
isAllowed('api.example.org', ['example.org']);                 // true
isAllowed('example.org', ['https://www.example.org/path']);    // true (entry normalized)
isAllowed('evil.com', ['example.org']);                        // false
isAllowed('example.org.evil.com', ['example.org']);            // false
```

## MockServer

```ts
class MockServer {
  constructor();
  register(path: string, handler: RouteHandler): void;
  async start(): Promise<void>;
  async stop(): Promise<void>;
  get port(): number;
  get isStarted(): boolean;
}

type RouteHandler = (req: http.IncomingMessage) => Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}>;
```

### Usage

```ts
const server = new MockServer();

server.register('/api/search', async (req) => ({
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ results: [...] }),
}));

server.register('/redirect', async () => ({
  status: 302,
  headers: { location: '/final' },
  body: '',
}));

await server.start();
// server.port → 127.0.0.1:<port>

await server.stop();
```

**Notes**:
- Binds to `127.0.0.1` (loopback only)
- Random port assigned on `start()`
- Path matching is exact (no wildcards)
- Method not filtered (handler receives full `IncomingMessage`)

## VMHarness

```ts
class VMHarness {
  constructor(
    allowedHosts: string[],
    runtimeIIFE: string,
    adapterModule: { default: ThemeAdapter } | ThemeAdapter
  );
  
  async testTheme(
    html: string,
    url = 'https://example.org/',
    options: ThemeTestOptions = {}
  ): Promise<ThemeTestResult>;
  
  getNativeBridge(): NativeBridge;
}
```

### Constructor

```ts
new VMHarness(
  allowedHosts: string[],           // Allowlist for NativeBridge
  runtimeIIFE: string,              // Content of dist/runtime.js
  adapterModule: ThemeAdapter | { default: ThemeAdapter }
);
// Loads runtimeIIFE in isolated node:vm context
// Verifies BlankGrimoireRuntime.__apiVersion === API_VERSION (1)
// Verifies dispatch function exists
// Injects NativeBridge as __native
```

### `testTheme(html, url, options)`

```ts
interface ThemeTestOptions {
  mangaKey?: string;           // Default: 'lorem-ipsum'
  chapterKey?: string;         // Default: first chapter key
  searchQuery?: SearchQuery;   // Default: { page: 1 }
}

interface ThemeTestResult {
  detected: boolean;           // Score >= minScore
  score: number;               // Detection score
  detectionSignature: ThemeSignature;
  selectors: ThemeSelectors;
  search?: PagedResult<MangaSummary>;
  details?: MangaDetails;
  chapters?: Chapter[];
  pages?: Page[];
}

// If not detected: returns only detection data (search/details/chapters/pages undefined)
```

### `getNativeBridge()`

```ts
harness.getNativeBridge(): NativeBridge;
// Returns the internal NativeBridge for custom network mocks
```

## ThemeTestResult Details

```ts
{
  detected: true,
  score: 7,
  detectionSignature: { metaGenerator: '^TestCMS', selectors: ['.test'], minScore: 3 },
  selectors: { search: {...}, details: {...}, chapters: {...}, pages: {...} },
  search: { items: [{ key, title, coverURL? }], hasNextPage: false },
  details: { key, title, status, contentRating, ... },
  chapters: [{ key, title?, number?, publishedAt? }],
  pages: [{ index: 0, imageURL, headers? }, ...]
}
```

## Complete Example

```ts
import { readFileSync } from 'node:fs';
import { VMHarness, MockServer } from '@blankgrimoire/testing';
import type { ThemeAdapter } from '@blankgrimoire/types';

const runtimeIIFE = readFileSync(
  'node_modules/@blankgrimoire/runtime/dist/runtime.js',
  'utf8',
);

const adapter: ThemeAdapter = {
  id: 'theme.example',
  name: 'Example',
  version: '1.0.0',
  detectionSignature: { selectors: ['.example'], minScore: 2 },
  selectors: {
    search: { path: '/search', item: '.result', title: '.title', link: 'a' },
    details: { title: 'h1', status: '.status', contentRating: '.rating' },
    chapters: { item: '.chapter', link: 'a', order: 'desc' },
    pages: { strategies: [{ kind: 'css', image: '.reader img', srcAttributes: ['src'] }] },
  },
};

const server = new MockServer();
server.register('/search', async () => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: '<html><body><div class="example"><div class="result"><a href="/s/1"><span class="title">Series 1</span></a></div></div></body></html>',
}));
server.register('/s/1', async () => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: '<html><body><div class="example"><h1>Series 1</h1><p class="status">Ongoing</p><p class="rating">Safe</p><ul class="chapters"><li class="chapter"><a href="/s/1/c1">Ch 1</a></li></ul><div class="reader"><img src="/p/1.jpg" /><img src="/p/2.jpg" /></div></div></body></html>',
}));
await server.start();

const harness = new VMHarness(
  [`127.0.0.1:${server.port}`],
  runtimeIIFE,
  adapter,
);

const result = await harness.testTheme(
  '<html><body><div class="example">...</div></body></html>',
  `http://127.0.0.1:${server.port}/`,
  { mangaKey: 'series-1' },
);

console.log(result.search);    // { items: [{ key: 'http://127.0.0.1:PORT/s/1', title: 'Series 1' }], hasNextPage: false }
console.log(result.details);   // { key: 'series-1', title: 'Series 1', status: 'ongoing', contentRating: 'safe' }
console.log(result.chapters);  // [{ key: 'http://127.0.0.1:PORT/s/1/c1', title: 'Ch 1' }]
console.log(result.pages);     // [{ index: 0, imageURL: 'http://127.0.0.1:PORT/p/1.jpg' }, ...]

await server.stop();
```

## Related Docs

- [Testing Guide](../guides/testing-adapters.md)
- [Runtime API](../reference/runtime-api.md)
- [Architecture: Bridge Protocol](../architecture/overview.md)