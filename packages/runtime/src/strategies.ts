// SPDX-License-Identifier: MIT

import type { Page } from '@blankgrimoire/types';
import type { DocumentLike, ParseHTML, WindowLike } from './dom.js';
import { attr, firstAttribute, queryAll, resolveURL, textOf } from './dom.js';
import { __http, __parseHTML } from './prelude.js';
import { extractCss, type CssStrategy } from './css.js';

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
  then: unknown;
}

export interface StrategyEnvironment {
  baseURL: string;
  window?: WindowLike;
  parseHTML?: ParseHTML;
}

const MAX_AJAX_DEPTH = 5;

function base64Decode(input: string): string {
  try {
    if (typeof atob !== 'undefined') {
      return atob(input);
    }
    const buffer = (globalThis as unknown as {
      Buffer?: { from: (value: string, encoding: string) => { toString: (encoding: string) => string } };
    }).Buffer;
    if (buffer) {
      return buffer.from(input, 'base64').toString('utf-8');
    }
    throw new Error('no base64 decoder available');
  } catch {
    return input;
  }
}

/**
 * Parse a JSON value from script text. Inline scripts often wrap the payload
 * in an assignment (`window.__DATA__ = {...}`), so fall back to the first
 * balanced object or array.
 */
export function parseJSONText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Fall through to the balanced-value scanner.
  }

  const start = trimmed.search(/[[{]/);
  if (start === -1) {
    return undefined;
  }

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (character === undefined) {
      break;
    }
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{' || character === '[') {
      stack.push(character);
      continue;
    }
    if (character === '}' || character === ']') {
      const open = stack.pop();
      if (
        open === undefined ||
        (open === '{' && character !== '}') ||
        (open === '[' && character !== ']')
      ) {
        return undefined;
      }
      if (stack.length === 0) {
        try {
          return JSON.parse(trimmed.slice(start, index + 1)) as unknown;
        } catch {
          return undefined;
        }
      }
    }
  }

  return undefined;
}

/** Dot/bracket path lookup, e.g. `props.pageProps.pages` or `items[0].url`. */
export function readPath(value: unknown, path: string): unknown {
  if (path.trim() === '') {
    return value;
  }
  let current: unknown = value;
  for (const rawPart of path.split('.')) {
    const match = /^([^[\]]*)(?:\[(\d+)\])?$/.exec(rawPart);
    if (!match) {
      return undefined;
    }
    const key = match[1] ?? '';
    if (key !== '') {
      current = (current as Record<string, unknown> | null | undefined)?.[key];
    }
    if (match[2] !== undefined) {
      current = (current as unknown[] | null | undefined)?.[Number(match[2])];
    }
    if (current === undefined || current === null) {
      return undefined;
    }
  }
  return current;
}

function pageURLFromItem(item: unknown): string | null {
  if (typeof item === 'string') {
    return item.trim() === '' ? null : item;
  }
  if (item && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    for (const key of ['imageURL', 'url', 'src', 'image']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }
  }
  return null;
}

/** Normalise a strategy payload (URL strings or page objects) into `Page[]`. */
export function toPages(
  payload: unknown,
  baseURL: string,
  headers?: Record<string, string>,
): Page[] {
  const candidates: unknown[] = Array.isArray(payload) ? payload : [payload];
  const pages: Page[] = [];

  for (const candidate of candidates) {
    const value = pageURLFromItem(candidate);
    if (!value) {
      continue;
    }
    const page: Page = {
      index: pages.length,
      imageURL: resolveURL(value, baseURL),
    };
    if (headers) {
      page.headers = { ...headers };
    }
    pages.push(page);
  }

  return pages;
}

/**
 * Extract pages from a JSON script. Inline scripts are parsed first; a
 * matching external script is fetched through the native bridge. Failed
 * scripts are skipped so later candidates can still succeed.
 */
export async function extractScriptJSON(
  strategy: ScriptJSONStrategy,
  document: DocumentLike,
  baseURL: string,
  parseHTML?: ParseHTML,
): Promise<Page[]> {
  void parseHTML;
  const regex = new RegExp(strategy.pattern);

  for (const script of queryAll(document, 'script')) {
    const text = textOf(script);
    const src = attr(script, 'src');

    let content = '';
    if (text !== '' && regex.test(text)) {
      content = text;
    } else if (src && regex.test(src)) {
      try {
        const response = await __http({ url: resolveURL(src, baseURL), method: 'GET' });
        if (response.status < 200 || response.status >= 300) {
          continue;
        }
        content = response.body;
      } catch {
        continue;
      }
    } else {
      continue;
    }

    try {
      const decoded = strategy.base64 ? base64Decode(content) : content;
      const parsed = parseJSONText(decoded);
      if (parsed === undefined) {
        continue;
      }
      const payload = readPath(parsed, strategy.path);
      if (payload === undefined || payload === null) {
        continue;
      }
      const pages = toPages(payload, baseURL);
      if (pages.length > 0) {
        return pages;
      }
    } catch {
      // Malformed JSON or unresolved path: try the next script.
    }
  }

  return [];
}

function hydrationPayload(
  strategy: HydrationStrategy,
  document: DocumentLike,
  windowObj: WindowLike | undefined,
): unknown {
  if (windowObj) {
    const value = strategy.framework === 'next' ? windowObj.__NEXT_DATA__ : windowObj.__NUXT__;
    if (value !== undefined) {
      return value;
    }
  }

  const selectors =
    strategy.framework === 'next'
      ? ['#__NEXT_DATA__']
      : ['#__NUXT_DATA__', '#__NUXT__'];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const text = textOf(element);
    if (text !== '') {
      const parsed = parseJSONText(text);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

/** Extract pages from a Next.js or Nuxt hydration payload. */
export function extractHydration(
  strategy: HydrationStrategy,
  document: DocumentLike,
  baseURL: string,
  windowObj?: WindowLike,
): Page[] {
  const payload = hydrationPayload(strategy, document, windowObj);
  if (payload === undefined) {
    return [];
  }

  let value: unknown = payload;
  if (strategy.path) {
    value = readPath(payload, strategy.path);
  }
  if (value === undefined || value === null) {
    return [];
  }
  return toPages(value, baseURL);
}

/** Fetch a URL and apply the nested strategy to the response HTML. */
export async function extractAjax(
  strategy: AjaxStrategy,
  document: DocumentLike,
  environment: StrategyEnvironment,
  depth = 0,
): Promise<Page[]> {
  if (depth >= MAX_AJAX_DEPTH) {
    return [];
  }

  const url = resolveURL(strategy.path, environment.baseURL);
  const request: { url: string; method: 'GET' | 'POST'; body?: string } = {
    url,
    method: strategy.method,
  };
  if (strategy.body !== undefined) {
    request.body = strategy.body;
  }

  let response;
  try {
    response = await __http(request);
  } catch {
    return [];
  }

  if (response.status < 200 || response.status >= 300) {
    return [];
  }

  let parsed: DocumentLike;
  try {
    parsed = environment.parseHTML ? environment.parseHTML(response.body) : __parseHTML(response.body);
  } catch {
    return [];
  }

  return runStrategy(strategy.then, parsed, environment, depth + 1);
}

/** Run one strategy. A strategy returns `[]` when it does not match. */
export async function runStrategy(
  strategy: unknown,
  document: DocumentLike,
  environment: StrategyEnvironment,
  depth = 0,
): Promise<Page[]> {
  if (!strategy || typeof strategy !== 'object') {
    return [];
  }
  const kind = (strategy as { kind?: unknown }).kind;

  switch (kind) {
    case 'css':
      return extractCss(strategy as CssStrategy, document, environment.baseURL);
    case 'scriptJSON':
      return extractScriptJSON(
        strategy as ScriptJSONStrategy,
        document,
        environment.baseURL,
        environment.parseHTML,
      );
    case 'hydration':
      return extractHydration(
        strategy as HydrationStrategy,
        document,
        environment.baseURL,
        environment.window,
      );
    case 'ajax':
      return extractAjax(strategy as AjaxStrategy, document, environment, depth);
    default:
      return [];
  }
}

// Re-exported for tests and adapters that build strategies programmatically.
export type { CssStrategy };
