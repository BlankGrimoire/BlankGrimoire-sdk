# @blankgrimoire/cli

Build, manifest and signing tooling for BlankGrimoire theme adapters.

## Install

The package exposes the `blankgrimoire` executable:

```bash
pnpm add -D @blankgrimoire/cli
pnpm exec blankgrimoire --help
```

## Commands

### Build a bundle

```bash
blankgrimoire build themes/example/src/index.ts \
  --outdir themes/example/dist \
  --outfile themes/example/dist/runtime.js \
  --minify
```

Produces one IIFE bundle exposing the `BlankGrimoireRuntime` global.

### Hash a bundle

```bash
blankgrimoire hash themes/example/dist/runtime.js
```

Prints the lowercase SHA-256 digest required by manifests and repository
indexes.

### Write a manifest

```bash
blankgrimoire manifest \
  --id theme.example \
  --name "Example Theme" \
  --version 1.0.0 \
  --sha256 <digest> \
  --detection-signature detection.json \
  --out themes/example/dist/manifest.json
```

`detection.json` is the `ThemeSignature` JSON object (selectors, generator,
probe paths, `minScore`). The manifest uses `apiVersion: 1` automatically.

### Sign a bundle

```bash
blankgrimoire sign themes/example/dist/runtime.js \
  --key-file "$PRIVATE_KEY_FILE" \
  --out themes/example/dist/runtime.sig
```

The key may be PEM, base64 PKCS#8 DER, or a base64 32-byte Ed25519 seed. It can
also be supplied through `BLANKGRIMOIRE_PRIVATE_KEY`. Never commit private keys:
production keys live only in GitHub environment secrets. The signature is
base64-encoded Ed25519.

### Write a repository index

```bash
blankgrimoire index \
  --name "Example Repository" \
  --public-key "ed25519:<base64>" \
  --extensions extensions.json \
  --out public/index.json
```

`extensions.json` is the JSON array of index entries. The command validates
`apiVersion`, SHA-256 digests, the public key format and base64 signatures
before writing the index.

## Development

```bash
pnpm build      # compiles dist/ and marks dist/cli.js executable
pnpm typecheck
pnpm test
```

License: MIT — © BlankGrimoire contributors.
