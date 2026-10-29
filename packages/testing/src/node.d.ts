// SPDX-License-Identifier: MIT

declare module 'http' {
  export interface IncomingMessage {
    url?: string;
    method?: string;
    headers: Record<string, string>;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    end(data?: string): void;
  }

  export class Server {
    listen(port: number, host: string, callback?: () => void): void;
    close(callback?: (err: Error | null) => void): void;
    address(): { port: number };
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export function createServer(
    requestListener?: (req: IncomingMessage, res: ServerResponse) => void,
  ): Server;
}

declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: string): string;
}

declare module 'node:vm' {
  export interface Context {
    [name: string]: unknown;
  }

  export function createContext(contextObject: object): Context;
  export function runInContext(
    code: string,
    contextObject: object,
    options?: { filename?: string; timeout?: number },
  ): unknown;
}

declare const Buffer: {
  from(value: string, encoding?: string): { toString(encoding: string): string };
};
