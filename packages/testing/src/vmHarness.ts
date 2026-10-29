// @ts-ignore - jsdom has no bundled type declarations; imported for DOM parsing
import { JSDOM } from 'jsdom';
import { NativeBridge } from './nativeBridge.js';
import type { ThemeAdapter } from '@blankgrimoire/types';

type WindowWithNative = Window & typeof globalThis & {
  __native: Record<string, unknown>;
};

/**
 * Harness che carica dist/runtime.js (IIFE) + un adapter in un contesto vm
 * isolato, emulando l'ambiente JavaScriptCore dell'iOS.
 * Espone testTheme() per eseguire un adapter end-to-end in test.
 */
export class VMHarness {
  private bridge: NativeBridge;
  private vmGlobals: Record<string, unknown>;
  private adapterExports: unknown;

  constructor(
    allowedHosts: string[],
    runtimeIIFE: string,
    adapterModule: { default: ThemeAdapter } | ThemeAdapter,
  ) {
    this.bridge = new NativeBridge(allowedHosts);

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const window = dom.window as unknown as WindowWithNative;

    // Bridge nativo esposto all'adapter
    window.__native = {
      request: (req: unknown) => this.bridge.request(req as any),
      parseHTML: (html: string) => this.bridge.parseHTML(html),
      log: (...args: unknown[]) => this.bridge.log(...args),
      setTimeout: (cb: () => void, ms: number) => this.bridge.setTimeout(cb, ms),
      clearTimeout: (id: number) => this.bridge.clearTimeout(id),
    };

    window.console = window.console ?? console;

    // IIFE del runtime: riceve window/__native e restituisce l'engine
    const runtimeFn = new Function(
      'window',
      '__native',
      'document',
      runtimeIIFE,
    );
    const engine = runtimeFn(window, window.__native, window.document);

    const adapter =
      'default' in adapterModule ? adapterModule.default : adapterModule;

    this.vmGlobals = {
      window,
      document: window.document,
      __native: window.__native,
      console: window.console,
      engine,
      adapter,
    };

    this.adapterExports = adapter;
  }

  /** Esegue l'adapter end-to-end: detect theme, extract summary, details, chapters, pages. */
  async testTheme(html: string, url: string = 'https://example.org/'): Promise<{
    signature: unknown;
    selectors: unknown;
    summary?: unknown;
    details?: unknown;
    chapters?: unknown;
    pages?: unknown;
  }> {
    const adapter = this.adapterExports as ThemeAdapter;

    // 1. Theme detection (simulata: confrontiamo signature con semplici heuristici HTML)
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const generator = doc.querySelector('meta[name="generator"]')?.content ?? '';

    let matched = false;
    if (adapter.signature.metaGenerator) {
      const re = new RegExp(adapter.signature.metaGenerator);
      matched = re.test(generator);
    }

    if (!matched && adapter.signature.selectors) {
      for (const sel of adapter.signature.selectors) {
        if (doc.querySelector(sel)) {
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      return {
        signature: adapter.signature,
        selectors: adapter.selectors,
      };
    }

    // 2. Estrazione summary/details (usa hook dell'adapter se presente, altrimenti valori sintetici)
    const siteContext = {
      baseURL: url,
      siteName: 'Example Site',
      overrides: {},
    } as any;

    let summary: unknown;
    let details: unknown;
    let chapters: unknown;
    let pages: unknown;

    if (adapter.hooks?.getMangaDetails) {
      details = await adapter.hooks.getMangaDetails(siteContext, 'lorem-ipsum');
    } else {
      summary = {
        key: 'lorem-ipsum',
        title: 'Lorem Ipsum',
        coverURL: 'https://example.org/covers/lorem-ipsum.jpg',
      };
    }

    if (adapter.hooks?.getChapters && details) {
      chapters = await adapter.hooks.getChapters(siteContext, 'lorem-ipsum');
    }

    if (adapter.hooks?.getPages && chapters) {
      const ch = Array.isArray(chapters) ? chapters[0] : chapters;
      const chKey = (ch as any)?.key ?? 'chapter-1';
      pages = await adapter.hooks.getPages(siteContext, 'lorem-ipsum', chKey);
    }

    return {
      signature: adapter.signature,
      selectors: adapter.selectors,
      summary,
      details,
      chapters,
      pages,
    };
  }

  /** Espone il bridge per test che vogliono simulare risposte di rete. */
  getNativeBridge(): NativeBridge {
    return this.bridge;
  }
}
