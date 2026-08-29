#!/usr/bin/env node
/**
 * Self-test for Task D — the reconciliation eval (T6, spec
 * 2026-08-29-parity-judgement-gates-and-evals).
 *
 * Covers the two halves that decide whether the eval measures anything:
 * `gradeTaskD` (scoring, always runnable — pure) and `reconcile-cases`
 * (posing a case, needs the gitignored canvas contracts and degrades to a
 * NAMED skip without them).
 *
 * The grading properties that matter most, and why:
 *   - A clean case must be scorable. An agent that correctly reports NOTHING
 *     has to score 1.0, or the eval rewards inventing drift.
 *   - Reporting everything must NOT score well. Recall alone would let a
 *     shotgun agent win; that is why the score is F1, not recall.
 *   - The injected needle is scored separately, because a case with a large
 *     pre-existing disagreement set can post a respectable F1 while missing
 *     the one thing deliberately broken.
 *   - An ungraded attempt reports `score: null`, never 0. "Not measured" and
 *     "measured as bad" are different facts.
 *
 * Run: node scripts/__tests__/reconcile-eval.test.mjs
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { gradeTaskD, runGrader } from '../ai-readiness/lib/grader.mjs';
import { caseForAttempt, loadCorpus, materializeCase, selectableCases } from '../ai-readiness/lib/reconcile-cases.mjs';
import { TASKS, taskById } from '../ai-readiness/lib/tasks-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const CASE = {
  id: 'al-button.rename-axis',
  tag: 'al-button',
  mutation: 'rename-axis',
  injected: [{ dimension: 'variant-axis', key: 'Variant Renamed', kind: 'missing-in-code' }],
  expected: [
    { dimension: 'variant-axis', key: 'Variant Renamed', kind: 'missing-in-code' },
    { dimension: 'prop', key: 'href', kind: 'missing-in-canvas' },
    { dimension: 'state', key: 'disabled', kind: 'missing-in-canvas' },
  ],
};
const CLEAN_CASE = { id: 'al-badge.none', tag: 'al-badge', mutation: 'none', injected: [], expected: [] };
const finding = (dimension, key, kind) => ({ dimension, key, kind, detail: 'x' });

console.log('== Task D reconciliation eval self-test ==');

console.log('\n1. Registration');
{
  assert('D is in the task registry', !!TASKS.D);
  assert('its id resolves back to its prompt file', taskById('D-reconcile')?.prompt === 'D-reconcile.md');
  assert('its prompt and schema exist on disk',
    existsSync(join(ROOT, 'scripts/ai-readiness/tasks/D-reconcile.md'))
    && existsSync(join(ROOT, 'scripts/ai-readiness/schemas/reconcile.schema.json')));
  assert('the schema declares draft-07 — the installed CLI rejects 2020-12 and kills every attempt before a token is spent',
    JSON.parse(readFileSync(join(ROOT, 'scripts/ai-readiness/schemas/reconcile.schema.json'), 'utf8')).$schema
      === 'http://json-schema.org/draft-07/schema#');
  assert('it is marked as case-driven', TASKS.D.cases === 'drift');
}

console.log('\n2. A perfect answer');
{
  const g = gradeTaskD({ verdict: 'drifted', findings: CASE.expected.map((e) => finding(e.dimension, e.key, e.kind)) }, { case: CASE });
  assert('precision 1', g.precision === 1);
  assert('recall 1', g.recall === 1);
  assert('f1 1', g.f1 === 1);
  assert('the injected needle is marked found', g.injectedFound === true);
  assert('the verdict is scored correct', g.verdictCorrect === true);
}

console.log('\n3. Key matching is normalised but dimension/kind are not fudged');
{
  const g = gradeTaskD({ findings: [finding('variant-axis', 'variantRenamed', 'missing-in-code')] }, { case: CASE });
  assert('"variantRenamed" matches "Variant Renamed" — an agent should not lose points for casing',
    g.truePositives === 1);

  const wrongKind = gradeTaskD({ findings: [finding('variant-axis', 'Variant Renamed', 'missing-in-canvas')] }, { case: CASE });
  assert('but the wrong KIND is not a match — direction is the substance of the finding', wrongKind.truePositives === 0);

  const wrongDim = gradeTaskD({ findings: [finding('prop', 'Variant Renamed', 'missing-in-code')] }, { case: CASE });
  assert('and neither is the wrong dimension', wrongDim.truePositives === 0);
}

console.log('\n4. A shotgun answer must not win');
{
  const shotgun = gradeTaskD({
    findings: [
      ...CASE.expected.map((e) => finding(e.dimension, e.key, e.kind)),
      finding('prop', 'invented1', 'missing-in-canvas'),
      finding('prop', 'invented2', 'missing-in-canvas'),
      finding('state', 'invented3', 'missing-in-code'),
    ],
  }, { case: CASE });
  assert('recall is still perfect', shotgun.recall === 1);
  assert('but precision is not', shotgun.precision < 1);
  assert('so the score is below a clean answer — this is why the score is F1, not recall', shotgun.score < 1);
  assert('the spurious findings are counted', shotgun.spurious === 3);
}

console.log('\n5. The needle is scored separately from the bulk');
{
  // Everything found EXCEPT the planted defect: a respectable F1, needle missed.
  const g = gradeTaskD({
    findings: CASE.expected.filter((e) => e.key !== 'Variant Renamed').map((e) => finding(e.dimension, e.key, e.kind)),
  }, { case: CASE });
  assert('f1 is still substantial', g.f1 > 0.5);
  assert('but the injected defect is reported as NOT found', g.injectedFound === false);
}

console.log('\n6. The clean case — resisting invented drift');
{
  const right = gradeTaskD({ verdict: 'in-sync', findings: [], sourceUsed: ['code.json', 'canvas.json'] }, { case: CLEAN_CASE });
  assert('reporting nothing on a clean pair scores 1.0, not 0', right.score === 1);
  assert('  ...and the verdict is scored correct', right.verdictCorrect === true);
  assert('  ...with no needle to find, injectedFound is null rather than false', right.injectedFound === null);

  const invented = gradeTaskD({ verdict: 'drifted', findings: [finding('prop', 'imaginary', 'missing-in-canvas')], sourceUsed: ['code.json'] }, { case: CLEAN_CASE });
  assert('inventing a finding on a clean pair scores 0', invented.score === 0);
  assert('  ...and the verdict is scored wrong', invented.verdictCorrect === false);
}

console.log('\n7. Not measured is never reported as measured-bad');
{
  const g = gradeTaskD({ findings: [] }, null);
  assert('an attempt with no case attached scores null, not 0', g.score === null);
  assert('  ...and says why', /no case attached/.test(g.reason));

  const missing = gradeTaskD({}, { case: CASE });
  assert('output with no findings key does not throw', missing.score === null && missing.unobserved === true);

  // UNOBSERVED vs MEASURED-ZERO. The first real Task D run materialized its
  // cases outside the child's sandbox: every attempt reported zero findings,
  // and all three were counted `gradeable` with F1 = 0 — a harness defect
  // wearing the costume of a model failure. An agent that read nothing has
  // not answered; an agent that read both sides and found nothing has.
  const blocked = gradeTaskD({ verdict: 'in-sync', findings: [], sourceUsed: [] }, { case: CASE });
  assert('read nothing + reported nothing is unobserved, not a zero', blocked.score === null);
  assert('  ...and says the comparison was never performed', /never performed/.test(blocked.reason));

  const looked = gradeTaskD({ verdict: 'in-sync', findings: [], sourceUsed: ['code.json', 'canvas.json'] }, { case: CASE });
  assert('read both sides and reported nothing IS a measured miss', looked.score === 0);
  assert('  ...counted against the full expected set', looked.missed === (CASE.expected ?? []).length);

  // The gaming vector the unconditional guard closes: a clean case rewards an
  // empty answer with 1.0, so "never read anything, always say in-sync" would
  // otherwise score 1.0 on every clean pair and null on every dirty one.
  const freeRide = gradeTaskD({ verdict: 'in-sync', findings: [], sourceUsed: [] }, { case: CLEAN_CASE });
  assert('a clean case does NOT hand a free 1.0 to an agent that read nothing', freeRide.score === null);
  const earned = gradeTaskD({ verdict: 'in-sync', findings: [], sourceUsed: ['code.json'] }, { case: CLEAN_CASE });
  assert('  ...while an agent that actually looked still earns it', earned.score === 1);
}

console.log('\n7b. A rename reported as one finding scores as the pair it covers');
{
  // The differ records a rename as {old, missing-in-canvas} + {new,
  // missing-in-code}. The first baseline scored an agent that correctly
  // reported it as ONE value-mismatch as 0 TP / 1 spurious: it named the
  // right axis, the right new name and the right winner, and was marked
  // wrong for not guessing the differ's internal encoding.
  const renameCase = {
    id: 'x.rename-axis',
    mutation: 'rename-axis',
    expected: [
      { dimension: 'variant-axis', key: 'variant', kind: 'missing-in-canvas' },
      { dimension: 'variant-axis', key: 'Variant Renamed', kind: 'missing-in-code' },
    ],
    injected: [
      { dimension: 'variant-axis', key: 'variant', kind: 'missing-in-canvas' },
      { dimension: 'variant-axis', key: 'Variant Renamed', kind: 'missing-in-code' },
    ],
  };
  const single = gradeTaskD({
    verdict: 'drifted',
    sourceUsed: ['code.json', 'canvas.json'],
    findings: [{ dimension: 'variant-axis', key: 'Variant', kind: 'value-mismatch', renamedTo: 'Variant Renamed', winner: 'canvas' }],
  }, { case: renameCase });
  assert('one finding with renamedTo covers both halves', single.score === 1);
  assert('  ...and precision never exceeds 1', single.precision === 1);
  assert('  ...and the needle counts as found', single.injectedFound === true);

  const halves = gradeTaskD({
    verdict: 'drifted',
    sourceUsed: ['code.json'],
    findings: [
      { dimension: 'variant-axis', key: 'variant', kind: 'missing-in-canvas' },
      { dimension: 'variant-axis', key: 'Variant Renamed', kind: 'missing-in-code' },
    ],
  }, { case: renameCase });
  assert('the two-halves encoding scores identically', halves.score === 1);

  // The gaming vector: "A was renamed to B" for two arbitrary keys must not
  // harvest credit for two unrelated disagreements. A genuine rename pair
  // always carries OPPOSITE kinds; these two do not.
  const bogusCase = {
    id: 'x.bogus',
    mutation: 'retoken',
    expected: [
      { dimension: 'prop', key: 'isDot', kind: 'missing-in-canvas' },
      { dimension: 'prop', key: 'isRound', kind: 'missing-in-canvas' },
    ],
  };
  const bogus = gradeTaskD({
    verdict: 'drifted',
    sourceUsed: ['code.json'],
    findings: [{ dimension: 'prop', key: 'isDot', kind: 'value-mismatch', renamedTo: 'isRound' }],
  }, { case: bogusCase });
  assert('same-kind pairs are NOT a rename - no expansion, scored literally', bogus.truePositives === 0);
  assert('  ...and the bogus claim counts as spurious', bogus.spurious === 1);

  const unknown = gradeTaskD({
    verdict: 'drifted',
    sourceUsed: ['code.json'],
    findings: [{ dimension: 'variant-axis', key: 'nothing', kind: 'value-mismatch', renamedTo: 'nowhere' }],
  }, { case: renameCase });
  assert('a rename claim absent from the key is scored literally, not credited', unknown.truePositives === 0);
}

console.log('8. runGrader passes the context through');
{
  const viaRegistry = runGrader('gradeTaskD', { findings: [], verdict: 'in-sync', sourceUsed: ['code.json'] }, { case: CLEAN_CASE });
  assert('the registry path reaches gradeTaskD with its case', viaRegistry.score === 1);
  assert('the older graders still work with no context at all', runGrader('gradeTaskC', { violations: [] }).score === 0);
}

console.log('\n9. Case selection is deterministic and balanced');
{
  const corpus = loadCorpus();
  if (!corpus) {
    assert('the drift corpus exists (pnpm run evals:drift-cases -- --write)', false);
  } else {
    const cases = selectableCases(corpus);
    assert('there are selectable cases', cases.length > 0);
    assert('attempt 1 always draws the same case', caseForAttempt(corpus, 1).id === caseForAttempt(corpus, 1).id);
    assert('different attempts draw different cases', caseForAttempt(corpus, 1).id !== caseForAttempt(corpus, 2).id);
    assert('selection cycles rather than running out',
      caseForAttempt(corpus, cases.length + 1).id === caseForAttempt(corpus, 1).id);
    const firstTen = Array.from({ length: 10 }, (_, i) => caseForAttempt(corpus, i + 1));
    assert('a small fleet draws defect cases first — asking "is anything wrong?" before "is nothing wrong?"',
      firstTen.every((c) => (c.injected?.length ?? 0) > 0));
  }
}

console.log('\n10. Materializing a case');
{
  const corpus = loadCorpus();
  const target = corpus && caseForAttempt(corpus, 1);
  const canvasOnDisk = target && existsSync(join(ROOT, '.altitude/figma-sync/canvas-contracts', `${target.tag}.canvas.json`));
  if (!canvasOnDisk) {
    console.log('  (skipped: canvas contracts are gitignored observations and are absent here)');
  } else {
    const dir = mkdtempSync(join(tmpdir(), 'recon-case-'));
    try {
      const paths = materializeCase(target, dir);
      assert('both sides of the pair are written', existsSync(paths.codePath) && existsSync(paths.canvasPath));
      const canvas = JSON.parse(readFileSync(paths.canvasPath, 'utf8'));
      assert('the canvas side is the MUTATED one, not the tracked original',
        JSON.stringify(canvas) !== readFileSync(join(ROOT, '.altitude/figma-sync/canvas-contracts', `${target.tag}.canvas.json`), 'utf8'));
      let threw = false;
      try {
        materializeCase({ ...target, tag: 'al-does-not-exist' }, dir);
      } catch (e) {
        threw = /no code contract|no canvas contract/.test(e.message);
      }
      assert('an unposable case THROWS rather than handing the agent a half-built one', threw);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
