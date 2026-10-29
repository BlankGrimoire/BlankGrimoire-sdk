# BlankGrimoire SDK Documentation

Welcome to the BlankGrimoire SDK documentation. This SDK provides the contract, runtime, testing tools, and CLI for building theme adapters for the BlankGrimoire iOS app.

## Quick Navigation

| Area | Description | Entry Point |
|------|-------------|-------------|
| **Architecture** | System design, data flow, bridge protocol | [architecture/overview.md](architecture/overview.md) |
| **Contract** | Type definitions, schema, fixtures, versioning | [contract/overview.md](contract/overview.md) |
| **Runtime** | Declarative engine, strategies, dispatch | [runtime/overview.md](runtime/overview.md) |
| **Testing** | VMHarness, NativeBridge, MockServer | [testing/overview.md](testing/overview.md) |
| **CLI** | Build, sign, manifest, index commands | [cli/overview.md](cli/overview.md) |
| **Guides** | Step-by-step tutorials | [guides/README.md](guides/README.md) |
| **Reference** | API reference, schemas, error codes | [reference/README.md](reference/README.md) |

## Getting Started

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build all packages
pnpm build

# Run tests
pnpm test

# Typecheck
pnpm typecheck

# Regenerate JSON schema from types
pnpm schema
```

## Creating a Theme Adapter

```ts
import { defineTheme } from '@blankgrimoire/types';

export default defineTheme({
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: {
    metaGenerator: '^ExampleCMS',
    selectors: ['.example-reader'],
    minScore: 3,
  },
  selectors: {
    search: { path: '/search', item: '.result', title: '.result-title', link: 'a' },
    details: { title: 'h1.series-title', synopsis: '.series-synopsis' },
    chapters: { item: '.chapter', link: 'a', order: 'desc' },
    pages: {
      strategies: [
        { kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'] },
      ],
    },
  },
});
```

## Key Principles

- **Themes, not websites** — Adapters target CMS/themes, never single domains
- **User chooses the site** — No hardcoded URLs in adapters
- **JSON-only exchange** — All host↔adapter communication via JSON strings
- **Declarative first** — CSS selectors and strategies; hooks only for edge cases
- **No global DOM** — Runtime uses `DocumentLike`; host provides `parseHTML`
- **JavaScriptCore compatible** — No `URL` global, no Node APIs in bundle

## Versioning

- SDK major version = adapter `apiVersion` (currently **1**)
- Schema: `schema/v1.json`, fixtures: `fixtures/v1/`
- Breaking contract change → major version bump

## License

MIT — © BlankGrimoire contributors