// SPDX-License-Identifier: MIT

import type { ThemeSignature } from './theme.js';
import type { ApiVersion } from './version.js';

/**
 * Adapter manifest published next to the bundle.
 *
 * There is no `baseURL` and no domain: hosts come from the user's
 * `SiteProfile`, which is an iOS app concept and not part of this SDK.
 */
export interface AdapterManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: ApiVersion;
  /** Theme detection signature (not a cryptographic signature). */
  detectionSignature: ThemeSignature;
  /**
   * SHA-256 of the bundle, lowercase hexadecimal.
   * @pattern ^[a-f0-9]{64}$
   */
  sha256: string;
}

export interface RepositoryIndex {
  /** Repository index format version, independent from `apiVersion`. */
  formatVersion: 1;
  name: string;
  /**
   * Ed25519 public key, formatted as `ed25519:BASE64`.
   * @pattern ^ed25519:[A-Za-z0-9+/]+={0,2}$
   */
  publicKey: string;
  extensions: Array<{
    id: string;
    name: string;
    version: string;
    apiVersion: ApiVersion;
    /**
     * Bundle location relative to the repository index.
     * @format uri-reference
     */
    bundleURL: string;
    /**
     * SHA-256 of the bundle, lowercase hexadecimal.
     * @pattern ^[a-f0-9]{64}$
     */
    sha256: string;
    /**
     * Ed25519 signature of the bundle, base64.
     * @pattern ^[A-Za-z0-9+/]+={0,2}$
     */
    bundleSignature: string;
  }>;
}
