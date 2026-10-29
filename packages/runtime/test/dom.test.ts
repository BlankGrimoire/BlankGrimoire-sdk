// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveRelativeURL, resolveURL } from '../src/dom.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveRelativeURL', () => {
  const base = 'https://example.org/library/series';

  it('keeps absolute URLs unchanged', () => {
    expect(resolveRelativeURL('https://example.com/cover.jpg', base)).toBe(
      'https://example.com/cover.jpg',
    );
    expect(resolveRelativeURL('urn:isbn:9780000000000', base)).toBe(
      'urn:isbn:9780000000000',
    );
  });

  it('resolves protocol-relative, root-relative and relative paths', () => {
    expect(resolveRelativeURL('//cdn.example.org/page.jpg', base)).toBe(
      'https://cdn.example.org/page.jpg',
    );
    expect(resolveRelativeURL('/pages/001.jpg', base)).toBe(
      'https://example.org/pages/001.jpg',
    );
    expect(resolveRelativeURL('chapter-1', base)).toBe(
      'https://example.org/library/chapter-1',
    );
    expect(resolveRelativeURL('../cover.jpg', base)).toBe(
      'https://example.org/cover.jpg',
    );
  });

  it('normalises dot segments and trailing slashes', () => {
    expect(resolveRelativeURL('/a/b/../c/./d', base)).toBe(
      'https://example.org/a/c/d',
    );
    expect(resolveRelativeURL('images/', 'https://example.org/a/b')).toBe(
      'https://example.org/a/images/',
    );
  });

  it('keeps query strings and fragments', () => {
    const withQuery = 'https://example.org/a?b=1#old';
    expect(resolveRelativeURL('?page=2', withQuery)).toBe(
      'https://example.org/a?page=2',
    );
    expect(resolveRelativeURL('#section', withQuery)).toBe(
      'https://example.org/a?b=1#section',
    );
    expect(resolveRelativeURL('c?page=2#top', base)).toBe(
      'https://example.org/library/c?page=2#top',
    );
  });

  it('resolves against an origin without a path', () => {
    expect(resolveRelativeURL('search', 'https://example.org')).toBe(
      'https://example.org/search',
    );
  });

  it('returns the input when the base URL is invalid', () => {
    expect(resolveRelativeURL('chapter-1', 'not-a-url')).toBe('chapter-1');
  });
});

describe('resolveURL', () => {
  const base = 'https://example.org/library/series';

  it('returns the base URL for empty input', () => {
    expect(resolveURL('   ', base)).toBe(base);
  });

  it('resolves through the native URL constructor when available', () => {
    expect(resolveURL('../cover.jpg', base)).toBe(
      'https://example.org/cover.jpg',
    );
    expect(resolveURL('chapter-1', 'https://example.org')).toBe(
      'https://example.org/chapter-1',
    );
  });

  it('falls back to the self-contained resolver without a global URL', () => {
    vi.stubGlobal('URL', undefined);
    expect(resolveURL('chapter-1?page=2', base)).toBe(
      'https://example.org/library/chapter-1?page=2',
    );
    expect(resolveURL('https://example.com/cover.jpg', base)).toBe(
      'https://example.com/cover.jpg',
    );
  });
});
