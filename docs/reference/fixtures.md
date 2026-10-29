# Fixtures Reference

Canonical JSON fixtures for every contract entity, published with each SDK release at `fixtures/v1/`.

## Purpose

- **Contract tests** — iOS app decodes fixtures to verify Swift DTOs match TypeScript output
- **Documentation** — Human-readable examples of every type
- **Validation** — Schema conformance guaranteed by `@blankgrimoire/types/test/contract.test.ts`

## Fixture List

| File | Type | Description |
|------|------|-------------|
| `attribution.json` | `Attribution` | Site credits/logo |
| `chapter.json` | `Chapter` | Chapter with all fields |
| `extraction-strategy.json` | `ExtractionStrategy` | CSS strategy example |
| `http-request.json` | `HttpRequest` | Sample HTTP request |
| `http-response.json` | `HttpResponse` | Sample HTTP response |
| `manga-details.json` | `MangaDetails` | Full details with all optional fields |
| `manga-details-unknown-status.json` | `MangaDetails` | With `status: "unknown"`, `contentRating: "unknown"` |
| `manga-summary.json` | `MangaSummary` | Basic summary |
| `manifest.json` | `AdapterManifest` | Manifest with `detectionSignature` |
| `page.json` | `Page` | Page with headers |
| `paged-result.json` | `PagedResult<MangaSummary>` | Search results page |
| `pages-config.json` | `PagesConfig` | Multiple strategies |
| `repository-index.json` | `RepositoryIndex` | Full repo index with extension |
| `search-query.json` | `SearchQuery` | Query with filters |
| `site-context.json` | `SiteContext` | With empty overrides |
| `theme-adapter.json` | `ThemeAdapter` | Minimal adapter |
| `theme-selectors.json` | `ThemeSelectors` | Full selectors |
| `theme-selectors-overrides.json` | `ThemeSelectorsOverrides` | Deep partial overrides |
| `theme-signature.json` | `ThemeSignature` | Detection signature |

## Fixture Contents

### `attribution.json`
```json
{
  "siteName": "Example Library",
  "siteURL": "https://example.org/",
  "logoURL": "https://example.org/logo.png",
  "credits": "Lorem ipsum credits"
}
```

### `chapter.json`
```json
{
  "key": "https://example.org/series/test/chapter-1",
  "title": "Chapter 1: The Beginning",
  "number": 1,
  "volume": 1,
  "language": "en",
  "publishedAt": "2024-01-15T12:00:00Z",
  "group": "Example Group"
}
```

### `extraction-strategy.json`
```json
{
  "kind": "css",
  "image": ".reader img",
  "srcAttributes": ["data-src", "src"],
  "headers": { "Referer": "https://example.org/" }
}
```

### `http-request.json`
```json
{
  "url": "https://example.org/search?q=lorem",
  "method": "GET",
  "headers": { "Accept": "text/html" }
}
```

### `http-response.json`
```json
{
  "status": 200,
  "url": "https://example.org/search?q=lorem",
  "headers": { "content-type": "text/html" },
  "body": "<html><body><p>Lorem ipsum</p></body></html>"
}
```

### `manga-details.json`
```json
{
  "key": "https://example.org/series/test",
  "title": "Test Series",
  "coverURL": "https://example.org/covers/test.jpg",
  "altTitles": ["Test", "Test Series Alt"],
  "authors": ["Author One"],
  "artists": ["Artist One"],
  "synopsis": "A test series for validation.",
  "tags": ["action", "fantasy"],
  "status": "ongoing",
  "contentRating": "safe",
  "attribution": {
    "siteName": "Example Library",
    "siteURL": "https://example.org/",
    "logoURL": "https://example.org/logo.png",
    "credits": "Data provided by Example Library"
  }
}
```

### `manga-details-unknown-status.json`
```json
{
  "key": "test-unknown",
  "title": "Unknown Status Series",
  "status": "unknown",
  "contentRating": "unknown"
}
```

### `manga-summary.json`
```json
{
  "items": [
    { "key": "test-1", "title": "Test Series 1", "coverURL": "https://example.org/covers/1.jpg" },
    { "key": "test-2", "title": "Test Series 2" }
  ],
  "hasNextPage": true
}
```

### `manifest.json`
```json
{
  "id": "theme.example",
  "name": "Example Theme",
  "version": "1.0.0",
  "apiVersion": 1,
  "detectionSignature": {
    "metaGenerator": "^ExampleCMS",
    "selectors": [".example-reader", ".example-chapter-list"],
    "scriptSrc": ["/assets/example-theme\\.js"],
    "probePaths": ["/example-feed.json"],
    "minScore": 5
  },
  "sha256": "0000000000000000000000000000000000000000000000000000000000000000"
}
```

### `page.json`
```json
{
  "index": 0,
  "imageURL": "https://example.org/images/test/001.jpg",
  "headers": { "Referer": "https://example.org/" }
}
```

### `paged-result.json`
```json
{
  "items": [
    { "key": "test-1", "title": "Test Series 1", "coverURL": "https://example.org/covers/1.jpg" },
    { "key": "test-2", "title": "Test Series 2" }
  ],
  "hasNextPage": true
}
```

### `pages-config.json`
```json
{
  "strategies": [
    { "kind": "css", "image": ".reader img", "srcAttributes": ["data-src", "src"] },
    { "kind": "scriptJSON", "pattern": "window.__PAGES__", "path": "pages" }
  ]
}
```

### `repository-index.json`
```json
{
  "formatVersion": 1,
  "name": "Example Repository",
  "publicKey": "ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  "extensions": [
    {
      "id": "theme.example",
      "name": "Example Theme",
      "version": "1.0.0",
      "apiVersion": 1,
      "bundleURL": "themes/example/runtime.js",
      "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
      "bundleSignature": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
    }
  ]
}
```

### `search-query.json`
```json
{
  "text": "lorem",
  "page": 1,
  "filters": { "status": "ongoing" }
}
```

### `site-context.json`
```json
{
  "baseURL": "https://example.org/",
  "siteName": "Example Library",
  "overrides": {}
}
```

### `theme-adapter.json`
```json
{
  "id": "theme.example",
  "name": "Example Theme",
  "version": "1.0.0",
  "detectionSignature": { "selectors": [".example-reader"], "minScore": 2 },
  "selectors": {
    "search": { "path": "/search", "item": ".result", "title": ".result-title", "link": "a" },
    "details": { "title": "h1.series-title" },
    "chapters": { "item": ".chapter", "link": "a", "order": "desc" },
    "pages": { "strategies": [{ "kind": "css", "image": ".reader img", "srcAttributes": ["src"] }] }
  }
}
```

### `theme-selectors.json`
```json
{
  "search": {
    "path": "/search",
    "item": ".result",
    "title": ".result-title",
    "link": "a",
    "cover": "img",
    "nextPage": ".next"
  },
  "details": {
    "title": "h1.series-title",
    "cover": ".series-cover img",
    "synopsis": ".series-synopsis",
    "authors": ".series-authors",
    "artists": ".series-artists",
    "altTitles": ".series-alt-titles",
    "tags": ".series-tags",
    "status": ".series-status",
    "contentRating": ".series-rating"
  },
  "chapters": {
    "item": ".chapter",
    "link": "a",
    "title": ".chapter-title",
    "date": ".chapter-date",
    "order": "desc"
  },
  "pages": {
    "strategies": [
      { "kind": "css", "image": ".reader img", "srcAttributes": ["data-src", "src"], "headers": { "Referer": "https://example.org/" } }
    ]
  },
  "attribution": { "logo": ".site-logo img", "credits": ".site-credits" }
}
```

### `theme-selectors-overrides.json`
```json
{
  "search": { "title": ".custom-result-title" },
  "details": { "status": ".custom-status" },
  "pages": { "strategies": [{ "kind": "css", "image": ".custom-reader img", "srcAttributes": ["data-src"] }] }
}
```

### `theme-signature.json`
```json
{
  "metaGenerator": "^ExampleCMS",
  "selectors": [".example-reader", ".example-chapter-list"],
  "scriptSrc": ["/assets/example-theme\\.js"],
  "probePaths": ["/example-feed.json"],
  "minScore": 5
}
```

## Validation

All fixtures validated by `@blankgrimoire/types/test/contract.test.ts`:

```ts
// Every fixture validates against schema
for (const [file, typeName] of Object.entries(FIXTURES)) {
  it(`${file} is a valid ${typeName}`, () => {
    const validate = validator(typeName);
    const data = readFixture(file);
    expect(validate(data)).toBe(true);
  });
}

// Negative tests
it('rejects unknown status/rating', () => {
  expect(validate({ ...details, status: 'something-new' })).toBe(false);
});

it('rejects legacy signature field', () => {
  expect(validate(legacyManifest)).toBe(false);
});

it('rejects unsupported apiVersion', () => {
  expect(validate({ ...manifest, apiVersion: 2 })).toBe(false);
});
```

## Regenerating Fixtures

When contract changes:
1. Update TypeScript types in `@blankgrimoire/types/src/`
2. Run `pnpm build && pnpm schema`
3. Update affected fixtures in `fixtures/v1/`
4. Run `pnpm test` to verify

## Related Docs

- [Contract Overview](../contract/overview.md)
- [Schema Reference](schema-v1.md)
- [TypeScript Types](../reference/types-api.md)