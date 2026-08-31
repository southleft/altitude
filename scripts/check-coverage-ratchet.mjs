#!/usr/bin/env node
/**
 * Coverage floor with a one-way ratchet.
 *
 * NOT to be confused with `scripts/check-cem-coverage.js`, which measures
 * custom-elements-manifest COMPLETENESS (does every component have a manifest
 * entry). This one reads real V8 code coverage produced by
 * `pnpm run test:unit:coverage`.
 *
 * The floor lives in `.altitude/baselines/coverage.json` and only ever moves
 * UP:
 *   - below the floor  -> exit 1. A PR may not lose coverage.
 *   - above the floor  -> exit 0, and with `--ratchet` the floor is rewritten
 *                        to the value just measured, so the next PR has to
 *                        hold that line.
 *   - lowering it is deliberate and manual: `--lower --reason "<why>"`, which
 *     records the reason in the baseline file. There is no silent path down.
 *
 * Usage:
 *   node scripts/check-coverage-ratchet.mjs              # check only
 *   node scripts/check-coverage-ratchet.mjs --ratchet    # check, then raise
 *   node scripts/check-coverage-ratchet.mjs --lower --reason "..."
 *
 * Exit codes: 0 pass · 1 below floor · 2 could not measure.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SUMMARY = resolve(REPO, 'coverage/coverage-summary.json');
const BASELINE = resolve(REPO, '.altitude/baselines/coverage.json');
const METRICS = ['statements', 'branches', 'functions', 'lines'];

/** Slack for V8's own noise between runs, in percentage points. */
const TOLERANCE = 0.25;

function args() {
  const out = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, v] = a.replace(/^--/, '').split('=');
    out[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
  }
  return out;
}

function fail(msg, code = 2) {
  console.error(`[coverage-ratchet] ${msg}`);
  process.exit(code);
}

const opts = args();

if (!existsSync(SUMMARY)) {
  fail(`no coverage summary at ${SUMMARY}. Run \`pnpm run test:unit:coverage\` first.`);
}

let summary;
try {
  summary = JSON.parse(readFileSync(SUMMARY, 'utf8'));
} catch (err) {
  fail(`coverage summary is not readable JSON: ${err.message}`);
}

const total = summary.total;
if (!total) fail('coverage summary has no `total` block.');

// A summary that measured nothing is a green run that proves nothing — the
// exact failure mode the min-test-count guards exist for. Treat it as broken.
if (!total.statements || total.statements.total === 0) {
  fail('coverage summary reports 0 statements. The run collected nothing.');
}

const measured = Object.fromEntries(METRICS.map((m) => [m, Number(total[m].pct.toFixed(2))]));

const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;

if (!baseline) {
  writeFileSync(
    BASELINE,
    JSON.stringify({ floor: measured, updated: new Date().toISOString(), note: 'seeded' }, null, 2) + '\n'
  );
  console.log('[coverage-ratchet] seeded a new floor:', measured);
  process.exit(0);
}

if (opts.lower) {
  if (!opts.reason || opts.reason === true) fail('--lower requires --reason "<why>".');
  writeFileSync(
    BASELINE,
    JSON.stringify({ floor: measured, updated: new Date().toISOString(), note: String(opts.reason) }, null, 2) + '\n'
  );
  console.log('[coverage-ratchet] floor LOWERED deliberately:', measured, `— ${opts.reason}`);
  process.exit(0);
}

const below = METRICS.filter((m) => measured[m] < baseline.floor[m] - TOLERANCE);

console.log('[coverage-ratchet] measured vs floor');
for (const m of METRICS) {
  const delta = (measured[m] - baseline.floor[m]).toFixed(2);
  console.log(`  ${m.padEnd(11)} ${String(measured[m]).padStart(6)}%   floor ${String(baseline.floor[m]).padStart(6)}%   ${delta >= 0 ? '+' : ''}${delta}`);
}

if (below.length) {
  console.error(
    `\n[coverage-ratchet] FAIL — ${below.map((m) => `${m} ${measured[m]}% < ${baseline.floor[m]}%`).join(', ')}.\n` +
      'Add tests, or lower the floor deliberately with --lower --reason "<why>".'
  );
  process.exit(1);
}

if (opts.ratchet) {
  const raised = METRICS.filter((m) => measured[m] > baseline.floor[m]);
  if (raised.length) {
    const floor = { ...baseline.floor };
    for (const m of raised) floor[m] = measured[m];
    writeFileSync(
      BASELINE,
      JSON.stringify({ floor, updated: new Date().toISOString(), note: baseline.note ?? '' }, null, 2) + '\n'
    );
    console.log(`\n[coverage-ratchet] floor RAISED for ${raised.join(', ')}. Commit .altitude/baselines/coverage.json.`);
  } else {
    console.log('\n[coverage-ratchet] nothing to raise.');
  }
}

console.log('\n[coverage-ratchet] PASS');
process.exit(0);
