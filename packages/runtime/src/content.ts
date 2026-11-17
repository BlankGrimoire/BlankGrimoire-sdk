// SPDX-License-Identifier: MIT

import type { ChapterText, ContentStrategy } from '@blankgrimoire/types';
import type { DocumentLike, ElementLike } from './dom.js';
import { queryAll, textOf } from './dom.js';

/** Default separator between paragraphs, matching rendered prose. */
export const DEFAULT_PARAGRAPH_JOIN = '\n\n';

/**
 * Remove selectors run before the body is read.
 *
 * A host whose DOM cannot mutate ignores this and its sanitiser still runs on
 * the extracted body, so the worst case is extra navigation text.
 */
function stripRemoved(document: DocumentLike, selectors: string[] | undefined): void {
  if (!selectors || selectors.length === 0) {
    return;
  }
  for (const selector of selectors) {
    for (const element of queryAll(document, selector)) {
      element.remove?.();
    }
  }
}

function htmlBody(container: ElementLike): ChapterText | null {
  const value = (container.innerHTML ?? '').trim();
  return value === '' ? null : { kind: 'html', value };
}

function textBody(strategy: ContentStrategy, container: ElementLike): ChapterText | null {
  const paragraphs = strategy.paragraph
    ? queryAll(container, strategy.paragraph)
        .map((element) => textOf(element))
        .filter((value) => value !== '')
    : [];

  const value =
    paragraphs.length > 0
      ? paragraphs.join(strategy.join ?? DEFAULT_PARAGRAPH_JOIN)
      : textOf(container);

  return value === '' ? null : { kind: 'text', value };
}

/**
 * Extract the body described by one strategy.
 *
 * Returns `null` when the container is missing or empty, so the caller can
 * try the next strategy. The chapter key and attribution are added by the
 * engine, which knows which chapter was requested.
 */
export function extractContentBody(
  strategy: ContentStrategy,
  document: DocumentLike,
): { title?: string; body: ChapterText } | null {
  const container = document.querySelector(strategy.container);
  if (!container) {
    return null;
  }

  stripRemoved(document, strategy.remove);

  const body = strategy.kind === 'css-html' ? htmlBody(container) : textBody(strategy, container);
  if (!body) {
    return null;
  }

  const result: { title?: string; body: ChapterText } = { body };
  const title = strategy.title ? textOf(document.querySelector(strategy.title)) : '';
  if (title !== '') {
    result.title = title;
  }
  return result;
}
