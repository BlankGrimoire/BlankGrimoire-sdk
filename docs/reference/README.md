# Reference Documentation

Complete API reference, schemas, and error codes.

## API Reference

| Module | Description |
|--------|-------------|
| [@blankgrimoire/types](types-api.md) | Contract types, `defineTheme`, enums |
| [@blankgrimoire/runtime](runtime-api.md) | Engine, strategies, dispatch, prelude |
| [@blankgrimoire/testing](testing-api.md) | VMHarness, NativeBridge, MockServer |
| [@blankgrimoire/cli](cli-api.md) | Programmatic build/sign/manifest/index |

## Schemas

| Schema | Description |
|--------|-------------|
| [JSON Schema v1](schema-v1.md) | `schema/v1.json` structure |
| [Fixtures](fixtures.md) | `fixtures/v1/` canonical examples |

## Error Codes

| Code | Context | Meaning |
|------|---------|---------|
| `E_UNSUPPORTED_API_VERSION` | Runtime, CLI | `apiVersion` ≠ 1 |
| `E_INVALID_DIGEST` | CLI | SHA-256 not 64 hex chars |
| `E_INVALID_SIGNATURE` | CLI | Signature not 64-byte base64 |
| `E_INVALID_PUBLIC_KEY` | CLI | Public key not 32-byte Ed25519 |
| `E_ALLOWLIST_DENIED` | NativeBridge | Host not in allowlist |
| `E_REDIRECT_DENIED` | NativeBridge | Redirect target not in allowlist |
| `E_UNSUPPORTED_PROTOCOL` | NativeBridge | Non-http/https URL |
| `E_DETECTION_FAILED` | VMHarness | Theme not detected |
| `E_DISPATCH_UNKNOWN_METHOD` | Runtime | Unknown dispatch method |

## Version Compatibility

| SDK Version | API Version | Schema | Fixtures |
|-------------|-------------|--------|----------|
| 1.x | 1 | `v1.json` | `v1/` |

## Related Docs

- [Architecture Overview](../architecture/overview.md)
- [Contract Overview](../contract/overview.md)