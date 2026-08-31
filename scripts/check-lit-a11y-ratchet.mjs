#!/usr/bin/env node
/**
 * Accessibility-lint ceiling with a one-way ratchet.
 *
 * `eslint-plugin-lit-a11y` reads the `html` tagged templates the components
 * render, which catches the class of defect the axe suite structurally cannot:
 * axe runs against a rendered STORY, so a template branch no story exercises is
 * never measured. This runs on the source, so every branch is seen.
 *
 * Most of its rules are `error` in `eslint.config.js` and are already clean —
 * those need no bookkeeping, because a regression simply fails the lint. This
 * script exists for the three rules that are NOT clean yet
 * (click-events-have-key-events, accessible-name, mouse-events-have-key-events).
 * They are held at `warn` so the gate could land the same day the plugin did,
 * and warnings do not fail a lint run — which is exactly how a known-bad count
 * quietly becomes a growing one.
 *
 * So the count is pinned, and moves only DOWN:
 *   - above the ceiling -> exit 1. A PR may not add accessibility warnings.
 *   - below the ceiling -> exit 0, and with `--ratchet` the ceiling is rewritten
 *                          to what was just measured, so the next PR holds it.
 *   - raising it is deliberate and manual: `--raise --reason "<why>"`, recorded
 *     in the baseline. There is no silent path up.
 *
 * When a rule reaches zero, promote it to `error` in eslint.config.js and drop
 * it from here — the ratchet is scaffolding for the transition, not a permanent
 * home for known defects.
 *
 * Usage:
 *   node scripts/check-lit-a11y-ratchet.mjs            # check only
 *   node scripts/check-lit-a11y-ratchet.mjs --ratchet  # check, then tighten
 *   node scripts/check-lit-a11y-ratchet.mjs --raise --reason "..."
 *
 * Exit codes: 0 pass · 1 over ceiling · 2 could not measure.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = resolve(REPO, '.altitude/baselines/lit-a11y.json');

const GLOBS = [
  'libs/al-web-components/components/**/*.ts',
  'libs/sl-web-components/components/**/*.ts',
];

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

/**
 * Run ESLint and count only `lit-a11y/*` messages.
 *
 * ESLint exits non-zero whenever anything at all is reported, so a thrown
 * error here is expected rather than exceptional — the JSON still arrives on
 * stdout and is the thing we actually want. Only genuinely empty output is
 * treated as a failure to measure, because "no output" and "no violations"
 * must not collapse into the same answer.
 */
function measure() {
  let stdout = '';
  try {
    stdout = execFileSync('pnpm', ['exec', 'eslint', ...GLOBS, '-f', 'json'], {
      cwd: REPO,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === 'win32',
    });
  } catch (error) {
    stdout = error.stdout || '';
  }
  if (!stdout.trim()) {
    console.error('lit-a11y-ratchet: ESLint produced no output — cannot measure.');
    process.exit(2);
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    console.error('lit-a11y-ratchet: ESLint output was not JSON — cannot measure.');
    process.exit(2);
  }

  const byRule = {};
  let errors = 0;
  for (const file of report) {
    for (const message of file.messages || []) {
      if (!message.ruleId?.startsWith('lit-a11y/')) continue;
      const rule = message.ruleId.replace('lit-a11y/', '');
      byRule[rule] = (byRule[rule] || 0) + 1;
      if (message.severity === 2) errors += 1;
    }
  }
  return { byRule, errors, total: Object.values(byRule).reduce((a, b) => a + b, 0) };
}

const options = args();
const { byRule, errors, total } = measure();

if (!existsSync(BASELINE)) {
  mkdirSync(dirname(BASELINE), { recursive: true });
  writeFileSync(
    BASELINE,
    `${JSON.stringify({ ceiling: byRule, total, updated: new Date().toISOString(), note: 'seeded' }, null, 2)}\n`
  );
  console.log(`lit-a11y-ratchet: seeded baseline at ${total} warning(s).`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const ceiling = baseline.ceiling || {};

console.log('Altitude — lit-a11y ratchet');
console.log(`  rules at error, failing : ${errors}`);
const rules = [...new Set([...Object.keys(ceiling), ...Object.keys(byRule)])].sort();
for (const rule of rules) {
  const now = byRule[rule] || 0;
  const max = ceiling[rule] ?? 0;
  const mark = now > max ? 'OVER' : now < max ? 'down' : 'held';
  console.log(`  ${String(now).padStart(3)} / ${String(max).padEnd(3)} ${mark.padEnd(4)}  ${rule}`);
}

// An `error`-level lit-a11y message means a rule that was clean has regressed.
// eslint itself already fails that run; failing here too keeps the gate honest
// when it is invoked on its own.
if (errors > 0) {
  console.error(`\nFAIL — ${errors} lit-a11y rule(s) at error severity are failing.`);
  process.exit(1);
}

const over = rules.filter((rule) => (byRule[rule] || 0) > (ceiling[rule] ?? 0));
if (over.length) {
  console.error(
    `\nFAIL — accessibility warnings increased: ${over
      .map((rule) => `${rule} ${ceiling[rule] ?? 0} -> ${byRule[rule]}`)
      .join(', ')}.\n` +
      'Fix the new violation, or raise deliberately with --raise --reason "<why>".'
  );
  process.exit(1);
}

if (options.ratchet && total < (baseline.total ?? Infinity)) {
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      { ceiling: byRule, total, updated: new Date().toISOString(), note: 'ratcheted' },
      null,
      2
    )}\n`
  );
  console.log(`\nRatcheted: ${baseline.total} -> ${total}.`);
} else if (options.raise) {
  if (!options.reason || options.reason === true) {
    console.error('\n--raise requires --reason "<why>".');
    process.exit(1);
  }
  writeFileSync(
    BASELINE,
    `${JSON.stringify(
      { ceiling: byRule, total, updated: new Date().toISOString(), note: `raised: ${options.reason}` },
      null,
      2
    )}\n`
  );
  console.log(`\nRaised to ${total} — ${options.reason}`);
} else {
  console.log(`\nOK — ${total} accessibility warning(s), at or below the pinned ceiling.`);
}
