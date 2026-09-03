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
 *   6. Components DELETED by the PR (no directory left in either library) are
 *      skipped — dropping their manifest key is correct bookkeeping, not a
 *      missing entry.
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

/**
 * A component that no longer exists on disk was DELETED by this PR. Removing its
 * key from migration.json is the correct bookkeeping for a deletion, so the gate
 * must not read that removal as "missing from migration.json". We check the
 * working tree rather than the diff because a component is only truly gone once
 * both the web-component directory and the React wrapper directory are absent.
 */
function isDeletedComponent(component) {
  const wcDir = path.join(REPO, WC_PREFIX, component);
  const reactDir = path.join(REPO, REACT_PREFIX, kebabToPascal(component));
  return !fs.existsSync(wcDir) && !fs.existsSync(reactDir);
}

function kebabToPascal(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
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
      // A deleted component legitimately has no manifest entry.
      if (isDeletedComponent(component)) {
        console.log(`[migration-gate] note — \`${component}\` was deleted; skipping.`);
        continue;
      }
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

  /**
   * THE REGRESSION INVARIANT.
   *
   * The rule above can only fire when a `legacy` component exists. As of the v2
   * refactor all 67 components are `scoped-complete`, so it fires never — the
   * gate reports PASS on every PR and the self-test has to synthesise a fake
   * `legacy` entry to exercise it at all. A gate that cannot fail is not a gate;
   * it is a green light with no bulb behind it.
   *
   * This is the invariant that still has teeth in the end state: a component may
   * move FORWARD along `legacy -> dual -> scoped-complete`, never backward. It is
   * policy-neutral (it forbids no state, it forbids only losing ground) and it
   * fires on a real mistake — a bad merge or a hand-edit that drops a component
   * back to `dual` silently re-opens every invariant `scoped-complete` asserts.
   *
   * The distribution is printed on every run whether or not anything is wrong,
   * because a gate missing from the log is indistinguishable from one that never
   * ran, and this repo treats that silence as the failure.
   */
  const RANK = { legacy: 0, dual: 1, 'scoped-complete': 2 };
  const regressions = [];
  for (const [name, headEntry] of Object.entries(headManifest.components ?? {})) {
    const baseEntry = baseManifest.components?.[name];
    if (!baseEntry) continue; // new component — nothing to regress from
    const before = RANK[baseEntry.state];
    const after = RANK[headEntry.state];
    if (before === undefined || after === undefined) continue;
    if (after < before) {
      regressions.push({ component: name, from: baseEntry.state, to: headEntry.state });
    }
  }

  const distribution = Object.values(headManifest.components ?? {}).reduce((acc, e) => {
    acc[e.state] = (acc[e.state] ?? 0) + 1;
    return acc;
  }, {});
  const shape = Object.entries(distribution)
    .sort()
    .map(([k, v]) => `${v} ${k}`)
    .join(', ');
  console.log(`[migration-gate] migration.json: ${shape}`);

  if (regressions.length > 0) {
    console.error('\n[migration-gate] FAIL — migration state moved BACKWARD:\n');
    for (const r of regressions) {
      console.error(`  • ${r.component}: ${r.from} -> ${r.to}`);
    }
    console.error(
      '\nA component may advance legacy -> dual -> scoped-complete, never the reverse.\n' +
        'If a component genuinely needs re-migrating, say so in the PR and change this gate\n' +
        'deliberately — do not let a merge quietly undo a completed migration.',
    );
    process.exit(1);
  }

  if (violations.length === 0) {
    console.log('[migration-gate] PASS — no `legacy` components touched without a state transition, no state regressions.');
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
