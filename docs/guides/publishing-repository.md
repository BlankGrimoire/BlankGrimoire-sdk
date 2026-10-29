# Publishing a Theme Repository

Guide to building, signing, and publishing a theme adapter repository (GitHub Pages + `index.json`).

## Repository Structure

```
my-theme-repo/
├── public/                    # GitHub Pages source
│   ├── index.json            # Repository index (generated)
│   └── themes/
│       └── my-theme/
│           ├── runtime.js    # Signed IIFE bundle
│           ├── runtime.sig   # Ed25519 signature
│           └── manifest.json # Adapter manifest
├── src/                      # Adapter source (private)
├── detection.json            # Detection signature (private)
├── private.pem               # Private key (NEVER COMMIT)
├── public.key                # Public key (for index.json)
├── extensions.json           # Extensions array (generated)
└── package.json
```

## 1. Generate Keys

```bash
# One-time setup
node -e "
const crypto = require('node:crypto');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const priv = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pub = 'ed25519:' + publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
require('fs').writeFileSync('private.pem', priv);
require('fs').writeFileSync('public.key', pub);
console.log('Keys generated. KEEP private.pem SECRET!');
"
```

**Security**:
- `private.pem` → **Never commit**, store in GitHub Environment Secrets
- `public.key` → Safe to reference, not secret
- Rotate keys periodically; update `publicKey` in `index.json`

## 2. Configure GitHub Secrets

Repository → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|------|-------|
| `BLANKGRIMOIRE_PRIVATE_KEY` | Contents of `private.pem` (PEM format) |
| `REPO_PUBLIC_KEY` | Contents of `public.key` (e.g., `ed25519:AAAA...`) |

## 3. Build Script

```bash
#!/usr/bin/env bash
# scripts/build-and-publish.sh
set -euo pipefail

THEME_ID="theme.my"
THEME_NAME="My Theme"
THEME_VERSION="1.0.0"
REPO_NAME="My Theme Repository"

# 1. Build bundle
blankgrimoire build src/index.ts --outdir dist --minify

# 2. Hash
HASH=$(blankgrimoire hash dist/runtime.js)

# 3. Sign (uses BLANKGRIMOIRE_PRIVATE_KEY from env)
blankgrimoire sign dist/runtime.js --out dist/runtime.sig
SIG=$(cat dist/runtime.sig)

# 4. Manifest
blankgrimoire manifest \
  --id "$THEME_ID" \
  --name "$THEME_NAME" \
  --version "$THEME_VERSION" \
  --sha256 "$HASH" \
  --detection-signature detection.json \
  --out dist/manifest.json

# 5. Copy to public/themes/
mkdir -p public/themes/my-theme
cp dist/runtime.js dist/runtime.sig dist/manifest.json public/themes/my-theme/

# 6. Update extensions.json
cat > extensions.json <<EOF
[{
  "id": "$THEME_ID",
  "name": "$THEME_NAME",
  "version": "$THEME_VERSION",
  "apiVersion": 1,
  "bundleURL": "themes/my-theme/runtime.js",
  "sha256": "$HASH",
  "bundleSignature": "$SIG"
}]
EOF

# 7. Generate index.json
blankgrimoire index \
  --name "$REPO_NAME" \
  --public-key "$REPO_PUBLIC_KEY" \
  --extensions extensions.json \
  --out public/index.json

echo "✅ Repository ready at public/"
```

## 4. GitHub Actions Workflow

```yaml
# .github/workflows/publish.yml
name: Publish Repository

on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'detection.json'
      - 'scripts/**'

permissions:
  contents: write  # For GitHub Pages deploy

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      
      - run: pnpm install --frozen-lockfile
      
      - name: Build runtime dependency
        run: pnpm --filter @blankgrimoire/runtime build
      
      - name: Build and sign adapter
        env:
          BLANKGRIMOIRE_PRIVATE_KEY: ${{ secrets.BLANKGRIMOIRE_PRIVATE_KEY }}
          REPO_PUBLIC_KEY: ${{ secrets.REPO_PUBLIC_KEY }}
        run: bash scripts/build-and-publish.sh
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
          force_orphan: true
```

## 5. Repository Index Format

```json
{
  "formatVersion": 1,
  "name": "My Theme Repository",
  "publicKey": "ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  "extensions": [
    {
      "id": "theme.my",
      "name": "My Theme",
      "version": "1.0.0",
      "apiVersion": 1,
      "bundleURL": "themes/my-theme/runtime.js",
      "sha256": "a1b2c3...",
      "bundleSignature": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="
    }
  ]
}
```

**Validations enforced by CLI**:
- `publicKey` decodes to exactly 32 bytes
- Each `sha256` = 64 lowercase hex chars
- Each `bundleSignature` decodes to exactly 64 bytes
- Each `apiVersion` = 1
- No extra fields in extensions

## 6. Adding Multiple Themes

```bash
# In build script, append to extensions.json
cat > extensions.json <<EOF
[
  {
    "id": "theme.first",
    "name": "First Theme",
    "version": "1.0.0",
    "apiVersion": 1,
    "bundleURL": "themes/first/runtime.js",
    "sha256": "$HASH1",
    "bundleSignature": "$SIG1"
  },
  {
    "id": "theme.second",
    "name": "Second Theme",
    "version": "1.0.0",
    "apiVersion": 1,
    "bundleURL": "themes/second/runtime.js",
    "sha256": "$HASH2",
    "bundleSignature": "$SIG2"
  }
]
EOF
```

## 7. Key Rotation

```bash
# 1. Generate new keys
node -e "
const crypto = require('node:crypto');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
console.log('NEW PRIVATE:');
console.log(privateKey.export({ type: 'pkcs8', format: 'pem' }));
console.log('NEW PUBLIC:');
console.log('ed25519:' + publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
"

# 2. Update GitHub Secrets
# BLANKGRIMOIRE_PRIVATE_KEY → new private
# REPO_PUBLIC_KEY → new public

# 3. Re-sign ALL existing bundles
# 4. Re-generate index.json with new public key
# 5. Deploy — app will verify new signatures on next fetch
```

## 8. GitHub Pages Setup

1. Repository → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `gh-pages` (created by `peaceiris/actions-gh-pages`) / `/ (root)`
4. Save → URL: `https://<user>.github.io/<repo>/index.json`

## 9. Verify Published Index

```bash
curl -s https://<user>.github.io/<repo>/index.json | jq .
# Should show valid JSON with formatVersion, name, publicKey, extensions[]
```

## 10. iOS App Configuration

In BlankGrimoire iOS app:
1. Add repository URL: `https://<user>.github.io/<repo>/index.json`
2. App fetches index, verifies `publicKey` signature
3. Downloads bundles, verifies `bundleSignature`
4. Themes appear in adapter store

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `publicKey must decode to 32-byte` | Wrong key format | Use `ed25519:BASE64` of 32-byte SPKI DER |
| `bundleSignature must decode to 64 bytes` | Truncated signature | Re-sign with correct private key |
| `Unsupported apiVersion: 2` | Wrong apiVersion | Use `1` in extensions |
| `Host not allowed by allowlist` | Network test | Use `127.0.0.1` or `example.org` |

## Related Docs

- [CLI Reference](../cli/overview.md)
- [Contract: Manifest & Index](../contract/overview.md)
- [Creating First Adapter](creating-first-adapter.md)