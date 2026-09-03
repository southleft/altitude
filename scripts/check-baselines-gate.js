#!/usr/bin/env node
/**
 * G8 — Baselines-before-changes gate.
 *
 * Fails CI if a PR modifies dependency versions or build config without also
 * updating `.altitude/baselines/`. Token snapshot, bundle-size record, and
 * VRT screenshots must move in lockstep with the changes that affect them.
 *
 * The watch list is `WATCHED` below and is the single source of truth for it —
 * `scripts/gate-self-test.sh` reads it from here rather than hardcoding a
 * fixture, because the two drifted apart once already (see the note on the
 * webpack entry below) and a self-test that exercises a file the gate no longer
 * watches proves nothing.
 *
 * Usage: node scripts/check-baselines-gate.js --base=origin/main
 *
 * Exit codes:
 *   0 — pass (no watched change OR baselines were updated in the same PR)
 *   1 — watched change without baseline update
 *   2 — internal error
 */

'use strict';

const { execSync } = require('node:child_process');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');

// EXPORTED so scripts/gate-self-test.sh can build its fixture from the real
// list instead of a hardcoded copy. Keep every entry a path that can actually
// exist in this repo today — a regex for a deleted file is a permanently dead
// watch, and a dead watch is indistinguishable from a passing one.
const WATCHED = [
  /^libs\/al-web-components\/package\.json$/,
  /^libs\/al-react\/package\.json$/,
  /^package\.json$/,
  // Vite decides what the bundle contains, which is exactly what the bundle
  // baseline measures. It replaced webpack in T2.2 — and this gate went on
  // watching `webpack.config.js` for months afterwards, so the one file most
  // able to move the baseline was unwatched while the gate looked healthy.
  // gate-self-test.sh even created a webpack.config.js to make the gate fire,
  // which is how a green self-test coexisted with a dead watch.
  /^libs\/al-web-components\/vite\.config\.mjs$/,
  /^libs\/al-react\/vite\.config\.(mjs|ts)$/,
  // A resolution change moves compiled output without any source edit.
  /^pnpm-lock\.yaml$/,
  /^libs\/al-web-components\/tsconfig\.json$/,
  // The SD v3 config (`styles/tokens-config.js`) was deleted in T6.2; watching
  // it was a permanently dead regex. `tokens-config.v5.mjs` is the sole token
  // build config now — a brand added to its `brands` array changes the emitted
  // token set without touching `styles/tokens-dtcg/`.
  /^libs\/al-web-components\/styles\/tokens-config\.v5\.mjs$/,
  /^libs\/al-web-components\/styles\/tokens-dtcg\//,
];

const BASELINE_PREFIX = '.altitude/baselines/';

function args() {
  const out = {};
  for (const a of process.argv.slice(2)) {
    const [k, v] = a.replace(/^--?/, '').split('=');
    out[k] = v ?? true;
  }
  return out;
}

function changedFiles(base) {
  const out = execSync(`git diff --name-only ${base}...HEAD`, {
    cwd: REPO,
    encoding: 'utf8',
  });
  return out.split('\n').filter(Boolean);
}

function main() {
  const a = args();
  const base = a.base || 'origin/main';
  let files;
  try {
    files = changedFiles(base);
  } catch (err) {
    console.error(`[baselines-gate] cannot diff vs ${base}: ${err.message}`);
    process.exit(2);
  }

  const watchedHits = files.filter(f => WATCHED.some(re => re.test(f)));
  const baselineHits = files.filter(f => f.startsWith(BASELINE_PREFIX));

  if (watchedHits.length === 0) {
    console.log('[baselines-gate] PASS — no dep/build changes detected.');
    process.exit(0);
  }
  if (baselineHits.length === 0) {
    console.error('[baselines-gate] FAIL — the following dep/build files changed without a baseline update:\n');
    for (const f of watchedHits) console.error(`  • ${f}`);
    console.error(
      '\nRegenerate baselines (`yarn baselines:capture`) and commit the diff under `.altitude/baselines/` in the same PR.'
    );
    process.exit(1);
  }
  console.log(`[baselines-gate] PASS — ${watchedHits.length} watched file(s) changed and ${baselineHits.length} baseline file(s) updated.`);
  process.exit(0);
}

main();
