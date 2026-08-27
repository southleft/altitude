#!/usr/bin/env node
/**
 * check-changesets-config.js
 *
 * Validates `.changeset/config.json` against the workspaces that actually exist.
 *
 * Why this exists: the `ignore` list referenced `al-app-enhance` for several
 * commits after that workspace was deleted. Changesets treats an unknown package
 * in `ignore` as a hard ValidationError, so `changeset status` — and therefore
 * the whole release pipeline — was broken. Nobody noticed because the CI step
 * runs `changeset status ... || true` to stay warn-only on docs/infra PRs, and
 * `|| true` swallows config errors just as happily as it swallows "no changeset
 * present".
 *
 * This check is the narrow, always-fatal complement to that warn-only step:
 * it says nothing about whether a PR has a changeset, only that the config
 * itself is coherent.
 *
 * It runs in BOTH directions, because for a long time it only ran in one:
 *
 *   STALE     - a name in `ignore` that no workspace declares. Changesets treats
 *               this as a hard ValidationError, so the release pipeline dies.
 *               (The original `al-app-enhance` failure.)
 *
 *   UNCLAIMED - a real pnpm workspace that is in neither `ignore` nor a
 *               `fixed`/`linked` release group. Changesets versions private
 *               packages by default, so an unclaimed workspace silently becomes
 *               a spurious patch bump - and an unclaimed NON-private one becomes
 *               a package that publishes without anyone deciding it should.
 *               apps/docs sat unclaimed from the day it was added until
 *               2026-08-27, green the whole time, because this half of the check
 *               did not exist.
 *
 * "Workspace" here means what pnpm means: the packages matched by
 * pnpm-workspace.yaml's globs. Nested package.json files that are NOT workspaces
 * (libs/al-web-components/story-fixture) are invisible to changesets and must not
 * be required in `ignore`.
 *
 * Exit 0 = clean, 1 = at least one problem.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['node_modules', '.git', 'dist', '.claude', 'storybook-static', '.angular', '.svelte-kit']);

function collectWorkspaceNames(dir, found = new Map()) {
  let entries;
  try { entries = readdirSync(dir); } catch { return found; }
  if (dir !== ROOT && entries.includes('package.json')) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      if (pkg.name) found.set(pkg.name, dir);
    } catch { /* unreadable package.json is not this check's concern */ }
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) collectWorkspaceNames(p, found);
  }
  return found;
}

/**
 * The packages pnpm itself considers workspaces - i.e. exactly what changesets
 * will see. Only `dir/*` globs are supported, which is all pnpm-workspace.yaml
 * uses here; anything more exotic is reported rather than silently under-matched.
 */
function collectPnpmWorkspaces() {
  const wsPath = join(ROOT, 'pnpm-workspace.yaml');
  if (!existsSync(wsPath)) return null;
  const globs = readFileSync(wsPath, 'utf8')
    .split(/[\r\n]+/)
    .map((line) => line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*$/))
    .filter(Boolean)
    .map((m) => m[1].trim());

  const names = new Map();
  for (const glob of globs) {
    if (!glob.endsWith('/*')) {
      console.error(`  NOTE   unsupported workspace glob "${glob}" - not expanded by this check`);
      continue;
    }
    const rel = glob.slice(0, -2);
    let entries;
    try { entries = readdirSync(join(ROOT, rel)); } catch { continue; }
    for (const entry of entries) {
      const pkgPath = join(ROOT, rel, entry, 'package.json');
      if (!existsSync(pkgPath)) continue;
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg.name) names.set(pkg.name, `${rel}/${entry}`);
      } catch { /* unreadable package.json is not this check's concern */ }
    }
  }
  return names;
}

const configPath = join(ROOT, '.changeset', 'config.json');
if (!existsSync(configPath)) {
  console.error('[changesets-config] FAIL — .changeset/config.json not found');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error(`[changesets-config] FAIL — .changeset/config.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const names = collectWorkspaceNames(ROOT);
const ignore = Array.isArray(config.ignore) ? config.ignore : [];

// --- direction 1: every `ignore` entry names a package that exists ---
const stale = ignore.filter((n) => !names.has(n));
for (const n of stale) {
  console.error(`  STALE  "${n}" is in .changeset/config.json "ignore" but no workspace declares that name`);
}

// --- direction 2: every real workspace is either released or ignored ---
const workspaces = collectPnpmWorkspaces();
const released = new Set([
  ...(Array.isArray(config.fixed) ? config.fixed.flat() : []),
  ...(Array.isArray(config.linked) ? config.linked.flat() : []),
]);
const ignored = new Set(ignore);
const unclaimed = workspaces
  ? [...workspaces].filter(([name]) => !released.has(name) && !ignored.has(name))
  : [];
for (const [name, dir] of unclaimed) {
  console.error(`  UNCLAIMED  "${name}" (${dir}) is in neither "ignore" nor a "fixed"/"linked" release group`);
}

if (stale.length || unclaimed.length) {
  if (stale.length) {
    console.error(
      `\n[changesets-config] FAIL — ${stale.length} stale ignore entr${stale.length === 1 ? 'y' : 'ies'}. ` +
      `Changesets treats these as a hard ValidationError, which breaks \`changeset status\` and the release pipeline. ` +
      `Remove them, or restore the missing workspace.`
    );
  }
  if (unclaimed.length) {
    console.error(
      `\n[changesets-config] FAIL — ${unclaimed.length} unclaimed workspace${unclaimed.length === 1 ? '' : 's'}. ` +
      `Changesets versions private packages by default, so an unclaimed workspace becomes a spurious patch ` +
      `bump, and an unclaimed non-private one publishes without anyone deciding it should. ` +
      `Add each to "ignore" if it must not ship, or to a "fixed"/"linked" group if it must.`
    );
  }
  process.exit(1);
}

console.log(
  `[changesets-config] PASS — ${ignore.length} ignore entr${ignore.length === 1 ? 'y' : 'ies'} ` +
  `all resolve against ${names.size} package manifests; all ` +
  `${workspaces ? workspaces.size : '?'} pnpm workspaces are either released (${released.size}) or ignored.`
);
