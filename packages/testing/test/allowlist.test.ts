// SPDX-License-Identifier: MIT

import { describe, expect, it } from 'vitest';
import { hostFromInput, isAllowed } from '../src/allowlist.js';

describe('hostFromInput', () => {
  it('accepts bare hosts and full URLs', () => {
    expect(hostFromInput('example.org')).toBe('example.org');
    expect(hostFromInput('https://www.example.org/path?q=1')).toBe('www.example.org');
    expect(hostFromInput('http://127.0.0.1:8080/')).toBe('127.0.0.1');
  });

  it('rejects empty and malformed input', () => {
    expect(hostFromInput('')).toBeNull();
    expect(hostFromInput('   ')).toBeNull();
    expect(hostFromInput('not a host')).toBeNull();
  });
});

describe('isAllowed', () => {
  const hosts = ['example.org', 'example.com'];

  it('allows an exact host', () => {
    expect(isAllowed('example.org', hosts)).toBe(true);
    expect(isAllowed('example.com', hosts)).toBe(true);
  });

  it('allows subdomains', () => {
    expect(isAllowed('www.example.org', hosts)).toBe(true);
    expect(isAllowed('api.example.org', hosts)).toBe(true);
    expect(isAllowed('v2.api.example.com', hosts)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAllowed('EXAMPLE.ORG', hosts)).toBe(true);
    expect(isAllowed('Example.Org', hosts)).toBe(true);
    expect(isAllowed('WWW.EXAMPLE.ORG', hosts)).toBe(true);
  });

  it('accepts full URLs and ignores path and port', () => {
    expect(isAllowed('https://www.example.org/search?q=lorem', hosts)).toBe(true);
    expect(isAllowed('http://127.0.0.1:8080/page', ['127.0.0.1'])).toBe(true);
    expect(isAllowed('https://example.com/covers/1.jpg', hosts)).toBe(true);
  });

  it('accepts full URLs and ports in the allowlist entries', () => {
    expect(
      isAllowed('https://www.example.org/search', [
        'https://www.example.org/library',
      ]),
    ).toBe(true);
    expect(isAllowed('https://example.org/', ['example.org:8443'])).toBe(true);
    expect(isAllowed('https://other.example.org/', ['https://www.example.org/'])).toBe(
      false,
    );
  });

  it('rejects hosts outside the list', () => {
    expect(isAllowed('https://example.com/', ['example.org'])).toBe(false);
    expect(isAllowed('example.org.example.com', ['example.org'])).toBe(false);
    expect(isAllowed('notexample.org', hosts)).toBe(false);
    expect(isAllowed('https://127.0.0.1/', hosts)).toBe(false);
  });

  it('rejects an empty list', () => {
    expect(isAllowed('example.org', [])).toBe(false);
  });
});
