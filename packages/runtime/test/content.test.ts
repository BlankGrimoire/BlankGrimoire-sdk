// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
// @ts-ignore - jsdom has no bundled type declarations
import { JSDOM } from 'jsdom';
import type { ContentStrategy } from '@blankgrimoire/types';
import type { DocumentLike } from '../src/dom.js';
import { extractContentBody } from '../src/content.js';
import {
  extractChapterContent,
  normalizeContentKind,
  type ThemeRuntimeOptions,
} from '../src/engine.js';

function makeDocument(html: string): DocumentLike {
  return new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`).window.document
    .documentElement as unknown as DocumentLike;
}

function strategy(overrides: Partial<ContentStrategy>): ContentStrategy {
  return {
    kind: 'css-text',
    container: '.chapter-body',
    ...overrides,
  } as ContentStrategy;
}

describe('extractContentBody', () => {
  it('joins paragraphs with the configured separator', () => {
    const document = makeDocument(`
      <article class="chapter-body">
        <p>First paragraph.</p>
        <p>Second paragraph.</p>
      </article>
    `);

    const body = extractContentBody(
      strategy({ paragraph: 'p', join: '\n' }),
      document,
    );

    expect(body?.body).toEqual({
      kind: 'text',
      value: 'First paragraph.\nSecond paragraph.',
    });
  });

  it('falls back to the container text when no paragraph matches', () => {
    const document = makeDocument(`<div class="chapter-body">One long line.</div>`);

    const body = extractContentBody(strategy({ paragraph: 'p' }), document);

    expect(body?.body).toEqual({ kind: 'text', value: 'One long line.' });
  });

  it('removes navigation selectors before reading', () => {
    const document = makeDocument(`
      <div class="chapter-body">
        <nav class="ads">Buy coins</nav>
        <p>Only the story.</p>
      </div>
    `);

    const body = extractContentBody(
      strategy({ paragraph: 'p', remove: ['.ads'] }),
      document,
    );

    expect(body?.body.value).toBe('Only the story.');
  });

  it('returns markup for css-html so formatting survives', () => {
    const document = makeDocument(
      `<article class="chapter-body"><p>Hello <em>world</em>.</p></article>`,
    );

    const body = extractContentBody(strategy({ kind: 'css-html' }), document);

    expect(body?.body.kind).toBe('html');
    expect(body?.body.value).toContain('<em>world</em>');
  });

  it('reads the chapter title when a selector is given', () => {
    const document = makeDocument(`
      <h1 class="chapter-title">Chapter 12</h1>
      <div class="chapter-body">Body.</div>
    `);

    const body = extractContentBody(
      strategy({ title: '.chapter-title' }),
      document,
    );

    expect(body?.title).toBe('Chapter 12');
  });

  it('returns null when the container is missing or empty', () => {
    const empty = makeDocument(`<div class="chapter-body">   </div>`);
    const missing = makeDocument(`<div class="other"></div>`);

    expect(extractContentBody(strategy({}), empty)).toBeNull();
    expect(extractContentBody(strategy({}), missing)).toBeNull();
  });
});

describe('extractChapterContent', () => {
  const adapter = (content?: unknown, hooks?: unknown) =>
    ({
      id: 'theme.example',
      name: 'Example',
      version: '1.0.0',
      apiVersion: 1,
      detectionSignature: { minScore: 0 },
      selectors: {
        search: { path: '/search', item: '.item', title: '.title', link: 'a' },
        details: { title: 'h1' },
        chapters: { item: '.chapter', link: 'a', order: 'asc' },
        pages: { strategies: [] },
        ...(content ? { content } : {}),
      },
      ...(hooks ? { hooks } : {}),
    }) as unknown as ThemeRuntimeOptions['adapter'];

  const runtime = (document: DocumentLike, options: {
    content?: unknown;
    hooks?: unknown;
  }): ThemeRuntimeOptions => ({
    adapter: adapter(options.content, options.hooks),
    context: { baseURL: 'https://example.org/', siteName: 'Example', overrides: {} },
    document,
  });

  it('returns null for an adapter without content config', async () => {
    const document = makeDocument('<div class="chapter-body">Body.</div>');

    const content = await extractChapterContent(runtime(document, {}), {
      mangaKey: 'manga',
      chapterKey: 'chapter',
    });

    expect(content).toBeNull();
  });

  it('stamps the requested chapter key and tries strategies in order', async () => {
    const document = makeDocument('<div class="chapter-body">Body.</div>');

    const content = await extractChapterContent(
      runtime(document, {
        content: {
          strategies: [
            { kind: 'css-text', container: '.missing' },
            { kind: 'css-text', container: '.chapter-body' },
          ],
        },
      }),
      { mangaKey: 'manga', chapterKey: 'chapter-7' },
    );

    expect(content?.key).toBe('chapter-7');
    expect(content?.body.value).toBe('Body.');
  });

  it('prefers the getContent hook over selectors', async () => {
    const document = makeDocument('<div class="chapter-body">Ignored.</div>');

    const content = await extractChapterContent(
      runtime(document, {
        content: { strategies: [{ kind: 'css-text', container: '.chapter-body' }] },
        hooks: {
          getContent: async () => ({
            key: 'hook',
            body: { kind: 'text', value: 'From the hook.' },
          }),
        },
      }),
      { mangaKey: 'manga', chapterKey: 'chapter' },
    );

    expect(content?.body.value).toBe('From the hook.');
  });
});

describe('normalizeContentKind', () => {
  it('marks prose pages as text and everything else as image', () => {
    expect(normalizeContentKind('Web Novel')).toBe('text');
    expect(normalizeContentKind('  prose ')).toBe('text');
    expect(normalizeContentKind('Manga')).toBe('image');
    expect(normalizeContentKind('')).toBe('image');
  });
});
