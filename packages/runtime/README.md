# @blankgrimoire/runtime

Declarative extraction engine for BlankGrimoire theme adapters. It runs in
JavaScriptCore on iOS, in Node for testing, and inside the signed bundle
built by `@blankgrimoire/cli`.

## Host contract

The runtime never assumes a global DOM. The host provides:

- `DocumentLike`: `querySelector`, `querySelectorAll`, `textContent`,
  `getAttribute`; HTML is parsed by the host through
  `__native.parseHTML(html)`.
- `__native.request(HttpRequest)` for HTTP, plus optional timers and logging.
- A `SiteContext` with `baseURL`, `siteName` and user selector overrides.

## Dispatching calls

The host calls one JSON entry point:

```ts
import { dispatch } from '@blankgrimoire/runtime';

const result = await dispatch(runtime, 'search', JSON.stringify({ page: 1 }));
```

`runtime` contains the adapter, `SiteContext`, the parsed `document`, and
optional `window` / `parseHTML` hooks. The result is always a JSON string.

Methods: `search`, `details`, `chapters`, `pages` (the `getMangaDetails`,
`getChapters` and `getPages` aliases are also accepted).

## Extraction

- Search, details and chapters are extracted declaratively from
  `ThemeSelectors`. TypeScript hooks take precedence when present.
- Pages use ordered strategies (`css`, `scriptJSON`, `hydration`, `ajax`);
  the first strategy that returns at least one page wins.
- User overrides are deep-partial and merge field by field without replacing
  sibling selector fields.
- Status and content-rating text are normalised to the closed contract unions,
  falling back to `unknown`.
- Relative URLs are resolved by the runtime itself; JavaScriptCore does not
  need to provide a global `URL` constructor.

## Packaging

- `dist/index.js` — ESM entry with type declarations for Node tooling.
- `dist/runtime.js` — single IIFE exposing the `BlankGrimoireRuntime` global
  for JavaScriptCore. `__apiVersion` equals `API_VERSION` (`1`).

## Development

```bash
pnpm build      # declarations + ESM + IIFE bundle
pnpm typecheck  # src and tests
pnpm test
```

License: MIT — © BlankGrimoire contributors.
