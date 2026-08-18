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
const stale = ignore.filter((n) => !names.has(n));

for (const n of stale) {
  console.error(`  STALE  "${n}" is in .changeset/config.json "ignore" but no workspace declares that name`);
}

if (stale.length) {
  console.error(
    `\n[changesets-config] FAIL — ${stale.length} stale ignore entr${stale.length === 1 ? 'y' : 'ies'}. ` +
    `Changesets treats these as a hard ValidationError, which breaks \`changeset status\` and the release pipeline. ` +
    `Remove them, or restore the missing workspace.`
  );
  process.exit(1);
}

console.log(
  `[changesets-config] PASS — ${ignore.length} ignore entr${ignore.length === 1 ? 'y' : 'ies'} ` +
  `all resolve against ${names.size} workspaces.`
);
