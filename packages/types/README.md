# @blankgrimoire/types

TypeScript type definitions for the BlankGrimoire adapter contract.

This package is the single source of truth for the contract shared between
theme adapters and the BlankGrimoire iOS app. The JSON Schema in
`schema/v1.json` and the canonical fixtures in `fixtures/v1/` are derived
from these types.

## Usage

Adapters target **themes**, not websites. The site is always chosen by the
user; an adapter never contains a domain.

```ts
import { defineTheme } from '@blankgrimoire/types';

export default defineTheme({
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: {
    metaGenerator: '^ExampleCMS',
    selectors: ['.example-reader'],
    minScore: 3,
  },
  selectors: {
    search: { path: '/search', item: '.result', title: '.result-title', link: 'a' },
    details: { title: 'h1.series-title', synopsis: '.series-synopsis' },
    chapters: { item: '.chapter-list li', link: 'a', order: 'desc' },
    pages: {
      strategies: [
        { kind: 'css', image: '.reader-area img', srcAttributes: ['data-src', 'src'] },
        { kind: 'hydration', framework: 'next', path: 'props.pageProps.pages' },
      ],
    },
  },
});
```

`defineTheme` returns the adapter with `apiVersion: 1` attached. `API_VERSION`
is exported as the canonical contract version.

## Contract rules

- JSON is the only exchange format.
- Optional fields are omitted, never `null`.
- `MangaStatus` and `ContentRating` are closed unions that include `unknown`;
  hosts map any unrecognised value to `unknown`.
- Any change requires schema regeneration (`pnpm build && pnpm schema`),
  a fixtures update, and the `contract` label. Breaking changes require a major bump.

License: MIT — © BlankGrimoire contributors.
