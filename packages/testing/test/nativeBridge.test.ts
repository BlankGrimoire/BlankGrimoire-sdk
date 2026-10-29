// SPDX-License-Identifier: MIT

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { MockServer } from '../src/mockServer.js';
import { NativeBridge } from '../src/nativeBridge.js';

describe('NativeBridge', () => {
  const server = new MockServer();
  let baseURL = '';

  beforeAll(async () => {
    server.register('/ok', async () => ({
      status: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html><body><h1>Example</h1></body></html>',
    }));
    server.register('/redirect', async () => ({
      status: 302,
      headers: { location: '/final' },
      body: '',
    }));
    server.register('/final', async () => ({
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: 'final',
    }));
    server.register('/offsite', async () => ({
      status: 302,
      headers: { location: 'https://example.com/' },
      body: '',
    }));
    await server.start();
    baseURL = `http://127.0.0.1:${server.port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('rejects requests to hosts outside the allowlist', async () => {
    const bridge = new NativeBridge(['example.org']);
    await expect(bridge.request({ url: 'https://example.com/' })).rejects.toThrow(
      /not allowed by allowlist/,
    );
  });

  it('makes requests to allowed loopback URLs', async () => {
    const bridge = new NativeBridge(['127.0.0.1']);
    const response = await bridge.request({ url: `${baseURL}/ok` });
    expect(response.status).toBe(200);
    expect(response.body).toContain('<h1>Example</h1>');
  });

  it('follows redirects that stay inside the allowlist', async () => {
    const bridge = new NativeBridge(['127.0.0.1']);
    const response = await bridge.request({ url: `${baseURL}/redirect` });
    expect(response.status).toBe(200);
    expect(response.body).toBe('final');
    expect(response.url).toBe(`${baseURL}/final`);
  });

  it('revalidates every redirect target against the allowlist', async () => {
    const bridge = new NativeBridge(['127.0.0.1']);
    await expect(bridge.request({ url: `${baseURL}/offsite` })).rejects.toThrow(
      /Host not allowed by allowlist: https:\/\/example\.com\//,
    );
  });

  it('rejects unsupported protocols after the allowlist check', async () => {
    const bridge = new NativeBridge(['127.0.0.1']);
    await expect(bridge.request({ url: 'file://127.0.0.1/etc/passwd' })).rejects.toThrow(
      /Unsupported protocol: file:/,
    );
  });

  it('parses HTML into selectable elements', () => {
    const bridge = new NativeBridge(['example.org']);
    const result = bridge.parseHTML(
      '<html><body><div class="reader"><h1>Title</h1><p class="text">Body</p></div></body></html>',
    );
    const title = result.querySelector('h1');
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe('Title');

    const paragraphs = result.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]?.textContent).toBe('Body');
  });

  it('logs without throwing', () => {
    const bridge = new NativeBridge(['example.org']);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(() => bridge.log('message', 1, { ok: true })).not.toThrow();
    expect(log).toHaveBeenCalledWith('message', 1, { ok: true });
    log.mockRestore();
  });

  it('schedules and clears timers', async () => {
    vi.useFakeTimers();
    const bridge = new NativeBridge(['example.org']);

    let cancelled = false;
    const cancelledID = bridge.setTimeout(() => {
      cancelled = true;
    }, 10);
    bridge.clearTimeout(cancelledID);
    vi.advanceTimersByTime(100);
    expect(cancelled).toBe(false);

    let fired = false;
    bridge.setTimeout(() => {
      fired = true;
    }, 10);
    vi.advanceTimersByTime(100);
    expect(fired).toBe(true);

    vi.useRealTimers();
  });
});
