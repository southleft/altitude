#!/usr/bin/env node
/**
 * Self-test for scripts/check-context-budget.mjs — the agent read-path ratchet.
 *
 * Plain node test, no framework — matches check-api-vocabulary.test.mjs and
 * check-doc-anchors.test.mjs: spawn the real CLI and assert on its exit code
 * and output, because the CLI contract (exit non-zero, name the path and the
 * delta) IS what CI depends on. The module is never imported: like the
 * vocabulary gate it runs its body at load time, so an import would measure the
 * real repo and call process.exit inside the test.
 *
 * Every case builds a THROWAWAY repo in os.tmpdir() and points the gate at it
 * with --root. Asserting against the real repo's word counts would make these
 * tests fail on every doc edit, which is the opposite of a regression test:
 * what must not regress is the RATCHET — both directions of it — not today's
 * word count. Two cases do run against the real repo, and both assert only that
 * it is self-consistent, never what the number is.
 *
 * Run: node scripts/__tests__/check-context-budget.test.mjs
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const SCRIPT = join(ROOT, 'scripts/check-context-budget.mjs');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond, extra) {
  if (cond) {
    console.log(`  ok - ${desc}`);
    PASS++;
  } else {
    console.log(`  NOT OK - ${desc}`);
    if (extra) console.log(`      ${String(extra).split('\n').join('\n      ')}`);
    FAIL++;
  }
}

const TEMP_ROOTS = [];

/** The files READ_PATHS declares, in the order the gate reads them. */
const ALWAYS = ['CLAUDE.md', '.claude/CLAUDE.md'];
const GENERATE_EXTRA = [
  'AGENTS.md',
  '.claude/skills/altitude-figma-generate/SKILL.md',
  '.altitude/FIGMA-CLEANLINESS.md',
  '.altitude/contracts/COVERAGE.md',
];
const ALL_FILES = [...ALWAYS, ...GENERATE_EXTRA];

const words = (n, eol = '\n') => Array.from({ length: n }, (_, i) => `w${i}`).join(eol === '\n' ? ' ' : eol);

/**
 * A repo whose every read-path file holds `perFile` words.
 * `omit` drops a file so the "cannot measure" path can be exercised.
 */
function makeRepo({ perFile = 10, baseline = null, omit = [], eol = '\n' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ctx-budget-'));
  TEMP_ROOTS.push(root);
  for (const rel of ALL_FILES) {
    if (omit.includes(rel)) continue;
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, `${words(perFile, eol)}${eol}`);
  }
  if (baseline) {
    mkdirSync(join(root, '.altitude/baselines'), { recursive: true });
    writeFileSync(join(root, '.altitude/baselines/context-budget.json'), JSON.stringify(baseline, null, 2));
  }
  return root;
}

/** A baseline pinning both paths, with the real file lists. */
function pin({ always, generate, slack = 0 }) {
  return {
    paths: {
      'always-loaded': { why: 'x', files: ALWAYS, words: always, slack },
      'figma-generate': { why: 'x', files: [...ALWAYS, ...GENERATE_EXTRA], words: generate, slack },
    },
  };
}

function run(args) {
  const r = spawnSync('node', [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

const readBaseline = (root) =>
  JSON.parse(readFileSync(join(root, '.altitude/baselines/context-budget.json'), 'utf8'));

console.log('check-context-budget.test.mjs');

// 1. --help exits 0 and documents both ratchet flags.
{
  const { code, out } = run(['--help']);
  assert('--help exits 0 and documents --update and --report',
    code === 0 && /--update/.test(out) && /--report/.test(out) && /Usage:/.test(out), out);
}

// 2. No baseline: the gate SEEDS one rather than failing. A first run that
//    red-lights on its own absence teaches people to skip it.
{
  const root = makeRepo({ perFile: 10 });
  const { code, out } = run(['--root', root]);
  assert('a missing baseline is seeded, not failed', code === 0 && /seeded/.test(out), out);
  const base = readBaseline(root);
  assert('...pinning always-loaded at the measured total (2 files x 10 words)', base.paths['always-loaded'].words === 20, out);
  assert('...and figma-generate at all six files (6 x 10)', base.paths['figma-generate'].words === 60, out);
  assert('...recording the file LIST, so a read path that grows shows as a diff',
    base.paths['figma-generate'].files.length === 6, out);
  assert('...and a down-side slack, so a typo fix does not red the build',
    base.paths['always-loaded'].slack > 0, out);
  const second = run(['--root', root]);
  assert('...and the seeded repo is green on the next run', second.code === 0 && /OK/.test(second.out), second.out);
}

// 3. Exactly at the pin passes.
{
  const root = makeRepo({ perFile: 10, baseline: pin({ always: 20, generate: 60 }) });
  const { code, out } = run(['--root', root]);
  assert('exactly at the pin passes', code === 0 && /OK/.test(out), out);
}

// 4. ABOVE the pin fails, at any size, and names the path and the delta.
{
  const root = makeRepo({ perFile: 11, baseline: pin({ always: 20, generate: 60, slack: 100 }) });
  const { code, out } = run(['--root', root]);
  assert('a longer read path fails', code === 1 && /over-budget/.test(out), out);
  assert('...naming the path', /always-loaded/.test(out), out);
  assert('...and the delta', /20 -> 22 words \(\+2\)/.test(out), out);
  assert('...even though the rise is well inside the down-side slack — slack is one-directional',
    /over-budget/.test(out), out);
}

// 5. BELOW the pin without --update fails: the failure mode this gate exists
//    for. A ratchet that only notices increases never moves.
{
  const root = makeRepo({ perFile: 5, baseline: pin({ always: 20, generate: 60, slack: 2 }) });
  const { code, out } = run(['--root', root]);
  assert('a shorter read path fails while the ceiling is still high', code === 1 && /ratchet-not-turned/.test(out), out);
  assert('...naming the drop and the slack it exceeded', /20 -> 10 words \(-10, slack 2\)/.test(out), out);
  assert('...and saying exactly how to tighten it', /--update/.test(out), out);
}

// 6. Below the pin but WITHIN slack passes — the tolerance that keeps the gate
//    from crying wolf on a typo fix.
{
  const root = makeRepo({ perFile: 9, baseline: pin({ always: 20, generate: 60, slack: 10 }) });
  const { code, out } = run(['--root', root]);
  assert('a drop inside the slack passes', code === 0 && /OK/.test(out), out);
}

// 7. --update turns the ratchet, and the same repo is green afterwards.
{
  const root = makeRepo({ perFile: 5, baseline: pin({ always: 20, generate: 60, slack: 2 }) });
  const first = run(['--root', root, '--update']);
  assert('--update exits 0', first.code === 0, first.out);
  assert('--update rewrites the pin to the measured total', readBaseline(root).paths['always-loaded'].words === 10, first.out);
  assert('--update records where each path came from', /always-loaded\s+20 -> 10/.test(first.out), first.out);
  assert('...and recomputes the slack against the new, smaller pin',
    readBaseline(root).paths['always-loaded'].slack < 20, first.out);
  const second = run(['--root', root]);
  assert('...and the gate is green afterwards', second.code === 0, second.out);
}

// 8. --update also re-pins a RISE. Unlike the vocabulary ledger there is no
//    "new violation" to launder here: a longer read path is a judgement call,
//    and the record of it is the baseline diff in the PR.
{
  const root = makeRepo({ perFile: 30, baseline: pin({ always: 20, generate: 60 }) });
  assert('a rise fails first', run(['--root', root]).code === 1);
  const up = run(['--root', root, '--update']);
  assert('--update accepts a justified rise', up.code === 0 && readBaseline(root).paths['always-loaded'].words === 60, up.out);
  assert('...and the note records the direction so the diff is reviewable',
    /20 -> 60/.test(readBaseline(root).note), JSON.stringify(readBaseline(root).note));
}

// 9. A read path whose FILE LIST changed fails separately from a word delta —
//    a path that quietly gained a mandatory file would otherwise read as an
//    unexplained jump in a total.
{
  const root = makeRepo({ perFile: 10 });
  mkdirSync(join(root, '.altitude/baselines'), { recursive: true });
  writeFileSync(
    join(root, '.altitude/baselines/context-budget.json'),
    JSON.stringify({
      paths: {
        'always-loaded': { why: 'x', files: ['CLAUDE.md'], words: 20, slack: 5 },
        'figma-generate': { why: 'x', files: [...ALWAYS, ...GENERATE_EXTRA], words: 60, slack: 5 },
      },
    }, null, 2)
  );
  const { code, out } = run(['--root', root]);
  assert('a changed read-path file list fails', code === 1 && /read-path-changed/.test(out), out);
  assert('...printing both lists', /pinned:.*CLAUDE\.md/s.test(out) && /measured:.*\.claude\/CLAUDE\.md/s.test(out), out);
}

// 10. Silence is the forbidden failure: a declared file that is not on disk
//     exits 2 rather than quietly measuring a smaller path.
{
  const root = makeRepo({ perFile: 10, omit: ['.altitude/FIGMA-CLEANLINESS.md'], baseline: pin({ always: 20, generate: 60 }) });
  const { code, out } = run(['--root', root]);
  assert('a missing read-path file exits 2', code === 2 && /cannot measure/.test(out), out);
  assert('...and names the file, not just the count', /FIGMA-CLEANLINESS\.md/.test(out), out);
}

// 11. Line endings do not change the measurement. This repo is authored on
//     Windows and gated on Linux; a baseline that disagreed across platforms
//     would be unsatisfiable from one of them.
{
  const lf = makeRepo({ perFile: 40, eol: '\n' });
  const crlf = makeRepo({ perFile: 40, eol: '\r\n' });
  run(['--root', lf]);
  run(['--root', crlf]);
  assert('CRLF and LF measure identically',
    readBaseline(lf).paths['figma-generate'].words === readBaseline(crlf).paths['figma-generate'].words,
    `${readBaseline(lf).paths['figma-generate'].words} vs ${readBaseline(crlf).paths['figma-generate'].words}`);
}

// 12. --report: the per-file breakdown, which is what makes the total
//     actionable — "which file do I compress?" is the only useful next question.
{
  const root = makeRepo({ perFile: 10, baseline: pin({ always: 20, generate: 60 }) });
  const { code, out } = run(['--root', root, '--report']);
  assert('--report exits 0', code === 0, out);
  assert('--report names both read paths', /always-loaded/.test(out) && /figma-generate/.test(out), out);
  assert('--report breaks the total down per file', /10\s+AGENTS\.md/.test(out) && /10\s+CLAUDE\.md/.test(out), out);
  assert('--report totals each path', /60\s+TOTAL/.test(out), out);
  assert('--report shows the delta against the pin', /against the pin/.test(out) && /15515|vs\s+60/.test(out), out);
  assert('--report explains WHY each path is a read path', /every turn of every session/.test(out), out);
}

// 13. --report before a baseline exists still works, and says so.
{
  const root = makeRepo({ perFile: 10 });
  const { code, out } = run(['--root', root, '--report']);
  assert('--report with no baseline exits 0 and says there is none', code === 0 && /no baseline yet/.test(out), out);
}

// 14. --json is machine-readable and carries the problems.
{
  const root = makeRepo({ perFile: 11, baseline: pin({ always: 20, generate: 60 }) });
  const { code, out } = run(['--root', root, '--json']);
  const json = JSON.parse(out.slice(out.indexOf('{')));
  assert('--json exits non-zero when the gate fails', code === 1, out);
  assert('...and carries the per-file measurement', json.paths['always-loaded'].files.length === 2, out);
  assert('...and names the problem kind', json.problems.some((p) => p.kind === 'over-budget'), out);
}

// 15. The real repo: green at its pin, and the report is reproducible.
{
  const gate = run([]);
  assert('the real repo is green at its pin', gate.code === 0, gate.out);
  const report = run(['--report']);
  assert('--report prints the real breakdown', report.code === 0 && /TOTAL/.test(report.out), report.out);
  assert('...including the always-loaded path, which every session pays for',
    /CLAUDE\.md/.test(report.out) && /always-loaded/.test(report.out), report.out);
}

for (const root of TEMP_ROOTS) rmSync(root, { recursive: true, force: true });
console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL ? 1 : 0);
