import type { MangaSummary } from '@blankgrimoire/types';
import type { ThemeSelectors } from '@blankgrimoire/types';

export type CssResult = {
  kind: 'summary';
  data: MangaSummary;
} | null;

export function extractCss(
  strategy: { kind: 'css'; image: string; srcAttributes: string[] },
  document: Document,
  _selectors: ThemeSelectors,
): CssResult {
  const element = document.querySelector(strategy.image);
  if (!element) {
    return null;
  }

  for (const attr of strategy.srcAttributes) {
    const value = element.getAttribute(attr);
    if (value && value.trim()) {
      return {
        kind: 'summary',
        data: {
          key: value,
          title: value,
          coverURL: value,
        },
      };
    }
  }

  return null;
}
