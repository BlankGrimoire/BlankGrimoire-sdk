# @blankgrimoire/cli API Reference

## Programmatic API

```ts
import {
  buildBundle,
  type BuildOptions,
  buildManifest,
  type BuildManifestOptions,
  signBundle,
  type SignOptions,
  buildIndexJson,
  type BuildIndexJsonOptions,
  type ExtensionEntry,
  runCLI,
  type CLIIO,
} from '@blankgrimoire/cli';
```

## `buildBundle(options)`

```ts
interface BuildOptions {
  entry: string;              // Entry file path
  outdir: string;             // Output directory
  outFile?: string;           // Output filename (default: 'runtime.js')
  minify?: boolean;           // Default: false
  sourcemap?: boolean;        // Default: false
}

async function buildBundle(options: BuildOptions): Promise<string>;
// Returns output file path
// Uses esbuild: IIFE, ES2020, browser, globalName: 'BlankGrimoireRuntime'
```

### Example
```ts
await buildBundle({
  entry: 'src/index.ts',
  outdir: 'dist',
  outFile: 'dist/runtime.js',
  minify: true,
  sourcemap: true,
});
// → 'dist/runtime.js'
```

## `buildManifest(options)`

```ts
interface BuildManifestOptions {
  id: string;                 // Adapter ID (e.g., 'theme.example')
  name: string;               // Display name
  version: string;            // Semver
  detectionSignature: ThemeSignature;  // From @blankgrimoire/types
  sha256: string;             // 64 lowercase hex chars
  outFile: string;            // Output manifest path
}

async function buildManifest(options: BuildManifestOptions): Promise<string>;
// Returns output file path
// Validates sha256 format (64 hex chars)
// Uses API_VERSION (1) automatically
```

### Example
```ts
await buildManifest({
  id: 'theme.example',
  name: 'Example Theme',
  version: '1.0.0',
  detectionSignature: {
    metaGenerator: '^ExampleCMS',
    selectors: ['.example-reader'],
    minScore: 3,
  },
  sha256: 'a1b2c3...',
  outFile: 'dist/manifest.json',
});
```

## `signBundle(options)`

```ts
interface SignOptions {
  privateKey: string;         // PEM, base64 PKCS#8 DER, or base64 32-byte seed
  data: string | Buffer;      // Data to sign (bundle content)
  outFile?: string;           // Optional output file
}

async function signBundle(options: SignOptions): Promise<string>;
// Returns base64-encoded Ed25519 signature
// Writes to outFile if provided
```

### Key Formats Accepted

| Format | Example |
|--------|---------|
| PEM (PKCS#8) | `-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEI...\n-----END PRIVATE KEY-----` |
| Base64 PKCS#8 DER | `MC4CAQAwBQYDK2VwBCIEI...` |
| Base64 32-byte seed | `dGVzdHNlZWRzZWVkc2VlZHNlZWRzZWVkcw==` |

### Algorithm
- Uses `crypto.sign(null, data, privateKey)` (Ed25519 = EdDSA, null digest)
- Returns base64 signature (64 bytes → 88 chars)

### Example
```ts
const signature = await signBundle({
  privateKey: fs.readFileSync('private.pem', 'utf8'),
  data: fs.readFileSync('dist/runtime.js'),
  outFile: 'dist/runtime.sig',
});
// signature = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
```

## `buildIndexJson(options)`

```ts
interface ExtensionEntry {
  id: string;
  name: string;
  version: string;
  apiVersion: number;         // Must be 1
  bundleURL: string;          // Relative to index.json
  sha256: string;             // 64 lowercase hex
  bundleSignature: string;    // Base64 Ed25519 (64 bytes)
}

interface BuildIndexJsonOptions {
  name: string;               // Repository display name
  publicKey: string;          // "ed25519:BASE64" (32 bytes)
  extensions: ExtensionEntry[];
  outFile: string;            // Output index path
}

async function buildIndexJson(options: BuildIndexJsonOptions): Promise<string>;
// Returns output file path
// Validates:
//   - publicKey decodes to 32 bytes
//   - each sha256 = 64 hex chars
//   - each bundleSignature decodes to 64 bytes
//   - each apiVersion = 1
//   - no extra fields in extensions
```

### Example
```ts
await buildIndexJson({
  name: 'My Repository',
  publicKey: 'ed25519:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  extensions: [{
    id: 'theme.example',
    name: 'Example Theme',
    version: '1.0.0',
    apiVersion: 1,
    bundleURL: 'themes/example/runtime.js',
    sha256: 'a1b2c3...',
    bundleSignature: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
  }],
  outFile: 'public/index.json',
});
```

## `runCLI(argv, io?)`

```ts
interface CLIIO {
  log(message: string): void;
  error(message: string): void;
}

async function runCLI(argv: string[], io?: CLIIO): Promise<number>;
// Returns exit code (0 = success, 1 = error)
// Default io: console.log / console.error
```

### Commands

| Command | Description |
|---------|-------------|
| `build <entry> --outdir <dir> [--outfile <file>] [--minify] [--sourcemap]` | Build IIFE bundle |
| `manifest --id <id> --name <name> --version <ver> --sha256 <hex> --detection-signature <file> --out <file>` | Generate manifest |
| `sign <file> (--key-file <file> \| BLANKGRIMOIRE_PRIVATE_KEY) [--out <file>]` | Sign bundle |
| `index --name <name> --public-key <key> --extensions <file> --out <file>` | Generate index.json |
| `hash <file>` | Compute SHA-256 |
| `help` / `--help` / `-h` | Show usage |

### Example
```ts
// Capture output
const logs: string[] = [];
const errors: string[] = [];
const io = {
  log: (m) => logs.push(m),
  error: (m) => errors.push(m),
};

await runCLI(['build', 'src/index.ts', '--outdir', 'dist', '--minify'], io);
await runCLI(['hash', 'dist/runtime.js'], io);
await runCLI(['sign', 'dist/runtime.js', '--key-file', 'private.pem', '--out', 'dist/runtime.sig'], io);
```

## Error Handling

All functions throw on validation errors:

```ts
try {
  await buildManifest({ ... });
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);  // e.g., "sha256 must be 64 lowercase hexadecimal characters"
  }
}
```

## Complete Workflow Example

```ts
import { buildBundle, buildManifest, signBundle, buildIndexJson } from '@blankgrimoire/cli';
import { readFileSync, writeFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';

// 1. Generate keys (one-time)
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privPEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubKey = 'ed25519:' + publicKey.export({ type: 'spki', format: 'der' }).toString('base64');

// 2. Build bundle
await buildBundle({ entry: 'src/index.ts', outdir: 'dist', minify: true });

// 3. Hash
const bundle = readFileSync('dist/runtime.js');
const hash = require('node:crypto').createHash('sha256').update(bundle).digest('hex');

// 4. Sign
const sig = await signBundle({ privateKey: privPEM, data: bundle, outFile: 'dist/runtime.sig' });

// 5. Manifest
await buildManifest({
  id: 'theme.my',
  name: 'My Theme',
  version: '1.0.0',
  detectionSignature: { selectors: ['.my-reader'], minScore: 2 },
  sha256: hash,
  outFile: 'dist/manifest.json',
});

// 6. Index
await buildIndexJson({
  name: 'My Repo',
  publicKey: pubKey,
  extensions: [{
    id: 'theme.my',
    name: 'My Theme',
    version: '1.0.0',
    apiVersion: 1,
    bundleURL: 'themes/my/runtime.js',
    sha256: hash,
    bundleSignature: sig,
  }],
  outFile: 'public/index.json',
});

// 7. Copy to public/themes/my/
// 8. Deploy public/ to GitHub Pages
```

## Related Docs

- [CLI Overview](../cli/overview.md)
- [Publishing Repository](../guides/publishing-repository.md)
- [Contract: Manifest & Index](../contract/overview.md)