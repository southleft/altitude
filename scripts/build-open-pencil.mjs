#!/usr/bin/env node
/**
 * Builds the OpenPencil canvas editor (apps/open-pencil, a Bun workspace) into
 * dist/open-pencil/, served at /open-pencil/ behind the GitHub sign-in gate in
 * functions/open-pencil/_middleware.js.
 *
 * SOFT BY DEFAULT. build:all is a strict && chain and Cloudflare publishes nothing if
 * any step fails. The docs are the product surface; a broken editor build must not take
 * them down. So a failure here prints a loud warning, leaves no partial dist/open-pencil,
 * and exits 0. Pass --strict (or OPEN_PENCIL_BUILD_STRICT=1) to fail instead, e.g. in CI.
 *
 * Bun: uses `bun` from PATH when present, otherwise `npx bun@<pinned>` (the Cloudflare
 * Pages image has Node but not Bun). The pin is apps/open-pencil/package.json
 * `packageManager`.
 *
 * Environment: the child build inherits process.env, so a Pages variable such as
 * VITE_OPENPENCIL_RELAY_URL (the hosted MCP relay, see apps/open-pencil/ALTITUDE.md)
 * reaches Vite, which exposes VITE_* variables to the editor.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'apps', 'open-pencil');
const OUT = join(ROOT, 'dist', 'open-pencil');
const BASE = '/open-pencil/';
// The hosted MCP relay (apps/open-pencil/packages/relay, Cloudflare Worker). Not a secret: it
// is the URL agents connect to. Vite bakes it in at build time, so it lives here as the
// default; the VITE_OPENPENCIL_RELAY_URL Pages variable still overrides it.
const DEFAULT_RELAY_URL = 'https://altitude-open-pencil-mcp.southleft-llc.workers.dev';
const strict = process.argv.includes('--strict') || process.env.OPEN_PENCIL_BUILD_STRICT === '1';

const pkg = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8'));
const bunVersion = /^bun@(.+)$/.exec(pkg.packageManager ?? '')?.[1] ?? 'latest';

function hasBun() {
  return spawnSync('bun', ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' }).status === 0;
}

const bun = hasBun() ? ['bun'] : ['npx', '--yes', `bun@${bunVersion}`];

function run(args, env = {}) {
  const [cmd, ...rest] = [...bun, ...args];
  console.log(`[open-pencil] $ ${[cmd, ...rest].join(' ')}`);
  const result = spawnSync(cmd, rest, {
    cwd: APP,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) throw new Error(`${args.join(' ')} exited with ${result.status}`);
}

try {
  if (!existsSync(join(ROOT, 'dist'))) throw new Error('dist/ does not exist — run after the docs build');
  rmSync(OUT, { recursive: true, force: true });
  run(['install', '--frozen-lockfile']);
  run(['run', 'build:packages']);
  const relayURL = process.env.VITE_OPENPENCIL_RELAY_URL?.trim() || DEFAULT_RELAY_URL;
  console.log(
    `[open-pencil] MCP relay: ${relayURL}` +
      (process.env.VITE_OPENPENCIL_RELAY_URL?.trim() ? ' (from VITE_OPENPENCIL_RELAY_URL)' : ' (default)')
  );
  run(['x', 'vite', 'build', '--outDir', OUT, '--emptyOutDir'], {
    OPENPENCIL_BASE: BASE,
    VITE_OPENPENCIL_RELAY_URL: relayURL,
  });
  console.log(`[open-pencil] built ${BASE} -> ${OUT}`);
} catch (error) {
  rmSync(OUT, { recursive: true, force: true });
  const message = error instanceof Error ? error.message : String(error);
  if (strict) {
    console.error(`[open-pencil] FAILED: ${message}`);
    process.exit(1);
  }
  console.warn(`\n[open-pencil] WARNING: editor build failed (${message}).`);
  console.warn('[open-pencil] Continuing without /open-pencil/ so the docs still deploy.\n');
}
