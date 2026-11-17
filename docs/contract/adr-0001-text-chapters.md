# ADR 0001: Text chapters on API version 1

- **Status:** Accepted
- **Date:** 2026-11-17
- **Issue:** #34

## Context

The adapter contract only describes image content: `pages` returns
`Page[]` with an `imageURL`. Sites that serve serialized prose cannot be
expressed, even though the app is moving towards mixed libraries.

Two versioning options were on the table:

- **A. Additive on `apiVersion: 1`** — every new field optional, new method
  only called by hosts that understand it.
- **B. `apiVersion: 2`** — a new major contract.

## Decision

**Option A.** The change adds nothing that invalidates an existing adapter:

- `MangaDetails.contentKind?: ContentKind` — missing means `image`.
- `AdapterManifest.contentKinds?: ContentKind[]` — missing means `['image']`.
- `ThemeSelectors.content?: ContentConfig` — an optional group of strategies.
- `ThemeHooks.getContent?()` — an optional hook.
- `dispatch('content', …)` — a new method; hosts that never call it are
  unaffected.

`Page` and `pages` are untouched, so image adapters keep their current path.
Because nothing required is added or changed, `API_VERSION` stays `1` and no
adapter has to be rebuilt.

## Consequences

- A v1 host that does not know `content` keeps working: it reads a text
  series as a series with no pages, which is the honest degradation.
- Hosts must decide what to do with `contentKind: 'text'` before importing;
  the manifest capability lets a repository browser warn before install.
- Sanitisation stays in the host. The runtime has a minimal `DocumentLike`,
  so a second sanitiser there would be unverifiable; the contract says the
  body is untrusted markup.
- `remove` selectors are best-effort: they need a mutable DOM. A host without
  `Element.remove` leaves the nodes in place and relies on its sanitiser.
- A future `apiVersion: 2` is only needed if `Page`/`pages` is replaced or the
  chapter shape changes.

## Alternatives rejected

- **Union inside `pages`** (`Page | TextBlock`): forces every host to branch
  inside the image path and makes the image extraction strategies ambiguous.
- **`apiVersion: 2` immediately**: no adapter benefits, and every published
  adapter would need a rebuild, for a purely additive capability.
