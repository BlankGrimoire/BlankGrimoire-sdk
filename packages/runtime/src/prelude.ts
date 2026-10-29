// SPDX-License-Identifier: MIT

import { API_VERSION, type HttpRequest, type HttpResponse } from '@blankgrimoire/types';
import type { DocumentLike } from './dom.js';

export type { HttpRequest, HttpResponse };

export const __apiVersion = API_VERSION;

interface NativeHost {
  request?: (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;
  parseHTML?: (html: string) => DocumentLike;
  log?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  setTimeout?: (callback: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  [name: string]: unknown;
}

function nativeHost(): NativeHost | undefined {
  return (globalThis as unknown as { __native?: NativeHost }).__native;
}

const timers = new Map<number, () => void>();
const timerHandles = new Map<number, unknown>();
let timerIdCounter = 0;

/**
 * Register a timer. When the host exposes `__native.setTimeout`, the callback
 * is scheduled natively after `ms`; otherwise the host must call
 * `__timerFire(id)`.
 */
export function setTimeout(cb: () => void, ms: number): number {
  const id = ++timerIdCounter;
  timers.set(id, cb);
  const host = nativeHost();
  if (host && typeof host.setTimeout === 'function') {
    const handle = host.setTimeout(() => __timerFire(id), ms);
    timerHandles.set(id, handle);
  }
  return id;
}

export function clearTimeout(id: number): void {
  timers.delete(id);
  const host = nativeHost();
  const handle = timerHandles.get(id);
  if (handle !== undefined && host && typeof host.clearTimeout === 'function') {
    host.clearTimeout(handle);
  }
  timerHandles.delete(id);
}

export function __timerFire(id: number): void {
  const cb = timers.get(id);
  if (cb) {
    timers.delete(id);
    timerHandles.delete(id);
    cb();
  }
}

/** Call a native host function by name. */
export function __nativeInvoke(fn: string, ...args: unknown[]): unknown {
  const host = nativeHost();
  if (!host || typeof host[fn] !== 'function') {
    throw new Error(`Host function not implemented: ${fn}`);
  }
  return (host[fn] as (...args: unknown[]) => unknown)(...args);
}

/** Perform a native HTTP request. */
export function __http(request: HttpRequest): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const host = nativeHost();
    if (!host || typeof host.request !== 'function') {
      reject(new Error('Host function not implemented: request'));
      return;
    }
    try {
      Promise.resolve(host.request(request)).then(resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Parse HTML through the native bridge. In Node tests the host can inject a
 * `parseHTML` implementation; jsdom documents are also accepted as a fallback.
 */
export function __parseHTML(html: string): DocumentLike {
  const host = nativeHost();
  if (host && typeof host.parseHTML === 'function') {
    return host.parseHTML(html);
  }
  const document = (globalThis as unknown as { document?: DocumentLike }).document;
  if (document?.implementation?.createHTMLDocument) {
    const parsed = document.implementation.createHTMLDocument('');
    if (parsed.documentElement) {
      parsed.documentElement.innerHTML = html;
    }
    return parsed;
  }
  throw new Error('Host function not implemented: parseHTML');
}

const console = {
  log: (...args: unknown[]): void => {
    nativeHost()?.log?.(...args);
  },
  error: (...args: unknown[]): void => {
    nativeHost()?.error?.(...args);
  },
  warn: (...args: unknown[]): void => {
    nativeHost()?.warn?.(...args);
  },
};

export { console };
