declare module 'node:crypto' {
  export function createPrivateKey(key: string | Buffer): KeyObject;
  export function sign(
    algorithm: string,
    data: Buffer | string,
    key: KeyObject
  ): Buffer;
  export function createSign(algorithm: string): Signer;
}

interface KeyObject {}

interface Signer {
  update(data: Buffer | string): Signer;
  sign(): Buffer;
}

declare module 'node:fs' {
  export function readFileSync(path: string, encoding?: string): Buffer | string;
  export function writeFileSync(
    path: string,
    data: string | Buffer,
    options?: { encoding?: string }
  ): void;
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
}

declare const Buffer: {
  from(data: string | Buffer, encoding?: string): Buffer;
  alloc(size: number): Buffer;
  isBuffer(obj: unknown): obj is Buffer;
  readonly prototype: Buffer;
};

interface Buffer {
  toString(encoding?: string): string;
}
