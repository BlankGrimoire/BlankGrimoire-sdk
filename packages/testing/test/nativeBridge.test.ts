import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { NativeBridge } from '../src/nativeBridge.js';

describe('NativeBridge', () => {
  const bridge = new NativeBridge(['example.org']);

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rifiesta richieste verso host non in allowlist', async () => {
    await expect(bridge.request({ url: 'https://evil.com/' })).rejects.toThrow(
      /not allowed by allowlist/,
    );
  });

  it('parseHTML restituisce elementi selezionabili', () => {
    const result = bridge.parseHTML(
      '<html><body><div class="reader"><h1>Titolo</h1><p class="text">Contenuto</p></div></body></html>',
    );
    const title = result.querySelector('h1');
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe('Titolo');

    const paragraphs = result.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]?.textContent).toBe('Contenuto');
  });

  it('log stampa senza errori', () => {
    expect(() => bridge.log('ciao', 123, { a: 1 })).not.toThrow();
  });

  it('setTimeout/clearTimeout funzionano', () => {
    let called = false;
    const id = bridge.setTimeout(() => {
      called = true;
    }, 10);
    bridge.clearTimeout(id);
    vi.advanceTimersByTime(100);
    expect(called).toBe(false);

    let called2 = false;
    const id2 = bridge.setTimeout(() => {
      called2 = true;
    }, 10);
    vi.advanceTimersByTime(100);
    expect(called2).toBe(true);
  });
});
