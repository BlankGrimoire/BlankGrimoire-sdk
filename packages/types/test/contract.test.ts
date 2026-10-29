import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const schema = JSON.parse(readFileSync(`${root}schema/v1.json`, 'utf8'));
const fixturesDir = `${root}fixtures/v1/`;

/** Intentionally invalid: exercises Swift tolerance of unknown statuses. */
const EXCLUDED = new Set(['manga-details-unknown-status.json']);

const FIXTURES: Record<string, string> = {
  'manga-summary.json': 'MangaSummary',
  'manga-details.json': 'MangaDetails',
  'chapter.json': 'Chapter',
  'page.json': 'Page',
  'paged-result.json': 'MangaSummaryPage',
  'search-query.json': 'SearchQuery',
  'manifest.json': 'AdapterManifest',
  'repository-index.json': 'RepositoryIndex',
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema, 'v1');

describe('fixtures/v1 conform to schema/v1.json', () => {
  it('maps every non-excluded fixture to a type', () => {
    const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.json') && !EXCLUDED.has(f));
    expect(files.sort()).toEqual(Object.keys(FIXTURES).sort());
  });

  for (const [file, typeName] of Object.entries(FIXTURES)) {
    it(`${file} is a valid ${typeName}`, () => {
      const validate = ajv.getSchema(`v1#/definitions/${encodeURIComponent(typeName)}`);
      expect(validate, `definition ${typeName} missing from schema`).toBeDefined();
      const data = JSON.parse(readFileSync(`${fixturesDir}${file}`, 'utf8'));
      const ok = validate!(data);
      expect(validate!.errors ?? []).toEqual([]);
      expect(ok).toBe(true);
    });
  }
});
