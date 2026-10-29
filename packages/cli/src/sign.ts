import crypto from 'node:crypto';
import fs from 'node:fs';

export type SignOptions = {
  privateKey: string; // Ed25519 private key, PEM or base64
  data: string | Buffer; // data to sign (usually bundle content)
  outFile?: string; // optional file to write the signature to
};

/**
 * Signs data with an Ed25519 private key.
 * Returns the base64-encoded signature.
 */
export async function signBundle(options: SignOptions): Promise<string> {
  let privateKey: any;

  if (options.privateKey.startsWith('-----BEGIN')) {
    privateKey = crypto.createPrivateKey(options.privateKey);
  } else {
    privateKey = crypto.createPrivateKey({
      key: Buffer.from(options.privateKey, 'base64'),
      type: 'ed25519',
      format: 'der',
    } as any);
  }

  const data =
    typeof options.data === 'string' ? Buffer.from(options.data, 'utf8') : options.data;

  const signature = crypto.sign('ed25519', data, privateKey);
  const signatureBase64 = signature.toString('base64');

  if (options.outFile) {
    fs.writeFileSync(options.outFile, signatureBase64, { encoding: 'utf8' });
  }

  return signatureBase64;
}
