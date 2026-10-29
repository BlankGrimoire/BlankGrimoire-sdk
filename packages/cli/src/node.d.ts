// SPDX-License-Identifier: MIT

declare module 'node:crypto' {
  export interface KeyObject {
    export(options: {
      type: 'pkcs8' | 'spki';
      format: 'pem' | 'der';
    }): string | Buffer;
  }

  export interface Hash {
    update(data: Buffer | string): Hash;
    digest(encoding: string): string;
  }

  export function createPrivateKey(
    key:
      | string
      | Buffer
      | { key: Buffer; type: 'pkcs8' | 'ed25519'; format: 'der' },
  ): KeyObject;
  export function createPublicKey(key: string | Buffer): KeyObject;
  export function createHash(algorithm: string): Hash;
  export function generateKeyPairSync(type: 'ed25519'): {
    privateKey: KeyObject;
    publicKey: KeyObject;
  };
  export function sign(
    algorithm: string | null,
    data: Buffer | string,
    key: KeyObject,
  ): Buffer;
  export function verify(
    algorithm: string | null,
    data: Buffer | string,
    key: KeyObject,
    signature: Buffer,
  ): boolean;
}

declare module 'node:fs' {
  export function readFileSync(path: string, encoding?: string): Buffer | string;
  export function writeFileSync(
    path: string,
    data: string | Buffer,
    options?: { encoding?: string } | string,
  ): void;
  export function existsSync(path: string): boolean;
  export function mkdtempSync(prefix: string): string;
  export function rmSync(
    path: string,
    options?: { recursive?: boolean; force?: boolean },
  ): void;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exitCode?: number;
  stdout: { write(data: string): void };
  stderr: { write(data: string): void };
};

declare const Buffer: {
  from(data: string | Buffer, encoding?: string): Buffer;
  alloc(size: number, fill?: string | number): Buffer;
  concat(list: Buffer[]): Buffer;
  isBuffer(obj: unknown): obj is Buffer;
  readonly prototype: Buffer;
};

interface Buffer {
  readonly length: number;
  subarray(start?: number, end?: number): Buffer;
  toString(encoding?: string): string;
}
