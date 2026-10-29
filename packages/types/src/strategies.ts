export type ExtractionStrategy =
  | { kind: 'css'; image: string; srcAttributes: string[] }
  | { kind: 'scriptJSON'; pattern: string; path: string; base64?: boolean }
  | { kind: 'hydration'; framework: 'next' | 'nuxt'; path?: string }
  | { kind: 'ajax'; method: 'GET' | 'POST'; path: string; body?: string; then: ExtractionStrategy };

export interface PagesConfig {
  /** Tried in order; the first non-empty result wins. */
  strategies: ExtractionStrategy[];
}
