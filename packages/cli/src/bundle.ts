import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

export type BuildOptions = {
  entry: string;
  outdir: string;
  outFile?: string;
  minify?: boolean;
  sourcemap?: boolean;
};

/**
 * Builds a TypeScript/JavaScript entry point into a single IIFE bundle using esbuild.
 * The output is compatible with JavaScriptCore (iOS) and Node.
 */
export async function buildBundle(options: BuildOptions): Promise<string> {
  const outFile = options.outFile ?? path.join(options.outdir, 'runtime.js');

  await build({
    entryPoints: [options.entry],
    outfile: outFile,
    bundle: true,
    format: 'iife',
    target: 'ES2020',
    platform: 'browser',
    minify: options.minify ?? false,
    sourcemap: options.sourcemap ?? false,
    globalName: 'BlankGrimoireRuntime',
  });

  return outFile;
}
