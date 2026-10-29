// SPDX-License-Identifier: MIT

/**
 * Minimal DOM surface used by the runtime. JavaScriptCore does not provide a
 * DOM, so the host parses HTML through `__native.parseHTML` and passes a
 * structural implementation of these interfaces. Node tests use jsdom.
 */
export interface ElementLike {
  getAttribute(name: string): string | null;
  readonly textContent: string | null;
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
  innerHTML?: string;
}

export interface DocumentLike {
  querySelector(selector: string): ElementLike | null;
  querySelectorAll(selector: string): ArrayLike<ElementLike>;
  documentElement?: ElementLike | null;
  implementation?: {
    createHTMLDocument(title?: string): DocumentLike;
  };
}

/** The subset of the host `window` used by hydration strategies. */
export interface WindowLike {
  __NEXT_DATA__?: unknown;
  __NUXT__?: unknown;
}

export type ParseHTML = (html: string) => DocumentLike;

export function queryAll(root: DocumentLike | ElementLike, selector: string): ElementLike[] {
  return Array.from(root.querySelectorAll(selector));
}

export function textOf(element: ElementLike | null | undefined): string {
  return (element?.textContent ?? '').trim();
}

export function attr(element: ElementLike, name: string): string | null {
  const value = element.getAttribute(name);
  return value !== null && value.trim() !== '' ? value.trim() : null;
}

const ABSOLUTE_URL = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const BASE_URL = /^([A-Za-z][A-Za-z0-9+.-]*:)(\/\/[^/?#]*)?([^?#]*)(\?[^#]*)?(#.*)?$/;

function normalizePath(path: string): string {
  const segments: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const leading = path.startsWith('/') ? '/' : '';
  const trailing = path.endsWith('/') && segments.length > 0 ? '/' : '';
  return `${leading}${segments.join('/')}${trailing}`;
}

/**
 * Resolve a relative URL without relying on the global `URL` constructor,
 * which JavaScriptCore does not guarantee. The native implementation is
 * preferred when available for full WHATWG semantics.
 */
export function resolveRelativeURL(value: string, baseURL: string): string {
  if (ABSOLUTE_URL.test(value)) {
    return value;
  }
  if (value.startsWith('//')) {
    const scheme = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(baseURL)?.[0] ?? '';
    return `${scheme}${value}`;
  }

  const base = BASE_URL.exec(baseURL);
  if (!base) {
    return value;
  }
  const scheme = base[1] ?? '';
  const authority = base[2] ?? '';
  const basePath = base[3] ?? '';
  const baseQuery = base[4] ?? '';

  const hashIndex = value.indexOf('#');
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = withoutHash.indexOf('?');
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  if (path === '') {
    return `${scheme}${authority}${basePath}${query || baseQuery}${hash}`;
  }

  let resolvedPath: string;
  if (path.startsWith('/')) {
    resolvedPath = normalizePath(path);
  } else {
    const directory = basePath.slice(0, basePath.lastIndexOf('/') + 1) || '/';
    resolvedPath = normalizePath(`${directory}${path}`);
  }

  return `${scheme}${authority}${resolvedPath}${query}${hash}`;
}

/** Resolve a relative URL against the site base URL. */
export function resolveURL(value: string, baseURL: string): string {
  const input = value.trim();
  if (input === '') {
    return baseURL;
  }
  if (typeof URL === 'function') {
    try {
      return new URL(input, baseURL).toString();
    } catch {
      // Fall through to the self-contained resolver.
    }
  }
  return resolveRelativeURL(input, baseURL);
}

/** Read the first non-empty attribute among `names`. */
export function firstAttribute(element: ElementLike, names: string[]): string | null {
  for (const name of names) {
    const value = attr(element, name);
    if (value) {
      return value;
    }
  }
  return null;
}
