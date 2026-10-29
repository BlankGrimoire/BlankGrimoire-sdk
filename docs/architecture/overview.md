# Architecture Overview

## High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        iOS App (Swift)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ AdapterStore│  │  JSContext  │  │  Native     │             │
│  │ (index.json)│  │  (JSC)      │  │  Bridge     │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Native Bridge                         │   │
│  │  request()  parseHTML()  setTimeout()  log()             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Adapter Bundle (IIFE)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BlankGrimoireRuntime (global)               │   │
│  │  __apiVersion  dispatch()  extractSearch()  extract...   │   │
│  │  extractDetails()  extractChapters()  extractPages()     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Theme Adapter (defineTheme)                 │   │
│  │  detectionSignature  selectors  hooks?                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Adapter Discovery & Loading
1. App reads `index.json` from configured repository
2. Verifies Ed25519 signature of bundle using repository public key
3. Loads `runtime.js` (IIFE) into a dedicated `JSContext`
4. Checks `__apiVersion === supportedApiVersion`

### 2. Theme Detection
1. App fetches site HTML via native networking
2. Calls `parseHTML(html)` → `DocumentLike`
3. Scores `detectionSignature` against document:
   - `metaGenerator` regex match: +3
   - Each `selectors` match: +2
   - Each `scriptSrc` regex match: +1
   - Each `probePaths` 2xx response: +3
4. If `score >= minScore` → theme detected

### 3. Extraction Calls (Host → Adapter)

All calls go through **JSON dispatcher**:

```ts
// Host calls
const result = await dispatch(runtime, 'search', JSON.stringify({ page: 1 }));
const data = JSON.parse(result) as PagedResult<MangaSummary>;
```

Methods:
| Method | Aliases | Input | Output |
|--------|---------|-------|--------|
| `search` | — | `SearchQuery` | `PagedResult<MangaSummary>` |
| `details` | `getMangaDetails` | `{ key: string }` | `MangaDetails` |
| `chapters` | `getChapters` | `{ key: string }` | `Chapter[]` |
| `pages` | `getPages` | `{ mangaKey, chapterKey }` | `Page[]` |

### 4. Native Bridge (Adapter → Host)

Adapter calls `__native.*` functions exposed by host:

| Function | Purpose |
|----------|---------|
| `request(HttpRequest)` | HTTP request (allowlist enforced) |
| `parseHTML(string)` | Returns `DocumentLike` |
| `log/warn/error(...)` | Logging |
| `setTimeout(cb, ms)` | Timer (host may schedule natively) |
| `__timerFire(id)` | Called by host when native timer fires |

## Bridge Protocol

### JSON Exchange Only
- **Every** value crossing the bridge is a JSON string
- Host stringifies input, adapter stringifies output
- No `JSValue` crosses the Swift/JS boundary directly

### HttpRequest / HttpResponse

```ts
// Request from adapter
{
  url: "https://example.org/search?q=lorem",
  method: "GET",
  headers: { "Accept": "text/html" },
  body?: "form=data"
}

// Response to adapter
{
  status: 200,
  url: "https://example.org/search?q=lorem",
  headers: { "content-type": "text/html" },
  body: "<html>...</html>"
}
```

### DocumentLike (Minimal DOM)

```ts
interface DocumentLike {
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
  documentElement?: ElementLike | null;
  implementation?: {
    createHTMLDocument(title?: string): DocumentLike;
  };
}

interface ElementLike {
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
  getAttribute(name: string): string | null;
  textContent: string | null;
  innerHTML?: string;
}
```

## Concurrency Model

- **One `JSVirtualMachine` per adapter** (isolated memory)
- **One `JSContext` per adapter** with custom serial executor
- **`JSValue` never leaves the executor** — all results serialized to JSON
- Native bridge calls are async; Swift bridges via `JSValue` callbacks

## Security

| Layer | Mechanism |
|-------|-----------|
| **Network** | Host allowlist (exact host or subdomain, case-insensitive); every redirect revalidated |
| **Code** | Bundle signed with Ed25519; verified on load and every update |
| **DOM** | No global `document`/`window`; only `DocumentLike` surface |
| **Timers** | Host controls timer execution; adapter cannot run arbitrary code later |
| **Protos** | Only `http:`/`https:` allowed; `file:`/`data:` rejected |

## Package Dependencies

```
@blankgrimoire/types (contract)
       ▲
       │
@blankgrimoire/runtime ◄──────────────► @blankgrimoire/testing
       ▲
       │
@blankgrimoire/cli
```

- `types` = single source of truth (shared with iOS)
- `runtime` = ESM for Node, IIFE for JSC
- `testing` = Node-only (jsdom, node:vm)
- `cli` = Node-only (esbuild, crypto)

## Related Docs

- [Contract Overview](../contract/overview.md)
- [Runtime Engine](../runtime/overview.md)
- [Testing Harness](../testing/overview.md)
- [CLI Reference](../cli/overview.md)