// SPDX-License-Identifier: MIT

import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildBundle } from '../src/bundle.js';
import { cleanup, makeTempDir } from './helpers.js';

let directory = '';

afterEach(() => {
  if (directory !== '') {
    cleanup(directory);
    directory = '';
  }
});

describe('buildBundle', () => {
  it('builds a single IIFE bundle exposing the runtime global', async () => {
    directory = makeTempDir('blankgrimoire-bundle-');
    const entry = path.join(directory, 'entry.ts');
    fs.writeFileSync(entry, 'export const answer = 42;\n', 'utf8');

    const output = await buildBundle({
      entry,
      outdir: directory,
      outFile: path.join(directory, 'bundle.js'),
    });

    const content = String(fs.readFileSync(output, 'utf8'));
    expect(output).toBe(path.join(directory, 'bundle.js'));
    expect(content).toContain('BlankGrimoireRuntime');
    expect(content).toContain('answer');
  });

  it('defaults the output file to runtime.js', async () => {
    directory = makeTempDir('blankgrimoire-bundle-');
    const entry = path.join(directory, 'entry.js');
    fs.writeFileSync(entry, 'globalThis.example = true;\n', 'utf8');

    const output = await buildBundle({ entry, outdir: directory });

    expect(output).toBe(path.join(directory, 'runtime.js'));
    expect(fs.existsSync(output)).toBe(true);
  });

  it('supports minification and source maps', async () => {
    directory = makeTempDir('blankgrimoire-bundle-');
    const entry = path.join(directory, 'entry.js');
    fs.writeFileSync(entry, 'globalThis.example = "lorem ipsum";\n', 'utf8');

    const output = await buildBundle({
      entry,
      outdir: directory,
      outFile: path.join(directory, 'minified.js'),
      minify: true,
      sourcemap: true,
    });

    const content = String(fs.readFileSync(output, 'utf8'));
    expect(content).toContain('sourceMappingURL');
    expect(fs.existsSync(`${output}.map`)).toBe(true);
  });
});
