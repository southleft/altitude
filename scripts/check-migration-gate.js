#!/usr/bin/env node
/**
 * G2 — Migration manifest gate.
 *
 * Fails CI if a PR modifies a `legacy` component beyond migration scope.
 *
 * Heuristic:
 *   1. Read `.altitude/migration.json` from HEAD.
 *   2. List files changed vs the base ref.
 *   3. For each changed file inside a known component directory, look up the
 *      component's `state` in migration.json.
 *   4. `legacy` components: change is allowed ONLY when the same PR also flips
 *      the component's state in migration.json away from `legacy`.
 *   5. `dual` and `scoped-complete` components: no restriction here (other
 *      gates enforce their invariants).
 *
 * Usage: node scripts/check-migration-gate.js --base=origin/main
 *
 * Exit codes:
 *   0 — pass
 *   1 — at least one legacy component touched without a state transition
 *   2 — internal error (cannot read manifest, base ref unknown)
 *
 * Intentionally zero-dependency (CommonJS, built-ins only) so it runs on any
 * Node 18+ checkout without `yarn install`.
 */

'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const MANIFEST = path.join(REPO, '.altitude', 'migration.json');
const WC_PREFIX = 'libs/al-web-components/components/';
const REACT_PREFIX = 'libs/al-react/src/components/';

function args() {
  const out = {};
  for (const a of process.argv.slice(2)) {
    const [k, v] = a.replace(/^--?/, '').split('=');
    out[k] = v ?? true;
  }
  return out;
}

function readManifest(ref) {
  try {
    if (ref) {
      const raw = execSync(`git show ${ref}:.altitude/migration.json`, {
        cwd: REPO,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return JSON.parse(raw);
    }
    return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch (err) {
    return null;
  }
}

function changedFiles(base) {
  const out = execSync(`git diff --name-only ${base}...HEAD`, {
    cwd: REPO,
    encoding: 'utf8',
  });
  return out.split('\n').filter(Boolean);
}

function componentOf(file) {
  // Web component
  if (file.startsWith(WC_PREFIX)) {
    const rest = file.slice(WC_PREFIX.length);
    const seg = rest.split('/')[0];
    // Components are directories. Skip loose top-level files (the `bundle.ts`
    // barrel, the `ALElement.ts` base class, etc.) and the shared test dir —
    // only kebab-case component directories are subject to the gate.
    if (seg.includes('.') || seg === '__tests__') return null;
    return seg; // already kebab-case
  }
  // React wrapper — convert PascalCase to kebab-case via a known table
  if (file.startsWith(REACT_PREFIX)) {
    const rest = file.slice(REACT_PREFIX.length);
    const seg = rest.split('/')[0];
    // `Icons/` is a container of per-glyph wrappers (Icons/Add/Add.tsx, ...), not a
    // component in its own right — `pascalToKebab` would yield `icons`, which is not
    // a key in migration.json and would fail the gate for every icon PR. Every file
    // under it belongs to the real `icon` component.
    if (seg === 'Icons') return 'icon';
    return pascalToKebab(seg);
  }
  return null;
}

function pascalToKebab(name) {
  // Handles AccordionPanel -> accordion-panel, DateTimePicker -> date-time-picker
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function main() {
  const a = args();
  const base = a.base || 'origin/main';
  const headManifest = readManifest(null);
  if (!headManifest) {
    console.error('[migration-gate] cannot read .altitude/migration.json from HEAD');
    process.exit(2);
  }
  let baseManifest = readManifest(base);
  if (!baseManifest) {
    // If base doesn't have the manifest yet (first PR after T0.2), treat all as legacy.
    baseManifest = { components: {} };
  }

  let files;
  try {
    files = changedFiles(base);
  } catch (err) {
    console.error(`[migration-gate] cannot diff vs ${base}: ${err.message}`);
    process.exit(2);
  }

  const touched = new Map(); // component -> Set<files>
  for (const f of files) {
    const c = componentOf(f);
    if (!c) continue;
    if (!touched.has(c)) touched.set(c, new Set());
    touched.get(c).add(f);
  }

  const violations = [];
  for (const [component, fileSet] of touched) {
    const baseEntry = baseManifest.components?.[component];
    const headEntry = headManifest.components?.[component];
    if (!headEntry) {
      violations.push({ component, reason: 'component missing from migration.json', files: [...fileSet] });
      continue;
    }
    const wasLegacy = !baseEntry || baseEntry.state === 'legacy';
    const isLegacy = headEntry.state === 'legacy';
    if (wasLegacy && isLegacy) {
      violations.push({
        component,
        reason: 'component is in `legacy` state and PR does not flip it to `dual`/`scoped-complete`',
        files: [...fileSet],
      });
    }
  }

  if (violations.length === 0) {
    console.log('[migration-gate] PASS — no `legacy` components touched without a state transition.');
    process.exit(0);
  }

  console.error('[migration-gate] FAIL — the following `legacy` components were modified without a state change:\n');
  for (const v of violations) {
    console.error(`  • ${v.component}: ${v.reason}`);
    for (const f of v.files) console.error(`      ${f}`);
  }
  console.error(
    '\nIf this is intentional migration work, also update `.altitude/migration.json` to flip the component out of `legacy` in the same PR.'
  );
  process.exit(1);
}

main();
