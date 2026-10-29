# CLI Overview

The `@blankgrimoire/cli` package provides the `blankgrimoire` executable for building, signing, and publishing theme adapters.

## Installation

```bash
pnpm add -D @blankgrimoire/cli
# or
npm install -D @blankgrimoire/cli

# Use via pnpm/npx
pnpm exec blankgrimoire --help
npx blankgrimoire --help
```

## Commands

### `blankgrimoire build`

Builds a TypeScript/JavaScript entry point into a single IIFE bundle.

```bash
blankgrimoire build <entry> --outdir <dir> [--outfile <file>] [--minify] [--sourcemap]
```

| Option | Required | Description |
|--------|----------|-------------|
| `<entry>` | Yes | Entry file (e.g., `src/index.ts`) |
| `--outdir` | Yes | Output directory |
| `--outfile` | No | Output filename (default: `runtime.js`) |
| `--minify` | No | Minify output |
| `--sourcemap` | No | Generate source map |

**Output**: Single IIFE file exposing `BlankGrimoireRuntime` global.

```bash
blankgrimoire build src/index.ts --outdir dist --outfile dist/runtime.js --minify
# → Built dist/runtime.js
```

### `blankgrimoire hash`

Computes SHA-256 digest of a file (required for manifest and index).

```bash
blankgrimoire hash <file>
```

```bash
blankgrimoire hash dist/runtime.js
# → a1b2c3... (64 lowercase hex chars)
```

### `blankgrimoire manifest`

Generates an `AdapterManifest` JSON file.

```bash
blankgrimoire manifest \
  --id <id> \
  --name <name> \
  --version <version> \
  --sha256 <digest> \
  --detection-signature <file> \
  --out <file>
```

| Option | Required | Description |
|--------|----------|-------------|
| `--id` | Yes | Adapter ID (e.g., `theme.example`) |
| `--name` | Yes | Display name |
| `--version` | Yes | Semver version |
| `--sha256` | Yes | 64-char lowercase hex digest |
| `--detection-signature` | Yes | Path to `ThemeSignature` JSON |
| `--out` | Yes | Output manifest file |

**Detection signature file** (`detection.json`):
```json
{
  "metaGenerator": "^ExampleCMS",
  "selectors": [".example-reader"],
  "scriptSrc": ["/assets/theme\\.js"],
  "probePaths": ["/health"],
  "minScore": 3
}
```

**Output** (`manifest.json`):
```json
{
  "id": "theme.example",
  "name": "Example Theme",
  "version": "1.0.0",
  "apiVersion": 1,
  "detectionSignature": { ... },
  "sha256": "a1b2c3..."
}
```

### `blankgrimoire sign`

Signs a bundle with Ed25519 private key.

```bash
blankgrimoire sign <file> \
  (--key-file <file> | BLANKGRIMOIRE_PRIVATE_KEY) \
  [--out <file>]
```

| Option | Required | Description |
|--------|----------|-------------|
| `<file>` | Yes | File to sign (typically `dist/runtime.js`) |
| `--key-file` | Yes* | Path to private key file |
| `BLANKGRIMOIRE_PRIVATE_KEY` | Yes* | Environment variable with key |
| `--out` | No | Output signature file (default: stdout) |

*One of `--key-file` or `BLANKGRIMOIRE_PRIVATE_KEY` required.

**Accepted key formats**:
1. **PEM** (PKCS#8):
   ```
   -----BEGIN PRIVATE KEY-----
   MC4CAQAwBQYDK2VwBCIEI...
   -----END PRIVATE KEY-----
   ```
2. **Base64 PKCS#8 DER**: Raw base64 of PKCS#8 DER
3. **Base64 32-byte seed**: Raw 32-byte Ed25519 seed, base64-encoded

**Output**: Base64-encoded Ed25519 signature (64 bytes → 88 chars base64).

```bash
# Via file
blankgrimoire sign dist/runtime.js --key-file private.pem --out dist/runtime.sig
# → Wrote dist/runtime.sig

# Via env (CI)
BLANKGRIMOIRE_PRIVATE_KEY="$(cat private.pem)" blankgrimoire sign dist/runtime.js
# → <base64-signature>
```

### `blankgrimoire index`

Generates a repository `index.json` for publishing to GitHub Pages.

```bash
blankgrimoire index \
  --name <name> \
  --public-key <key> \
  --extensions <file> \
  --out <file>
```

| Option | Required | Description |
|--------|----------|-------------|
| `--name` | Yes | Repository display name |
| `--public-key` | Yes | Ed25519 public key as `ed25519:BASE64` (32 bytes) |
| `--extensions` | Yes | Path to extensions array JSON |
| `--out` | Yes | Output index file |

**Extensions file** (`extensions.json`):
```json
[
  {
    "id": "theme.example",
    "name": "Example Theme",
    "version": "1.0.0",
    "apiVersion": 1,
    "bundleURL": "themes/example/runtime.js",
    "sha256": "a1b2c3...",
    "bundleSignature": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
  }
]
```

**Output** (`index.json`):
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
      "sha256": "a1b2c3...",
      "bundleSignature": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
    }
  ]
}
```

**Validations**:
- `publicKey` decodes to exactly 32 bytes
- Each `sha256` is 64 lowercase hex chars
- Each `bundleSignature` decodes to exactly 64 bytes
- Each `apiVersion` equals `1`

## Complete Workflow

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Build bundle
blankgrimoire build src/index.ts --outdir dist --minify

# 2. Hash bundle
HASH=$(blankgrimoire hash dist/runtime.js)

# 3. Sign bundle
blankgrimoire sign dist/runtime.js --key-file "$PRIVATE_KEY_FILE" --out dist/runtime.sig
SIG=$(cat dist/runtime.sig)

# 4. Create manifest
blankgrimoire manifest \
  --id theme.example \
  --name "Example Theme" \
  --version 1.0.0 \
  --sha256 "$HASH" \
  --detection-signature detection.json \
  --out dist/manifest.json

# 5. Create extensions array for index
cat > extensions.json <<EOF
[{
  "id": "theme.example",
  "name": "Example Theme",
  "version": "1.0.0",
  "apiVersion": 1,
  "bundleURL": "themes/example/runtime.js",
  "sha256": "$HASH",
  "bundleSignature": "$SIG"
}]
EOF

# 6. Create repository index
blankgrimoire index \
  --name "My Theme Repository" \
  --public-key "ed25519:$PUBLIC_KEY_BASE64" \
  --extensions extensions.json \
  --out public/index.json

# 7. Publish public/ to GitHub Pages
```

## Programmatic API

All commands available as functions:

```ts
import { buildBundle, buildManifest, signBundle, buildIndexJson } from '@blankgrimoire/cli';

await buildBundle({ entry: 'src/index.ts', outdir: 'dist', minify: true });
const hash = await hashFile('dist/runtime.js');
const sig = await signBundle({ privateKey: pem, data: bundleBuffer, outFile: 'dist/runtime.sig' });
await buildManifest({ id: 'theme.example', name: 'Example', version: '1.0.0', detectionSignature, sha256: hash, outFile: 'dist/manifest.json' });
await buildIndexJson({ name: 'Repo', publicKey: 'ed25519:...', extensions, outFile: 'public/index.json' });
```

## Security Notes

- **Never commit private keys** — Use GitHub Environment Secrets for CI
- **Production keys** — Only in GitHub secrets, never in repo
- **Key rotation** — Update `publicKey` in `index.json` and re-sign all bundles
- **Allowlist** — Repository `index.json` served over HTTPS; app verifies signature on every fetch

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Usage error or validation failure |
| `2` | I/O error |

## Related Docs

- [Architecture Overview](../architecture/overview.md)
- [Contract: Manifest & Index](../contract/overview.md)
- [Runtime Bundle](../runtime/overview.md)