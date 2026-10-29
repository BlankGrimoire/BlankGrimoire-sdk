# Contributing to the BlankGrimoire SDK

## Ground rules

The same rules as the rest of the project apply: no real website domains,
synthetic test data only, no circumvention of access controls.

## Development setup

Requirements: Node 22 (`.nvmrc`) and pnpm 9+.

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm schema        # regenerate schema/ from @blankgrimoire/types
pnpm schema:check  # verify the committed schema is up to date
```

## Changing the contract

`@blankgrimoire/types` is the **single source of truth** shared with the iOS app.
Any change to it must:

1. regenerate `schema/` with `pnpm schema` and commit the result;
2. update the canonical JSON files in `fixtures/v1/`;
3. be labeled `contract`, plus `breaking-change` if it is not backward compatible;
4. bump the **major** version for breaking changes (major = `apiVersion`).

The iOS app runs contract tests against the published fixtures: a mismatch
will fail its CI.

## Runtime

`@blankgrimoire/runtime` runs in **both** Node and JavaScriptCore. Do not use
Node-only or browser-only APIs (`fs`, global `document`, `window`, `fetch`);
use the native bridge (`__native.*`) and the `DocumentLike` interface instead.
HTML is parsed by the host through `__native.parseHTML`.

## Workflow

1. Create a branch: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
2. Use [Conventional Commits](https://www.conventionalcommits.org/).
3. The PR title (Conventional Commits) determines the version bump and the changelog. Mark breaking changes with `!` (e.g. `feat!:`).
4. Open a PR and fill in the template. PRs are squash-merged.

AI agents working in this repository must not create commits: they leave every
change uncommitted for human review. See `AGENTS.md`.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
