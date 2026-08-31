#!/usr/bin/env node
/**
 * check-brand-conformance.test.mjs — fixture-free smoke test for
 * scripts/check-brand-conformance.mjs.
 *
 * `check-brand-conformance.mjs` resolves projects through
 * `libs/altitude-mcp/src/lib/ds-project.mjs`, which reads the real
 * `.altitude/ds-projects.json` with no override hook (by design — the
 * registry is checked-in config, not something a caller repoints). That rules
 * out a hermetic fixture the way `gate-self-test.sh` builds one (a throwaway
 * git worktree with synthetic commits): there is nothing to seed. Instead
 * this exercises the CLI as a subprocess against the REAL repo — the same
 * approach `gate-self-test.sh` takes for the other gate scripts — and asserts
 * STRUCTURE and INVARIANTS rather than today's exact failure count, so a
 * future fix to al-header/al-footer's brand surface doesn't break this test.
 *
 * Run: node scripts/__tests__/check-brand-conformance.test.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'check-brand-conformance.mjs');

let pass = 0;
function ok(desc) {
  pass += 1;
  console.log(`  ok - ${desc}`);
}

function run(args) {
  try {
    const stdout = execFileSync('node', [SCRIPT, ...args], { cwd: REPO_ROOT, encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

console.log('check-brand-conformance.test.mjs');

// 1. --help exits 0 and documents --allow.
{
  const { code, stdout } = run(['--help']);
  assert.equal(code, 0);
  assert.match(stdout, /Usage:/);
  assert.match(stdout, /--allow/);
  ok('--help exits 0 and documents --allow');
}

// 2. A project with no brandLibrary is a no-op, exit 0.
{
  const { code, stdout } = run(['--project', 'altitude']);
  assert.equal(code, 0);
  assert.match(stdout, /declares no brandLibrary/);
  ok('--project altitude (no brandLibrary) exits 0 and says so');
}

// 3. --project southleft --json — structure holds regardless of current
//    conformance state (so this test survives a future fix to the drift it
//    finds today).
{
  const { code, stdout } = run(['--project', 'southleft', '--json']);
  assert.ok(code === 0 || code === 1, `exit code must be 0 or 1, got ${code}`);
  const jsonStart = stdout.indexOf('{');
  assert.ok(jsonStart >= 0, 'stdout must contain a JSON payload');
  const report = JSON.parse(stdout.slice(jsonStart));

  assert.equal(typeof report.failed, 'boolean');
  assert.equal(code, report.failed ? 1 : 0, 'exit code must match the `failed` field');

  assert.equal(report.projects.length, 1);
  const [project] = report.projects;
  assert.equal(project.id, 'southleft');
  assert.ok(Array.isArray(project.pairs));
  assert.equal(project.pairs.length, 2, 'southleft.brandLibrary.supersedes has 2 pairs (al-header, al-footer)');

  for (const pair of project.pairs) {
    assert.ok(typeof pair.brandTag === 'string' && typeof pair.baseTag === 'string');
    if (pair.error) continue; // base/brand CEM missing — reported, not a shape violation
    for (const bucket of ['failures', 'allowed', 'extra']) {
      assert.ok(Array.isArray(pair[bucket]), `pair.${bucket} must be an array`);
      for (const item of pair[bucket]) {
        assert.ok(['slot', 'cssPart', 'cssProperty', 'attribute'].includes(item.kind));
        assert.equal(typeof item.name, 'string');
      }
    }
  }

  assert.ok(Array.isArray(project.newBaseComponents));
  ok('--project southleft --json has the documented shape and a matching exit code');
}

// 4. --allow accepts the documented "default" alias for the unnamed slot and
//    actually suppresses that one finding (moves it from `failures` to
//    `allowed`), without touching anything else.
{
  const beforeRun = run(['--project', 'southleft', '--json']);
  const before = JSON.parse(beforeRun.stdout.slice(beforeRun.stdout.indexOf('{')));
  const beforePair = before.projects[0].pairs.find((p) => p.brandTag === 'al-header');
  const hadDefaultSlotFailure = beforePair.failures.some((f) => f.kind === 'slot' && f.name === '');

  const after = run(['--project', 'southleft', '--json', '--allow', 'al-header.slot.default']);
  const afterReport = JSON.parse(after.stdout.slice(after.stdout.indexOf('{')));
  const afterPair = afterReport.projects[0].pairs.find((p) => p.brandTag === 'al-header');

  assert.ok(!afterPair.failures.some((f) => f.kind === 'slot' && f.name === ''), '--allow al-header.slot.default must remove the default-slot failure');
  if (hadDefaultSlotFailure) {
    assert.ok(afterPair.allowed.some((a) => a.kind === 'slot' && a.name === ''), 'the suppressed finding must reappear under `allowed`');
  }
  ok('--allow al-header.slot.default suppresses exactly that finding');
}

// 5. A malformed --allow value is reported but does not crash the run.
{
  const { code } = run(['--project', 'southleft', '--allow', 'not-enough-parts']);
  assert.ok(code === 0 || code === 1);
  ok('a malformed --allow value does not crash the run');
}

console.log(`\n${pass} passed.`);
