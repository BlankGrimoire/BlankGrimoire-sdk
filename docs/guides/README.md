# Guides

Step-by-step tutorials for common tasks.

## Available Guides

| Guide | Description | Difficulty |
|-------|-------------|------------|
| [Creating Your First Adapter](creating-first-adapter.md) | Complete walkthrough from scaffold to signed bundle | Beginner |
| [Writing Declarative Selectors](writing-selectors.md) | CSS selectors, strategies, and overrides | Beginner |
| [Using Hooks for Edge Cases](using-hooks.md) | When and how to write TypeScript hooks | Intermediate |
| [Testing Adapters Locally](testing-adapters.md) | VMHarness, MockServer, and unit tests | Beginner |
| [Publishing a Repository](publishing-repository.md) | Building index.json and deploying to GitHub Pages | Intermediate |
| [Migrating from v0 (Legacy)](migration-v0.md) | Upgrading adapters from pre-1.0 contracts | Advanced |

## Quick Start

```bash
# 1. Scaffold a new adapter (when create-blank-theme is published)
# npm create blank-theme@latest my-theme
# cd my-theme

# 2. Develop with tests
pnpm test

# 3. Build and sign
blankgrimoire build src/index.ts --outdir dist --minify
blankgrimoire sign dist/runtime.js --key-file private.pem --out dist/runtime.sig

# 4. Create manifest
blankgrimoire manifest --id theme.my --name "My Theme" --version 1.0.0 \
  --sha256 $(blankgrimoire hash dist/runtime.js) \
  --detection-signature detection.json --out dist/manifest.json

# 5. Add to repository index
blankgrimoire index --name "My Repo" --public-key "ed25519:..." \
  --extensions extensions.json --out public/index.json
```

## Prerequisites

- Node.js 22+ (`.nvmrc` in repo)
- pnpm 9+
- Ed25519 key pair (for signing)
- GitHub repository (for publishing)

## Related Docs

- [CLI Reference](../cli/overview.md)
- [Testing Overview](../testing/overview.md)
- [Contract Overview](../contract/overview.md)