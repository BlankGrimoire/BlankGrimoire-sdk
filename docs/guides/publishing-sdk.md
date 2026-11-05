# Publishing the SDK

The SDK packages are released from `main` by the release workflow:

- `@blankgrimoire/types`
- `@blankgrimoire/runtime`
- `@blankgrimoire/testing`
- `@blankgrimoire/cli`

The workflow also creates the GitHub Release and its runtime, schema, and
fixture assets.

## npm Trusted Publishing

Configure a trusted publisher for each package on npm. Use:

| Setting | Value |
|---|---|
| Provider | GitHub Actions |
| Organization or user | `BlankGrimoire` |
| Repository | `BlankGrimoire-sdk` |
| Workflow filename | `.github/workflows/release.yml` |
| Environment | Leave empty unless the workflow is changed to use one |

The release workflow requests the GitHub OIDC token and publishes with npm
provenance. No `NPM_TOKEN` secret is required.

## Release flow

For a patch release:

1. Create a branch from the updated `develop`.
2. Make a backward-compatible fix and use a `fix:` Conventional Commit or PR
   title.
3. Merge the branch into `develop`.
4. Merge `develop` into `main`.
5. The release workflow calculates the next patch version, updates all package
   manifests, publishes them to npm, and creates the GitHub Release.

The current `v1.0.0` release therefore becomes `v1.0.1` after the npm
publishing fix is merged through this flow. A `feat:` release would instead
produce `v1.1.0`.

## Local verification

Before merging, run:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm schema:check
pnpm -r publish --access public --no-git-checks --dry-run
```

The dry run verifies package contents without publishing. Do not run a real
publish from a developer machine.
