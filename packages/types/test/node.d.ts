// SPDX-License-Identifier: MIT

declare module 'node:fs' {
  export function readdirSync(path: string): string[];
  export function readFileSync(path: string, encoding: string): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
