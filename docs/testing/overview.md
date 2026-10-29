# Testing Overview

The `@blankgrimoire/testing` package provides Node.js utilities for testing theme adapters without iOS:

- **NativeBridge** — Emulates the `__native` bridge with HTTP allowlist
- **MockServer** — Loopback HTTP server for synthetic responses
- **VMHarness** — Loads real `dist/runtime.js` IIFE in `node:vm` for E2E tests

## Installation

```bash
pnpm add -D @blankgrimoire/testing
# Peer dependencies: @blankgrimoire/runtime, @blankgrimoire/types
```

## NativeBridge

Emulates `__native` with allowlist enforcement and redirect revalidation.

### Allowlist Semantics
- Accepts bare hosts (`example.org`) **or full URLs** (`https://www.example.org/path`)
- Case-insensitive, subdomain-aware (`example.org` allows `www.example.org`)
- **Every redirect target revalidated** against allowlist
- Only `http:` and `https:` protocols allowed

```ts
import { NativeBridge } from '@blankgrimoire/testing';

const bridge = new NativeBridge(['example.org', '127.0.0.1']);

// Request with full URL
const response = await bridge.request({
  url: 'https://www.example.org/search?q=lorem',
  method: 'GET',
  headers: { 'Accept': 'text/html' },
});

// parseHTML returns DocumentLike (jsdom-backed)
const document = bridge.parseHTML('<html><body><h1>Title</h1></body></html>');
const title = document.querySelector('h1')?.textContent; // 'Title'
```

### Timer Support
```ts
const id = bridge.setTimeout(() => console.log('fired'), 100);
bridge.clearTimeout(id);
```

### Logging
```ts
bridge.log('info', 1, { meta: 'data' });
bridge.error('error', 2, { code: 'ERR' });
bridge.warn('warn', 3);
```

## MockServer

Loopback HTTP server bound to `127.0.0.1` for deterministic tests.

```ts
import { MockServer } from '@blankgrimoire/testing';

const server = new MockServer();

server.register('/search', async (req) => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: '<html><body><div class="result">...</div></body></html>',
}));

server.register('/redirect', async () => ({
  status: 302,
  headers: { location: '/final' },
  body: '',
}));

server.register('/final', async () => ({
  status: 200,
  headers: { 'content-type': 'text/plain' },
  body: 'final content',
}));

await server.start();
// server.port → 127.0.0.1:<port>

const bridge = new NativeBridge([`127.0.0.1:${server.port}`]);
const response = await bridge.request({ url: `http://127.0.0.1:${server.port}/search` });

await server.stop();
```

## VMHarness

**E2E test harness** — loads the actual `dist/runtime.js` IIFE bundle in an isolated `node:vm` context.

### Why VMHarness?
- Tests the **exact same bundle** that runs on iOS
- Verifies `__apiVersion === API_VERSION`
- Uses real JSON dispatcher (`dispatch`)
- Integrates NativeBridge for network simulation

```ts
import { readFileSync } from 'node:fs';
import { VMHarness } from '@blankgrimoire/testing';
import type { ThemeAdapter } from '@blankgrimoire/types';

// Load the real runtime bundle
const runtimeIIFE = readFileSync(
  'node_modules/@blankgrimoire/runtime/dist/runtime.js',
  'utf8',
);

const adapter: ThemeAdapter = {
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: { selectors: ['.example-reader'], minScore: 2 },
  selectors: { /* ... */ },
};

const harness = new VMHarness(
  ['example.org'],           // Allowlist
  runtimeIIFE,               // Real bundle
  adapter,                   // Or { default: adapter }
);

const result = await harness.testTheme(html, 'https://example.org/', {
  mangaKey: 'lorem-ipsum',
  chapterKey: 'chapter-1',
  searchQuery: { page: 1, text: 'lorem' },
});

if (result.detected) {
  console.log('Search:', result.search);
  console.log('Details:', result.details);
  console.log('Chapters:', result.chapters);
  console.log('Pages:', result.pages);
}
```

### ThemeTestResult
```ts
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
```

### Hook Precedence Test
```ts
const hookedAdapter: ThemeAdapter = {
  ...declarativeAdapter,
  hooks: {
    search: async () => ({ items: [{ key: 'x', title: 'Hooked' }], hasNextPage: false }),
    getMangaDetails: async () => ({ key: 'x', title: 'Hooked', status: 'completed', contentRating: 'safe' }),
    getChapters: async () => [{ key: 'x', title: 'Ch1' }],
    getPages: async () => [{ index: 0, imageURL: 'https://example.org/hook.jpg' }],
  },
};

const harness = new VMHarness(['example.org'], runtimeIIFE, { default: hookedAdapter });
const result = await harness.testTheme(html, 'https://example.org/');
// result.search.items[0].title === 'Hooked'  ← hook wins
```

### Non-Detected Theme
```ts
const result = await harness.testTheme(
  '<html><head><meta name="generator" content="OtherCMS"></head><body></body></html>',
  'https://example.org/',
);
result.detected === false;     // true
result.score === 0;            // true
result.search === undefined;   // true
```

### Access NativeBridge for Network Mocks
```ts
const bridge = harness.getNativeBridge();
// Use with MockServer for full network simulation
```

## Test Patterns

### Unit Tests (Declarative Only)
```ts
import { extractSearch, extractDetails } from '@blankgrimoire/runtime';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(html, { url: 'https://example.org/' });
const document = dom.window.document;

const runtime = { adapter, context, document, window: dom.window };
const result = await extractSearch(runtime, { page: 1 });
```

### Integration Tests (VMHarness + MockServer)
```ts
const server = new MockServer();
server.register('/search', async () => ({ status: 200, headers: {}, body: searchHTML }));
server.register('/series/1', async () => ({ status: 200, headers: {}, body: detailsHTML }));
await server.start();

const harness = new VMHarness(
  [`127.0.0.1:${server.port}`],
  runtimeIIFE,
  adapter,
);

const result = await harness.testTheme(
  searchHTML,
  `http://127.0.0.1:${server.port}/`,
  { mangaKey: 'series-1' }
);

await server.stop();
```

### Detection Signature Testing
```ts
const harness = new VMHarness(['example.org'], runtimeIIFE, adapter);

// Test metaGenerator
const htmlWithGen = '<html><head><meta name="generator" content="ExampleCMS v2"></head><body></body></html>';
const result = await harness.testTheme(htmlWithGen, 'https://example.org/');
// result.score includes +3 for generator match

// Test probePaths
server.register('/probe', async () => ({ status: 200, headers: {}, body: 'ok' }));
// result.score includes +3 for successful probe
```

## Running Tests

```bash
# In @blankgrimoire/testing
pnpm test

# Requires @blankgrimoire/runtime built first (pretest handles this)
```

## Related Docs

- [Runtime Engine](../runtime/overview.md)
- [Contract Overview](../contract/overview.md)
- [NativeBridge API](../reference/native-bridge.md)
- [VMHarness API](../reference/vm-harness.md)