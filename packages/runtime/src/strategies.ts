import type { MangaSummary } from '@blankgrimoire/types';
import type { ThemeSelectors } from '@blankgrimoire/types';
import { __http } from './prelude.js';
import { extractCss, type CssResult } from './css.js';

export type AjaxResult = CssResult;

export interface ScriptJSONStrategy {
  kind: 'scriptJSON';
  pattern: string;
  path: string;
  base64?: boolean;
}

export interface HydrationStrategy {
  kind: 'hydration';
  framework: 'next' | 'nuxt';
  path?: string;
}

export interface AjaxStrategy {
  kind: 'ajax';
  method: 'GET' | 'POST';
  path: string;
  body?: string;
  then: { kind: 'css'; image: string; srcAttributes: string[] };
}

function base64Decode(input: string): string {
  try {
    if (typeof atob !== 'undefined') {
      return atob(input);
    }
    // Node.js fallback (runtime check only, no type reference)
    const buf = (globalThis as unknown as { Buffer?: { from: (s: string, e: string) => { toString: (e: string) => string } } }).Buffer;
    if (buf) {
      return buf.from(input, 'base64').toString('utf-8');
    }
    throw new Error('no base64 decoder available');
  } catch {
    return input;
  }
}

export function extractScriptJSON(
  strategy: ScriptJSONStrategy,
  document: Document,
): AjaxResult | null {
  const regex = new RegExp(strategy.pattern);
  const scripts = Array.from(document.querySelectorAll('script'));

  for (const script of scripts) {
    const text = script.textContent || '';
    const src = script.getAttribute('src') || '';

    if (!regex.test(src) && !regex.test(text)) continue;

    try {
      let content = text;
      if (strategy.base64) {
        content = base64Decode(content);
      }
      const json = JSON.parse(content);
      let value: unknown = json;
      for (const part of strategy.path.split('.')) {
        value = (value as Record<string, unknown> | null)?.[part];
        if (value === undefined || value === null) return null;
      }

      if (typeof value === 'object' && value !== null && 'key' in value && 'title' in value) {
        const v = value as Record<string, unknown>;
        const data: MangaSummary = { key: String(v.key), title: String(v.title) };
        if (v.coverURL) {
          data.coverURL = String(v.coverURL);
        }
        return {
          kind: 'summary',
          data,
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function extractHydration(
  strategy: HydrationStrategy,
  windowObj: Window & typeof globalThis,
): AjaxResult | null {
  let data: unknown;

  if (strategy.framework === 'next') {
    data = (windowObj as unknown as { __NEXT_DATA__?: unknown }).__NEXT_DATA__;
  } else {
    data = (windowObj as unknown as { __NUXT__?: unknown }).__NUXT__;
  }

  if (!data) return null;

  let value: unknown = data;
  if (strategy.path) {
    for (const part of strategy.path.split('.')) {
      value = (value as Record<string, unknown> | null)?.[part];
      if (value === undefined || value === null) return null;
    }
  }

  if (typeof value === 'object' && value !== null && 'key' in value && 'title' in value) {
    const v = value as Record<string, unknown>;
    const data: MangaSummary = { key: String(v.key), title: String(v.title) };
    if (v.coverURL) {
      data.coverURL = String(v.coverURL);
    }
    return {
      kind: 'summary',
      data,
    };
  }
  return null;
}

export async function extractAjax(
  strategy: AjaxStrategy,
  context: { baseURL: string },
  document: Document,
): Promise<AjaxResult | null> {
  const url = new URL(strategy.path, context.baseURL).toString();

  const httpRequest: { url: string; method: 'GET' | 'POST'; body?: string } = {
    url,
    method: strategy.method,
  };
  if (strategy.body) {
    httpRequest.body = strategy.body;
  }

  let response: { status: number; url: string; headers: Record<string, string>; body: string };
  try {
    response = await __http(httpRequest);
  } catch {
    return null;
  }

  if (strategy.then.kind === 'css') {
    const doc = document.implementation?.createHTMLDocument
      ? document.implementation.createHTMLDocument('')
      : ({ querySelector: () => null } as unknown as Document);
    doc.documentElement.innerHTML = response.body;
    return extractCss(strategy.then, doc, {} as ThemeSelectors);
  }

  return null;
}
