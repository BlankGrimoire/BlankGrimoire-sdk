#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

for package in types runtime testing cli; do
  package_dir="$root/packages/$package"
  package_workdir="$workdir/$package"
  mkdir -p "$package_workdir"

  pnpm --dir "$package_dir" pack \
    --pack-destination "$package_workdir" >/dev/null

  archive="$(find "$package_workdir" -maxdepth 1 -type f -name '*.tgz' -print -quit)"
  if [[ -z "$archive" ]]; then
    echo "No package archive was produced for @blankgrimoire/$package" >&2
    exit 1
  fi

  publish_args=("$archive" --access public --provenance)
  if [[ "${PUBLISH_DRY_RUN:-0}" == "1" ]]; then
    publish_args+=(--dry-run)
  fi
  npx --yes -p npm@11.5.1 npm publish "${publish_args[@]}"
done
