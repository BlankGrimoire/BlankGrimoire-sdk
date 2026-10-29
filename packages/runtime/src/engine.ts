import type { ThemeSelectors } from '@blankgrimoire/types';
import { extractCss, type CssResult } from './css.js';

export type ExtractionResult = CssResult;

export interface ExtractOptions {
  strategies: Array<{ kind: string }>;
  context: SiteContextLike;
}

export interface SiteContextLike {
  baseURL: string;
  siteName: string;
  selectors: ThemeSelectors;
  overrides?: Partial<ThemeSelectors>;
}

/** Resolve selectors with user overrides applied (overrides take precedence). */
function resolveSelectors(base: ThemeSelectors, overrides: Partial<ThemeSelectors>): ThemeSelectors {
  return {
    search: { ...base.search, ...overrides.search },
    details: { ...base.details, ...overrides.details },
    chapters: { ...base.chapters, ...overrides.chapters },
    pages: {
      strategies: overrides.pages?.strategies ?? base.pages.strategies,
    },
    ...(overrides.attribution && { attribution: { ...base.attribution, ...overrides.attribution } }),
  };
}

/** Run extraction strategies in order; first non-empty result wins. */
export function extract(
  options: ExtractOptions,
  document: Document,
): ExtractionResult {
  const selectors = resolveSelectors(options.context.selectors, options.context.overrides ?? {});
  const strategies =
    options.context.overrides?.pages?.strategies ??
    options.strategies ??
    selectors.pages.strategies;

  for (const strategy of strategies) {
    const result = runStrategy(strategy, document, selectors);
    if (result) {
      return result;
    }
  }
  return null;
}

function runStrategy(
  strategy: { kind: string },
  document: Document,
  selectors: ThemeSelectors,
): ExtractionResult {
  if (strategy.kind === 'css') {
    return extractCss(strategy as { kind: 'css'; image: string; srcAttributes: string[] }, document, selectors);
  }
  return null;
}
