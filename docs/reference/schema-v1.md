# JSON Schema v1 Reference

The JSON Schema is generated from `@blankgrimoire/types` via `ts-json-schema-generator` and published as `schema/v1.json`.

## Generation

```bash
pnpm schema
# ts-json-schema-generator -p packages/types/src/index.ts -t '*' -o schema/v1.json --no-type-check
```

## Schema Structure

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "ApiVersion": { "const": 1, "type": "number" },
    "AdapterManifest": { ... },
    "Attribution": { ... },
    "Chapter": { ... },
    "ContentRating": { "enum": ["safe","suggestive","mature","unknown"], "type": "string" },
    "ExtractionStrategy": { "anyOf": [ ... ] },
    "HttpRequest": { ... },
    "HttpResponse": { ... },
    "ISODateString": { "format": "date-time", "type": "string" },
    "MangaDetails": { ... },
    "MangaStatus": { "enum": ["ongoing","completed","hiatus","cancelled","unknown"], "type": "string" },
    "MangaSummary": { ... },
    "MangaSummaryPage": { ... },
    "Page": { ... },
    "PagesConfig": { ... },
    "RepositoryIndex": { ... },
    "SearchQuery": { ... },
    "SiteContext": { ... },
    "ThemeAdapter": { ... },
    "ThemeHooks": { ... },
    "ThemeSelectors": { ... },
    "ThemeSelectorsOverrides": { ... },
    "ThemeSignature": { ... },
    "URLString": { "format": "uri-reference", "type": "string" },
    "defineTheme": { ... }
  }
}
```

## Key Definitions

### ApiVersion
```json
{ "const": 1, "description": "Literal type of the current adapter API version.", "type": "number" }
```

### ContentRating / MangaStatus
```json
{
  "enum": ["safe", "suggestive", "mature", "unknown"],
  "type": "string"
}
```
Closed unions — **no additional values allowed**. Host normalizes unknown text to `unknown`.

### AdapterManifest
```json
{
  "additionalProperties": false,
  "required": ["id", "name", "version", "apiVersion", "detectionSignature", "sha256"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "version": { "type": "string" },
    "apiVersion": { "$ref": "#/definitions/ApiVersion" },
    "detectionSignature": { "$ref": "#/definitions/ThemeSignature" },
    "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" }
  }
}
```
- No `baseURL`, no `domains` (hosts from user SiteProfile)
- `detectionSignature` not `signature` (legacy)

### RepositoryIndex
```json
{
  "additionalProperties": false,
  "required": ["formatVersion", "name", "publicKey", "extensions"],
  "properties": {
    "formatVersion": { "const": 1 },
    "name": { "type": "string" },
    "publicKey": { "type": "string", "pattern": "^ed25519:[A-Za-z0-9+/]+={0,2}$" },
    "extensions": {
      "type": "array",
      "items": { "$ref": "#/definitions/ExtensionEntry" }
    }
  }
}
```

### ExtensionEntry
```json
{
  "additionalProperties": false,
  "required": ["id", "name", "version", "apiVersion", "bundleURL", "sha256", "bundleSignature"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "version": { "type": "string" },
    "apiVersion": { "$ref": "#/definitions/ApiVersion" },
    "bundleURL": { "type": "string", "format": "uri-reference" },
    "sha256": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
    "bundleSignature": { "type": "string", "pattern": "^[A-Za-z0-9+/]+={0,2}$" }
  }
}
```
- `bundleSignature` not `signature` (legacy)
- `apiVersion` constrained to 1

### ThemeSignature
```json
{
  "additionalProperties": false,
  "required": ["minScore"],
  "properties": {
    "metaGenerator": { "type": "string" },
    "selectors": { "type": "array", "items": { "type": "string" } },
    "scriptSrc": { "type": "array", "items": { "type": "string" } },
    "probePaths": { "type": "array", "items": { "type": "string" } },
    "minScore": { "type": "number", "minimum": 0 }
  }
}
```

### ThemeSelectors
```json
{
  "additionalProperties": false,
  "required": ["search", "details", "chapters", "pages"],
  "properties": {
    "search": { "$ref": "#/definitions/SearchSelectors" },
    "details": { "$ref": "#/definitions/DetailsSelectors" },
    "chapters": { "$ref": "#/definitions/ChaptersSelectors" },
    "pages": { "$ref": "#/definitions/PagesConfig" },
    "attribution": { "$ref": "#/definitions/AttributionSelectors" }
  }
}
```

### ExtractionStrategy (anyOf)
```json
{
  "anyOf": [
    { "$ref": "#/definitions/CssStrategy" },
    { "$ref": "#/definitions/ScriptJSONStrategy" },
    { "$ref": "#/definitions/HydrationStrategy" },
    { "$ref": "#/definitions/AjaxStrategy" }
  ]
}
```

#### CssStrategy
```json
{
  "additionalProperties": false,
  "required": ["kind", "image", "srcAttributes"],
  "properties": {
    "kind": { "const": "css" },
    "image": { "type": "string" },
    "srcAttributes": { "type": "array", "items": { "type": "string" } },
    "headers": { "type": "object", "additionalProperties": { "type": "string" } }
  }
}
```

#### ScriptJSONStrategy
```json
{
  "additionalProperties": false,
  "required": ["kind", "pattern", "path"],
  "properties": {
    "kind": { "const": "scriptJSON" },
    "pattern": { "type": "string" },
    "path": { "type": "string" },
    "base64": { "type": "boolean" }
  }
}
```

#### HydrationStrategy
```json
{
  "additionalProperties": false,
  "required": ["kind", "framework"],
  "properties": {
    "kind": { "const": "hydration" },
    "framework": { "enum": ["next", "nuxt"] },
    "path": { "type": "string" }
  }
}
```

#### AjaxStrategy
```json
{
  "additionalProperties": false,
  "required": ["kind", "method", "path", "then"],
  "properties": {
    "kind": { "const": "ajax" },
    "method": { "enum": ["GET", "POST"] },
    "path": { "type": "string" },
    "body": { "type": "string" },
    "then": { "$ref": "#/definitions/ExtractionStrategy" }
  }
}
```

### ThemeSelectorsOverrides
```json
{
  "additionalProperties": false,
  "properties": {
    "search": { "type": "object", "additionalProperties": { "type": "string" } },
    "details": { "type": "object", "additionalProperties": { "type": "string" } },
    "chapters": { "type": "object", "additionalProperties": { "type": "string" } },
    "pages": { "type": "object", "properties": { "strategies": { "type": "array", "items": { "$ref": "#/definitions/ExtractionStrategy" } } } },
    "attribution": { "type": "object", "additionalProperties": { "type": "string" } }
  }
}
```

### SiteContext
```json
{
  "additionalProperties": false,
  "required": ["baseURL", "siteName", "overrides"],
  "properties": {
    "baseURL": { "type": "string" },
    "siteName": { "type": "string" },
    "overrides": { "$ref": "#/definitions/ThemeSelectorsOverrides" }
  }
}
```

### Entity Types

#### MangaSummary
```json
{
  "additionalProperties": false,
  "required": ["key", "title"],
  "properties": {
    "key": { "type": "string" },
    "title": { "type": "string" },
    "coverURL": { "$ref": "#/definitions/URLString" }
  }
}
```

#### MangaDetails (extends MangaSummary)
```json
{
  "additionalProperties": false,
  "required": ["key", "title", "status", "contentRating"],
  "properties": {
    "key": { "type": "string" },
    "title": { "type": "string" },
    "coverURL": { "$ref": "#/definitions/URLString" },
    "altTitles": { "type": "array", "items": { "type": "string" } },
    "authors": { "type": "array", "items": { "type": "string" } },
    "artists": { "type": "array", "items": { "type": "string" } },
    "synopsis": { "type": "string" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "status": { "$ref": "#/definitions/MangaStatus" },
    "contentRating": { "$ref": "#/definitions/ContentRating" },
    "attribution": { "$ref": "#/definitions/Attribution" }
  }
}
```

#### Chapter
```json
{
  "additionalProperties": false,
  "required": ["key"],
  "properties": {
    "key": { "type": "string" },
    "title": { "type": "string" },
    "number": { "type": "number" },
    "volume": { "type": "number" },
    "language": { "type": "string" },
    "publishedAt": { "$ref": "#/definitions/ISODateString" },
    "group": { "type": "string" }
  }
}
```

#### Page
```json
{
  "additionalProperties": false,
  "required": ["index", "imageURL"],
  "properties": {
    "index": { "type": "number" },
    "imageURL": { "$ref": "#/definitions/URLString" },
    "headers": { "type": "object", "additionalProperties": { "type": "string" } }
  }
}
```

## Format Validators

| Format | Pattern/Validator |
|--------|-------------------|
| `uri-reference` | RFC 3986 relative/absolute URI |
| `date-time` | RFC 3339 / ISO 8601 |
| `sha256` | `^[a-f0-9]{64}$` |
| `publicKey` | `^ed25519:[A-Za-z0-9+/]+={0,2}$` |
| `bundleSignature` | `^[A-Za-z0-9+/]+={0,2}$` (decodes to 64 bytes) |

## Validation Rules

1. **`additionalProperties: false`** on all objects — no extra fields allowed
2. **`const`** on version fields — `apiVersion: 1`, `formatVersion: 1`, `ApiVersion: 1`
3. **`enum`** on closed unions — `MangaStatus`, `ContentRating`, `framework`
4. **`pattern`** on formatted strings — digests, signatures, keys
5. **`minimum`** on `minScore` — ≥ 0

## Using the Schema

```ts
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from './schema/v1.json';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'v1');

const validate = ajv.getSchema('v1#/definitions/AdapterManifest');
const valid = validate(manifest);
if (!valid) console.error(validate.errors);
```

## Related Docs

- [Contract Overview](../contract/overview.md)
- [Fixtures Reference](fixtures.md)
- [TypeScript Types](../reference/types-api.md)