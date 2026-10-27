# Contributing to the BlankGrimoire SDK

## Ground rules

The same rules as the rest of the project apply: no real website domains,
synthetic test data only, no circumvention of access controls.

## Development setup

Requirements: Node 20+ and pnpm 9+.

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm schema   # regenerate schema/ from @blankgrimoire/types
```

## Changing the contract

`@blankgrimoire/types` is the **single source of truth** shared with the iOS app.
Any change to it must:

1. regenerate `schema/` with `pnpm schema` and commit the result;
2. update the canonical JSON files in `fixtures/`;
3. be labeled `contract`, plus `breaking-change` if it is not backward compatible;
4. bump the **major** version for breaking changes (major = `apiVersion`).

The iOS app runs contract tests against the published fixtures: a mismatch
will fail its CI.

## Runtime

`@blankgrimoire/runtime` runs in **both** Node and JavaScriptCore. Do not use
Node-only or browser-only APIs (`fs`, `document`, `window`, `fetch`); use the
native bridge (`__native.*`) instead.

## Workflow

1. Create a branch: `feat/<topic>`, `fix/<topic>`.
2. Use [Conventional Commits](https://www.conventionalcommits.org/).
3. The PR title (Conventional Commits) determines the version bump and the changelog. Mark breaking changes with `!` (e.g. `feat!:`).
4. Open a PR and fill in the template. PRs are squash-merged.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).