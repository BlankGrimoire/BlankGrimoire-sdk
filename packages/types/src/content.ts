// SPDX-License-Identifier: MIT

/**
 * Selectors for extracting a text chapter body.
 *
 * Extraction is declarative so hosts can reason about it without executing
 * arbitrary code. `remove` strips elements that must never reach the reader
 * (navigation, ad slots, paywall notices); a host whose DOM cannot mutate
 * ignores it and the host-side sanitiser still runs on the result.
 */
export interface ContentSelectors {
  /** Element holding the chapter body. */
  container: string;
  /**
   * Selector matching one paragraph inside `container`. When omitted the whole
   * container text is used, which suits single-paragraph bodies.
   */
  paragraph?: string;
  /** Optional selector for the chapter title on the same page. */
  title?: string;
  /** Selectors removed from the container before the body is read. */
  remove?: string[];
  /** Separator between paragraphs for `css-text`. Defaults to a blank line. */
  join?: string;
}

/**
 * One text extraction strategy.
 *
 * `css-text` returns the container (or its paragraphs) as plain text;
 * `css-html` returns the container markup so the reader can keep formatting.
 * Strategies are tried in order and the first non-empty body wins.
 */
export type ContentStrategy =
  | ({ kind: 'css-text' } & ContentSelectors)
  | ({ kind: 'css-html' } & ContentSelectors);

export interface ContentConfig {
  /** Tried in order; the first strategy that yields a body wins. */
  strategies: ContentStrategy[];
}
