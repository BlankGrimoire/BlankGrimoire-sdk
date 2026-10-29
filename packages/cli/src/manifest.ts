// SPDX-License-Identifier: MIT

import { API_VERSION, type ApiVersion, type ThemeSignature } from '@blankgrimoire/types';
import fs from 'node:fs';

export interface BuildManifestOptions {
  id: string;
  name: string;
  version: string;
  detectionSignature: ThemeSignature;
  sha256: string;
  outFile: string;
}

/**
 * Builds an AdapterManifest JSON file for a signed adapter bundle.
 * The manifest is published alongside the bundle in the theme repository index.
 */
export async function buildManifest(options: BuildManifestOptions): Promise<string> {
  const sha256Pattern = /^[a-f0-9]{64}$/;
  if (!sha256Pattern.test(options.sha256)) {
    throw new Error('sha256 must be 64 lowercase hexadecimal characters');
  }

  const apiVersion: ApiVersion = API_VERSION;
  const manifest = {
    id: options.id,
    name: options.name,
    version: options.version,
    apiVersion,
    detectionSignature: options.detectionSignature,
    sha256: options.sha256,
  };

  const content = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(options.outFile, content, { encoding: 'utf8' });

  return options.outFile;
}
