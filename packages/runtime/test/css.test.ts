// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
// @ts-ignore - jsdom has no bundled type declarations
import { JSDOM } from 'jsdom';
import { extractCss } from '../src/css.js';
import type { DocumentLike } from '../src/dom.js';

function makeDocument(html: string): DocumentLike {
  return new JSDOM(html).window.document as unknown as DocumentLike;
}

describe('extractCss', () => {
  it('extracts every page in document order with sequential indexes', () => {
    const document = makeDocument(
      '<html><body><div class="reader">' +
        '<img src="https://example.org/001.jpg" />' +
        '<img data-src="/002.jpg" src="https://example.org/fallback.jpg" />' +
        '</div></body></html>',
    );
    const pages = extractCss(
      { kind: 'css', image: '.reader img', srcAttributes: ['data-src', 'src'] },
      document,
      'https://example.org/chapter/',
    );

    expect(pages).toEqual([
      { index: 0, imageURL: 'https://example.org/001.jpg' },
      { index: 1, imageURL: 'https://example.org/002.jpg' },
    ]);
  });

  it('attaches configured headers to every page', () => {
    const document = makeDocument('<html><body><img src="/001.jpg" /></body></html>');
    const pages = extractCss(
      {
        kind: 'css',
        image: 'img',
        srcAttributes: ['src'],
        headers: { Referer: 'https://example.org/' },
      },
      document,
      'https://example.org/',
    );

    expect(pages[0]?.headers).toEqual({ Referer: 'https://example.org/' });
  });

  it('returns an empty list when nothing matches', () => {
    const document = makeDocument('<html><body><p>no image</p></body></html>');
    expect(
      extractCss(
        { kind: 'css', image: '.reader img', srcAttributes: ['src'] },
        document,
        'https://example.org/',
      ),
    ).toEqual([]);
  });

  it('skips elements without any configured attribute', () => {
    const document = makeDocument(
      '<html><body><img alt="none" /><img src="/ok.jpg" /></body></html>',
    );
    const pages = extractCss(
      { kind: 'css', image: 'img', srcAttributes: ['data-src', 'src'] },
      document,
      'https://example.org/',
    );
    expect(pages).toEqual([{ index: 0, imageURL: 'https://example.org/ok.jpg' }]);
  });
});
