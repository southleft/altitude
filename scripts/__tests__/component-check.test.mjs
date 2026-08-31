#!/usr/bin/env node
/**
 * Self-test for scripts/component-check.mjs.
 *
 * Read-only against the real repo (no worktree needed — this script only
 * reads files, it never writes) — asserts the exit code and JSON shape for
 * a real, fully-shipped component and for a fabricated tag that cannot
 * exist. Run: node scripts/__tests__/component-check.test.mjs
 */

import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = resolve(REPO, 'scripts/component-check.mjs');

let PASS = 0;
let FAIL = 0;

function assert(desc, cond) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    PASS++;
  } else {
    console.log(`  ✗ ${desc}`);
    FAIL++;
  }
}

function run(args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: REPO, encoding: 'utf8' });
  return result;
}

console.log('==> al-button (real, fully-shipped component) — blockers must all pass');
{
  const r = run(['al-button', '--json']);
  assert('exit code is 0 (no blockers failed)', r.status === 0);
  let payload;
  try {
    payload = JSON.parse(r.stdout);
  } catch {
    payload = null;
  }
  assert('emits valid JSON', payload !== null);
  if (payload) {
    const blockers = payload.items.filter((i) => i.severity === 'blocker');
    assert('has 4 blocker items', blockers.length === 4);
    assert('all blockers pass', blockers.every((i) => i.pass === true));
  }
}

console.log('\n==> al-widget-turbo-self-test (fabricated tag) — every blocker must fail');
{
  const r = run(['al-widget-turbo-self-test', '--json']);
  assert('exit code is 1 (blockers failed)', r.status === 1);
  let payload;
  try {
    payload = JSON.parse(r.stdout);
  } catch {
    payload = null;
  }
  assert('emits valid JSON', payload !== null);
  if (payload) {
    const blockers = payload.items.filter((i) => i.severity === 'blocker');
    assert('has 4 blocker items', blockers.length === 4);
    assert('all blockers fail', blockers.every((i) => i.pass === false));
  }
}

console.log('\n==> --all covers every discovered component with zero usage errors');
{
  const r = run(['--all', '--json']);
  assert('exit code is 0 or 1, never 2 (usage error)', r.status === 0 || r.status === 1);
  let payload;
  let parseError = null;
  try {
    payload = JSON.parse(r.stdout);
  } catch (e) {
    payload = null;
    parseError = e;
  }
  /**
   * SAY WHY, don't just fail. This swallowed its parse error, so when the
   * assertion went red in CI on 2026-08-31 the log showed only "emits a JSON
   * array: NOT OK" — no status, no stderr, nothing to act on, and it could not
   * be reproduced locally. A test that hides its evidence costs more than the
   * bug it catches.
   */
  if (!payload) {
    console.log(`      status=${r.status} stdout=${r.stdout.length}b stderr=${r.stderr.length}b`);
    if (parseError) console.log(`      parse: ${parseError.message}`);
    if (r.stdout) console.log(`      stdout head: ${JSON.stringify(r.stdout.slice(0, 300))}`);
    if (r.stderr) console.log(`      stderr head: ${JSON.stringify(r.stderr.slice(0, 600))}`);
  }
  assert('emits a JSON array', Array.isArray(payload));
  assert('covers more than 60 components', Array.isArray(payload) && payload.length > 60);
}

console.log('\n==> no args is a usage error (exit 2)');
{
  const r = run([]);
  assert('exit code is 2', r.status === 2);
}

console.log(`\nSelf-test: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
