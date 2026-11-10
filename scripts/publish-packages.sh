#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

expected_version="$(node -p "require('$root/package.json').version")"

for package in types runtime testing cli; do
  package_dir="$root/packages/$package"
  package_workdir="$workdir/$package"
  mkdir -p "$package_workdir"

  # `pnpm pack` rewrites `workspace:` ranges to concrete versions before the
  # tarball is handed to npm. Verify that rewrite so npm never receives an
  # uninstallable manifest.
  pnpm --dir "$package_dir" pack \
    --pack-destination "$package_workdir" >/dev/null

  archive="$(find "$package_workdir" -maxdepth 1 -type f -name '*.tgz' -print -quit)"
  if [[ -z "$archive" ]]; then
    echo "No package archive was produced for @blankgrimoire/$package" >&2
    exit 1
  fi

  manifest="$(tar -xOzf "$archive" package/package.json)"
  if printf '%s' "$manifest" | grep -q 'workspace:'; then
    echo "Packed manifest for @blankgrimoire/$package still contains a workspace: range" >&2
    exit 1
  fi

  packed_version="$(
    printf '%s' "$manifest" |
      node -e 'let input = ""; process.stdin.on("data", (chunk) => { input += chunk; }); process.stdin.on("end", () => { process.stdout.write(JSON.parse(input).version); });'
  )"
  if [[ "$packed_version" != "$expected_version" ]]; then
    echo "Packed @blankgrimoire/$package version is $packed_version, expected $expected_version" >&2
    exit 1
  fi

  if [[ "${PUBLISH_DRY_RUN:-0}" == "1" ]]; then
    echo "Dry run: @blankgrimoire/$package@$packed_version passed manifest checks"
    continue
  fi

  publish_args=("$archive" --access public --provenance)
  npx --yes -p npm@11.5.1 npm publish "${publish_args[@]}"
done
