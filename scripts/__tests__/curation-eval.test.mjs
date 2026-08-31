#!/usr/bin/env node
/**
 * Self-test for Task F — the curation-review eval (T8, spec
 * 2026-08-29-parity-judgement-gates-and-evals).
 *
 * The corpus is derived LIVE from the 33 tracked `figma.gen.json` files, so
 * these assertions run anywhere the repo is checked out — no gitignored
 * observation is involved.
 *
 * What is actually at risk here, and therefore what is tested:
 *   - BALANCE. The corpus is 50/50 correct/wrong by construction, so both
 *     degenerate strategies ("all fine", "all broken") land on 0.5 instead of
 *     either one scoring well. Ordering interleaves them so a small fleet sees
 *     both.
 *   - The WRONG cases must be plausible. A wrong value is a REAL value
 *     borrowed from another component — not a scrambled string, which any
 *     agent would reject without understanding the component.
 *   - The historical reversals are present. An eval that cannot reproduce a
 *     failure you already had is not yet measuring anything.
 *
 * Run: node scripts/__tests__/curation-eval.test.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectConstantVerdict, gradeTaskF, runGrader } from '../ai-readiness/lib/grader.mjs';
import { caseSource } from '../ai-readiness/lib/case-sources.mjs';
import {
  REVIEWABLE_KEYS,
  buildCurationCases,
  loadCurations,
  loadNegatives,
  orderedCases,
} from '../ai-readiness/lib/curation-cases.mjs';
import { TASKS, taskById } from '../ai-readiness/lib/tasks-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const CORRECT_CASE = { id: 'al-badge.anatomyCase.correct', tag: 'al-badge', key: 'anatomyCase', expected: 'correct' };
const WRONG_CASE = { id: 'al-banner.anatomyCase.wrong', tag: 'al-banner', key: 'anatomyCase', expected: 'wrong' };
const answer = (verdict, extra = {}) => ({ verdict, reasoning: 'checked the contract', confidence: 'high', ...extra });

console.log('== Task F curation-review self-test ==');

console.log('\n1. Registration');
{
  assert('F is in the task registry', !!TASKS.F);
  assert('its id resolves back to its prompt file', taskById('F-curation')?.prompt === 'F-curation.md');
  assert('prompt and schema exist', existsSync(join(ROOT, 'scripts/ai-readiness/tasks/F-curation.md'))
    && existsSync(join(ROOT, 'scripts/ai-readiness/schemas/curation.schema.json')));
  assert('the schema declares draft-07', JSON.parse(readFileSync(join(ROOT, 'scripts/ai-readiness/schemas/curation.schema.json'), 'utf8')).$schema
    === 'http://json-schema.org/draft-07/schema#');
}

console.log('\n2. The corpus comes from the real curation files');
{
  const curations = loadCurations();
  assert('the tracked figma.gen.json files are found', curations.length >= 30);
  assert('every one parses and carries at least one key', curations.every((c) => Object.keys(c.config).length > 0));
  assert('every one documents itself with a $comment — an undocumented curation is an unreviewable one',
    curations.every((c) => typeof c.config.$comment === 'string' && c.config.$comment.length > 20));

  const cases = buildCurationCases();
  assert('cases were built', cases.length > 10);
  assert('only reviewable keys are asked about — $comment is prose and sheet has no per-component right answer',
    cases.every((c) => REVIEWABLE_KEYS.includes(c.key) || c.historical === true));
}

console.log('\n3. Balance — both degenerate strategies must land on ~0.5');
{
  const cases = buildCurationCases();
  const correct = cases.filter((c) => c.expected === 'correct').length;
  const wrong = cases.filter((c) => c.expected === 'wrong').length;
  assert(`the derived corpus is balanced (${correct} correct / ${wrong} wrong)`, Math.abs(correct - wrong) <= cases.filter((c) => c.historical).length + 1);

  const ordered = orderedCases(cases);
  assert('ordering interleaves, so a fleet of 2 sees one of each',
    ordered[0].expected !== ordered[1].expected);
  assert('every case is still present after ordering', ordered.length === cases.length);
}

console.log('\n4. The wrong cases are plausible, not scrambled');
{
  const wrongs = buildCurationCases().filter((c) => c.expected === 'wrong' && !c.historical);
  assert('there are derived wrong cases', wrongs.length > 0);
  assert('each names the component it borrowed the value from', wrongs.every((c) => typeof c.borrowedFrom === 'string'));
  assert('each borrowed from a DIFFERENT component — borrowing from yourself would make it correct',
    wrongs.every((c) => c.borrowedFrom !== c.tag));
  assert('each records the true value, so a failure can be reviewed', wrongs.every((c) => typeof c.trueValue === 'string'));
  assert('the presented value differs from the true one', wrongs.every((c) => c.presented !== c.trueValue));
}

console.log('\n5. The historical reversals are in the corpus');
{
  const negatives = loadNegatives();
  assert('the negatives fixture loads', negatives.length >= 3);
  const ids = negatives.map((n) => n.id);
  assert('the al-button axis-from-a-screenshot reversal (T22/T23 -> T31) is present',
    ids.some((id) => id.includes('al-button.axis-from-screenshot')));
  assert('the al-badge alphabetical-anatomy failure is present',
    ids.some((id) => id.includes('al-badge.alphabetical-anatomy')));
  assert('every historical case cites where the failure is recorded',
    negatives.every((n) => typeof n.source === 'string' && n.source.length > 15));
  assert('they are not all negatives — one documents a curation that is CORRECT, so the set does not teach "historical means wrong"',
    negatives.some((n) => n.expected === 'correct'));
  assert('they are flagged as historical so a report can separate them from the derived cases',
    buildCurationCases().filter((c) => c.historical).length === negatives.length);
}

console.log('\n6. Scoring');
{
  assert('a correct verdict scores 1', gradeTaskF(answer('correct'), { case: CORRECT_CASE }).score === 1);
  assert('a wrong verdict on a correct curation scores 0', gradeTaskF(answer('wrong'), { case: CORRECT_CASE }).score === 0);
  assert('spotting a bad curation scores 1', gradeTaskF(answer('wrong'), { case: WRONG_CASE }).score === 1);
  assert('an off-vocabulary verdict is flagged invalid', gradeTaskF(answer('maybe'), { case: WRONG_CASE }).validAnswer === false);

  const noFix = gradeTaskF(answer('wrong'), { case: WRONG_CASE });
  assert('calling it wrong with no correction is tracked', noFix.offeredCorrection === false);
  assert('  ...but not scored — a correct detection is not penalised for a weak correction', noFix.score === 1);
  const withFix = gradeTaskF(answer('wrong', { correctedValue: 'Dismissible=no' }), { case: WRONG_CASE });
  assert('offering a correction is recorded', withFix.offeredCorrection === true);
  assert('offeredCorrection is null when the verdict is `correct` — there is nothing to correct',
    gradeTaskF(answer('correct'), { case: CORRECT_CASE }).offeredCorrection === null);

  assert('no case attached scores null, not 0', gradeTaskF(answer('correct'), null).score === null);
  assert('runGrader routes to it', runGrader('gradeTaskF', answer('correct'), { case: CORRECT_CASE }).score === 1);
}

console.log('\n7. The degenerate-verdict detector');
{
  const allFine = [
    { answered: 'correct', expected: 'correct' },
    { answered: 'correct', expected: 'wrong' },
    { answered: 'correct', expected: 'wrong' },
  ];
  assert('"everything is fine" is flagged', detectConstantVerdict(allFine).constant === true);
  const allBroken = [
    { answered: 'wrong', expected: 'correct' },
    { answered: 'wrong', expected: 'wrong' },
    { answered: 'wrong', expected: 'correct' },
  ];
  assert('"everything is broken" is flagged too — the corpus is 50/50, so both score ~0.5',
    detectConstantVerdict(allBroken).constant === true);
  const real = [
    { answered: 'correct', expected: 'correct' },
    { answered: 'wrong', expected: 'wrong' },
    { answered: 'correct', expected: 'correct' },
  ];
  assert('a discriminating agent is not flagged', detectConstantVerdict(real).constant === false);
  assert('too few attempts returns null rather than a guess', detectConstantVerdict(allFine.slice(0, 2)) === null);
}

console.log('\n8. Selection through the shared case-source interface');
{
  const source = caseSource('curation');
  const corpus = source.load();
  assert('the corpus loads through the interface', !!corpus?.cases?.length);
  assert('selection is deterministic', source.forAttempt(corpus, 3).id === source.forAttempt(corpus, 3).id);
  assert('it cycles', source.forAttempt(corpus, corpus.cases.length + 1).id === source.forAttempt(corpus, 1).id);
  const ph = source.placeholders(source.forAttempt(corpus, 1));
  assert('placeholders carry everything the prompt needs',
    ['TAG', 'KEY', 'PRESENTED', 'CASE_ID'].every((k) => typeof ph[k] === 'string' && ph[k].length > 0));
  assert('this source materializes nothing — it is answerable from tracked files alone',
    source.materialize(source.forAttempt(corpus, 1), '/nonexistent') === null);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
