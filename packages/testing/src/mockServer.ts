// SPDX-License-Identifier: MIT

import http from 'http';

type RouteHandler = (req: http.IncomingMessage) => Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}>;

/**
 * HTTP mock server bound to 127.0.0.1 (loopback). Tests use it to simulate
 * site responses without any real network access.
 */
export class MockServer {
  private server: http.Server;
  private portValue = 0;
  private handlers = new Map<string, RouteHandler>();
  private started = false;

  constructor() {
    this.server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
      const path = req.url ?? '/';
      const handler = this.handlers.get(path);
      if (!handler) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      const result = handler(req);
      Promise.resolve(result).then((response) => {
        res.writeHead(response.status, response.headers);
        res.end(response.body);
      });
    });
  }

  /** Register a handler for a path. The method is not filtered here. */
  register(path: string, handler: RouteHandler): void {
    this.handlers.set(path, handler);
  }

  async start(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.listen(0, '127.0.0.1', () => {
        this.portValue = (this.server.address() as { port: number }).port;
        this.started = true;
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.server.close((error: Error | null) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    this.started = false;
  }

  get port(): number {
    return this.portValue;
  }

  get isStarted(): boolean {
    return this.started;
  }
}
