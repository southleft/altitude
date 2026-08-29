/**
 * reconcile-cases.mjs — hand Task D one case from the drift corpus.
 *
 * T6, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * The corpus (`.altitude/ai-readiness/drift-cases.<project>.json`, built by
 * `build-drift-cases.mjs`) stores only `{tag, mutation, expected, injected}`.
 * The mutated contracts themselves are NOT stored — every mutation is
 * deterministic, so this module re-derives the exact pair the case describes
 * and writes it where the agent can read it.
 *
 * WHY SELECTION IS DETERMINISTIC. Attempt N always gets the same case. A
 * random pick would make two runs incomparable, which defeats the delta loop
 * the whole harness exists for — the point is measuring whether a change to a
 * skill or a doc moved the score, and that requires the same questions.
 *
 * WHY MATERIALIZATION CAN FAIL LOUDLY. Canvas contracts are gitignored live
 * observations (`.gitignore:122`) and are absent on a clone. A Task D attempt
 * on a machine that has never run `contracts:canvas` cannot be constructed at
 * all. That raises, rather than quietly handing the agent an empty or
 * half-built case and scoring whatever comes back — a silently degraded eval
 * reports a number that looks like a measurement and is not one.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { applyMutation } from './drift-mutations.mjs';
import { REPO_ROOT } from '../../../libs/altitude-mcp/src/lib/paths.mjs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function corpusPath(projectId = 'altitude') {
  return join(REPO_ROOT, '.altitude', 'ai-readiness', `drift-cases.${projectId}.json`);
}

/** The tracked corpus, or null when it has never been built. */
export function loadCorpus(projectId = 'altitude') {
  const p = corpusPath(projectId);
  return existsSync(p) ? read(p) : null;
}

/**
 * The cases Task D draws from, in a stable order.
 *
 * Cases carrying an injected defect come first, then the clean (`none`) ones,
 * each group sorted by id. That ordering is the balance control: a small fleet
 * (`--fleet=3`) draws three defect cases, and a fleet large enough to exhaust
 * them starts drawing clean ones — so a run only ever asks "is nothing wrong
 * here?" once it has already asked "what is wrong here?" enough times for that
 * question to mean something.
 */
export function selectableCases(corpus) {
  if (!corpus?.cases?.length) return [];
  const withNeedle = corpus.cases.filter((c) => (c.injected?.length ?? 0) > 0);
  const clean = corpus.cases.filter((c) => (c.injected?.length ?? 0) === 0);
  const byId = (a, b) => a.id.localeCompare(b.id);
  return [...withNeedle.sort(byId), ...clean.sort(byId)];
}

/**
 * Which case does attempt `index` (1-based) get?
 *
 * Cycles once the list is exhausted, so a fleet larger than the corpus repeats
 * cases rather than failing — repetition across a fleet is signal about
 * variance, which is exactly what a multi-attempt fleet is for.
 */
export function caseForAttempt(corpus, index) {
  const cases = selectableCases(corpus);
  if (!cases.length) return null;
  return cases[(index - 1) % cases.length];
}

/**
 * Re-derive the case's contract pair and write both sides to `dir`.
 *
 * @throws when the source contracts are not on this machine, or the mutation
 *   no longer applies — both mean the case cannot be posed, and a case that
 *   cannot be posed must not be silently graded.
 */
export function materializeCase(caseRecord, dir, { projectId = 'altitude' } = {}) {
  const codePath = join(REPO_ROOT, '.altitude', 'contracts', projectId, `${caseRecord.tag}.contract.json`);
  const canvasPath = join(REPO_ROOT, '.altitude', 'figma-sync',
    ...(projectId === 'altitude' ? [] : [projectId]), 'canvas-contracts', `${caseRecord.tag}.canvas.json`);

  if (!existsSync(codePath)) {
    throw new Error(`case ${caseRecord.id}: no code contract at ${codePath}`);
  }
  if (!existsSync(canvasPath)) {
    throw new Error(
      `case ${caseRecord.id}: no canvas contract at ${canvasPath}. Canvas contracts are gitignored live ` +
      'observations and are absent on a clone — run `pnpm run contracts:canvas` against a live Figma ' +
      'connection before running Task D.',
    );
  }

  const pair = { codeContract: read(codePath), canvasContract: read(canvasPath) };
  const applied = caseRecord.mutation === 'none'
    ? { pair, target: {} }
    : applyMutation(caseRecord.mutation, pair);

  if (!applied) {
    throw new Error(`case ${caseRecord.id}: mutation "${caseRecord.mutation}" no longer applies to ${caseRecord.tag} — rebuild the corpus (pnpm run evals:drift-cases -- --write).`);
  }

  mkdirSync(dir, { recursive: true });
  const codeOut = join(dir, `reconcile-${caseRecord.id}-code.json`);
  const canvasOut = join(dir, `reconcile-${caseRecord.id}-canvas.json`);
  writeFileSync(codeOut, `${JSON.stringify(applied.pair.codeContract, null, 2)}\n`, 'utf8');
  writeFileSync(canvasOut, `${JSON.stringify(applied.pair.canvasContract, null, 2)}\n`, 'utf8');
  return { codePath: codeOut, canvasPath: canvasOut };
}
