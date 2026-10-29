// SPDX-License-Identifier: MIT

// @ts-ignore - jsdom has no bundled type declarations
import { JSDOM } from 'jsdom';
import type { HttpRequest } from '@blankgrimoire/types';
import type { DocumentLike } from '@blankgrimoire/runtime';
import { isAllowed } from './allowlist.js';

export type NativeRequestOptions = HttpRequest;

export type NativeResponse = {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type NativeParseResult = DocumentLike;

const MAX_REDIRECTS = 5;

/**
 * Emulates the `__native` bridge exposed by the runtime to adapters.
 * Every network operation is subject to the host allowlist, including each
 * redirect target.
 */
export class NativeBridge {
  private timers = new Map<number, { nativeId: ReturnType<typeof setTimeout>; cb: () => void }>();
  private timerIdCounter = 0;

  constructor(private readonly allowedHosts: string[]) {}

  async request(options: NativeRequestOptions): Promise<NativeResponse> {
    let current = options.url;
    let method = options.method ?? 'GET';
    let body = options.body;

    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      if (!isAllowed(current, this.allowedHosts)) {
        throw new Error(`Host not allowed by allowlist: ${current}`);
      }

      let parsed: URL;
      try {
        parsed = new URL(current);
      } catch {
        throw new Error(`Invalid request URL: ${current}`);
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Unsupported protocol: ${parsed.protocol}`);
      }

      const fetchOptions: RequestInit = {
        method,
        redirect: 'manual',
      };
      if (options.headers) {
        fetchOptions.headers = options.headers;
      }
      if (body !== undefined) {
        fetchOptions.body = body;
      }

      const response = await fetch(current, fetchOptions);
      const location = response.headers.get('location');

      if (response.status >= 300 && response.status < 400 && location) {
        current = new URL(location, current).toString();
        if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === 'POST')) {
          method = 'GET';
          body = undefined;
        }
        continue;
      }

      const text = await response.text();
      return {
        status: response.status,
        url: response.url || current,
        headers: Object.fromEntries(response.headers.entries()),
        body: text,
      };
    }

    throw new Error(`Too many redirects: ${options.url}`);
  }

  parseHTML(html: string): NativeParseResult {
    const dom = new JSDOM(html);
    return dom.window.document as unknown as DocumentLike;
  }

  log(...args: unknown[]): void {
    console.log(...args);
  }

  setTimeout(cb: () => void, ms: number): number {
    const id = ++this.timerIdCounter;
    const nativeId = setTimeout(() => {
      const entry = this.timers.get(id);
      if (entry) {
        this.timers.delete(id);
        entry.cb();
      }
    }, ms);
    (nativeId as { unref?: () => void }).unref?.();
    this.timers.set(id, { nativeId, cb });
    return id;
  }

  clearTimeout(id: number): void {
    const entry = this.timers.get(id);
    if (entry !== undefined) {
      clearTimeout(entry.nativeId);
      this.timers.delete(id);
    }
  }
}
