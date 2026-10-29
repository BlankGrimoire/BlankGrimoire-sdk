// SPDX-License-Identifier: MIT

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function readJSON<T>(file: string): T {
  return JSON.parse(String(fs.readFileSync(file, 'utf8'))) as T;
}

export function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
