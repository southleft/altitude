#!/usr/bin/env node
/**
 * Self-test for Task E — the direction-policy eval (T7, spec
 * 2026-08-29-parity-judgement-gates-and-evals).
 *
 * Task E has only three possible answers, which makes it unusually easy for
 * the eval to look like it is working while measuring nothing: an agent that
 * always answers "code" scores whatever fraction of the corpus happens to be
 * code-wins. Two defences are tested here, and they are the reason this file
 * exists at all:
 *
 *   1. BALANCE. The corpus is balanced across code / canvas / ask-a-human, and
 *      case selection INTERLEAVES the three, so any prefix a small fleet draws
 *      is balanced too. A fleet of 3 that drew three code-wins cases would
 *      report a number that says nothing.
 *   2. A DEGENERATE-STRATEGY DETECTOR. `detectConstantDirection` flags a run
 *      whose cases varied but whose answers did not — and deliberately does
 *      NOT flag three correct "code" answers to three code-wins cases.
 *
 * Every case in the fixture also has to cite the rule it tests. A hand-authored
 * answer key with no citation is an opinion, and the point of this eval is to
 * measure whether a DOCUMENTED rule is legible.
 *
 * Run: node scripts/__tests__/direction-eval.test.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectConstantDirection, gradeTaskE, runGrader } from '../ai-readiness/lib/grader.mjs';
import { caseSource, interleaveByExpected } from '../ai-readiness/lib/case-sources.mjs';
import { TASKS, taskById } from '../ai-readiness/lib/tasks-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const CASE = { id: 'token-value-hex', expected: 'code', dimension: 'token-binding' };
const answer = (winner, justification = 'The DTCG tokens are the source and Figma variables are generated from them.') =>
  ({ winner, justification, action: 'fix the Figma variable', confidence: 'high' });

console.log('== Task E direction-policy self-test ==');

console.log('\n1. Registration');
{
  assert('E is in the task registry', !!TASKS.E);
  assert('its id resolves back to its prompt file', taskById('E-direction')?.prompt === 'E-direction.md');
  assert('prompt and schema exist', existsSync(join(ROOT, 'scripts/ai-readiness/tasks/E-direction.md'))
    && existsSync(join(ROOT, 'scripts/ai-readiness/schemas/direction.schema.json')));
  assert('the schema declares draft-07 — 2020-12 kills every attempt before a token is spent',
    JSON.parse(readFileSync(join(ROOT, 'scripts/ai-readiness/schemas/direction.schema.json'), 'utf8')).$schema
      === 'http://json-schema.org/draft-07/schema#');
}

console.log('\n2. The hand-authored corpus is balanced and cited');
{
  const source = caseSource('direction');
  const corpus = source.load();
  assert('the fixture loads', !!corpus?.cases?.length);

  const byExpected = new Map();
  for (const c of corpus.cases) byExpected.set(c.expected, (byExpected.get(c.expected) ?? 0) + 1);
  assert('all three answers are represented — an eval missing one cannot detect a constant strategy for it',
    ['code', 'canvas', 'ask-a-human'].every((k) => (byExpected.get(k) ?? 0) > 0));
  assert('no single answer is more than 60% of the corpus',
    [...byExpected.values()].every((n) => n / corpus.cases.length <= 0.6));

  assert('every case cites the rule it tests — an uncited answer key is an opinion',
    corpus.cases.every((c) => typeof c.source === 'string' && c.source.length > 10));
  assert('every case explains WHY, not just what', corpus.cases.every((c) => typeof c.why === 'string' && c.why.length > 40));
  assert('case ids are unique', new Set(corpus.cases.map((c) => c.id)).size === corpus.cases.length);
  assert('the corpus names the policy document it encodes', typeof corpus.policySource === 'string' && corpus.policySource.includes('SKILL.md'));
}

console.log('\n3. Selection interleaves, so a small fleet is still balanced');
{
  const source = caseSource('direction');
  const corpus = source.load();
  const first3 = [1, 2, 3].map((i) => source.forAttempt(corpus, i));
  assert('a fleet of 3 draws three DIFFERENT expected answers',
    new Set(first3.map((c) => c.expected)).size === 3);
  assert('selection is deterministic', source.forAttempt(corpus, 2).id === source.forAttempt(corpus, 2).id);
  assert('and it cycles rather than running out',
    source.forAttempt(corpus, corpus.cases.length + 1).id === source.forAttempt(corpus, 1).id);

  const synthetic = interleaveByExpected([
    { id: 'a', expected: 'code' }, { id: 'b', expected: 'code' }, { id: 'c', expected: 'code' },
    { id: 'd', expected: 'canvas' },
  ]);
  assert('interleave puts the rare answer second, not last',
    synthetic.map((c) => c.expected).slice(0, 2).join() === 'canvas,code');
}

console.log('\n4. Scoring is binary — a wrong direction is wrong however well argued');
{
  assert('the right answer scores 1', gradeTaskE(answer('code'), { case: CASE }).score === 1);
  assert('a wrong answer scores 0', gradeTaskE(answer('canvas'), { case: CASE }).score === 0);
  assert('casing and padding do not matter', gradeTaskE(answer('  CODE '), { case: CASE }).correct === true);
  assert('an off-vocabulary answer is caught as invalid, not just wrong',
    gradeTaskE(answer('the code side'), { case: CASE }).validAnswer === false);
  assert('a thin justification is flagged', gradeTaskE(answer('code', 'code wins'), { case: CASE }).justified === false);
  assert('  ...but does not change the score — justification quality is the judge\'s job, not the grader\'s',
    gradeTaskE(answer('code', 'code wins'), { case: CASE }).score === 1);
  assert('an attempt with no case scores null, not 0', gradeTaskE(answer('code'), null).score === null);
  assert('runGrader routes to it with its case', runGrader('gradeTaskE', answer('code'), { case: CASE }).score === 1);
}

console.log('\n5. The degenerate-strategy detector');
{
  const alwaysCode = [
    { answered: 'code', expected: 'code' },
    { answered: 'code', expected: 'canvas' },
    { answered: 'code', expected: 'ask-a-human' },
  ];
  const d = detectConstantDirection(alwaysCode);
  assert('an agent that answers "code" to three different questions is flagged', d.constant === true);
  assert('  ...and the report names what it answered and what was asked',
    d.distinctAnswers.join() === 'code' && d.distinctExpected.length === 3);

  const correctlyConstant = [
    { answered: 'code', expected: 'code' },
    { answered: 'code', expected: 'code' },
    { answered: 'code', expected: 'code' },
  ];
  assert('three correct "code" answers to three code-wins cases are NOT flagged — that is right, not lazy',
    detectConstantDirection(correctlyConstant).constant === false);

  const varied = [
    { answered: 'code', expected: 'code' },
    { answered: 'canvas', expected: 'canvas' },
    { answered: 'ask-a-human', expected: 'ask-a-human' },
  ];
  assert('a discriminating agent is not flagged', detectConstantDirection(varied).constant === false);

  assert('two attempts is too few to call it — null, not a guess', detectConstantDirection(alwaysCode.slice(0, 2)) === null);
  assert('no attempts at all is null too', detectConstantDirection([]) === null);
}

console.log('\n6. ask-a-human is a real answer, not an escape hatch');
{
  const askCase = { id: 'both-sides-changed', expected: 'ask-a-human', dimension: 'prop' };
  assert('answering ask-a-human when that IS the answer scores 1',
    gradeTaskE(answer('ask-a-human'), { case: askCase }).score === 1);
  assert('answering ask-a-human when a rule settles it scores 0',
    gradeTaskE(answer('ask-a-human'), { case: CASE }).score === 0);
  const alwaysAsk = [
    { answered: 'ask-a-human', expected: 'code' },
    { answered: 'ask-a-human', expected: 'canvas' },
    { answered: 'ask-a-human', expected: 'ask-a-human' },
  ];
  assert('and always answering it is flagged as degenerate too', detectConstantDirection(alwaysAsk).constant === true);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
