// SPDX-License-Identifier: MIT

import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { API_VERSION, type RepositoryIndex } from '@blankgrimoire/types';
import {
  buildIndexJson,
  type BuildIndexJsonOptions,
  type ExtensionEntry,
} from '../src/index-json.js';
import { cleanup, makeTempDir, readJSON } from './helpers.js';

let directory = '';

afterEach(() => {
  if (directory !== '') {
    cleanup(directory);
    directory = '';
  }
});

const publicKey = `ed25519:${Buffer.alloc(32, 1).toString('base64')}`;
const sha256 = 'b'.repeat(64);
const bundleSignature = Buffer.alloc(64, 2).toString('base64');

function options(outFile: string): BuildIndexJsonOptions {
  return {
    name: 'Example Repository',
    publicKey,
    extensions: [
      {
        id: 'theme.example',
        name: 'Example Theme',
        version: '1.0.0',
        apiVersion: API_VERSION,
        bundleURL: 'themes/example/runtime.js',
        sha256,
        bundleSignature,
      },
    ],
    outFile,
  };
}

describe('buildIndexJson', () => {
  it('writes a signed repository index', async () => {
    directory = makeTempDir('blankgrimoire-index-');
    const outFile = path.join(directory, 'index.json');

    await buildIndexJson(options(outFile));

    const index = readJSON<RepositoryIndex>(outFile);
    expect(index.formatVersion).toBe(1);
    expect(index.publicKey).toBe(publicKey);
    expect(index.extensions).toHaveLength(1);
    expect(index.extensions[0]).toMatchObject({
      id: 'theme.example',
      apiVersion: 1,
      sha256,
      bundleSignature,
    });
    expect(
      Object.keys(index.extensions[0] as unknown as Record<string, unknown>),
    ).not.toContain('signature');
  });

  it('rejects malformed public keys', async () => {
    directory = makeTempDir('blankgrimoire-index-');
    const malformed = options(path.join(directory, 'index.json'));
    malformed.publicKey = 'not-a-key';

    await expect(buildIndexJson(malformed)).rejects.toThrow(/publicKey/);
  });

  it('rejects malformed digests and signatures', async () => {
    directory = makeTempDir('blankgrimoire-index-');

    const badDigest = options(path.join(directory, 'index.json'));
    badDigest.extensions[0]!.sha256 = 'xyz';
    await expect(buildIndexJson(badDigest)).rejects.toThrow(/sha256/);

    const badSignature = options(path.join(directory, 'index.json'));
    badSignature.extensions[0]!.bundleSignature = 'not base64!';
    await expect(buildIndexJson(badSignature)).rejects.toThrow(/bundleSignature/);

    const shortSignature = options(path.join(directory, 'index.json'));
    shortSignature.extensions[0]!.bundleSignature = Buffer.alloc(32, 2).toString(
      'base64',
    );
    await expect(buildIndexJson(shortSignature)).rejects.toThrow(/64 bytes/);
  });

  it('rejects keys that do not decode to 32 bytes', async () => {
    directory = makeTempDir('blankgrimoire-index-');
    const invalid = options(path.join(directory, 'index.json'));
    invalid.publicKey = `ed25519:${Buffer.alloc(16, 1).toString('base64')}`;

    await expect(buildIndexJson(invalid)).rejects.toThrow(/32-byte/);
  });

  it('rejects unsupported contract versions', async () => {
    directory = makeTempDir('blankgrimoire-index-');
    const invalid = options(path.join(directory, 'index.json'));
    const extension = {
      ...invalid.extensions[0],
      apiVersion: 2,
    } as unknown as ExtensionEntry;
    invalid.extensions = [extension];

    await expect(buildIndexJson(invalid)).rejects.toThrow(/Unsupported apiVersion/);
  });
});
