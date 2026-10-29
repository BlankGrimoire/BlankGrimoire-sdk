export type HttpRequest = {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
};

export type HttpResponse = {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: string;
};

export const __apiVersion = 1;

const timers = new Map<number, () => void>();
let timerIdCounter = 0;

export function setTimeout(cb: () => void, ms: number): number {
  const id = ++timerIdCounter;
  timers.set(id, cb);
  return id;
}

export function clearTimeout(id: number): void {
  timers.delete(id);
}

export function __timerFire(id: number): void {
  const cb = timers.get(id);
  if (cb) {
    timers.delete(id);
    cb();
  }
}

export function __invoke(fn: string, ...args: unknown[]): unknown {
  const host = (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native;
  if (!host || typeof host[fn] !== 'function') {
    throw new Error(`Host function not implemented: ${fn}`);
  }
  return host[fn](...args);
}

export function __http(request: HttpRequest): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const host = (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native;
    if (!host || typeof host.request !== 'function') {
      reject(new Error('Host function not implemented: request'));
      return;
    }
    try {
      const result = host.request(request);
      resolve(result as HttpResponse);
    } catch (err) {
      reject(err);
    }
  });
}

const console = {
  log: (...args: unknown[]): void => {
    const host = (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native;
    if (host && typeof host.log === 'function') {
      host.log(...args);
    }
  },
  error: (...args: unknown[]): void => {
    const host = (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native;
    if (host && typeof host.error === 'function') {
      host.error(...args);
    }
  },
  warn: (...args: unknown[]): void => {
    const host = (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native;
    if (host && typeof host.warn === 'function') {
      host.warn(...args);
    }
  },
};

export { console };
