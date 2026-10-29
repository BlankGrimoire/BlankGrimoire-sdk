#!/usr/bin/env bash
set -euo pipefail

VERSION="$1"

for f in package.json packages/*/package.json; do
  [ -f "$f" ] || continue
  tmp="$(mktemp)"
  jq --arg v "$VERSION" '.version = $v' "$f" > "$tmp"
  mv "$tmp" "$f"
done
