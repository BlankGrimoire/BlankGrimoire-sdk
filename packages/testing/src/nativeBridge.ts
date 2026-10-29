// @ts-ignore - jsdom has no bundled type declarations
import { JSDOM } from 'jsdom';
import { isAllowed } from './allowlist.js';

export type NativeRequestOptions = {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
};

export type NativeResponse = {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
};

export type NativeParseResult = {
  querySelector: (selector: string) => Element | null;
  querySelectorAll: (selector: string) => Element[];
};

/**
 * Emula il bridge __native esposto dal runtime agli adapter.
 * Tutte le operazioni di rete sono soggette all'host allowlist.
 */
export class NativeBridge {
  private timers = new Map<number, { nativeId: any; cb: () => void }>();
  private timerIdCounter = 0;

  constructor(private allowedHosts: string[]) {}

  /** Effettua una richiesta HTTP soggetta all'allowlist. */
  async request(options: NativeRequestOptions): Promise<NativeResponse> {
    if (!isAllowed(options.url, this.allowedHosts)) {
      throw new Error(`Host not allowed by allowlist: ${options.url}`);
    }
    const fetchOptions: RequestInit = {
      method: options.method ?? 'GET',
    };
    if (options.headers) {
      fetchOptions.headers = options.headers;
    }
    if (options.body !== undefined) {
      fetchOptions.body = options.body;
    }
    const res = await fetch(options.url, fetchOptions);
    const text = await res.text();
    return {
      status: res.status,
      url: res.url,
      headers: Object.fromEntries(res.headers.entries()),
      body: text,
    };
  }

  /** Parsa una stringa HTML in un oggetto DOM-like. */
  parseHTML(html: string): NativeParseResult {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    return {
      querySelector: (selector: string) => doc.querySelector(selector),
      querySelectorAll: (selector: string) =>
        Array.from(doc.querySelectorAll(selector)),
    };
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
