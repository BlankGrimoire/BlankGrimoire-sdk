#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

runtime_js="packages/runtime/dist/runtime.js"
schema_json="schema/v1.json"
fixtures_dir="fixtures/v1"
release_dir="release"

fail() {
  echo "$1" >&2
  exit 1
}

[[ -s "$runtime_js" ]] || fail "Missing or empty runtime bundle: $runtime_js (run pnpm build)"
[[ -s "$schema_json" ]] || fail "Missing or empty schema: $schema_json (run pnpm schema)"
[[ -d "$fixtures_dir" ]] || fail "Missing fixtures directory: $fixtures_dir"

fixture_files="$(find "$fixtures_dir" -maxdepth 1 -type f -name '*.json' -print | sort)"
fixture_count="$(printf '%s\n' "$fixture_files" | sed '/^$/d' | wc -l | tr -d ' ')"
[[ "$fixture_count" -gt 0 ]] || fail "No JSON fixtures found in $fixtures_dir"

rm -rf "$release_dir"
mkdir -p "$release_dir"
cp "$runtime_js" "$release_dir/runtime.js"
cp "$schema_json" "$release_dir/schema-v1.json"
tar -czf "$release_dir/fixtures-v1.tar.gz" -C fixtures v1

for asset in "$release_dir/runtime.js" "$release_dir/schema-v1.json" "$release_dir/fixtures-v1.tar.gz"; do
  [[ -s "$asset" ]] || fail "Release asset missing or empty: $asset"
done

tar_list="$(mktemp)"
trap 'rm -f "$tar_list"' EXIT
tar -tzf "$release_dir/fixtures-v1.tar.gz" > "$tar_list"

# iOS extracts the archive into its `fixtures/` directory and expects the
# canonical `v1/<fixture>.json` layout at the archive root.
grep -qx 'v1/' "$tar_list" || fail "fixtures-v1.tar.gz is missing the top-level v1/ directory"
archived_count="$(grep -c '^v1/[^/]*\.json$' "$tar_list" || true)"
[[ "$archived_count" -eq "$fixture_count" ]] || fail \
  "fixtures-v1.tar.gz contains $archived_count JSON files, expected $fixture_count"

while IFS= read -r fixture; do
  [[ -n "$fixture" ]] || continue
  name="$(basename "$fixture")"
  grep -qx "v1/$name" "$tar_list" || fail "fixtures-v1.tar.gz is missing v1/$name"
done <<< "$fixture_files"

echo "Release assets ready in $release_dir:"
ls -1 "$release_dir"
