// SPDX-License-Identifier: MIT

import type { Page } from '@blankgrimoire/types';
import type { DocumentLike } from './dom.js';
import { firstAttribute, queryAll, resolveURL } from './dom.js';

export interface CssStrategy {
  kind: 'css';
  image: string;
  srcAttributes: string[];
  headers?: Record<string, string>;
}

/** Extract every page image matching the selector, preserving document order. */
export function extractCss(
  strategy: CssStrategy,
  document: DocumentLike,
  baseURL: string,
): Page[] {
  const pages: Page[] = [];

  for (const element of queryAll(document, strategy.image)) {
    const value = firstAttribute(element, strategy.srcAttributes);
    if (!value) {
      continue;
    }
    const page: Page = {
      index: pages.length,
      imageURL: resolveURL(value, baseURL),
    };
    if (strategy.headers) {
      page.headers = { ...strategy.headers };
    }
    pages.push(page);
  }

  return pages;
}
