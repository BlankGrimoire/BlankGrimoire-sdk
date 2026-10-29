import type { ThemeSignature } from './theme.js';

/** No baseURL and no domains: hosts come from the user's SiteProfile. */
export interface AdapterManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: number;
  signature: ThemeSignature;
  sha256: string;
}

export interface RepositoryIndex {
  formatVersion: 1;
  name: string;
  /** Format: "ed25519:BASE64". */
  publicKey: string;
  extensions: Array<{
    id: string;
    name: string;
    version: string;
    apiVersion: number;
    /** Relative to the repository index. */
    bundleURL: string;
    sha256: string;
    signature: string;
  }>;
}
