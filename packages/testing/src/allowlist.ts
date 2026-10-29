/**
 * Host allowlist.
 * Un host è permesso se corrisponde esattamente a un elemento della lista
 * oppure è un subdomain di esso (es. example.org permette www.example.org).
 * Il match è case-insensitive.
 */
export function isAllowed(host: string, allowedHosts: string[]): boolean {
  const h = host.toLowerCase();
  return allowedHosts.some((allowed) => {
    const a = allowed.toLowerCase();
    if (h === a) return true;
    // subdomain match: h ends with "." + a
    return h.endsWith(`.${a}`);
  });
}
