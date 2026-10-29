// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { MockServer } from '../src/mockServer.js';

describe('MockServer', () => {
  it('avvia e ferma il server', async () => {
    const server = new MockServer();
    await server.start();
    expect(server.port).toBeGreaterThan(0);
    expect(server.isStarted).toBe(true);
    await server.stop();
    expect(server.isStarted).toBe(false);
  });

  it('risponde agli handler registrati', async () => {
    const server = new MockServer();
    server.register('/page', async () => ({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html><body>ok</body></html>',
    }));
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.port}/page`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('ok');

    await server.stop();
  });

  it('ritorna 404 per path non registrato', async () => {
    const server = new MockServer();
    await server.start();

    const res = await fetch(`http://127.0.0.1:${server.port}/unknown`);
    expect(res.status).toBe(404);

    await server.stop();
  });
});
