# AGENTS.md

Instructions for AI coding agents working in this repository.
Human contributors: see `CONTRIBUTING.md` (if present) and the organization's `.github` repository.

## Repository Facts

| Key | Value |
|-----|-------|
| Repository | BlankGrimoire-sdk |
| Stack | TypeScript pnpm monorepo: `types`, `runtime`, `testing`, `cli`, `create-blank-theme` |
| License | MIT |
| Source header | `// SPDX-License-Identifier: MIT` at the top of every TS source file |
| Contact | blankgrimoire.dev@gmail.com |
| Copyright holder | BlankGrimoire contributors |

## Non-Negotiable Rules

1. **No real website domains** anywhere (code, tests, comments, commit messages, docs). Use `example.org` / `example.com` only.
2. **Themes, not websites.** No site-specific scrapers, no lists of sites, no adapters named after sites.
3. **Synthetic fixtures only.** Hand-written Lorem ipsum and placeholder images. Never copy HTML, text, or images from real sites.
4. **No circumvention.** No bypass of authentication, paywalls, DRM, or access controls. Anti-bot challenges are completed by the user in a **visible** WKWebView, never a hidden one.
5. **Attribution preserved.** Site name, logo, credits, and the "Open on site" button. Credit pages are never filtered.
6. **No marketing vocabulary.** The words manga, manhwa, and scanlation must not appear in descriptions, topics, or README marketing. Domain type names (e.g. `MangaSummary`) are acceptable in code.
7. **Never commit secrets.** The Ed25519 private key lives only in GitHub environment secrets.
8. **Never commit personal emails.** The only allowed email is blankgrimoire.dev@gmail.com.

## Git Rules

- Never `git push`, never force push, never create remote resources, never publish packages.
- Conventional Commits only: `feat`, `fix`, `perf`, `refactor`, `docs`, `chore`, `ci`, `test`, `revert`; use `!` for breaking changes.
- Branches: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
- Squash merge; the PR title is the commit message and drives semantic-release.
- Never edit `CHANGELOG.md` by hand. Never create release tags manually.

## Code Style

`strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, ES2020 target, vitest, esbuild. `packages/types` is the single source of truth for the contract. Major version = adapter `apiVersion` (currently 2).

## Commands

| Task | Command |
|------|---------|
| Install | `pnpm install --frozen-lockfile` |
| Typecheck | `pnpm -r typecheck` |
| Build | `pnpm -r build` |
| Test | `pnpm -r test` |

## Before Every Commit

- [ ] All commands in the table above pass.
- [ ] Every new source file has the license header.
- [ ] Domain, vocabulary, secrets, and email scans are clean.
- [ ] No new dependencies without human approval.

## Ask a Human Before

- Adding dependencies not listed in the handouts.
- Changing the adapter contract after SDK-1 approval.
- Anything touching remotes, repository settings, or secrets.
- App icon or branding, distribution or code signing, and license questions.
