#!/usr/bin/env node
/**
 * G8 — Baselines-before-changes gate.
 *
 * Fails CI if a PR modifies dependency versions or build config without also
 * updating `.altitude/baselines/`. Token snapshot, bundle-size record, and
 * VRT screenshots must move in lockstep with the changes that affect them.
 *
 * Files watched (any change triggers the baseline requirement):
 *   - libs/al-web-components/package.json
 *   - libs/al-react/package.json
 *   - package.json (root)
 *   - libs/al-web-components/webpack.config.js
 *   - libs/al-web-components/tsconfig.json
 *   - libs/al-web-components/styles/tokens-config.v5.mjs (the token build
 *     config — its `themes`/`brands` arrays decide which files are emitted,
 *     so editing it changes token output without touching `styles/tokens/`)
 *   - libs/al-web-components/styles/tokens/** (token sources)
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

const WATCHED = [
  /^libs\/al-web-components\/package\.json$/,
  /^libs\/al-react\/package\.json$/,
  /^package\.json$/,
  /^libs\/al-web-components\/webpack\.config\.js$/,
  /^libs\/al-web-components\/tsconfig\.json$/,
  // The SD v3 config (`styles/tokens-config.js`) was deleted in T6.2; watching
  // it was a permanently dead regex. `tokens-config.v5.mjs` is the sole token
  // build config now — a brand added to its `brands` array changes the emitted
  // token set without touching `styles/tokens/`.
  /^libs\/al-web-components\/styles\/tokens-config\.v5\.mjs$/,
  /^libs\/al-web-components\/styles\/tokens\//,
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
