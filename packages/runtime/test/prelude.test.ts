import { describe, expect, it } from 'vitest';
import { __apiVersion, __invoke, setTimeout, clearTimeout, __timerFire } from '../src/index';

describe('__apiVersion', () => {
  it('is 1', () => {
    expect(__apiVersion).toBe(1);
  });
});

describe('setTimeout / clearTimeout / __timerFire', () => {
  it('registers and fires a timer', () => {
    let called = false;
    const id = setTimeout(() => {
      called = true;
    }, 100);
    expect(typeof id).toBe('number');
    __timerFire(id);
    expect(called).toBe(true);
  });

  it('clearTimeout prevents firing', () => {
    let called = false;
    const id = setTimeout(() => {
      called = true;
    }, 100);
    clearTimeout(id);
    __timerFire(id);
    expect(called).toBe(false);
  });

  it('firing an unknown id is a no-op', () => {
    expect(() => __timerFire(999999)).not.toThrow();
  });
});

describe('__invoke', () => {
  it('throws when host function is missing', () => {
    expect(() => __invoke('nonexistent')).toThrow(/Host function not implemented/);
  });

  it('calls a registered host function', () => {
    const calls: string[] = [];
    (globalThis as unknown as { __native?: Record<string, (...args: unknown[]) => unknown> }).__native = {
      echo: (...args: unknown[]) => {
        calls.push(args.join(','));
        return args.join(',');
      },
    };
    const result = __invoke('echo', 'a', 'b');
    expect(result).toBe('a,b');
    expect(calls).toEqual(['a,b']);
  });
});
