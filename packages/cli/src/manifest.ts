// SPDX-License-Identifier: MIT

import { API_VERSION, type ApiVersion, type ThemeSignature } from '@blankgrimoire/types';
import fs from 'node:fs';

export interface BuildManifestOptions {
  id: string;
  name: string;
  version: string;
  detectionSignature: ThemeSignature;
  sha256: string;
  referrerHeaders?: Record<string, string>;
  networkHosts?: string[];
  outFile: string;
}

const NETWORK_HOST_PLACEHOLDER = '{host}';
const HOST_TEMPLATE_PART = /^[A-Za-z0-9.-]*$/;

/**
 * A network host template is a hostname with exactly one `{host}` placeholder
 * and no scheme, port or path, for example `api.{host}`. The host app refuses
 * an expansion that leaves the configured site's domain, so the template
 * cannot widen the allowlist on its own.
 */
function validateNetworkHosts(networkHosts: string[]): void {
  for (const template of networkHosts) {
    if (typeof template !== 'string' || template.trim() === '') {
      throw new Error('networkHosts entries must be non-empty strings');
    }
    const parts = template.split(NETWORK_HOST_PLACEHOLDER);
    if (parts.length !== 2) {
      throw new Error(
        `network host template "${template}" must contain exactly one ${NETWORK_HOST_PLACEHOLDER} placeholder`,
      );
    }
    for (const part of parts) {
      if (!HOST_TEMPLATE_PART.test(part)) {
        throw new Error(
          `network host template "${template}" may only contain a hostname fragment around ${NETWORK_HOST_PLACEHOLDER}`,
        );
      }
    }
    const [prefix = '', suffix = ''] = parts;
    if (prefix === '' && suffix === '') {
      throw new Error(
        `network host template "${template}" needs a hostname fragment around ${NETWORK_HOST_PLACEHOLDER}`,
      );
    }
  }
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
  const networkHosts = options.networkHosts ?? [];
  validateNetworkHosts(networkHosts);
  const manifest = {
    id: options.id,
    name: options.name,
    version: options.version,
    apiVersion,
    detectionSignature: options.detectionSignature,
    sha256: options.sha256,
    referrerHeaders: options.referrerHeaders ?? {},
    networkHosts,
  };

  const content = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(options.outFile, content, { encoding: 'utf8' });

  return options.outFile;
}
