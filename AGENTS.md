# AGENTS.md

Instructions for AI coding agents working in this repository.
Human contributors: see `CONTRIBUTING.md` and the organization's `.github` repository.

## Repository Facts

| Key | Value |
|-----|-------|
| Repository | BlankGrimoire-sdk |
| Stack | TypeScript pnpm monorepo: `types`, `runtime`, `testing`, `cli` |
| Node | `>=22`; `.nvmrc` pins 22 and CI covers 22 and 24 |
| License | MIT |
| Source header | `// SPDX-License-Identifier: MIT` at the top of every TS source file |
| Contact | blankgrimoire.dev@gmail.com |
| Copyright holder | BlankGrimoire contributors |

## Non-Negotiable Rules

1. **Flexible Endpoint Configuration.** Avoid hardcoding explicit real-world domains in code, tests, or documentation. Use configurable base URLs or generic identifiers (e.g., `SourceTypeA`, `TemplateB`) to abstract the underlying fan-site infrastructure.
2. **Generic Theme Adapters.** Scrapers and adapters must be designed around structural layout themes rather than being explicitly named after specific websites. Build them to support families of sites with similar architectures, keeping the actual target domains masked and dynamically injected.
3. **Abstracted Test Data.** Avoid bundling extensive real content from external platforms in the repository. Use genericized fixtures or placeholder assets for testing instead of direct rips from target sites.
4. **Silent anti-bot resolution first.** Adapters should attempt to handle and bypass standard anti-bot challenges or captchas automatically and transparently in the background. Only if automated resolution fails or is technically unfeasible must the challenge be deferred to the user via a visible WKWebView.
5. **Attribution preserved.** Site name, logo, credits, and the "Open on site" button must remain intact. Credit pages are never filtered.
6. **No marketing vocabulary.** The words manga, manhwa, and scanlation must not appear in descriptions, topics, or README marketing. Domain type names (e.g. `MangaSummary`) are acceptable in code. Published adapter names and descriptions are validated at build time.
7. **Never commit secrets.** The Ed25519 private key lives only in GitHub environment secrets. Local keys and certificates are gitignored.
8. **Never commit personal emails.** The only allowed email is blankgrimoire.dev@gmail.com.

## Git Rules

- **Never run `git commit`.** Leave every change uncommitted in the working tree for human review, together with a proposed commit message in the report.
- Never `git push`, never force push, never create remote resources, never publish packages.
- Conventional Commits only: `feat`, `fix`, `perf`, `refactor`, `docs`, `chore`, `ci`, `test`, `revert`; use `!` for breaking changes.
- Branches: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
- Squash merge; the PR title is the commit message and drives semantic-release.
- Never edit `CHANGELOG.md` by hand. Never create release tags manually.

## Code Style

`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, ES2020 target, vitest, esbuild. `packages/types` is the single source of truth for the contract. `API_VERSION` is 1, the SDK major version equals the adapter `apiVersion`, and the runtime rejects adapters that do not declare it. `packages/types/src/schema.ts` lists the contract roots used to generate the JSON Schema.

## Documentation

All SDK implementation details are in `docs/`:

| Area | Entry Point |
|------|-------------|
| Architecture | `docs/architecture/overview.md` |
| Contract | `docs/contract/overview.md` |
| Runtime | `docs/runtime/overview.md` |
| Testing | `docs/testing/overview.md` |
| CLI | `docs/cli/overview.md` |
| Guides | `docs/guides/README.md` |
| Reference | `docs/reference/README.md` |

## Commands

| Task | Command |
|------|---------|
| Install | `pnpm install --frozen-lockfile` |
| Typecheck (src + tests) | `pnpm typecheck` |
| Build | `pnpm build` |
| Test | `pnpm test` |
| Regenerate schema | `pnpm schema` |
| Verify schema is current | `pnpm schema:check` (CI, clean tree) |
| Build release assets | `pnpm release:assets` |
| Verify published package manifests | `pnpm publish:check` |

## Before Handoff

- [ ] All commands in the table above pass (`schema:check` requires a clean tree; locally run `pnpm schema` and inspect the diff instead).
- [ ] Every new source file has the license header.
- [ ] Domain, vocabulary, secrets, and email scans are clean.
- [ ] No new dependencies without human approval.
- [ ] No commits were created; changes are left uncommitted.

## Ask a Human Before

- Adding dependencies not listed in the handouts.
- Changing the adapter contract after SDK-1 approval.
- Anything touching remotes, repository settings, or secrets.
- App icon or branding, distribution or code signing, and license questions.
