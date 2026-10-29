// SPDX-License-Identifier: MIT

/**
 * Strategy used to extract the ordered image pages of a chapter.
 *
 * Strategies are tried in order and the first one that returns at least one
 * page wins. A strategy never returns series summaries: search results,
 * details and chapters are extracted from `ThemeSelectors` instead.
 */
export type ExtractionStrategy =
  | {
      kind: 'css';
      /** Selector matching page images. */
      image: string;
      /** Attributes tried in order, e.g. `["data-src", "src"]`. */
      srcAttributes: string[];
      /** Optional headers attached to every extracted page. */
      headers?: Record<string, string>;
    }
  | {
      kind: 'scriptJSON';
      /** Regex matched against inline script text or a script `src`. */
      pattern: string;
      /** Dot path to the page array inside the decoded JSON. */
      path: string;
      /** Decode the script text from base64 before parsing. */
      base64?: boolean;
    }
  | {
      kind: 'hydration';
      framework: 'next' | 'nuxt';
      /** Dot path to the page array inside the hydration payload. */
      path?: string;
    }
  | {
      kind: 'ajax';
      method: 'GET' | 'POST';
      /** Path resolved against `SiteContext.baseURL`. */
      path: string;
      body?: string;
      /** Strategy applied to the response HTML. May itself be `ajax`. */
      then: ExtractionStrategy;
    };

export interface PagesConfig {
  /** Tried in order; the first non-empty page list wins. */
  strategies: ExtractionStrategy[];
}
