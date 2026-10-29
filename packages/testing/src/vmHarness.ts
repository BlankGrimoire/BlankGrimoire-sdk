// SPDX-License-Identifier: MIT

// @ts-ignore - jsdom has no bundled type declarations
import { JSDOM } from 'jsdom';
import * as nodeVm from 'node:vm';
import {
  API_VERSION,
  type Chapter,
  type MangaDetails,
  type MangaSummary,
  type Page,
  type PagedResult,
  type SearchQuery,
  type ThemeAdapter,
  type ThemeSelectors,
  type ThemeSignature,
} from '@blankgrimoire/types';
import type {
  DocumentLike,
  ThemeRuntimeOptions,
  WindowLike,
} from '@blankgrimoire/runtime';
import { NativeBridge } from './nativeBridge.js';

type RuntimeGlobal = {
  __apiVersion?: number;
  dispatch?: (runtime: ThemeRuntimeOptions, method: string, argsJSON: string) => Promise<string>;
};

export interface ThemeTestOptions {
  mangaKey?: string;
  chapterKey?: string;
  searchQuery?: SearchQuery;
}

export interface ThemeTestResult {
  detected: boolean;
  score: number;
  detectionSignature: ThemeSignature;
  selectors: ThemeSelectors;
  search?: PagedResult<MangaSummary>;
  details?: MangaDetails;
  chapters?: Chapter[];
  pages?: Page[];
}

/**
 * Loads the real `dist/runtime.js` IIFE into an isolated `node:vm` context,
 * together with an adapter and a native bridge, and exercises the same
 * declarative engine used on iOS.
 */
export class VMHarness {
  private readonly bridge: NativeBridge;
  private readonly runtime: RuntimeGlobal;
  private readonly adapter: ThemeAdapter;

  constructor(
    allowedHosts: string[],
    runtimeIIFE: string,
    adapterModule: { default: ThemeAdapter } | ThemeAdapter,
  ) {
    this.bridge = new NativeBridge(allowedHosts);
    this.adapter = 'default' in adapterModule ? adapterModule.default : adapterModule;

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const window = dom.window as unknown as WindowLike;
    const document = dom.window.document as unknown as DocumentLike;

    const native = {
      request: (request: Parameters<NativeBridge['request']>[0]) => this.bridge.request(request),
      parseHTML: (html: string) => this.bridge.parseHTML(html),
      log: (...args: unknown[]) => this.bridge.log(...args),
      error: (...args: unknown[]) => this.bridge.log(...args),
      warn: (...args: unknown[]) => this.bridge.log(...args),
      setTimeout: (callback: () => void, ms: number) => this.bridge.setTimeout(callback, ms),
      clearTimeout: (id: number) => this.bridge.clearTimeout(id),
    };

    const sandbox: Record<string, unknown> = {
      window,
      document,
      __native: native,
      console,
      URL,
      atob: (value: string) => Buffer.from(value, 'base64').toString('binary'),
      btoa: (value: string) => Buffer.from(value, 'binary').toString('base64'),
      setTimeout: (callback: () => void, ms: number) => this.bridge.setTimeout(callback, ms),
      clearTimeout: (id: number) => this.bridge.clearTimeout(id),
    };

    const context = nodeVm.createContext(sandbox);
    nodeVm.runInContext(runtimeIIFE, context, { filename: 'runtime.js' });

    const runtime = sandbox.BlankGrimoireRuntime as RuntimeGlobal | undefined;
    if (!runtime || runtime.__apiVersion !== API_VERSION) {
      throw new Error(
        `runtimeIIFE did not expose a BlankGrimoireRuntime global for API version ${API_VERSION}`,
      );
    }
    if (typeof runtime.dispatch !== 'function') {
      throw new Error(
        'runtimeIIFE did not expose a BlankGrimoireRuntime global with dispatch',
      );
    }
    this.runtime = runtime;
  }

  private score(signature: ThemeSignature, document: DocumentLike, url: string): Promise<number> {
    let total = 0;

    if (signature.metaGenerator) {
      const meta = document.querySelector('meta[name="generator"]');
      const content = meta?.getAttribute('content') ?? '';
      if (new RegExp(signature.metaGenerator).test(content)) {
        total += 3;
      }
    }

    for (const selector of signature.selectors ?? []) {
      if (document.querySelector(selector)) {
        total += 2;
      }
    }

    for (const pattern of signature.scriptSrc ?? []) {
      const regex = new RegExp(pattern);
      const scripts = Array.from(document.querySelectorAll('script'));
      if (
        scripts.some((script) => {
          const src = script.getAttribute('src') ?? '';
          return regex.test(src);
        })
      ) {
        total += 1;
      }
    }

    return (async () => {
      for (const probePath of signature.probePaths ?? []) {
        try {
          const response = await this.bridge.request({
            url: new URL(probePath, url).toString(),
            method: 'GET',
          });
          if (response.status >= 200 && response.status < 300) {
            total += 3;
          }
        } catch {
          // A failed probe simply contributes no score.
        }
      }
      return total;
    })();
  }

  async testTheme(
    html: string,
    url = 'https://example.org/',
    options: ThemeTestOptions = {},
  ): Promise<ThemeTestResult> {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document as unknown as DocumentLike;
    const window = dom.window as unknown as WindowLike;
    const detectionSignature = this.adapter.detectionSignature;
    const score = await this.score(detectionSignature, document, url);

    const base: ThemeTestResult = {
      detected: score >= detectionSignature.minScore,
      score,
      detectionSignature,
      selectors: this.adapter.selectors,
    };
    if (!base.detected) {
      return base;
    }

    const runtime: ThemeRuntimeOptions = {
      adapter: this.adapter,
      context: { baseURL: url, siteName: 'Example Site', overrides: {} },
      document,
      window,
      parseHTML: (value: string) => this.bridge.parseHTML(value),
    };

    const mangaKey = options.mangaKey ?? 'lorem-ipsum';
    const searchQuery = options.searchQuery ?? { page: 1 };

    const call = async <T>(method: string, args: unknown): Promise<T> =>
      JSON.parse(
        await this.runtime.dispatch!(runtime, method, JSON.stringify(args)),
      ) as T;

    base.search = await call<PagedResult<MangaSummary>>('search', searchQuery);
    base.details = await call<MangaDetails>('details', { key: mangaKey });
    base.chapters = await call<Chapter[]>('chapters', { key: mangaKey });
    const chapterKey = options.chapterKey ?? base.chapters[0]?.key ?? 'chapter-1';
    base.pages = await call<Page[]>('pages', { mangaKey, chapterKey });
    return base;
  }

  /** Exposes the bridge for tests that simulate network responses. */
  getNativeBridge(): NativeBridge {
    return this.bridge;
  }
}
