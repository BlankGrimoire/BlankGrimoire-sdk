// SPDX-License-Identifier: MIT

/**
 * Resolve the hostname from either a full URL or a bare host.
 * Returns `null` for malformed input.
 */
export function hostFromInput(input: string): string | null {
  const value = input.trim();
  if (value === '') {
    return null;
  }
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`http://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Host allowlist. A host is allowed when it matches an entry exactly or is a
 * subdomain of it (e.g. `example.org` allows `www.example.org`).
 * Matching is case-insensitive. Full URLs are accepted as input.
 */
export function isAllowed(input: string, allowedHosts: string[]): boolean {
  const host = hostFromInput(input);
  if (host === null) {
    return false;
  }
  return allowedHosts.some((allowed) => {
    const entry = hostFromInput(allowed);
    if (entry === null) {
      return false;
    }
    return host === entry || host.endsWith(`.${entry}`);
  });
}
