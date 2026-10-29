// SPDX-License-Identifier: MIT

import crypto from 'node:crypto';
import fs from 'node:fs';

export type SignOptions = {
  privateKey: string; // Ed25519 private key, PEM, PKCS#8 DER or raw seed, base64
  data: string | Buffer; // data to sign (usually bundle content)
  outFile?: string; // optional file to write the signature to
};

const ED25519_PKCS8_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
);

/**
 * Signs data with an Ed25519 private key.
 *
 * Accepted key formats: PEM, base64 PKCS#8 DER, or a base64 32-byte seed.
 * Returns the base64-encoded signature.
 */
export async function signBundle(options: SignOptions): Promise<string> {
  let privateKey: crypto.KeyObject;

  if (options.privateKey.startsWith('-----BEGIN')) {
    privateKey = crypto.createPrivateKey(options.privateKey);
  } else {
    const decoded = Buffer.from(options.privateKey, 'base64');
    const der =
      decoded.length === 32
        ? Buffer.concat([ED25519_PKCS8_PREFIX, decoded])
        : decoded;
    privateKey = crypto.createPrivateKey({
      key: der,
      type: 'pkcs8',
      format: 'der',
    });
  }

  const data =
    typeof options.data === 'string' ? Buffer.from(options.data, 'utf8') : options.data;

  // Ed25519 is an EdDSA algorithm: Node requires a null digest.
  const signature = crypto.sign(null, data, privateKey);
  const signatureBase64 = signature.toString('base64');

  if (options.outFile) {
    fs.writeFileSync(options.outFile, signatureBase64, { encoding: 'utf8' });
  }

  return signatureBase64;
}
