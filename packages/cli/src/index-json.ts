// SPDX-License-Identifier: MIT

import { API_VERSION, type ApiVersion, type RepositoryIndex } from '@blankgrimoire/types';
import fs from 'node:fs';

export type ExtensionEntry = RepositoryIndex['extensions'][number];

export type BuildIndexJsonOptions = {
  name: string;
  publicKey: string; // "ed25519:BASE64"
  extensions: ExtensionEntry[];
  outFile: string;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BASE64_SIGNATURE_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const PUBLIC_KEY_PATTERN = /^ed25519:[A-Za-z0-9+/]+={0,2}$/;

function assertApiVersion(value: number): asserts value is ApiVersion {
  if (value !== API_VERSION) {
    throw new Error(`Unsupported apiVersion: ${value}`);
  }
}

/**
 * Builds a repository index.json for BlankGrimoire theme adapters.
 * The index is published to GitHub Pages and consumed by the iOS AdapterStore.
 */
export async function buildIndexJson(options: BuildIndexJsonOptions): Promise<string> {
  if (!PUBLIC_KEY_PATTERN.test(options.publicKey)) {
    throw new Error('publicKey must be formatted as ed25519:BASE64');
  }
  const publicKeyBytes = Buffer.from(
    options.publicKey.slice('ed25519:'.length),
    'base64',
  );
  if (publicKeyBytes.length !== 32) {
    throw new Error('publicKey must decode to a 32-byte Ed25519 key');
  }

  for (const extension of options.extensions) {
    assertApiVersion(extension.apiVersion);
    if (!SHA256_PATTERN.test(extension.sha256)) {
      throw new Error(
        `extension ${extension.id}: sha256 must be 64 lowercase hexadecimal characters`,
      );
    }
    if (!BASE64_SIGNATURE_PATTERN.test(extension.bundleSignature)) {
      throw new Error(`extension ${extension.id}: bundleSignature must be base64`);
    }
    const signatureBytes = Buffer.from(extension.bundleSignature, 'base64');
    if (signatureBytes.length !== 64) {
      throw new Error(
        `extension ${extension.id}: bundleSignature must decode to 64 bytes`,
      );
    }
  }

  const index: RepositoryIndex = {
    formatVersion: 1,
    name: options.name,
    publicKey: options.publicKey,
    extensions: options.extensions,
  };

  const content = JSON.stringify(index, null, 2);
  fs.writeFileSync(options.outFile, content, { encoding: 'utf8' });

  return options.outFile;
}
