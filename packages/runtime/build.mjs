// SPDX-License-Identifier: MIT

import { build } from 'esbuild';
import { RUNTIME_GLOBAL_NAME } from '@blankgrimoire/types';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/runtime.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  globalName: RUNTIME_GLOBAL_NAME,
});
