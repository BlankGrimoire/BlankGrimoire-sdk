# BlankGrimoire SDK

Contract, runtime and tooling to build **theme adapters** for BlankGrimoire.

An adapter describes how to read a *family of websites built on the same
theme* through declarative CSS selectors and extraction strategies, with
optional TypeScript hooks for edge cases.

## Packages

| Package | Description |
|---|---|
| `@blankgrimoire/types` | Type definitions: the contract shared with the iOS app |
| `@blankgrimoire/runtime` | Declarative extraction engine (runs in JavaScriptCore and Node) |
| `@blankgrimoire/testing` | Node harness emulating the native bridge, plus a mock server |
| `@blankgrimoire/cli` | Build, manifest generation and Ed25519 signing |
| `create-blank-theme` | Scaffolding for new adapters |

## Quick start

```bash
npm create blank-theme@latest my-theme
cd my-theme && npm test
```

```ts
import { defineTheme } from '@blankgrimoire/types';

export default defineTheme({
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  signature: { selectors: ['.example-reader'], minScore: 2 },
  selectors: { /* ... */ },
});
```

## Versioning

The SDK **major version equals the adapter `apiVersion`**.
A breaking change in the contract always means a new major.

Each release publishes the JSON Schema (`schema/`) and canonical fixtures
(`fixtures/`), which the iOS app uses for contract tests.

## Development

```bash
pnpm install
pnpm build && pnpm test && pnpm schema
```

## License

[MIT](LICENSE). Usage of this SDK is subject to the project
[Disclaimer](https://github.com/BlankGrimoire/BlankGrimoire-iOS/blob/main/DISCLAIMER.md).