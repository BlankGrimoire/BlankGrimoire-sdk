// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __apiVersion,
  __http,
  __nativeInvoke,
  __parseHTML,
  __timerFire,
  clearTimeout,
  setTimeout,
} from '../src/index.js';
import type { DocumentLike } from '../src/dom.js';

const NATIVE = globalThis as unknown as { __native?: Record<string, unknown> };

afterEach(() => {
  delete NATIVE.__native;
  vi.useRealTimers();
});

describe('__apiVersion', () => {
  it('matches API_VERSION', () => {
    expect(__apiVersion).toBe(1);
  });
});

describe('timers', () => {
  it('schedules through the native host when available', () => {
    vi.useFakeTimers();
    const hostTimers: Array<() => void> = [];
    NATIVE.__native = {
      setTimeout: (callback: () => void) => {
        hostTimers.push(callback);
        return hostTimers.length;
      },
      clearTimeout: vi.fn(),
    };

    let called = false;
    setTimeout(() => {
      called = true;
    }, 250);
    expect(hostTimers).toHaveLength(1);
    hostTimers[0]?.();
    expect(called).toBe(true);
  });

  it('fires manually when the host has no timers', () => {
    let called = false;
    const id = setTimeout(() => {
      called = true;
    }, 100);
    __timerFire(id);
    expect(called).toBe(true);
  });

  it('clearTimeout prevents firing and clears the native handle', () => {
    const clear = vi.fn();
    NATIVE.__native = { setTimeout: () => 'handle', clearTimeout: clear };

    let called = false;
    const id = setTimeout(() => {
      called = true;
    }, 10);
    clearTimeout(id);
    __timerFire(id);
    expect(called).toBe(false);
    expect(clear).toHaveBeenCalledWith('handle');
  });
});

describe('__nativeInvoke', () => {
  it('throws when the host function is missing', () => {
    expect(() => __nativeInvoke('missing')).toThrow(/Host function not implemented/);
  });

  it('calls a registered host function', () => {
    NATIVE.__native = { echo: (...args: unknown[]) => args.join(',') };
    expect(__nativeInvoke('echo', 'a', 'b')).toBe('a,b');
  });
});

describe('__http', () => {
  it('rejects when the host request is missing', async () => {
    await expect(__http({ url: 'https://example.org/' })).rejects.toThrow(
      /Host function not implemented: request/,
    );
  });

  it('resolves host responses', async () => {
    NATIVE.__native = {
      request: async (request: { url: string }) => ({
        status: 200,
        url: request.url,
        headers: {},
        body: 'ok',
      }),
    };
    await expect(__http({ url: 'https://example.org/' })).resolves.toMatchObject({
      status: 200,
      body: 'ok',
    });
  });
});

describe('__parseHTML', () => {
  it('uses the native parseHTML implementation', () => {
    const document = { querySelector: () => null, querySelectorAll: () => [] } as DocumentLike;
    NATIVE.__native = { parseHTML: () => document };
    expect(__parseHTML('<html></html>')).toBe(document);
  });

  it('throws without a native implementation or a DOM', () => {
    expect(() => __parseHTML('<html></html>')).toThrow(
      /Host function not implemented: parseHTML/,
    );
  });
});
