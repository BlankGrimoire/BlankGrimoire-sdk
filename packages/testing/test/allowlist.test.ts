import { describe, expect, it } from 'vitest';
import { isAllowed } from '../src/allowlist.js';

describe('isAllowed', () => {
  const hosts = ['example.org', 'api.test.com'];

  it('permette host esatto', () => {
    expect(isAllowed('example.org', hosts)).toBe(true);
    expect(isAllowed('api.test.com', hosts)).toBe(true);
  });

  it('permette subdomain', () => {
    expect(isAllowed('www.example.org', hosts)).toBe(true);
    expect(isAllowed('api.example.org', hosts)).toBe(true);
    expect(isAllowed('v2.api.test.com', hosts)).toBe(true);
  });

  it('è case-insensitive', () => {
    expect(isAllowed('EXAMPLE.ORG', hosts)).toBe(true);
    expect(isAllowed('Example.Org', hosts)).toBe(true);
    expect(isAllowed('WWW.EXAMPLE.ORG', hosts)).toBe(true);
  });

  it('rifiuta host non in lista', () => {
    expect(isAllowed('evil.com', hosts)).toBe(false);
    expect(isAllowed('example.org.evil.com', hosts)).toBe(false);
    expect(isAllowed('notexample.org', hosts)).toBe(false);
  });

  it('rifiuta lista vuota', () => {
    expect(isAllowed('example.org', [])).toBe(false);
  });
});
