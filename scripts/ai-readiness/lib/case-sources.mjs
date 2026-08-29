/**
 * case-sources.mjs — the one interface run-probe.mjs uses to pose a
 * per-attempt case, whatever kind of case it is.
 *
 * T7, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * Tasks A/B/C/G ask every attempt the SAME question; D and E do not. Rather
 * than teaching run-probe about each corpus, a task declares `cases: '<kind>'`
 * in the registry and this module resolves that to four functions:
 *
 *   load()                     the corpus, or null when it is not on disk
 *   forAttempt(corpus, i)      DETERMINISTIC: attempt i always gets case i
 *   materialize(case, dir)     side effects (writing contract files), or null
 *   placeholders(case, paths)  the `{{...}}` substitutions for the prompt
 *
 * Determinism is load-bearing across all of them. The harness exists to
 * measure the DELTA between runs — whether editing a skill moved the score —
 * and that requires two runs to have been asked the same questions.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { caseForAttempt, loadCorpus, materializeCase } from './reconcile-cases.mjs';
import { caseForAttempt as curationCaseForAttempt, loadCurationCorpus } from './curation-cases.mjs';
import { REPO_ROOT } from '../../../libs/altitude-mcp/src/lib/paths.mjs';

const DIRECTION_FIXTURE = join(REPO_ROOT, 'scripts', 'ai-readiness', 'fixtures', 'direction-cases.json');

/**
 * Task D — reconciliation. Cases are COMPUTED: `contract-diff.mjs` derives
 * each answer key from a real contract pair plus a deterministic mutation.
 */
const driftSource = {
  kind: 'drift',
  hint: 'run: pnpm run evals:drift-cases -- --write',
  load: () => loadCorpus(),
  forAttempt: (corpus, i) => caseForAttempt(corpus, i),
  materialize: (caseRecord, dir) => materializeCase(caseRecord, dir),
  placeholders: (caseRecord, paths) => ({
    TAG: caseRecord.tag,
    CASE_ID: caseRecord.id,
    CODE_CONTRACT_PATH: paths ? paths.codePath : '<materialized at run time>',
    CANVAS_CONTRACT_PATH: paths ? paths.canvasPath : '<materialized at run time>',
  }),
};

/**
 * Task E — direction policy. Cases are HAND-AUTHORED, because "who wins" is a
 * policy question and no differ can compute it. Each case cites the rule it
 * tests; if a case and its cited source ever disagree, the source is right.
 *
 * Ordering interleaves the three expected answers rather than grouping them.
 * A fleet of 3 that drew three consecutive `code` cases would report a score
 * that says nothing about whether the agent can recognise the other two
 * answers — and "always answer code" would pass it.
 */
const directionSource = {
  kind: 'direction',
  hint: `expected at ${DIRECTION_FIXTURE}`,
  load: () => (existsSync(DIRECTION_FIXTURE) ? JSON.parse(readFileSync(DIRECTION_FIXTURE, 'utf8')) : null),
  forAttempt: (corpus, i) => {
    const cases = interleaveByExpected(corpus?.cases ?? []);
    return cases.length ? cases[(i - 1) % cases.length] : null;
  },
  materialize: () => null,
  placeholders: (caseRecord) => ({
    CASE_ID: caseRecord.id,
    SCENARIO: caseRecord.scenario,
    DIMENSION: caseRecord.dimension,
  }),
};

/**
 * Round-robin the cases across their expected answers, preserving the
 * declared order within each answer. Deterministic, and it means any prefix of
 * the sequence is roughly balanced — which is what makes a small fleet's score
 * mean something.
 */
export function interleaveByExpected(cases) {
  const buckets = new Map();
  for (const c of cases) {
    if (!buckets.has(c.expected)) buckets.set(c.expected, []);
    buckets.get(c.expected).push(c);
  }
  // Sort the bucket ORDER by name so the interleave is stable regardless of
  // the order answers happen to first appear in the fixture.
  const lists = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  const out = [];
  for (let i = 0; lists.some((l) => i < l.length); i += 1) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

/**
 * Task F - curation review. Cases are DERIVED LIVE from the 33 tracked
 * figma.gen.json files (so they cannot drift from them) plus a hand-authored
 * set of historical reversals. Half present the real curated value and half a
 * real value belonging to a different component.
 */
const curationSource = {
  kind: 'curation',
  hint: 'expected: tracked libs/*/components/*/figma.gen.json files',
  load: () => loadCurationCorpus(),
  forAttempt: (corpus, i) => curationCaseForAttempt(corpus, i),
  materialize: () => null,
  placeholders: (caseRecord) => ({
    TAG: caseRecord.tag,
    CASE_ID: caseRecord.id,
    KEY: caseRecord.key,
    PRESENTED: caseRecord.presented,
  }),
};

const SOURCES = { drift: driftSource, direction: directionSource, curation: curationSource };

/** Resolve a task registry `cases` value to its source, or null for a fixed-prompt task. */
export function caseSource(kind) {
  if (!kind) return null;
  const source = SOURCES[kind];
  if (!source) throw new Error(`unknown case source "${kind}" — known: ${Object.keys(SOURCES).join(', ')}`);
  return source;
}
