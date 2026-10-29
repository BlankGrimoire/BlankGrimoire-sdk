import fs from 'node:fs';
import path from 'node:path';

export type ExtensionEntry = {
  id: string;
  name: string;
  version: string;
  apiVersion: number;
  bundleURL: string;
  sha256: string;
  signature: string;
};

export type BuildIndexJsonOptions = {
  name: string;
  publicKey: string; // "ed25519:BASE64"
  extensions: ExtensionEntry[];
  outFile: string;
};

/**
 * Builds a repository index.json for BlankGrimoire theme adapters.
 * The index is published to GitHub Pages and consumed by the iOS AdapterStore.
 */
export async function buildIndexJson(options: BuildIndexJsonOptions): Promise<string> {
  const index = {
    formatVersion: 1,
    name: options.name,
    publicKey: options.publicKey,
    extensions: options.extensions,
  };

  const content = JSON.stringify(index, null, 2);
  fs.writeFileSync(options.outFile, content, { encoding: 'utf8' });

  return options.outFile;
}
