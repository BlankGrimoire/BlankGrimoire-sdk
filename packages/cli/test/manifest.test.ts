// SPDX-License-Identifier: MIT

import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { API_VERSION, type AdapterManifest } from '@blankgrimoire/types';
import { buildManifest } from '../src/manifest.js';
import { cleanup, makeTempDir, readJSON } from './helpers.js';

let directory = '';

afterEach(() => {
  if (directory !== '') {
    cleanup(directory);
    directory = '';
  }
});

const sha256 = 'a'.repeat(64);

describe('buildManifest', () => {
  it('writes a manifest using the canonical contract version', async () => {
    directory = makeTempDir('blankgrimoire-manifest-');
    const outFile = path.join(directory, 'manifest.json');

    await buildManifest({
      id: 'theme.example',
      name: 'Example Theme',
      version: '1.0.0',
      detectionSignature: {
        metaGenerator: '^ExampleCMS',
        selectors: ['.example-reader'],
        minScore: 3,
      },
      sha256,
      outFile,
    });

    const manifest = readJSON<AdapterManifest>(outFile);
    expect(manifest).toEqual({
      id: 'theme.example',
      name: 'Example Theme',
      version: '1.0.0',
      apiVersion: API_VERSION,
      detectionSignature: {
        metaGenerator: '^ExampleCMS',
        selectors: ['.example-reader'],
        minScore: 3,
      },
      sha256,
    });
    expect(manifest.apiVersion).toBe(1);
    expect(Object.keys(manifest)).not.toContain('signature');
  });

  it('rejects an invalid sha256 digest', async () => {
    directory = makeTempDir('blankgrimoire-manifest-');
    await expect(
      buildManifest({
        id: 'theme.example',
        name: 'Example Theme',
        version: '1.0.0',
        detectionSignature: { selectors: ['.example-reader'], minScore: 2 },
        sha256: 'not-a-digest',
        outFile: path.join(directory, 'manifest.json'),
      }),
    ).rejects.toThrow(/sha256/);
  });
});
