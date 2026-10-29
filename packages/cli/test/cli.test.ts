// SPDX-License-Identifier: MIT

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { API_VERSION, type AdapterManifest } from '@blankgrimoire/types';
import { runCLI, type CLIIO } from '../src/cli.js';
import type { RepositoryIndex } from '@blankgrimoire/types';
import { cleanup, makeTempDir, readJSON } from './helpers.js';

let directory = '';

afterEach(() => {
  if (directory !== '') {
    cleanup(directory);
    directory = '';
  }
});

interface Capture {
  io: CLIIO;
  logs: string[];
  errors: string[];
}

function capture(): Capture {
  const logs: string[] = [];
  const errors: string[] = [];
  return {
    io: {
      log: (message) => logs.push(message),
      error: (message) => errors.push(message),
    },
    logs,
    errors,
  };
}

const sha256 = 'c'.repeat(64);

describe('runCLI', () => {
  it('prints usage for help flags and for no arguments', async () => {
    for (const argv of [['help'], ['--help'], ['-h']]) {
      const help = capture();
      expect(await runCLI(argv, help.io)).toBe(0);
      expect(help.logs.join('\n')).toContain('blankgrimoire build');
    }

    const empty = capture();
    expect(await runCLI([], empty.io)).toBe(0);
    expect(empty.logs.join('\n')).toContain('Usage:');
  });

  it('computes a sha256 digest', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const file = path.join(directory, 'bundle.js');
    fs.writeFileSync(file, 'abc', 'utf8');

    const result = capture();
    expect(await runCLI(['hash', file], result.io)).toBe(0);
    expect(result.logs).toEqual([
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    ]);
  });

  it('builds a bundle through the build command', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const entry = path.join(directory, 'entry.ts');
    const output = path.join(directory, 'bundle.js');
    fs.writeFileSync(entry, 'export const answer = 42;\n', 'utf8');

    const result = capture();
    const code = await runCLI(
      ['build', entry, '--outdir', directory, '--outfile', output, '--minify'],
      result.io,
    );

    expect(code).toBe(0);
    expect(result.logs).toEqual([`Built ${output}`]);
    expect(String(fs.readFileSync(output, 'utf8'))).toContain('BlankGrimoireRuntime');
  });

  it('writes a manifest through the manifest command', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const signatureFile = path.join(directory, 'detection.json');
    const outFile = path.join(directory, 'manifest.json');
    fs.writeFileSync(
      signatureFile,
      JSON.stringify({ metaGenerator: '^ExampleCMS', minScore: 3 }),
      'utf8',
    );

    const result = capture();
    const code = await runCLI(
      [
        'manifest',
        '--id',
        'theme.example',
        '--name',
        'Example Theme',
        '--version',
        '1.0.0',
        '--sha256',
        sha256,
        '--detection-signature',
        signatureFile,
        '--out',
        outFile,
      ],
      result.io,
    );

    expect(code).toBe(0);
    const manifest = readJSON<AdapterManifest>(outFile);
    expect(manifest.apiVersion).toBe(API_VERSION);
    expect(manifest.detectionSignature).toEqual({
      metaGenerator: '^ExampleCMS',
      minScore: 3,
    });
  });

  it('signs a file through the sign command', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const keyPair = crypto.generateKeyPairSync('ed25519');
    const privateKey = String(
      keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
    );
    const publicKey = String(
      keyPair.publicKey.export({ type: 'spki', format: 'pem' }),
    );
    const keyFile = path.join(directory, 'private.pem');
    const dataFile = path.join(directory, 'bundle.js');
    const signatureFile = path.join(directory, 'bundle.sig');
    fs.writeFileSync(keyFile, privateKey, 'utf8');
    fs.writeFileSync(dataFile, 'bundle', 'utf8');

    const result = capture();
    const code = await runCLI(
      [
        'sign',
        dataFile,
        '--key-file',
        keyFile,
        '--out',
        signatureFile,
      ],
      result.io,
    );

    expect(code).toBe(0);
    expect(result.logs).toEqual([`Wrote ${signatureFile}`]);
    const signature = Buffer.from(
      String(fs.readFileSync(signatureFile, 'utf8')),
      'base64',
    );
    expect(
      crypto.verify(
        null,
        'bundle',
        crypto.createPublicKey(publicKey),
        signature,
      ),
    ).toBe(true);
  });

  it('writes a repository index through the index command', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const extensionsFile = path.join(directory, 'extensions.json');
    const outFile = path.join(directory, 'index.json');
    const publicKey = `ed25519:${Buffer.alloc(32, 3).toString('base64')}`;
    fs.writeFileSync(
      extensionsFile,
      JSON.stringify([
        {
          id: 'theme.example',
          name: 'Example Theme',
          version: '1.0.0',
          apiVersion: 1,
          bundleURL: 'themes/example/runtime.js',
          sha256,
          bundleSignature: Buffer.alloc(64, 4).toString('base64'),
        },
      ]),
      'utf8',
    );

    const result = capture();
    const code = await runCLI(
      [
        'index',
        '--name',
        'Example Repository',
        '--public-key',
        publicKey,
        '--extensions',
        extensionsFile,
        '--out',
        outFile,
      ],
      result.io,
    );

    expect(code).toBe(0);
    const index = readJSON<RepositoryIndex>(outFile);
    expect(index.formatVersion).toBe(1);
    expect(index.extensions[0]?.bundleURL).toBe('themes/example/runtime.js');
  });

  it('reports unknown commands and missing flags', async () => {
    const unknown = capture();
    expect(await runCLI(['unknown'], unknown.io)).toBe(1);
    expect(unknown.errors.join('\n')).toContain('Unknown command: unknown');

    const missing = capture();
    expect(await runCLI(['manifest'], missing.io)).toBe(1);
    expect(missing.errors.join('\n')).toContain('Missing --id');
  });

  it('reports invalid JSON inputs', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const broken = path.join(directory, 'broken.json');
    fs.writeFileSync(broken, '{not json', 'utf8');

    const result = capture();
    const code = await runCLI(
      [
        'manifest',
        '--id',
        'theme.example',
        '--name',
        'Example Theme',
        '--version',
        '1.0.0',
        '--sha256',
        sha256,
        '--detection-signature',
        broken,
        '--out',
        path.join(directory, 'manifest.json'),
      ],
      result.io,
    );

    expect(code).toBe(1);
    expect(result.errors.join('\n')).toContain('Invalid JSON');
  });

  it('rejects detection signatures outside the contract', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const signatureFile = path.join(directory, 'detection.json');
    fs.writeFileSync(
      signatureFile,
      JSON.stringify({ metaGenerator: 42, minScore: 1 }),
      'utf8',
    );

    const result = capture();
    const code = await runCLI(
      [
        'manifest',
        '--id',
        'theme.example',
        '--name',
        'Example Theme',
        '--version',
        '1.0.0',
        '--sha256',
        sha256,
        '--detection-signature',
        signatureFile,
        '--out',
        path.join(directory, 'manifest.json'),
      ],
      result.io,
    );

    expect(code).toBe(1);
    expect(result.errors.join('\n')).toContain('metaGenerator must be a string');
  });

  it('rejects unknown extension fields', async () => {
    directory = makeTempDir('blankgrimoire-cli-');
    const extensionsFile = path.join(directory, 'extensions.json');
    fs.writeFileSync(
      extensionsFile,
      JSON.stringify([
        {
          id: 'theme.example',
          name: 'Example Theme',
          version: '1.0.0',
          apiVersion: 1,
          bundleURL: 'themes/example/runtime.js',
          sha256,
          bundleSignature: Buffer.alloc(64, 4).toString('base64'),
          extra: true,
        },
      ]),
      'utf8',
    );

    const result = capture();
    const code = await runCLI(
      [
        'index',
        '--name',
        'Example Repository',
        '--public-key',
        `ed25519:${Buffer.alloc(32, 3).toString('base64')}`,
        '--extensions',
        extensionsFile,
        '--out',
        path.join(directory, 'index.json'),
      ],
      result.io,
    );

    expect(code).toBe(1);
    expect(result.errors.join('\n')).toContain('unknown field extra');
  });

  it('ships an executable bin entry point', () => {
    const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
    const packagePath = fileURLToPath(new URL('../package.json', import.meta.url));
    const source = String(fs.readFileSync(cliPath, 'utf8'));
    const packageJson = readJSON<{ bin: Record<string, string> }>(packagePath);

    expect(source.startsWith('#!/usr/bin/env node')).toBe(true);
    expect(packageJson.bin.blankgrimoire).toBe('dist/cli.js');
  });
});
