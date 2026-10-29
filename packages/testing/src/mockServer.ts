import http from 'http';

type RouteHandler = (req: http.IncomingMessage) => Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
}>;

/**
 * Mock server HTTP su 127.0.0.1 (loopback), usato dai test per simulare
 * risposte di siti senza rete reale.
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
      Promise.resolve(result).then((r) => {
        res.writeHead(r.status, r.headers);
        res.end(r.body);
      });
    });
  }

  /** Registra un handler per un path (il method non è filtrato qui). */
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
      this.server.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
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
