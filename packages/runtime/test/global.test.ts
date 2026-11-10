// SPDX-License-Identifier: MIT

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RUNTIME_GLOBAL_NAME } from '@blankgrimoire/types';
import { describe, expect, it } from 'vitest';

const dist = fileURLToPath(new URL('../dist/runtime.js', import.meta.url));

describe('runtime bundle', () => {
  it('exposes the shared global name expected by the iOS host', () => {
    const source = readFileSync(dist, 'utf8');

    expect(source).toContain(`var ${RUNTIME_GLOBAL_NAME} =`);
    expect(source).toContain('__apiVersion');
  });
});
