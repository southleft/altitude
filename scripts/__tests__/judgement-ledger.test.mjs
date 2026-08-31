#!/usr/bin/env node
/**
 * Self-test for scripts/check-judgement-ledger.mjs (T12, spec
 * 2026-08-29-parity-judgement-gates-and-evals, R8).
 *
 * A checker that cannot fail is not a checker. The 14 judgement points were
 * found by a one-off sweep, and this file's whole reason to exist is that the
 * 14th would otherwise be invisible — so the assertions that matter are the
 * NEGATIVE ones: it must actually go red when a marker appears in an
 * unrecorded file, and when a ledger anchor stops resolving.
 *
 * Both are exercised by really writing a file / really editing the ledger and
 * spawning the real CLI, then restoring. The ledger is a tracked file, so the
 * restore runs in a `finally` and is asserted byte-for-byte — the same
 * discipline libs/altitude-mcp/test/mark-synced.mjs uses on the parity
 * manifest.
 *
 * Run: node scripts/__tests__/judgement-ledger.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/check-judgement-ledger.mjs');
const LEDGER = join(ROOT, '.altitude/judgement-ledger.json');
const CANARY = join(ROOT, 'scripts/__unrecorded-judgement-canary.mjs');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const run = (args = []) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });

console.log('== judgement-ledger checker self-test ==');

console.log('\n1. The ledger as it stands');
{
  const res = run();
  assert('the checker passes against the committed ledger', res.status === 0);
  const json = JSON.parse(run(['--json']).stdout);
  // Bumped 13 -> 14 on 2026-08-29 when J14 (the receipt never recorded WHICH
  // Figma file it measured) was found live. The hardcoded count is the point:
  // adding a judgement point has to be a deliberate act that turns this red.
  assert('all 14 judgement points are recorded', json.points === 14);
  assert('every point has a disposition', Object.values(json.byDisposition).reduce((a, b) => a + b, 0) === json.points);
  assert('marker files were actually found — a scan that finds nothing proves nothing', json.markerFiles.length >= 10);
  assert('no problems', json.problems.length === 0);
}

console.log('\n2. The ledger records what it claims to record');
{
  const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
  assert('every point has an id, a decision, a location and an anchor',
    ledger.points.every((p) => p.id && p.decision && p.location && p.anchor));
  assert('ids are unique', new Set(ledger.points.map((p) => p.id)).size === ledger.points.length);
  assert('every point names what a WRONG answer looks like — a ledger of decisions with no consequences is a list',
    ledger.points.every((p) => typeof p.wrongAnswer === 'string' && p.wrongAnswer.length > 25));
  assert('every non-open point names what covers it',
    ledger.points.filter((p) => p.disposition !== 'open').every((p) => Array.isArray(p.coveredBy) && p.coveredBy.length > 0));
  assert('every open point has an EMPTY coveredBy — "open" must mean open',
    ledger.points.filter((p) => p.disposition === 'open').every((p) => (p.coveredBy ?? []).length === 0));
  assert('the dispositions used are the ones the file defines',
    ledger.points.every((p) => Object.keys(ledger.dispositions).includes(p.disposition)));
  assert('the acknowledged-files list explains itself', typeof ledger.$acknowledgedComment === 'string');
}

console.log('\n3. It FAILS on a marker in an unrecorded file');
{
  try {
    writeFileSync(CANARY, [
      '// A synthetic file for scripts/__tests__/judgement-ledger.test.mjs.',
      '// It records a judgment call and is deliberately NOT in the ledger.',
      'export const nothing = null;',
      '',
    ].join('\n'), 'utf8');
    const res = run();
    assert('exit is non-zero', res.status !== 0);
    assert('the unrecorded file is named', /__unrecorded-judgement-canary/.test(res.stdout + res.stderr));
    assert('and the message says what to do about it',
      /Add a point for it, or add it to markerFilesAcknowledged/.test(res.stdout + res.stderr));
  } finally {
    rmSync(CANARY, { force: true });
  }
  assert('the canary is cleaned up', !existsSync(CANARY));
  assert('and the checker is green again', run().status === 0);
}

console.log('\n4. It FAILS when a ledger anchor stops resolving');
{
  const original = readFileSync(LEDGER, 'utf8');
  try {
    const ledger = JSON.parse(original);
    ledger.points[0].anchor = 'this string is not in any source file anywhere';
    writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
    const res = run();
    assert('exit is non-zero', res.status !== 0);
    assert('the drifted point is named by id', new RegExp(ledger.points[0].id).test(res.stdout + res.stderr));
    assert('and the message explains that the entry describes something gone',
      /moved or been removed/.test(res.stdout + res.stderr));
  } finally {
    writeFileSync(LEDGER, original, 'utf8');
  }
  assert('the tracked ledger is restored byte-for-byte', readFileSync(LEDGER, 'utf8') === original);
  assert('and the checker is green again', run().status === 0);
}

console.log('\n5. It FAILS when a point names a file that no longer exists');
{
  const original = readFileSync(LEDGER, 'utf8');
  try {
    const ledger = JSON.parse(original);
    ledger.points[0].location = 'scripts/this-file-was-deleted.mjs';
    writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
    const res = run();
    assert('exit is non-zero', res.status !== 0);
    assert('the missing file is named', /this-file-was-deleted/.test(res.stdout + res.stderr));
  } finally {
    writeFileSync(LEDGER, original, 'utf8');
  }
  assert('the tracked ledger is restored byte-for-byte', readFileSync(LEDGER, 'utf8') === original);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
