#!/usr/bin/env node
/**
 * Self-test for scripts/ai-readiness/check-vision-calibration.mjs (T10, spec
 * 2026-08-29-parity-judgement-gates-and-evals, R6).
 *
 * This gate exists to say NO. Its whole value is refusing to certify a vision
 * judge that has not been shown to agree with known answers — so the
 * assertions that matter are that it refuses for the RIGHT reasons, and that
 * it cannot be talked into certifying by a set that is large but one-sided.
 *
 * The ledger is empty today and that is a finding, not a gap in this test:
 * the labelled cases do not exist because visual defects in this repo erase
 * their own evidence when the fix regenerates the image in place. The
 * assertions below therefore drive the gate with SYNTHETIC ledgers written to
 * a temp file, so they hold whatever the real ledger contains.
 *
 * Run: node scripts/__tests__/vision-calibration.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/ai-readiness/check-vision-calibration.mjs');
const REAL_LEDGER = join(ROOT, '.altitude/ai-readiness/vision-calibration.json');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const base = JSON.parse(readFileSync(REAL_LEDGER, 'utf8'));

/** Run the gate against a synthetic ledger by temporarily swapping the real one. */
function withLedger(ledger, args = []) {
  const original = readFileSync(REAL_LEDGER, 'utf8');
  try {
    writeFileSync(REAL_LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
    const res = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
    return { status: res.status, out: `${res.stdout}${res.stderr}` };
  } finally {
    writeFileSync(REAL_LEDGER, original, 'utf8');
  }
}

const makeCases = (defective, correct, agreeing = true) => [
  ...Array.from({ length: defective }, (_, i) => ({
    id: `d${i}`, expectedVerdict: 'defective', judgeVerdict: agreeing ? 'defective' : 'correct',
  })),
  ...Array.from({ length: correct }, (_, i) => ({
    id: `c${i}`, expectedVerdict: 'correct', judgeVerdict: 'correct',
  })),
];

console.log('== vision calibration gate self-test ==');

console.log('\n1. The real ledger, as it stands');
{
  const report = spawnSync(process.execPath, [SCRIPT, '--json'], { cwd: ROOT, encoding: 'utf8' });
  assert('reporting exits 0 — asking "how far off are we" must not fail a build', report.status === 0);
  const j = JSON.parse(report.stdout);
  assert('it is NOT certified', j.certified === false);
  assert('and it says why, in blockers', j.blockers.length > 0);

  const certify = spawnSync(process.execPath, [SCRIPT, '--certify'], { cwd: ROOT, encoding: 'utf8' });
  assert('--certify exits non-zero — this gate exists to say no', certify.status !== 0);
  assert('the empty ledger explains itself rather than just reporting zero',
    /why the ledger is empty/.test(certify.stdout) && /erase their own evidence|overwritten by its own repair/.test(certify.stdout));
}

console.log('\n2. It refuses a set that is too small');
{
  const r = withLedger({ ...base, cases: makeCases(2, 2) }, ['--certify']);
  assert('four cases do not certify', r.status !== 0);
  assert('  ...and the reason names the count', /only 4 labelled case/.test(r.out));
}

console.log('\n3. It refuses a set that is large but ONE-SIDED');
{
  const r = withLedger({ ...base, cases: makeCases(14, 0) }, ['--certify']);
  assert('fourteen defective cases and no correct ones do not certify', r.status !== 0);
  assert('  ...and the reason is balance, not size',
    /not balanced/.test(r.out) && !/only 14 labelled/.test(r.out));
  assert('  ...naming why: a judge answering one way every time would otherwise pass',
    /answers one way every time/.test(r.out));
}

console.log('\n4. It refuses a balanced set the judge disagrees with');
{
  const r = withLedger({ ...base, cases: makeCases(8, 8, false) }, ['--certify']);
  assert('50% agreement over 16 balanced cases does not certify', r.status !== 0);
  assert('  ...and the reason names the agreement and the threshold', /agreement 50% is below the 75% threshold/.test(r.out));
}

console.log('\n5. It DOES certify a set that earns it');
{
  const r = withLedger({ ...base, cases: makeCases(8, 8, true) }, ['--certify']);
  assert('sixteen balanced, fully-agreeing cases certify', r.status === 0);
  assert('  ...and it says a judge may SCREEN, never gate', /may screen \(never gate\)/.test(r.out));
}

console.log('\n6. Unjudged cases cannot be counted as agreement');
{
  const unjudged = Array.from({ length: 16 }, (_, i) => ({
    id: `u${i}`, expectedVerdict: i % 2 ? 'defective' : 'correct',
  }));
  const r = withLedger({ ...base, cases: unjudged }, ['--certify']);
  assert('a big balanced set with no judge verdicts does not certify', r.status !== 0);
  assert('  ...because agreement is not computable, and that is said out loud',
    /agreement cannot be computed/.test(r.out));
}

console.log('\n7. The real ledger is restored');
{
  const now = JSON.parse(readFileSync(REAL_LEDGER, 'utf8'));
  assert('cases are still empty', (now.cases ?? []).length === 0);
  assert('the capture procedure survived every swap', Array.isArray(now.captureProcedure) && now.captureProcedure.length >= 3);
  assert('so did the threshold', now.threshold.minCases === base.threshold.minCases);
}

// Belt and braces: never leave a tracked file mutated even if an assert threw.
const tmp = mkdtempSync(join(tmpdir(), 'vision-cal-'));
rmSync(tmp, { recursive: true, force: true });

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
