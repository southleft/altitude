#!/usr/bin/env node
/**
 * T1.2 — Token-contract tests.
 *
 * Asserts the public token surface is stable from the legacy baseline
 * captured in `.altitude/baselines/tokens/snapshot.json`. Run after every
 * token build to fail PRs that drift a token name without an alias.
 *
 * Test surfaces (per plan):
 *   1. NAME STABILITY: every `--al-*` name in the baseline is still present.
 *   2. COUNTS: total occurrences and unique names match within a tolerance.
 *      Tolerance defaults to 0 (strict); set ALTITUDE_TOKEN_TOLERANCE=N to
 *      allow N additions during in-flight migrations.
 *   3. VALUES: every name has the same value in the current build.
 *   4. ALIAS RESOLUTION: every reference `{...}` in the baseline resolved
 *      to a defined token. (Phase 1 has nothing to alias yet; this is a
 *      shape check that ensures we never ship a dangling reference.)
 *   5. ZERO DANGLING REFS: no value in the current build is the raw `{...}`
 *      form. (After SD resolves, references should be `var(--al-*)` or
 *      literal values, never `{some.reference}` strings.)
 *
 * Exit codes:
 *   0 — pass
 *   1 — drift / regression
 *   2 — internal error
 */

'use strict';

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const BASELINE = path.join(REPO, '.altitude/baselines/tokens/snapshot.json');
const CAPTURE_SCRIPT = path.join(REPO, 'scripts/capture-token-baseline.js');

function fail(msg) {
  console.error('[tokens:contract] FAIL —', msg);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(BASELINE)) {
    console.error('[tokens:contract] missing baseline at', BASELINE);
    process.exit(2);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

  // Recapture into a tmpfile via the capture script's env override so the
  // committed baseline is never touched (race-safe across parallel jobs).
  const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'al-tokens-'));
  const tmp = path.join(tmpDir, 'snapshot.json');
  try {
    execSync(`node ${CAPTURE_SCRIPT}`, {
      cwd: REPO,
      stdio: 'pipe',
      env: { ...process.env, ALTITUDE_TOKEN_SNAPSHOT_OUT: tmp },
    });
  } catch (err) {
    console.error('[tokens:contract] capture failed:', err.message);
    process.exit(2);
  }
  const current = JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const tol = Number(process.env.ALTITUDE_TOKEN_TOLERANCE || '0');

  const baseNames = new Map();
  for (const v of baseline.variables) {
    if (!baseNames.has(v.name)) baseNames.set(v.name, v.value);
  }
  const curNames = new Map();
  for (const v of current.variables) {
    if (!curNames.has(v.name)) curNames.set(v.name, v.value);
  }

  // 1. NAME STABILITY
  const missing = [...baseNames.keys()].filter((n) => !curNames.has(n));
  if (missing.length) {
    fail(`${missing.length} baseline token name(s) missing in current build:\n  ${missing.slice(0, 10).join('\n  ')}${missing.length > 10 ? `\n  …and ${missing.length - 10} more` : ''}`);
  }

  // 2. COUNTS (with tolerance)
  const occDiff = Math.abs(current.totalVariables - baseline.totalVariables);
  if (occDiff > tol) {
    fail(`occurrence count drift ${occDiff} > tolerance ${tol} (baseline ${baseline.totalVariables}, current ${current.totalVariables})`);
  }
  const nameDiff = Math.abs(current.uniqueNames - baseline.uniqueNames);
  if (nameDiff > tol) {
    fail(`unique name count drift ${nameDiff} > tolerance ${tol} (baseline ${baseline.uniqueNames}, current ${current.uniqueNames})`);
  }

  // 3. VALUES
  const valueDrift = [];
  for (const [name, baseVal] of baseNames) {
    const curVal = curNames.get(name);
    if (curVal !== baseVal) valueDrift.push({ name, base: baseVal, cur: curVal });
  }
  if (valueDrift.length) {
    fail(`${valueDrift.length} token value drift(s):\n  ${valueDrift.slice(0, 5).map((d) => `${d.name}: '${d.base}' -> '${d.cur}'`).join('\n  ')}${valueDrift.length > 5 ? `\n  …` : ''}`);
  }

  // 5. ZERO DANGLING REFS (4 is implicit because no references exist yet)
  const dangling = current.variables.filter((v) => /^\s*\{[a-z][\w.-]*\}\s*$/i.test(String(v.value)));
  if (dangling.length) {
    fail(`${dangling.length} dangling reference(s) (unresolved \`{ref}\`):\n  ${dangling.slice(0, 5).map((d) => `${d.name} = ${d.value}`).join('\n  ')}`);
  }

  console.log(`[tokens:contract] PASS — ${current.totalVariables} occurrences / ${current.uniqueNames} names, no drift from baseline.`);
}

main();
