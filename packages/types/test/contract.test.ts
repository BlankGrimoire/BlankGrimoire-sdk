// SPDX-License-Identifier: MIT

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { API_VERSION } from '../src/index.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
type SchemaDocument = Record<string, unknown> & {
  definitions: Record<string, unknown>;
};
const schema = JSON.parse(
  readFileSync(`${root}schema/v1.json`, 'utf8'),
) as SchemaDocument;
const fixturesDir = `${root}fixtures/v1/`;

const FIXTURES: Record<string, string> = {
  'attribution.json': 'Attribution',
  'chapter.json': 'Chapter',
  'extraction-strategy.json': 'ExtractionStrategy',
  'http-request.json': 'HttpRequest',
  'http-response.json': 'HttpResponse',
  'manga-details.json': 'MangaDetails',
  'manga-details-unknown-status.json': 'MangaDetails',
  'manga-summary.json': 'MangaSummary',
  'manifest.json': 'AdapterManifest',
  'page.json': 'Page',
  'paged-result.json': 'MangaSummaryPage',
  'pages-config.json': 'PagesConfig',
  'repository-index.json': 'RepositoryIndex',
  'search-query.json': 'SearchQuery',
  'site-context.json': 'SiteContext',
  'theme-adapter.json': 'ThemeAdapter',
  'theme-selectors.json': 'ThemeSelectors',
  'theme-selectors-overrides.json': 'ThemeSelectorsOverrides',
  'theme-signature.json': 'ThemeSignature',
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'v1');

function validator(typeName: string): ValidateFunction {
  const validate = ajv.getSchema(
    `v1#/definitions/${encodeURIComponent(typeName)}`,
  );
  expect(validate, `definition ${typeName} missing from schema`).toBeDefined();
  return validate as ValidateFunction;
}

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(`${fixturesDir}${name}`, 'utf8')) as unknown;
}

describe('fixtures/v1 conform to schema/v1.json', () => {
  it('maps every fixture to a type', () => {
    const files = readdirSync(fixturesDir).filter((file) => file.endsWith('.json'));
    expect(files.sort()).toEqual(Object.keys(FIXTURES).sort());
  });

  it('pins the schema to API_VERSION', () => {
    const definition = schema.definitions.ApiVersion as { const?: unknown };
    expect(API_VERSION).toBe(1);
    expect(definition.const).toBe(API_VERSION);
  });

  it('pins manifest and repository index fixtures to API_VERSION', () => {
    const manifest = readFixture('manifest.json') as { apiVersion: number };
    const index = readFixture('repository-index.json') as {
      extensions: Array<{ apiVersion: number }>;
    };

    expect(manifest.apiVersion).toBe(API_VERSION);
    expect(index.extensions[0]?.apiVersion).toBe(API_VERSION);
  });

  for (const [file, typeName] of Object.entries(FIXTURES)) {
    it(`${file} is a valid ${typeName}`, () => {
      const validate = validator(typeName);
      const data = readFixture(file);
      const ok = validate(data);
      expect(validate.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });
  }
});

describe('schema/v1.json rejects values outside the contract', () => {
  it('rejects unknown statuses and content ratings', () => {
    const validate = validator('MangaDetails');
    const details = readFixture('manga-details.json') as Record<string, unknown>;

    expect(validate(details)).toBe(true);
    expect(validate({ ...details, status: 'something-new' })).toBe(false);
    expect(validate({ ...details, contentRating: 'explicit' })).toBe(false);
    expect(validate({ ...details, status: 'unknown', contentRating: 'unknown' })).toBe(
      true,
    );
  });

  it('rejects the legacy manifest signature field', () => {
    const validate = validator('AdapterManifest');
    const manifest = readFixture('manifest.json') as Record<string, unknown>;
    const legacy: Record<string, unknown> = {
      ...manifest,
      signature: manifest.detectionSignature,
    };
    delete legacy.detectionSignature;

    expect(validate(legacy)).toBe(false);
  });

  it('rejects the legacy repository index signature field', () => {
    const validate = validator('RepositoryIndex');
    const index = readFixture('repository-index.json') as {
      extensions: Array<Record<string, unknown>>;
    };
    const extension = index.extensions[0];
    expect(extension).toBeDefined();
    const legacy: Record<string, unknown> = {
      ...extension,
      signature: extension?.bundleSignature,
    };
    delete legacy.bundleSignature;

    expect(validate({ ...index, extensions: [legacy] })).toBe(false);
  });

  it('rejects unsupported API versions', () => {
    const manifest = readFixture('manifest.json') as Record<string, unknown>;
    expect(validator('AdapterManifest')({ ...manifest, apiVersion: 2 })).toBe(false);

    const index = readFixture('repository-index.json') as {
      extensions: Array<Record<string, unknown>>;
    };
    const extension = index.extensions[0];
    expect(
      validator('RepositoryIndex')({
        ...index,
        extensions: [{ ...extension, apiVersion: 2 }],
      }),
    ).toBe(false);
  });

  it('rejects malformed bundle digests', () => {
    const manifest = readFixture('manifest.json') as Record<string, unknown>;
    expect(validator('AdapterManifest')({ ...manifest, sha256: 'xyz' })).toBe(false);

    const index = readFixture('repository-index.json') as {
      extensions: Array<Record<string, unknown>>;
    };
    const extension = index.extensions[0];
    expect(
      validator('RepositoryIndex')({
        ...index,
        extensions: [{ ...extension, sha256: 'xyz' }],
      }),
    ).toBe(false);
  });
});
