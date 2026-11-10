#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
set -euo pipefail

VERSION="${1:?usage: set-version.sh <version>}"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid version: $VERSION" >&2
  exit 1
fi

for f in package.json packages/*/package.json; do
  [ -f "$f" ] || continue
  node -e '
    const fs = require("node:fs");
    const [file, version] = process.argv.slice(1);
    const text = fs.readFileSync(file, "utf8");
    const pattern = /("version"\s*:\s*")[^"]*(")/;
    if (!pattern.test(text)) {
      console.error(`No version field found in ${file}`);
      process.exit(1);
    }
    fs.writeFileSync(file, text.replace(pattern, `$1${version}$2`));
  ' "$f" "$VERSION"
done
