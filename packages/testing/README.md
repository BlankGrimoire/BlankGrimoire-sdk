# @blankgrimoire/testing

Node testing utilities for BlankGrimoire theme adapters:

- `NativeBridge` — emulates the `__native` bridge with an HTTP allowlist.
- `MockServer` — loopback HTTP server bound to `127.0.0.1` for synthetic pages.
- `VMHarness` — loads the real `dist/runtime.js` IIFE in a `node:vm` context
  and runs an adapter end-to-end.

## NativeBridge

The allowlist accepts bare hosts (`example.org`) and full URLs
(`https://www.example.org/path`). Every redirect target is revalidated before
the next request; leaving the allowlist throws. Only `http:` and `https:` are
supported.

```ts
import { NativeBridge } from '@blankgrimoire/testing';

const bridge = new NativeBridge(['example.org']);
const response = await bridge.request({ url: 'https://example.org/search' });
```

`parseHTML` uses jsdom and returns the runtime `DocumentLike` interface.

## VMHarness

```ts
import { readFileSync } from 'node:fs';
import { VMHarness } from '@blankgrimoire/testing';

const runtimeIIFE = readFileSync(
  'node_modules/@blankgrimoire/runtime/dist/runtime.js',
  'utf8',
);

const harness = new VMHarness(['example.org'], runtimeIIFE, adapterModule);
const result = await harness.testTheme(html, 'https://example.org/', {
  mangaKey: 'lorem-ipsum',
});
```

The harness scores the detection signature, then calls the runtime through its
JSON dispatcher. When the theme is not detected it returns only detection data.
Adapters may be passed directly or as a module-shaped `{ default: adapter }`.

## MockServer

```ts
import { MockServer } from '@blankgrimoire/testing';

const server = new MockServer();
server.register('/page', async () => ({
  status: 200,
  headers: { 'content-type': 'text/html' },
  body: '<html><body>Lorem ipsum</body></html>',
}));
await server.start();
// server.port -> 127.0.0.1:<port>
await server.stop();
```

## Development

```bash
pnpm build
pnpm typecheck
pnpm test
```

The test script builds `@blankgrimoire/runtime` first so the harness always
loads the real IIFE artifact.

License: MIT — © BlankGrimoire contributors.
