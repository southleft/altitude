#!/usr/bin/env node
/**
 * Self-test for scripts/run-gates.mjs — the gate runner and its --check-ci
 * drift mode.
 *
 * Plain node, no framework — matches check-doc-anchors.test.mjs and
 * component-check.test.mjs: spawn the real CLI and assert on exit code and
 * output, because the CLI contract IS what a human and CI depend on.
 *
 * Behavioural cases build a THROWAWAY repo in os.tmpdir() and point the runner
 * at it with --root/--manifest/--workflow. Asserting the drift cases against the
 * real repo would make them fail the moment someone legitimately adds a gate or
 * renames a CI job — the opposite of a regression test. What must not regress is
 * the LOGIC: unmet prerequisites become a NAMED skip and never a pass, a failing
 * blocking gate exits 1 while a failing warning-tier gate does not, and drift is
 * caught in BOTH directions.
 *
 * Two cases do read the real repo, deliberately: the shipped manifest must parse
 * and every entry must carry its required fields, and --check-ci must agree with
 * the real workflow. Those are the facts the manifest exists to assert.
 *
 * Run: node scripts/__tests__/run-gates.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/run-gates.mjs');
const REAL_MANIFEST = join(ROOT, '.altitude/gates.json');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) {
    console.log(`  ok - ${desc}`);
    PASS++;
  } else {
    console.log(`  NOT OK - ${desc}`);
    FAIL++;
  }
}

const TEMP_ROOTS = [];

/** Build a synthetic repo: a gates.json, a workflow, and whatever else is asked for. */
function makeRepo({ gates, workflow, files = {}, vocabulary }) {
  const root = mkdtempSync(join(tmpdir(), 'run-gates-'));
  TEMP_ROOTS.push(root);
  const manifest = {
    version: 1,
    needsVocabulary: vocabulary ?? {
      none: 'nothing',
      install: 'node_modules present',
      docs: 'dist/docs present',
    },
    gates,
  };
  const all = {
    '.altitude/gates.json': JSON.stringify(manifest, null, 2),
    '.github/workflows/v2-checks.yml': workflow ?? 'name: x\njobs:\n',
    ...files,
  };
  for (const [rel, content] of Object.entries(all)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

function run(root, args = []) {
  const res = spawnSync(process.execPath, [SCRIPT, '--root', root, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return { ...res, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

/** A gate entry with sane defaults, so each case states only what it is about. */
const gate = (over) => ({
  id: 'g',
  npmScript: null,
  command: 'node -e "process.exit(0)"',
  purpose: 'a synthetic gate',
  purposeSource: 'script-header',
  needs: ['none'],
  blocking: true,
  ci: null,
  ciVia: null,
  tier: 'fast',
  group: 'synthetic',
  ...over,
});

console.log('== run-gates.mjs self-test ==');

// ───────────────────────────────────────────────────────────────────────────
console.log('\n1. The SHIPPED manifest parses and every entry carries its required fields');
{
  const raw = readFileSync(REAL_MANIFEST, 'utf8');
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    assert(`.altitude/gates.json parses (${err.message})`, false);
  }
  assert('.altitude/gates.json parses', data !== null);

  if (data) {
    assert('has a gates array', Array.isArray(data.gates) && data.gates.length > 0);
    assert('declares a closed needs vocabulary', Object.keys(data.needsVocabulary ?? {}).length > 0);

    const required = ['id', 'command', 'purpose', 'needs', 'blocking', 'ci', 'tier'];
    const missing = [];
    const badTier = [];
    const badNeeds = [];
    const dupes = [];
    const seen = new Set();
    const vocab = new Set(Object.keys(data.needsVocabulary ?? {}));
    for (const g of data.gates) {
      for (const f of required) if (!(f in g)) missing.push(`${g.id ?? '?'}.${f}`);
      if (!['fast', 'build', 'live'].includes(g.tier)) badTier.push(g.id);
      if (!Array.isArray(g.needs) || g.needs.length === 0) badNeeds.push(`${g.id}: empty`);
      else for (const n of g.needs) if (!vocab.has(n)) badNeeds.push(`${g.id}: ${n}`);
      if (seen.has(g.id)) dupes.push(g.id);
      seen.add(g.id);
    }
    if (missing.length) console.log(`      missing: ${missing.join(', ')}`);
    if (badNeeds.length) console.log(`      off-vocabulary needs: ${badNeeds.join(', ')}`);
    assert('every entry has id/command/purpose/needs/blocking/ci/tier', missing.length === 0);
    assert('every tier is fast|build|live', badTier.length === 0);
    assert('every `needs` token is in the declared vocabulary (it is CLOSED)', badNeeds.length === 0);
    assert('no duplicate gate ids', dupes.length === 0);
    assert('every purpose is non-empty prose', data.gates.every((g) => typeof g.purpose === 'string' && g.purpose.trim().length > 10));
    assert('every entry records where its purpose came from', data.gates.every((g) => typeof g.purposeSource === 'string'));
    assert('`blocking` is a boolean everywhere — never a truthy string', data.gates.every((g) => typeof g.blocking === 'boolean'));
  }
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n2. --list works against the real manifest and reports the CI split');
{
  const res = spawnSync(process.execPath, [SCRIPT, '--list', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert('exits 0', res.status === 0);
  let payload = null;
  try {
    payload = JSON.parse(res.stdout);
  } catch (err) {
    console.log(`      parse: ${err.message}`);
  }
  assert('--list --json parses', payload !== null);
  if (payload) {
    assert('counts total gates', payload.counts.total === payload.gates.length);
    assert('splits CI-declared from local-only rather than reporting one number',
      payload.counts.inCi > 0 && payload.counts.localOnly > 0);
    assert('total = inCi + viaCi + localOnly',
      payload.counts.inCi + payload.counts.viaCi + payload.counts.localOnly === payload.counts.total);
  }
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n3. An unmet prerequisite is a NAMED skip — never a pass');
{
  const root = makeRepo({
    gates: [
      gate({ id: 'runnable', needs: ['none'] }),
      gate({ id: 'needs-built-docs', needs: ['docs'], command: 'node -e "process.exit(0)"' }),
    ],
  });
  const res = run(root, ['--tier', 'fast']);
  assert('exits 0 — a skip is not a failure', res.status === 0);
  assert('the skipped gate is named', /needs-built-docs/.test(res.out));
  assert('the SKIP status is printed, not swallowed', /SKIP\s+needs-built-docs/.test(res.out));
  assert('the unmet need is named', /docs:/.test(res.out));
  assert('the reason says what to run', /pnpm --filter al-app-docs build/.test(res.out));
  assert('the summary counts skipped SEPARATELY from passed', /1 passed,.*1 SKIPPED/.test(res.out));
  assert('the summary says a skip proves nothing', /skipped gate proves nothing/i.test(res.out));

  const json = run(root, ['--tier', 'fast', '--json']);
  const payload = JSON.parse(json.stdout);
  assert('--json counts passed and skipped as different fields',
    payload.counts.passed === 1 && payload.counts.skipped === 1);
  assert('--json never reports the skipped gate as pass',
    payload.results.find((r) => r.id === 'needs-built-docs').status === 'skip');
  assert('--json carries the skip reason', /docs/.test(payload.results.find((r) => r.id === 'needs-built-docs').reason));
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n4. A failing BLOCKING gate exits non-zero; a failing NON-BLOCKING one does not');
{
  const blocking = makeRepo({
    gates: [gate({ id: 'ok-one' }), gate({ id: 'bad', blocking: true, command: 'node -e "console.error(\'boom detail\');process.exit(1)"' })],
  });
  const res = run(blocking, ['--tier', 'fast']);
  assert('exits 1 when a blocking gate fails', res.status === 1);
  assert('prints FAIL for it', /FAIL\s+bad/.test(res.out));
  assert("prints the failing gate's own output", /boom detail/.test(res.out));
  assert('the passing sibling is still counted', /1 passed, 1 failed/.test(res.out));

  const warn = makeRepo({
    gates: [gate({ id: 'ok-one' }), gate({ id: 'soft', blocking: false, command: 'node -e "console.error(\'soft detail\');process.exit(1)"' })],
  });
  const w = run(warn, ['--tier', 'fast']);
  assert('exits 0 when only a non-blocking gate fails', w.status === 0);
  assert('but reports it LOUDLY as WARN', /WARN\s+soft/.test(w.out));
  assert('and says the exit code is unchanged', /exit code unchanged/i.test(w.out));
  assert('and never folds it into passed', /1 passed, 0 failed, 1 warned/.test(w.out));
  assert("prints the warning gate's own output too", /soft detail/.test(w.out));
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n5. --only / --skip / --bail');
{
  const root = makeRepo({
    gates: [
      gate({ id: 'a' }),
      gate({ id: 'b', command: 'node -e "process.exit(1)"' }),
      gate({ id: 'c' }),
      gate({ id: 'manual', autorun: false }),
    ],
  });
  const only = run(root, ['--only', 'a,c']);
  assert('--only runs exactly the named gates', /2 gate\(s\) selected/.test(only.out) && only.status === 0);

  const skip = run(root, ['--tier', 'fast', '--skip', 'b']);
  assert('--skip excludes a gate entirely', skip.status === 0 && !/FAIL/.test(skip.out));

  const bail = run(root, ['--tier', 'fast', '--bail']);
  assert('--bail exits 1', bail.status === 1);
  assert('--bail marks the un-run remainder as SKIPPED, not passed', /SKIP\s+c/.test(bail.out));
  assert('--bail says why they did not run', /--bail stopped the run/.test(bail.out));

  assert('autorun:false gates are not selected by --tier', !/manual/.test(skip.out.split('GATE')[1] ?? ''));
  assert('but --only can still name one', run(root, ['--only', 'manual']).status === 0);
  assert('--only with an unknown id is a usage error (exit 2)', run(root, ['--only', 'nope']).status === 2);
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n6. A structurally invalid manifest exits 3 and names the problem');
{
  const offVocab = makeRepo({ gates: [gate({ id: 'x', needs: ['teleportation'] })] });
  const r1 = run(offVocab, ['--list']);
  assert('an off-vocabulary need exits 3', r1.status === 3);
  assert('and names the offending token', /teleportation/.test(r1.out));
  assert('and says the vocabulary is closed', /vocabulary is closed/.test(r1.out));

  const noPurpose = makeRepo({ gates: [{ id: 'y', command: 'true', needs: ['none'], blocking: true, ci: null, tier: 'fast' }] });
  const r2 = run(noPurpose, ['--list']);
  assert('a missing required field exits 3', r2.status === 3);
  assert('and names the field', /purpose/.test(r2.out));

  const dupe = makeRepo({ gates: [gate({ id: 'z' }), gate({ id: 'z' })] });
  assert('a duplicate id exits 3', run(dupe, ['--list']).status === 3);
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n7. --check-ci direction (a): a gate claiming a job the workflow does not have');
{
  const workflow = [
    'name: w',
    'jobs:',
    '  alpha:',
    '    name: The Alpha Job',
    '    steps:',
    '      - run: pnpm run lint',
  ].join('\n');

  const clean = makeRepo({
    workflow,
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: 'The Alpha Job' })],
  });
  const ok = run(clean, ['--check-ci']);
  assert('a manifest that agrees with the workflow exits 0', ok.status === 0);
  assert('and says so', /PASS/.test(ok.out));

  // The exact rot this mode exists to catch: someone renames the CI job.
  const renamed = makeRepo({
    workflow: workflow.replace('The Alpha Job', 'The Renamed Job'),
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: 'The Alpha Job' })],
  });
  const r = run(renamed, ['--check-ci']);
  assert('a renamed CI job exits 1', r.status === 1);
  assert('names the gate', /lint/.test(r.out));
  assert('names the job it claims', /The Alpha Job/.test(r.out));
  assert('labels the direction manifest->workflow', /manifest->workflow/.test(r.out));

  // A job that exists but does not actually invoke the script.
  const wrongJob = makeRepo({
    workflow: `${workflow}\n  beta:\n    name: The Beta Job\n    steps:\n      - run: echo nothing\n`,
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: 'The Beta Job' })],
  });
  const wj = run(wrongJob, ['--check-ci']);
  assert('a job that exists but never runs the script exits 1', wj.status === 1);
  assert('and says the job never runs it', /never runs/.test(wj.out));

  const unknown = makeRepo({
    workflow,
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: 'unknown' })],
  });
  const u = run(unknown, ['--check-ci']);
  assert('an explicitly-undetermined ci value exits 1 rather than passing quietly', u.status === 1);
  assert('and says it has not been determined', /has not been determined/.test(u.out));
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n8. --check-ci direction (b): a `pnpm run` in the workflow that the manifest does not declare');
{
  const workflow = [
    'name: w',
    'jobs:',
    '  alpha:',
    '    name: The Alpha Job',
    '    steps:',
    '      - run: pnpm run lint',
    '      - run: pnpm run brand-new-gate',
  ].join('\n');

  const missing = makeRepo({
    workflow,
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: 'The Alpha Job' })],
  });
  const m = run(missing, ['--check-ci']);
  assert('an undeclared workflow script exits 1', m.status === 1);
  assert('names the script', /brand-new-gate/.test(m.out));
  assert('labels the direction workflow->manifest', /workflow->manifest/.test(m.out));
  assert('says the manifest is no longer an inventory', /no longer an inventory/.test(m.out));

  // Declared, but the `ci` value missed a second job that also runs it.
  const twoJobs = [
    'name: w',
    'jobs:',
    '  alpha:',
    '    name: The Alpha Job',
    '    steps:',
    '      - run: pnpm run lint',
    '  beta:',
    '    name: The Beta Job',
    '    steps:',
    '      - run: pnpm run lint',
  ].join('\n');
  const partial = makeRepo({
    workflow: twoJobs,
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: 'The Alpha Job' })],
  });
  const p = run(partial, ['--check-ci']);
  assert('a second job running the same script and not listed exits 1', p.status === 1);
  assert('names the unlisted job', /The Beta Job/.test(p.out));

  const both = makeRepo({
    workflow: twoJobs,
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: ['The Alpha Job', 'The Beta Job'] })],
  });
  assert('listing both jobs exits 0', run(both, ['--check-ci']).status === 0);

  // A comment mentioning a script must not count as an invocation — the
  // workflow is dense with prose about retired scripts.
  const commented = makeRepo({
    workflow: 'name: w\njobs:\n  alpha:\n    name: The Alpha Job\n    steps:\n      # WAS `pnpm run build:storybook`, retired 2026-08-25\n      - run: pnpm run lint\n',
    gates: [gate({ id: 'lint', npmScript: 'lint', command: 'pnpm run lint', ci: 'The Alpha Job' })],
  });
  assert('a script named only in a workflow COMMENT is not treated as an invocation',
    run(commented, ['--check-ci']).status === 0);
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n9. --check-ci against the REAL repo: the shipped manifest agrees with the real workflow');
{
  const res = spawnSync(process.execPath, [SCRIPT, '--check-ci', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  let payload = null;
  try {
    payload = JSON.parse(res.stdout);
  } catch (err) {
    console.log(`      parse: ${err.message}`);
    console.log(`      stdout head: ${JSON.stringify(res.stdout.slice(0, 400))}`);
  }
  assert('--check-ci --json parses', payload !== null);
  if (payload) {
    if (payload.drift.length) {
      for (const d of payload.drift) console.log(`      drift: [${d.direction}] ${d.gate}: ${d.message}`);
    }
    assert('no drift between .altitude/gates.json and v2-checks.yml', payload.drift.length === 0);
    assert('the workflow really was parsed (jobs found)', payload.jobs > 20);
    assert('every `pnpm run` script in the workflow is accounted for', payload.workflowScripts > 30);
    assert('the check is not vacuous — most gates declare a CI job', payload.declaredInCi > payload.localOnly);
    assert('partially-verifiable entries are REPORTED, not hidden', Array.isArray(payload.unverified));
  }
  assert('exit code matches the drift verdict', (payload?.drift.length ? 1 : 0) === res.status);
}

for (const dir of TEMP_ROOTS) {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
