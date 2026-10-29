# Creating Your First Adapter

Complete walkthrough from project setup to a signed, publishable adapter bundle.

## Prerequisites

```bash
node --version  # >= 22
pnpm --version  # >= 9
```

## 1. Project Setup

```bash
mkdir my-theme && cd my-theme
pnpm init

# Install SDK packages
pnpm add @blankgrimoire/types
pnpm add -D @blankgrimoire/runtime @blankgrimoire/testing @blankgrimoire/cli typescript vitest

# TypeScript config
cat > tsconfig.json <<'EOF'
{
  "extends": "@blankgrimoire/types/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

# Package.json scripts
cat > package.json <<'EOF'
{
  "name": "my-theme",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc && blankgrimoire build src/index.ts --outdir dist --minify",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@blankgrimoire/cli": "workspace:*",
    "@blankgrimoire/runtime": "workspace:*",
    "@blankgrimoire/testing": "workspace:*",
    "@blankgrimoire/types": "workspace:*",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
EOF
```

## 2. Write the Adapter

```ts
// src/index.ts
import { defineTheme } from '@blankgrimoire/types';

export default defineTheme({
  id: 'theme.my',
  name: 'My Theme',
  version: '1.0.0',
  
  // Detection: how the host recognizes this theme
  detectionSignature: {
    metaGenerator: '^MyCMS',           // <meta name="generator" content="MyCMS 2.1">
    selectors: ['.my-reader', '.my-chapter-list'], // Must exist in DOM
    scriptSrc: ['/assets/my-theme\\.js'],          // Script src regex
    probePaths: ['/api/health'],       // Must return 2xx
    minScore: 4,                       // Threshold (generator=3, each selector=2)
  },
  
  // Declarative extraction (no code needed for most sites)
  selectors: {
    search: {
      path: '/search',
      item: '.search-result',
      title: '.result-title',
      link: 'a',
      cover: 'img.cover',
      nextPage: '.pagination .next',
    },
    details: {
      title: 'h1.series-title',
      cover: '.series-cover img',
      synopsis: '.series-synopsis',
      authors: '.series-authors',
      artists: '.series-artists',
      altTitles: '.series-alt-titles',
      tags: '.series-tags',
      status: '.series-status',        // Text → normalized to MangaStatus
      contentRating: '.series-rating', // Text → normalized to ContentRating
    },
    chapters: {
      item: '.chapter-list li',
      link: 'a',
      title: '.chapter-title',
      date: '.chapter-date',
      order: 'desc',
    },
    pages: {
      strategies: [
        // Strategy 1: CSS selector for images
        {
          kind: 'css',
          image: '.reader-area img',
          srcAttributes: ['data-src', 'src'],
          headers: { Referer: 'https://example.org/' },
        },
        // Strategy 2: JSON in script tag (fallback)
        {
          kind: 'scriptJSON',
          pattern: 'window.__PAGES__',
          path: 'pages',
        },
      ],
    },
    attribution: {
      logo: '.site-logo img',
      credits: '.site-credits',
    },
  },
});
```

## 3. Detection Signature File

Create `detection.json` for the manifest command:

```json
// detection.json
{
  "metaGenerator": "^MyCMS",
  "selectors": [".my-reader", ".my-chapter-list"],
  "scriptSrc": ["/assets/my-theme\\.js"],
  "probePaths": ["/api/health"],
  "minScore": 4
}
```

## 4. Write Tests

```ts
// src/index.test.ts
import { describe, expect, it } from 'vitest';
import { VMHarness } from '@blankgrimoire/testing';
import { readFileSync } from 'node:fs';
import adapter from './index.js';

const runtimeIIFE = readFileSync(
  'node_modules/@blankgrimoire/runtime/dist/runtime.js',
  'utf8',
);

const testHTML = `<!DOCTYPE html>
<html>
  <head><meta name="generator" content="MyCMS 2.1"></head>
  <body>
    <div class="my-reader">
      <div class="search-result">
        <a href="/series/test"><span class="result-title">Test Series</span></a>
        <img class="cover" src="/covers/test.jpg" />
      </div>
      <h1 class="series-title">Test Series</h1>
      <div class="series-cover"><img src="/covers/test.jpg" /></div>
      <p class="series-synopsis">A test series.</p>
      <p class="series-status">Ongoing</p>
      <p class="series-rating">Safe</p>
      <ul class="chapter-list">
        <li><a href="/series/test/ch-1"><span class="chapter-title">Chapter 1</span></a></li>
      </ul>
      <div class="reader-area">
        <img data-src="/pages/001.jpg" />
        <img src="/pages/002.jpg" />
      </div>
    </div>
  </body>
</html>`;

describe('My Theme Adapter', () => {
  const harness = new VMHarness(['example.org'], runtimeIIFE, adapter);

  it('detects the theme', async () => {
    const result = await harness.testTheme(testHTML, 'https://example.org/');
    expect(result.detected).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(4);
  });

  it('extracts search results', async () => {
    const result = await harness.testTheme(testHTML, 'https://example.org/', {
      mangaKey: 'test-series',
    });
    expect(result.search?.items).toHaveLength(1);
    expect(result.search?.items[0].title).toBe('Test Series');
  });

  it('extracts details with normalized status/rating', async () => {
    const result = await harness.testTheme(testHTML, 'https://example.org/', {
      mangaKey: 'test-series',
    });
    expect(result.details?.status).toBe('ongoing');
    expect(result.details?.contentRating).toBe('safe');
  });

  it('extracts chapters in descending order', async () => {
    const result = await harness.testTheme(testHTML, 'https://example.org/', {
      mangaKey: 'test-series',
    });
    expect(result.chapters).toHaveLength(1);
    expect(result.chapters?.[0].title).toBe('Chapter 1');
  });

  it('extracts pages via CSS strategy', async () => {
    const result = await harness.testTheme(testHTML, 'https://example.org/', {
      mangaKey: 'test-series',
      chapterKey: 'https://example.org/series/test/ch-1',
    });
    expect(result.pages).toHaveLength(2);
    expect(result.pages?.[0].imageURL).toBe('https://example.org/pages/001.jpg');
    expect(result.pages?.[1].imageURL).toBe('https://example.org/pages/002.jpg');
  });
});
```

Run tests:
```bash
pnpm test
# → 5 passed
```

## 5. Build the Bundle

```bash
pnpm build
# → dist/runtime.js (IIFE, ~20KB minified)
```

Verify the bundle:
```bash
node -e "
const vm = require('node:vm');
const fs = require('node:fs');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('dist/runtime.js', 'utf8'), ctx);
console.log('API Version:', ctx.BlankGrimoireRuntime.__apiVersion);
console.log('Has dispatch:', typeof ctx.BlankGrimoireRuntime.dispatch === 'function');
"
# → API Version: 1
# → Has dispatch: true
```

## 6. Generate Keys

```bash
# Generate Ed25519 key pair
node -e "
const crypto = require('node:crypto');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
console.log('PRIVATE (PEM):');
console.log(privateKey.export({ type: 'pkcs8', format: 'pem' }));
console.log('PUBLIC (base64):');
console.log('ed25519:' + publicKey.export({ type: 'spki', format: 'der' }).toString('base64'));
" > keys.txt

# Save private key securely (never commit!)
cat keys.txt | head -20 > private.pem
cat keys.txt | tail -1 > public.key
```

## 7. Sign and Create Manifest

```bash
# Hash
HASH=$(blankgrimoire hash dist/runtime.js)
echo "SHA256: $HASH"

# Sign
blankgrimoire sign dist/runtime.js --key-file private.pem --out dist/runtime.sig
SIG=$(cat dist/runtime.sig)
echo "Signature: $SIG"

# Manifest
blankgrimoire manifest \
  --id theme.my \
  --name "My Theme" \
  --version 1.0.0 \
  --sha256 "$HASH" \
  --detection-signature detection.json \
  --out dist/manifest.json
```

## 8. Create Repository Index

```bash
# Extensions array
cat > extensions.json <<EOF
[{
  "id": "theme.my",
  "name": "My Theme",
  "version": "1.0.0",
  "apiVersion": 1,
  "bundleURL": "themes/my/runtime.js",
  "sha256": "$HASH",
  "bundleSignature": "$SIG"
}]
EOF

# Index (use public key from step 6)
PUBLIC_KEY=$(cat public.key)
blankgrimoire index \
  --name "My Theme Repository" \
  --public-key "$PUBLIC_KEY" \
  --extensions extensions.json \
  --out public/index.json
```

## 9. Publish

```bash
# Deploy public/ to GitHub Pages
# Settings → Pages → Deploy from branch → main / public folder
```

Your repository is now at `https://<user>.github.io/<repo>/index.json`

## 10. Verify in iOS App

1. Add repository URL in BlankGrimoire iOS app
2. App fetches `index.json`, verifies signature
3. Downloads `themes/my/runtime.js`, verifies bundle signature
4. Theme appears in adapter store → install → test on site

## Next Steps

- Add user overrides support via `ThemeSelectorsOverrides`
- Write hooks for edge cases (see [Using Hooks](using-hooks.md))
- Add more extraction strategies (see [Writing Selectors](writing-selectors.md))
- Set up CI for automated builds (see [Publishing Repository](publishing-repository.md))