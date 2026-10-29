// SPDX-License-Identifier: MIT

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { signBundle } from '../src/sign.js';
import { cleanup, makeTempDir } from './helpers.js';

let directory = '';

afterEach(() => {
  if (directory !== '') {
    cleanup(directory);
    directory = '';
  }
});

const keyPair = crypto.generateKeyPairSync('ed25519');
const privateKeyPEM = String(
  keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }),
);
const publicKeyPEM = String(
  keyPair.publicKey.export({ type: 'spki', format: 'pem' }),
);

function verify(data: string, signature: string): boolean {
  return crypto.verify(
    null,
    data,
    crypto.createPublicKey(publicKeyPEM),
    Buffer.from(signature, 'base64'),
  );
}

describe('signBundle', () => {
  it('signs data with a PEM private key', async () => {
    const signature = await signBundle({ privateKey: privateKeyPEM, data: 'bundle' });
    expect(verify('bundle', signature)).toBe(true);
  });

  it('signs data with a base64 PKCS#8 DER private key', async () => {
    const der = keyPair.privateKey.export({ type: 'pkcs8', format: 'der' });
    const base64 = (der as Buffer).toString('base64');
    const signature = await signBundle({ privateKey: base64, data: Buffer.from('bundle') });
    expect(verify('bundle', signature)).toBe(true);
  });

  it('signs data with a base64 32-byte seed', async () => {
    const der = keyPair.privateKey.export({ type: 'pkcs8', format: 'der' }) as Buffer;
    const seed = der.subarray(der.length - 32);
    const signature = await signBundle({
      privateKey: seed.toString('base64'),
      data: 'bundle',
    });
    expect(verify('bundle', signature)).toBe(true);
  });

  it('writes the signature when an output file is provided', async () => {
    directory = makeTempDir('blankgrimoire-sign-');
    const outFile = path.join(directory, 'runtime.sig');

    const signature = await signBundle({
      privateKey: privateKeyPEM,
      data: 'bundle',
      outFile,
    });

    expect(String(fs.readFileSync(outFile, 'utf8'))).toBe(signature);
    expect(verify('bundle', signature)).toBe(true);
  });
});
