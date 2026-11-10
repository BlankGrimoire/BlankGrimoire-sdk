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

`@semantic-release/git` commits the version bump and `CHANGELOG.md` back to
`main`. If `main` is protected, allow the release token (or its GitHub App) to
push that commit, otherwise the release fails during `prepare`.

## Release flow

For a patch release:

1. Create a branch from the updated `develop`.
2. Make a backward-compatible fix and use a `fix:` Conventional Commit or PR
   title.
3. Merge the branch into `develop`.
4. Merge `develop` into `main`.
5. The release workflow calculates the next patch version, updates all package
   manifests, commits the bump with `@semantic-release/git`, publishes the
   packages to npm, and creates the GitHub Release with validated assets.

The current release is `v1.0.1`; `main` and every package manifest report
`1.0.1`. A `feat:` release would produce `v1.1.0`.

## Local verification

Before merging, run:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm schema:check
pnpm release:assets
pnpm publish:check
```

`pnpm publish:check` packs every workspace package and fails if a published
manifest still contains a `workspace:` range or carries the wrong version. It
does not contact the registry or publish anything. Do not run a real publish
from a developer machine.
