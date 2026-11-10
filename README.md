# BlankGrimoire SDK

Contract, runtime and tooling to build **theme adapters** for BlankGrimoire.

An adapter describes how to read a *family of sites built on the same theme*
through declarative CSS selectors and extraction strategies, with optional
TypeScript hooks for edge cases. The site itself is always chosen by the user:
an adapter never contains a domain.

## Packages

| Package | Description |
|---|---|
| `@blankgrimoire/types` | Type definitions: the contract shared with the iOS app |
| `@blankgrimoire/runtime` | Declarative extraction engine (runs in JavaScriptCore and Node) |
| `@blankgrimoire/testing` | Node harness emulating the native bridge, plus a mock server |
| `@blankgrimoire/cli` | Build, manifest generation and Ed25519 signing |

## Quick start

```ts
import { defineTheme } from '@blankgrimoire/types';

export default defineTheme({
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: { selectors: ['.example-reader'], minScore: 2 },
  selectors: {
    search: { path: '/search', item: '.result', title: '.result-title', link: 'a' },
    details: { title: 'h1.series-title' },
    chapters: { item: '.chapter', link: 'a', order: 'desc' },
    pages: {
      strategies: [
        { kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'] },
      ],
    },
  },
});
```

`defineTheme` attaches `apiVersion: 1`. The adapter is built into a single IIFE
bundle and published with an Ed25519 signature through a repository index.

## How an adapter runs

- The host parses HTML and exposes the native bridge (`__native.parseHTML`,
  `__native.request`, timers and logging). The runtime never assumes a global
  DOM and works with a minimal `DocumentLike` interface. The bridge surface is
  documented in
  [Contract Overview → Native bridge](docs/contract/overview.md#native-bridge-host--runtime).
- The host calls `dispatch(runtime, method, argsJSON)` and receives a JSON
  string. Methods: `search`, `details`, `chapters`, `pages`.
- `@blankgrimoire/runtime` ships as ESM for Node tooling and as
  `dist/runtime.js`, an IIFE exposing the `BlankGrimoireRuntime` global for
  JavaScriptCore. The name is shared through `RUNTIME_GLOBAL_NAME` and covered
  by a test.

## Development

Requirements: Node 22 or newer (`.nvmrc` pins 22; CI covers 22 and 24) and
pnpm 9.

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm schema        # regenerate schema/v1.json from @blankgrimoire/types
pnpm schema:check  # CI: fail if the committed schema is stale
pnpm release:assets   # build release/runtime.js, schema and fixtures archive
pnpm publish:check    # pack every package and verify its published manifest
```

`pnpm schema` type-checks `@blankgrimoire/types` first and generates the
schema from the explicit contract roots in `packages/types/src/schema.ts`.

## Versioning

The SDK **major version equals the adapter `apiVersion`** (currently `1`).
A breaking change in the contract always means a new major.

The package version is owned by semantic-release: the release job calculates
the version from Conventional Commits, updates the root and package
`package.json` files, commits them with `@semantic-release/git`, and creates
the tag. Never bump versions or edit `CHANGELOG.md` by hand. The current
published version is `1.0.1`.

Each release publishes `runtime.js`, the JSON Schema (`schema/v1.json`) and
the canonical fixtures (`fixtures/v1/`) as GitHub Release assets. The assets
are produced by `scripts/release-assets.sh`, which fails when a file is
missing and verifies the `v1/<fixture>.json` layout with `tar -tzf`. The
`@blankgrimoire/types`, `@blankgrimoire/runtime`, `@blankgrimoire/testing`, and
`@blankgrimoire/cli` packages are published to npm with provenance;
`scripts/publish-packages.sh` rejects packed manifests that still contain
`workspace:` ranges. The iOS CI runs the ReaderCore contract tests against
vendored assets verified by `make verify-sdk`.

## License

[MIT](LICENSE). Usage of this SDK is subject to the project
[Disclaimer](https://github.com/BlankGrimoire/BlankGrimoire-iOS/blob/main/DISCLAIMER.md).
