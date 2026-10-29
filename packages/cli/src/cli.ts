#!/usr/bin/env node
// SPDX-License-Identifier: MIT

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ThemeSignature } from '@blankgrimoire/types';
import { buildBundle, type BuildOptions } from './bundle.js';
import { buildIndexJson, type ExtensionEntry } from './index-json.js';
import { buildManifest } from './manifest.js';
import { signBundle, type SignOptions } from './sign.js';

export interface CLIIO {
  log(message: string): void;
  error(message: string): void;
}

const consoleIO: CLIIO = {
  log: (message) => process.stdout.write(`${message}\n`),
  error: (message) => process.stderr.write(`${message}\n`),
};

class UsageError extends Error {}

const USAGE = `BlankGrimoire adapter tooling

Usage:
  blankgrimoire build <entry> --outdir <dir> [--outfile <file>] [--minify] [--sourcemap]
  blankgrimoire manifest --id <id> --name <name> --version <version> --sha256 <hex> --detection-signature <file> --out <file>
  blankgrimoire sign <file> (--key-file <file> | BLANKGRIMOIRE_PRIVATE_KEY) [--out <file>]
  blankgrimoire index --name <name> --public-key <key> --extensions <file> --out <file>
  blankgrimoire hash <file>
  blankgrimoire help

The detection signature file contains the ThemeSignature JSON object.
The extensions file contains the repository index extensions array.`;

type Flags = Record<string, string | true>;

interface ParsedArguments {
  command: string | undefined;
  positionals: string[];
  flags: Flags;
}

function parseArguments(argv: string[]): ParsedArguments {
  const [command, ...rest] = argv;
  const positionals: string[] = [];
  const flags: Flags = {};

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === undefined) {
      continue;
    }
    if (!argument.startsWith('--')) {
      positionals.push(argument);
      continue;
    }
    const name = argument.slice(2);
    if (name === '') {
      throw new UsageError('Empty flag name');
    }
    const next = rest[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags[name] = next;
      index += 1;
    } else {
      flags[name] = true;
    }
  }

  return { command, positionals, flags };
}

function requireFlag(flags: Flags, name: string): string {
  const value = flags[name];
  if (typeof value !== 'string' || value === '') {
    throw new UsageError(`Missing --${name}`);
  }
  return value;
}

function optionalFlag(flags: Flags, name: string): string | undefined {
  const value = flags[name];
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function booleanFlag(flags: Flags, name: string): boolean {
  const value = flags[name];
  if (value === undefined) {
    return false;
  }
  if (value === true) {
    return true;
  }
  throw new UsageError(`--${name} does not take a value`);
}

function readJSON(file: string, label: string): unknown {
  let text: string;
  try {
    text = String(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new UsageError(`Cannot read ${label}: ${file}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new UsageError(`Invalid JSON in ${label}: ${file}`);
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new UsageError(`${label} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

const DETECTION_FIELDS = new Set([
  'metaGenerator',
  'selectors',
  'scriptSrc',
  'probePaths',
  'minScore',
]);

function readDetectionSignature(file: string): ThemeSignature {
  const value = asRecord(readJSON(file, 'detection signature'), 'Detection signature');

  for (const field of Object.keys(value)) {
    if (!DETECTION_FIELDS.has(field)) {
      throw new UsageError(`Detection signature: unknown field ${field}`);
    }
  }
  if (value.metaGenerator !== undefined && typeof value.metaGenerator !== 'string') {
    throw new UsageError('Detection signature: metaGenerator must be a string');
  }
  for (const field of ['selectors', 'scriptSrc', 'probePaths']) {
    const list = value[field];
    if (
      list !== undefined &&
      (!Array.isArray(list) || list.some((item) => typeof item !== 'string'))
    ) {
      throw new UsageError(`Detection signature: ${field} must be an array of strings`);
    }
  }
  if (
    typeof value.minScore !== 'number' ||
    !Number.isFinite(value.minScore) ||
    value.minScore < 0
  ) {
    throw new UsageError('Detection signature requires a non-negative numeric minScore');
  }
  return value as unknown as ThemeSignature;
}

const EXTENSION_FIELDS = new Set([
  'id',
  'name',
  'version',
  'apiVersion',
  'bundleURL',
  'sha256',
  'bundleSignature',
]);

function readExtensions(file: string): ExtensionEntry[] {
  const value = readJSON(file, 'extensions');
  if (!Array.isArray(value)) {
    throw new UsageError('Extensions file must be a JSON array');
  }

  return value.map((entry, index) => {
    const record = asRecord(entry, `Extension ${index}`);
    for (const field of Object.keys(record)) {
      if (!EXTENSION_FIELDS.has(field)) {
        throw new UsageError(`Extension ${index}: unknown field ${field}`);
      }
    }
    for (const field of [
      'id',
      'name',
      'version',
      'bundleURL',
      'sha256',
      'bundleSignature',
    ]) {
      if (typeof record[field] !== 'string') {
        throw new UsageError(`Extension ${index}: missing string field ${field}`);
      }
    }
    if (typeof record.apiVersion !== 'number') {
      throw new UsageError(`Extension ${index}: missing numeric field apiVersion`);
    }
    return record as unknown as ExtensionEntry;
  });
}

async function buildCommand(
  positionals: string[],
  flags: Flags,
  io: CLIIO,
): Promise<number> {
  const entry = positionals[0];
  if (entry === undefined) {
    throw new UsageError('build requires an entry file');
  }

  const options: BuildOptions = {
    entry,
    outdir: requireFlag(flags, 'outdir'),
  };
  const outFile = optionalFlag(flags, 'outfile');
  if (outFile !== undefined) {
    options.outFile = outFile;
  }
  options.minify = booleanFlag(flags, 'minify');
  options.sourcemap = booleanFlag(flags, 'sourcemap');

  const output = await buildBundle(options);
  io.log(`Built ${output}`);
  return 0;
}

async function manifestCommand(flags: Flags, io: CLIIO): Promise<number> {
  const output = await buildManifest({
    id: requireFlag(flags, 'id'),
    name: requireFlag(flags, 'name'),
    version: requireFlag(flags, 'version'),
    detectionSignature: readDetectionSignature(
      requireFlag(flags, 'detection-signature'),
    ),
    sha256: requireFlag(flags, 'sha256'),
    outFile: requireFlag(flags, 'out'),
  });
  io.log(`Wrote ${output}`);
  return 0;
}

async function signCommand(
  positionals: string[],
  flags: Flags,
  io: CLIIO,
): Promise<number> {
  const file = positionals[0];
  if (file === undefined) {
    throw new UsageError('sign requires a file to sign');
  }

  const keyFile = optionalFlag(flags, 'key-file');
  const environmentKey = process.env.BLANKGRIMOIRE_PRIVATE_KEY;
  let privateKey: string;
  if (keyFile !== undefined) {
    try {
      privateKey = String(fs.readFileSync(keyFile, 'utf8'));
    } catch {
      throw new UsageError(`Cannot read private key: ${keyFile}`);
    }
  } else if (environmentKey !== undefined && environmentKey !== '') {
    privateKey = environmentKey;
  } else {
    throw new UsageError('sign requires --key-file or BLANKGRIMOIRE_PRIVATE_KEY');
  }

  const data = fs.readFileSync(file);
  const options: SignOptions = {
    privateKey,
    data: Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'),
  };
  const outFile = optionalFlag(flags, 'out');
  if (outFile !== undefined) {
    options.outFile = outFile;
  }

  const signature = await signBundle(options);
  if (outFile !== undefined) {
    io.log(`Wrote ${outFile}`);
  } else {
    io.log(signature);
  }
  return 0;
}

async function indexCommand(flags: Flags, io: CLIIO): Promise<number> {
  const output = await buildIndexJson({
    name: requireFlag(flags, 'name'),
    publicKey: requireFlag(flags, 'public-key'),
    extensions: readExtensions(requireFlag(flags, 'extensions')),
    outFile: requireFlag(flags, 'out'),
  });
  io.log(`Wrote ${output}`);
  return 0;
}

function hashCommand(positionals: string[], io: CLIIO): number {
  const file = positionals[0];
  if (file === undefined) {
    throw new UsageError('hash requires a file');
  }
  let data: string | Buffer;
  try {
    data = fs.readFileSync(file);
  } catch {
    throw new UsageError(`Cannot read file: ${file}`);
  }
  const digest = crypto.createHash('sha256').update(data).digest('hex');
  io.log(digest);
  return 0;
}

async function execute(argv: string[], io: CLIIO): Promise<number> {
  const { command, positionals, flags } = parseArguments(argv);

  if (
    command === undefined ||
    command === 'help' ||
    command === '--help' ||
    command === '-h' ||
    flags.help === true
  ) {
    io.log(USAGE);
    return 0;
  }

  switch (command) {
    case 'build':
      return buildCommand(positionals, flags, io);
    case 'manifest':
      return manifestCommand(flags, io);
    case 'sign':
      return signCommand(positionals, flags, io);
    case 'index':
      return indexCommand(flags, io);
    case 'hash':
      return hashCommand(positionals, io);
    default:
      throw new UsageError(`Unknown command: ${command}`);
  }
}

export async function runCLI(argv: string[], io: CLIIO = consoleIO): Promise<number> {
  try {
    return await execute(argv, io);
  } catch (error) {
    if (error instanceof UsageError) {
      io.error(`Error: ${error.message}`);
      io.error('');
      io.error(USAGE);
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    io.error(`Error: ${message}`);
    return 1;
  }
}

const entry = process.argv[1];
if (entry !== undefined) {
  let isMain = false;
  try {
    isMain = fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    isMain = false;
  }
  if (isMain) {
    void runCLI(process.argv.slice(2)).then((code) => {
      process.exitCode = code;
    });
  }
}
