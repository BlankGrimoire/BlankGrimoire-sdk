// SPDX-License-Identifier: MIT

import type {
  Attribution,
  Chapter,
  ContentRating,
  MangaDetails,
  MangaStatus,
  MangaSummary,
  Page,
  PagedResult,
  SearchQuery,
  SiteContext,
  ThemeAdapter,
  ThemeSelectors,
  ThemeSelectorsOverrides,
} from '@blankgrimoire/types';
import type { DocumentLike, ElementLike, ParseHTML, WindowLike } from './dom.js';
import { attr, firstAttribute, queryAll, resolveURL, textOf } from './dom.js';
import { runStrategy, type StrategyEnvironment } from './strategies.js';

export interface ThemeRuntimeOptions {
  adapter: ThemeAdapter;
  context: SiteContext;
  document: DocumentLike;
  window?: WindowLike;
  parseHTML?: ParseHTML;
}

export type ExtractionResult = Page[];

export interface PageKeys {
  mangaKey: string;
  chapterKey: string;
}

/** Merge field-by-field user overrides into the adapter selectors. */
export function resolveSelectors(
  base: ThemeSelectors,
  overrides: ThemeSelectorsOverrides,
): ThemeSelectors {
  const resolved: ThemeSelectors = {
    search: { ...base.search, ...overrides.search },
    details: { ...base.details, ...overrides.details },
    chapters: { ...base.chapters, ...overrides.chapters },
    pages: { strategies: overrides.pages?.strategies ?? base.pages.strategies },
  };

  const attribution = overrides.attribution
    ? { ...base.attribution, ...overrides.attribution }
    : base.attribution;
  if (attribution) {
    resolved.attribution = attribution;
  }

  return resolved;
}

function selectorsFor(runtime: ThemeRuntimeOptions): ThemeSelectors {
  return resolveSelectors(runtime.adapter.selectors, runtime.context.overrides);
}

function readText(
  root: DocumentLike | ElementLike,
  selector: string | undefined,
): string | undefined {
  if (!selector) {
    return undefined;
  }
  const value = textOf(root.querySelector(selector));
  return value === '' ? undefined : value;
}

function readImageURL(
  root: DocumentLike | ElementLike,
  selector: string | undefined,
  baseURL: string,
): string | undefined {
  if (!selector) {
    return undefined;
  }
  const element = root.querySelector(selector);
  if (!element) {
    return undefined;
  }
  const image = element.querySelector('img') ?? element;
  const value = firstAttribute(image, ['data-src', 'src', 'data-original']);
  return value ? resolveURL(value, baseURL) : undefined;
}

function splitList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const items = value
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter((item) => item !== '');
  return items.length > 0 ? items : undefined;
}

/** Normalise site text into the closed `MangaStatus` union. */
export function normalizeStatus(value: string): MangaStatus {
  const text = value.trim().toLowerCase();
  if (text === '') {
    return 'unknown';
  }
  if (/(ongoing|current|publishing|in progress)/.test(text)) {
    return 'ongoing';
  }
  if (/(completed|complete|finished|ended)/.test(text)) {
    return 'completed';
  }
  if (/(hiatus|on hold|paused)/.test(text)) {
    return 'hiatus';
  }
  if (/(cancelled|canceled|dropped|axed)/.test(text)) {
    return 'cancelled';
  }
  return 'unknown';
}

/** Normalise site text into the closed `ContentRating` union. */
export function normalizeContentRating(value: string): ContentRating {
  const text = value.trim().toLowerCase();
  if (text === '') {
    return 'unknown';
  }
  if (/(safe|all ages|general)/.test(text)) {
    return 'safe';
  }
  if (/(suggestive|teen|mature teen)/.test(text)) {
    return 'suggestive';
  }
  if (/(mature|adult|explicit|18\+)/.test(text)) {
    return 'mature';
  }
  return 'unknown';
}

function parseChapterNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const match = /(\d+(?:\.\d+)?)/.exec(value);
  if (!match || match[1] === undefined) {
    return undefined;
  }
  const number = Number(match[1]);
  return Number.isFinite(number) ? number : undefined;
}

/** Search a site. Hooks take precedence over declarative selectors. */
export async function extractSearch(
  runtime: ThemeRuntimeOptions,
  query: SearchQuery,
): Promise<PagedResult<MangaSummary>> {
  const hook = runtime.adapter.hooks?.search;
  if (hook) {
    return hook(runtime.context, query);
  }

  const selectors = selectorsFor(runtime).search;
  const items: MangaSummary[] = [];

  for (const element of queryAll(runtime.document, selectors.item)) {
    const title = textOf(element.querySelector(selectors.title));
    const link = element.querySelector(selectors.link);
    const href = link ? attr(link, 'href') : null;
    if (title === '' || !href) {
      continue;
    }
    const summary: MangaSummary = {
      key: resolveURL(href, runtime.context.baseURL),
      title,
    };
    const cover = readImageURL(element, selectors.cover, runtime.context.baseURL);
    if (cover) {
      summary.coverURL = cover;
    }
    items.push(summary);
  }

  const hasNextPage = selectors.nextPage
    ? runtime.document.querySelector(selectors.nextPage) !== null
    : false;

  return { items, hasNextPage };
}

/** Read series details. Hooks take precedence over declarative selectors. */
export async function extractDetails(
  runtime: ThemeRuntimeOptions,
  key: string,
): Promise<MangaDetails> {
  const hook = runtime.adapter.hooks?.getMangaDetails;
  if (hook) {
    return hook(runtime.context, key);
  }

  const selectors = selectorsFor(runtime);
  const detailsSelectors = selectors.details;
  const document = runtime.document;
  const baseURL = runtime.context.baseURL;

  const details: MangaDetails = {
    key,
    title: readText(document, detailsSelectors.title) ?? key,
    status: normalizeStatus(readText(document, detailsSelectors.status) ?? ''),
    contentRating: normalizeContentRating(
      readText(document, detailsSelectors.contentRating) ?? '',
    ),
  };

  const coverURL = readImageURL(document, detailsSelectors.cover, baseURL);
  if (coverURL) {
    details.coverURL = coverURL;
  }

  const optionalText: Array<[keyof Pick<MangaDetails, 'synopsis'>, string | undefined]> = [
    ['synopsis', readText(document, detailsSelectors.synopsis)],
  ];
  for (const [field, value] of optionalText) {
    if (value) {
      details[field] = value;
    }
  }

  const altTitles = splitList(readText(document, detailsSelectors.altTitles));
  if (altTitles) {
    details.altTitles = altTitles;
  }
  const authors = splitList(readText(document, detailsSelectors.authors));
  if (authors) {
    details.authors = authors;
  }
  const artists = splitList(readText(document, detailsSelectors.artists));
  if (artists) {
    details.artists = artists;
  }
  const tags = splitList(readText(document, detailsSelectors.tags));
  if (tags) {
    details.tags = tags;
  }

  const attributionSelectors = selectors.attribution;
  const logoURL = readImageURL(document, attributionSelectors?.logo, baseURL);
  const credits = readText(document, attributionSelectors?.credits);
  if (logoURL || credits) {
    const attribution: Attribution = {
      siteName: runtime.context.siteName,
      siteURL: baseURL,
    };
    if (logoURL) {
      attribution.logoURL = logoURL;
    }
    if (credits) {
      attribution.credits = credits;
    }
    details.attribution = attribution;
  }

  return details;
}

/** Read a chapter list. Hooks take precedence over declarative selectors. */
export async function extractChapters(
  runtime: ThemeRuntimeOptions,
  key: string,
): Promise<Chapter[]> {
  const hook = runtime.adapter.hooks?.getChapters;
  if (hook) {
    return hook(runtime.context, key);
  }

  const selectors = selectorsFor(runtime).chapters;
  const baseURL = runtime.context.baseURL;
  const chapters: Chapter[] = [];

  for (const element of queryAll(runtime.document, selectors.item)) {
    const link = element.querySelector(selectors.link);
    const href = link ? attr(link, 'href') : null;
    if (!href) {
      continue;
    }

    const title = selectors.title
      ? readText(element, selectors.title)
      : textOf(link) || undefined;

    const chapter: Chapter = { key: resolveURL(href, baseURL) };
    if (title) {
      chapter.title = title;
    }
    const number = parseChapterNumber(title);
    if (number !== undefined) {
      chapter.number = number;
    }

    const dateText = readText(element, selectors.date);
    if (dateText) {
      const time = Date.parse(dateText);
      if (!Number.isNaN(time)) {
        chapter.publishedAt = new Date(time).toISOString();
      }
    }

    chapters.push(chapter);
  }

  const numeric = chapters.every((chapter) => chapter.number !== undefined);
  if (numeric) {
    chapters.sort((a, b) => {
      const left = a.number ?? 0;
      const right = b.number ?? 0;
      return selectors.order === 'asc' ? left - right : right - left;
    });
  } else if (selectors.order === 'asc') {
    chapters.reverse();
  }

  return chapters;
}

/** Extract chapter pages. Hooks take precedence over declarative strategies. */
export async function extractPages(
  runtime: ThemeRuntimeOptions,
  keys: PageKeys,
): Promise<Page[]> {
  const hook = runtime.adapter.hooks?.getPages;
  if (hook) {
    return hook(runtime.context, keys.mangaKey, keys.chapterKey);
  }

  const selectors = selectorsFor(runtime);
  const environment: StrategyEnvironment = { baseURL: runtime.context.baseURL };
  if (runtime.window) {
    environment.window = runtime.window;
  }
  if (runtime.parseHTML) {
    environment.parseHTML = runtime.parseHTML;
  }

  for (const strategy of selectors.pages.strategies) {
    const pages = await runStrategy(strategy, runtime.document, environment);
    if (pages.length > 0) {
      return pages;
    }
  }

  return [];
}

/** Backwards-compatible name for page extraction. */
export const extract = extractPages;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toJSON(value: unknown): string {
  return JSON.stringify(value) ?? 'null';
}

/**
 * JSON dispatcher used by the host. Every exchange value is a JSON string.
 * Method aliases match the `ThemeHooks` names.
 */
export async function dispatch(
  runtime: ThemeRuntimeOptions,
  method: string,
  argsJSON: string,
): Promise<string> {
  const args = asRecord(argsJSON.trim() === '' ? {} : (JSON.parse(argsJSON) as unknown));

  switch (method) {
    case 'search': {
      const filters = asRecord(args.filters);
      const filterRecord: Record<string, string> = {};
      for (const [name, value] of Object.entries(filters)) {
        filterRecord[name] = String(value);
      }
      const query: SearchQuery = {
        page: typeof args.page === 'number' ? args.page : 1,
      };
      if (typeof args.text === 'string') {
        query.text = args.text;
      }
      if (Object.keys(filterRecord).length > 0) {
        query.filters = filterRecord;
      }
      return toJSON(await extractSearch(runtime, query));
    }
    case 'details':
    case 'getMangaDetails':
      return toJSON(await extractDetails(runtime, String(args.key ?? '')));
    case 'chapters':
    case 'getChapters':
      return toJSON(await extractChapters(runtime, String(args.key ?? '')));
    case 'pages':
    case 'getPages':
      return toJSON(
        await extractPages(runtime, {
          mangaKey: String(args.mangaKey ?? ''),
          chapterKey: String(args.chapterKey ?? ''),
        }),
      );
    default:
      throw new Error(`Unknown adapter method: ${method}`);
  }
}
