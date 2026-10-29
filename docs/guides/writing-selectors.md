# Writing Declarative Selectors

The runtime extracts data using **CSS selectors** and **strategies** — no TypeScript code required for most sites.

## Selector Structure

```ts
selectors: {
  search: { ... },      // Search results page
  details: { ... },     // Series/manga detail page
  chapters: { ... },    // Chapter list page
  pages: { ... },       // Chapter reader page
  attribution: { ... }  // Optional: site credits/logo
}
```

## Search Selectors

```ts
search: {
  path: '/search',           // Search endpoint path (relative to baseURL)
  item: '.result',           // Selector for each result row
  title: '.result-title',    // Title text within item
  link: 'a',                 // Link element (href extracted)
  cover: 'img.cover',        // Optional: cover image within item
  nextPage: '.pagination .next', // Optional: next page link
}
```

**Extraction logic**:
1. Navigate to `baseURL + path?query`
2. For each `item`:
   - `title` = textContent of `item.querySelector(title)`
   - `href` = `item.querySelector(link).getAttribute('href')`
   - `key` = `resolveURL(href, baseURL)`
   - `coverURL` = `readImageURL(item, cover, baseURL)` (if cover provided)
3. `hasNextPage` = `document.querySelector(nextPage) !== null`

### Tips
- Use **specific but stable** selectors (`.search-result` not `div > div > div`)
- `link` can be any element with `href` (not just `<a>`)
- `cover` selector should target the `<img>` or its container

## Details Selectors

```ts
details: {
  title: 'h1.series-title',          // Required
  cover: '.series-cover img',        // Optional
  synopsis: '.series-synopsis',      // Optional
  authors: '.series-authors',        // Optional (comma-separated)
  artists: '.series-artists',        // Optional (comma-separated)
  altTitles: '.series-alt-titles',   // Optional (comma-separated)
  tags: '.series-tags',              // Optional (comma-separated)
  status: '.series-status',          // Text → normalized to MangaStatus
  contentRating: '.series-rating',   // Text → normalized to ContentRating
}
```

### Text Normalization

| Field | Input | Normalized To |
|-------|-------|---------------|
| `status` | "Ongoing", "Publishing", "In Progress" | `ongoing` |
| `status` | "Completed", "Finished", "Ended" | `completed` |
| `status` | "Hiatus", "On Hold", "Paused" | `hiatus` |
| `status` | "Cancelled", "Canceled", "Dropped" | `cancelled` |
| `status` | anything else | `unknown` |
| `contentRating` | "Safe", "All Ages", "General" | `safe` |
| `contentRating` | "Suggestive", "Teen", "Mature Teen" | `suggestive` |
| `contentRating` | "Mature", "Adult", "Explicit", "18+" | `mature` |
| `contentRating` | anything else | `unknown` |

### Split Lists
`authors`, `artists`, `altTitles`, `tags` — split by `,`, `|`, or newline, trimmed, empty filtered.

### Attribution
```ts
attribution: {
  logo: '.site-logo img',      // Optional: logo image
  credits: '.site-credits',    // Optional: credits text
}
```
If present, adds `Attribution { siteName, siteURL, logoURL?, credits? }` to details.

## Chapters Selectors

```ts
chapters: {
  item: '.chapter-list li',    // Each chapter row
  link: 'a',                   // Link to chapter (href)
  title: '.chapter-title',     // Optional: chapter title
  date: '.chapter-date',       // Optional: publication date
  order: 'desc',               // 'asc' or 'desc'
}
```

**Extraction**:
1. For each `item`: `href` → `resolveURL()` → `key`
2. `title` from `title` selector (or link text if omitted)
3. `number` parsed from title via regex `(\d+(?:\.\d+)?)`
4. `date` parsed via `Date.parse()` → ISO string
5. **Sort**: if all have `number` → numeric sort; else reverse for `asc`

### Tips
- Use `order: 'desc'` for newest-first (typical)
- If site lists oldest-first, use `order: 'asc'` — runtime handles it

## Pages Strategies

```ts
pages: {
  strategies: [
    { kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'] },
    { kind: 'scriptJSON', pattern: 'window.__PAGES__', path: 'pages' },
    { kind: 'hydration', framework: 'next', path: 'props.pageProps.pages' },
    { kind: 'ajax', method: 'GET', path: '/api/pages', then: { kind: 'css', ... } },
  ],
}
```

**Execution**: Strategies tried **in order**; first returning ≥1 page wins.

### CSS Strategy
```ts
{ kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'], headers?: {...} }
```
- `image`: selector matching `<img>` elements (or containers)
- `srcAttributes`: tried in order; first non-empty wins
- `headers`: attached to each `Page` (e.g., `Referer`)

### ScriptJSON Strategy
```ts
{ kind: 'scriptJSON', pattern: 'window.__PAGES__', path: 'pages', base64?: false }
```
- Searches all `<script>` elements
- Matches `pattern` against script `textContent` or `src` attribute
- If `src` matches → fetches via `__http` (allowlist applies)
- Parses JSON (handles `window.__DATA__ = {...}` assignments)
- Follows `path` (dot/bracket: `props.pageProps.pages[0].url`)
- Base64 decode if `base64: true`

### Hydration Strategy
```ts
{ kind: 'hydration', framework: 'next' | 'nuxt', path?: string }
```
- Checks `window.__NEXT_DATA__` or `window.__NUXT__`
- Falls back to `#__NEXT_DATA__` / `#__NUXT_DATA__` script tags
- Follows optional `path` to page array

### AJAX Strategy
```ts
{ kind: 'ajax', method: 'GET', path: '/chapter/1/pages', then: { kind: 'css', ... } }
```
- Fetches `path` (resolved against `baseURL`)
- Parses response HTML via `parseHTML`
- Runs nested `then` strategy on parsed document
- Max depth: 5

### Page Normalization
All strategies produce `Page[]` via `toPages()`:
```ts
// Input can be:
['/page1.jpg', '/page2.jpg']                    // String array
[{ imageURL: '/page1.jpg' }, { url: '/page2.jpg' }] // Objects with imageURL/url/src/image

// Output:
[
  { index: 0, imageURL: 'https://example.org/page1.jpg', headers?: {...} },
  { index: 1, imageURL: 'https://example.org/page2.jpg', headers?: {...} },
]
```

## User Overrides (Deep Partial)

```ts
overrides: {
  search: { title: '.custom-title' },           // Only replaces title
  details: { status: '.custom-status' },        // Only replaces status
  chapters: { item: '.custom-chapter' },        // Only replaces item
  pages: { strategies: [...] },                 // Replaces entire array
  attribution: { logo: '.custom-logo' },        // Only replaces logo
}
```
- Shallow merge per top-level key
- `pages.strategies` is **replaced entirely** (not merged)
- Use `Partial<ThemeSelectors[...]>` for type safety

## Common Patterns

### Pagination
```ts
search: {
  path: '/search',
  item: '.item',
  title: '.title',
  link: 'a',
  nextPage: '.pagination a.next',  // Link to page 2, 3, etc.
}
```

### Relative URLs
```ts
// All href/src are resolved automatically
link: 'a',                    // href="/series/1" → https://example.org/series/1
cover: 'img',                 // src="/cover.jpg" → https://example.org/cover.jpg
```

### Multiple Cover Attributes
```ts
srcAttributes: ['data-src', 'data-original', 'src']  // Lazy-load → fallback
```

### Referer Header for Images
```ts
pages: {
  strategies: [{
    kind: 'css',
    image: '.reader img',
    srcAttributes: ['data-src', 'src'],
    headers: { Referer: 'https://example.org/' },  // Added to each Page
  }],
}
```

### Script JSON with Nested Path
```ts
// Site has: window.__DATA__ = { props: { pageProps: { pages: [...] } } }
{ kind: 'scriptJSON', pattern: '__DATA__', path: 'props.pageProps.pages' }
```

### Next.js Hydration
```ts
// Site uses Next.js with getStaticProps
{ kind: 'hydration', framework: 'next', path: 'props.pageProps.chapter.pages' }
```

## Debugging Selectors

```bash
# Test in browser console
document.querySelectorAll('.result')           // Count items
document.querySelector('.result .title')       // First title
document.querySelector('.result a').href       // First link

# Test in VMHarness
const harness = new VMHarness(...);
const result = await harness.testTheme(html, url);
console.log(result.search);  // See extracted data
```

## Related Docs

- [Using Hooks](using-hooks.md) — When selectors aren't enough
- [Testing Adapters](testing-adapters.md) — Verify selectors with VMHarness
- [Contract: ThemeSelectors](../contract/overview.md)