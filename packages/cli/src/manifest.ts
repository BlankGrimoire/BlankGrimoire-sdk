import type { AdapterManifest, ThemeSignature } from '@blankgrimoire/types';
import fs from 'node:fs';

export interface BuildManifestOptions {
  id: string;
  name: string;
  version: string;
  signature: ThemeSignature;
  sha256: string;
  outFile: string;
}

/**
 * Builds an AdapterManifest JSON file for a signed adapter bundle.
 * The manifest is published alongside the bundle in the theme repository index.
 */
export async function buildManifest(options: BuildManifestOptions): Promise<string> {
  const manifest: AdapterManifest = {
    id: options.id,
    name: options.name,
    version: options.version,
    apiVersion: 1,
    signature: options.signature,
    sha256: options.sha256,
  };

  const content = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(options.outFile, content, { encoding: 'utf8' });

  return options.outFile;
}
