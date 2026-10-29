# Testing Adapters Locally

Complete guide to testing theme adapters in Node.js using the SDK testing utilities.

## Test Stack

| Tool | Purpose |
|------|---------|
| **vitest** | Test runner (fast, Vite-powered) |
| **JSDOM** | DOM simulation for unit tests |
| **VMHarness** | E2E test with real runtime bundle |
| **NativeBridge** | `__native` emulation with allowlist |
| **MockServer** | Loopback HTTP server for network simulation |

## Setup

```bash
pnpm add -D @blankgrimoire/testing vitest jsdom
# Peer deps: @blankgrimoire/runtime @blankgrimoire/types
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

## Unit Tests (JSDOM + Runtime Functions)

Test individual extraction functions without the full bundle.

```ts
// src/selectors.test.ts
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { extractSearch, extractDetails } from '@blankgrimoire/runtime';
import adapter from './index.js';

const html = `<!DOCTYPE html>
<html>
<body>
  <div class="result">
    <a href="/series/test"><span class="result-title">Test</span></a>
    <img class="cover" src="/covers/test.jpg" />
  </div>
  <h1 class="series-title">Test Series</h1>
  <div class="series-cover"><img src="/covers/test.jpg" /></div>
  <p class="series-synopsis">Synopsis</p>
  <p class="series-status">Ongoing</p>
  <p class="series-rating">Safe</p>
</body>
</html>`;

const dom = new JSDOM(html, { url: 'https://example.org/' });
const document = dom.window.document;

const runtime = {
  adapter,
  context: { baseURL: 'https://example.org/', siteName: 'Test', overrides: {} },
  document,
  window: dom.window,
};

describe('Unit: extractSearch', () => {
  it('extracts search results', async () => {
    const result = await extractSearch(runtime, { page: 1 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Test');
    expect(result.items[0].key).toBe('https://example.org/series/test');
  });
});

describe('Unit: extractDetails', () => {
  it('normalizes status and rating', async () => {
    const details = await extractDetails(runtime, 'test-key');
    expect(details.status).toBe('ongoing');
    expect(details.contentRating).toBe('safe');
  });
});
```

## Integration Tests (VMHarness)

Test the **exact same bundle** that runs on iOS.

```ts
// src/adapter.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VMHarness } from '@blankgrimoire/testing';
import adapter from './index.js';

const runtimeIIFE = readFileSync(
  'node_modules/@blankgrimoire/runtime/dist/runtime.js',
  'utf8',
);

const harness = new VMHarness(
  ['example.org'],
  runtimeIIFE,
  adapter,  // or { default: adapter }
);

const testHTML = `<!DOCTYPE html>
<html>
<head><meta name="generator" content="TestCMS 1.0"></head>
<body>
  <div class="test-reader">
    <div class="search-result">
      <a href="/series/abc"><span class="title">Series ABC</span></a>
      <img src="/covers/abc.jpg" />
    </div>
    <h1 class="series-title">Series ABC</h1>
    <div class="cover"><img src="/covers/abc.jpg" /></div>
    <p class="synopsis">Description</p>
    <p class="status">Completed</p>
    <p class="rating">Mature</p>
    <ul class="chapters">
      <li><a href="/series/abc/ch-2"><span class="ch-title">Ch 2</span></a></li>
      <li><a href="/series/abc/ch-1"><span class="ch-title">Ch 1</span></a></li>
    </ul>
    <div class="reader">
      <img data-src="/pages/1.jpg" />
      <img src="/pages/2.jpg" />
    </div>
  </div>
</body>
</html>`;

describe('Integration: VMHarness', () => {
  it('detects theme and extracts all data', async () => {
    const result = await harness.testTheme(testHTML, 'https://example.org/', {
      mangaKey: 'series-abc',
    });

    expect(result.detected).toBe(true);
    expect(result.search?.items[0].title).toBe('Series ABC');
    expect(result.details?.title).toBe('Series ABC');
    expect(result.details?.status).toBe('completed');
    expect(result.details?.contentRating).toBe('mature');
    expect(result.chapters).toHaveLength(2);
    expect(result.chapters?.[0].title).toBe('Ch 2');  // desc order
    expect(result.pages).toHaveLength(2);
  });
});
```

## Network Tests (NativeBridge + MockServer)

Test HTTP allowlist, redirects, and real network behavior.

```ts
// src/network.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockServer } from '@blankgrimoire/testing';
import { NativeBridge } from '@blankgrimoire/testing';

const server = new MockServer();
let baseURL = '';

beforeAll(async () => {
  server.register('/ok', async () => ({
    status: 200,
    headers: { 'content-type': 'text/html' },
    body: '<html><body>OK</body></html>',
  }));
  server.register('/redirect', async () => ({
    status: 302,
    headers: { location: '/final' },
    body: '',
  }));
  server.register('/final', async () => ({
    status: 200,
    headers: { 'content-type': 'text/plain' },
    body: 'final',
  }));
  server.register('/offsite', async () => ({
    status: 302,
    headers: { location: 'https://evil.com/' },
    body: '',
  }));
  await server.start();
  baseURL = `http://127.0.0.1:${server.port}`;
});

afterAll(async () => {
  await server.stop();
});

describe('NativeBridge', () => {
  it('allows requests to allowlisted hosts', async () => {
    const bridge = new NativeBridge(['127.0.0.1']);
    const res = await bridge.request({ url: `${baseURL}/ok` });
    expect(res.status).toBe(200);
  });

  it('rejects offsite redirects', async () => {
    const bridge = new NativeBridge(['127.0.0.1']);
    await expect(bridge.request({ url: `${baseURL}/offsite` }))
      .rejects.toThrow(/Host not allowed by allowlist/);
  });

  it('follows onsite redirects', async () => {
    const bridge = new NativeBridge(['127.0.0.1']);
    const res = await bridge.request({ url: `${baseURL}/redirect` });
    expect(res.url).toBe(`${baseURL}/final`);
    expect(res.body).toBe('final');
  });
});
```

## Full E2E: VMHarness + MockServer

```ts
// src/e2e.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockServer } from '@blankgrimoire/testing';
import { readFileSync } from 'node:fs';
import { VMHarness } from '@blankgrimoire/testing';
import adapter from './index.js';

const server = new MockServer();
let baseURL = '';

beforeAll(async () => {
  server.register('/search', async () => ({
    status: 200,
    headers: { 'content-type': 'text/html' },
    body: searchHTML,
  }));
  server.register('/series/1', async () => ({
    status: 200,
    headers: { 'content-type': 'text/html' },
    body: detailsHTML,
  }));
  server.register('/series/1/ch-1', async () => ({
    status: 200,
    headers: { 'content-type': 'text/html' },
    body: chapterHTML,
  }));
  await server.start();
  baseURL = `http://127.0.0.1:${server.port}`;
});

afterAll(async () => {
  await server.stop();
});

const runtimeIIFE = readFileSync(
  'node_modules/@blankgrimoire/runtime/dist/runtime.js',
  'utf8',
);

const harness = new VMHarness(
  [`127.0.0.1:${server.port}`],
  runtimeIIFE,
  adapter,
);

describe('Full E2E', () => {
  it('flows through search → details → chapters → pages', async () => {
    const result = await harness.testTheme(
      searchHTML,
      baseURL + '/',
      { mangaKey: 'series-1' },
    );

    expect(result.search?.items[0].key).toBe(`${baseURL}/series/1`);
    expect(result.details?.key).toBe('series-1');
    expect(result.chapters).toHaveLength(1);
    expect(result.pages).toHaveLength(2);
  });
});
```

## Hook Testing

```ts
// src/hooks.test.ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { VMHarness } from '@blankgrimoire/testing';

const runtimeIIFE = readFileSync(
  'node_modules/@blankgrimoire/runtime/dist/runtime.js',
  'utf8',
);

const hookedAdapter = {
  id: 'theme.hook-test',
  name: 'Hook Test',
  version: '1.0.0',
  detectionSignature: { selectors: ['.hook-test'], minScore: 1 },
  selectors: {
    search: { path: '/', item: '.item', title: '.title', link: 'a' },
    details: { title: 'h1' },
    chapters: { item: '.ch', link: 'a', order: 'desc' },
    pages: { strategies: [{ kind: 'css', image: 'img', srcAttributes: ['src'] }] },
  },
  hooks: {
    search: async () => ({
      items: [{ key: 'hooked', title: 'Hooked Search' }],
      hasNextPage: false,
    }),
    getMangaDetails: async () => ({
      key: 'hooked',
      title: 'Hooked Details',
      status: 'completed',
      contentRating: 'safe',
    }),
    getChapters: async () => [{ key: 'ch1', title: 'Hooked Chapter' }],
    getPages: async () => [{ index: 0, imageURL: 'https://example.org/hook.jpg' }],
  },
};

const harness = new VMHarness(['example.org'], runtimeIIFE, { default: hookedAdapter });

describe('Hooks take precedence', () => {
  it('uses hook for search', async () => {
    const result = await harness.testTheme(
      '<html><body><div class="hook-test"></div></body></html>',
      'https://example.org/',
    );
    expect(result.search?.items[0].title).toBe('Hooked Search');
  });

  it('uses hook for details', async () => {
    const result = await harness.testTheme(
      '<html><body><div class="hook-test"></div></body></html>',
      'https://example.org/',
      { mangaKey: 'test' },
    );
    expect(result.details?.title).toBe('Hooked Details');
  });
});
```

## Detection Signature Testing

```ts
describe('Detection scoring', () => {
  it('scores metaGenerator', async () => {
    const html = '<html><head><meta name="generator" content="TestCMS 2.0"></head><body></body></html>';
    const result = await harness.testTheme(html, 'https://example.org/');
    // metaGenerator match = +3
  });

  it('scores selectors', async () => {
    const html = '<html><body><div class="test-reader"></div></body></html>';
    const result = await harness.testTheme(html, 'https://example.org/');
    // Each matching selector = +2
  });

  it('scores probePaths via MockServer', async () => {
    server.register('/health', async () => ({ status: 200, headers: {}, body: 'ok' }));
    const html = '<html><head><meta name="generator" content="TestCMS"></head><body></body></html>';
    const result = await harness.testTheme(html, baseURL + '/');
    // Each successful probe = +3
  });
});
```

## Running Tests

```bash
# Unit + integration
pnpm test

# Watch mode
pnpm vitest watch

# Coverage
pnpm vitest run --coverage

# Single test file
pnpm vitest run src/adapter.test.ts
```

## CI Configuration

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @blankgrimoire/runtime build
      - run: pnpm test
```

## Best Practices

1. **Unit test selectors** — Fast, no bundle needed
2. **Integration test with VMHarness** — Catches bundle/runtime issues
3. **MockServer for network** — Deterministic, no flakiness
4. **Test hooks separately** — Verify precedence
5. **Test detection edge cases** — Just-below-threshold, missing fields
6. **Use `example.org` only** — Never real domains

## Related Docs

- [VMHarness API](../reference/vm-harness.md)
- [NativeBridge API](../reference/native-bridge.md)
- [Runtime Overview](../runtime/overview.md)
- [Writing Selectors](writing-selectors.md)