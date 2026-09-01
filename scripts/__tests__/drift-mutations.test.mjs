#!/usr/bin/env node
/**
 * Self-test for scripts/ai-readiness/lib/drift-mutations.mjs and the corpus
 * it produces (T5, spec 2026-08-29-parity-judgement-gates-and-evals).
 *
 * TWO TIERS, ON PURPOSE. Canvas contracts are GITIGNORED (.gitignore:122,
 * `.altitude/figma-sync/*` + `/*`) — they are live observations, not source, so
 * they do not survive a clone and are absent in CI. The MUTATION sections need
 * a real contract pair and degrade to a named skip without one; the CORPUS
 * section needs only the tracked answer-key file and therefore always runs.
 * Skipping the whole file would let it exit 0 having asserted nothing, which
 * is the silent pass this repo treats as the one forbidden failure.
 *
 * Two assertions encode bugs that were real during T5 and would silently
 * hollow out the eval if they came back:
 *   1. `rename-axis` renaming only HALF the pair (the axis but not the matching
 *      component property), because the axis object it held was a reference
 *      into the contract it was editing. The mutation produced no diff at all,
 *      and reported its target as `{from: "X Renamed", to: "X Renamed"}`.
 *   2. Mutations targeting the `State` axis, which `contract-diff.mjs`
 *      deliberately compares through a different dimension — so the mutation
 *      was invisible and looked like a differ blind spot when the differ was
 *      right and the mutation was pointed at the wrong thing.
 *
 * Run: node scripts/__tests__/drift-mutations.test.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MUTATIONS, MUTATION_IDS, applyMutation, mutationById } from '../ai-readiness/lib/drift-mutations.mjs';
import { diffContracts } from '../../libs/altitude-mcp/src/lib/contract-diff.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const PAIR_TAG = 'al-button';
const codePath = join(ROOT, '.altitude/contracts/altitude', `${PAIR_TAG}.contract.json`);
const canvasPath = join(ROOT, '.altitude/figma-sync/canvas-contracts', `${PAIR_TAG}.canvas.json`);
const corpusPath = join(ROOT, '.altitude/ai-readiness/drift-cases.altitude.json');

console.log('== drift-mutations self-test ==');

// ── tier 1: the tracked corpus. Always runs, clone or not. ────────────────
console.log('\n1. The tracked corpus holds its invariants');
if (!existsSync(corpusPath)) {
  assert('the corpus exists (run: pnpm run evals:drift-cases -- --write)', false);
} else {
  const corpus = read(corpusPath);
  assert('every case has a stable id', corpus.cases.every((c) => typeof c.id === 'string' && c.id.includes('.')));
  assert('case ids are unique', new Set(corpus.cases.map((c) => c.id)).size === corpus.cases.length);
  assert('cases are sorted, so a rebuild produces a reviewable diff',
    corpus.cases.map((c) => c.id).join() === corpus.cases.map((c) => c.id).slice().sort((a, b) => a.localeCompare(b)).join());
  assert('no timestamp — a generated-at field would make every run a diff and --check useless',
    !JSON.stringify(corpus).includes('generatedAt'));
  assert('every mutated case carries at least one injected or resolved disagreement',
    corpus.cases.filter((c) => c.mutation !== 'none').every((c) => (c.injected?.length ?? 0) + (c.resolved?.length ?? 0) > 0));
  assert('there are clean (unmutated) cases too — the balanced half of the set',
    corpus.cases.some((c) => c.mutation === 'none'));
  assert('excluded mutations are recorded with a reason rather than dropped silently',
    Array.isArray(corpus.defects) && corpus.defects.every((d) => typeof d.why === 'string' && d.why.length > 30));
}

// ── tier 2: the mutations themselves. Needs a live-extracted canvas pair. ──
const havePair = existsSync(codePath) && existsSync(canvasPath);
if (!havePair) {
  console.log(`\n  (sections 2-6 skipped: no ${PAIR_TAG} canvas contract on disk. Canvas`);
  console.log('   contracts are gitignored observations — run `pnpm run contracts:canvas`');
  console.log('   against a live Figma connection to exercise them.)');
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  process.exit(FAIL === 0 ? 0 : 1);
}

const pair = { codeContract: read(codePath), canvasContract: read(canvasPath) };

console.log('\n2. Mutations never touch their input');
{
  const before = JSON.stringify(pair);
  for (const id of MUTATION_IDS) applyMutation(id, pair);
  assert('the input pair is byte-identical after every mutation ran', JSON.stringify(pair) === before);
}

console.log('\n3. Determinism — the corpus is only meaningful if this holds');
{
  for (const id of MUTATION_IDS) {
    const a = applyMutation(id, pair);
    if (!a) continue;
    const b = applyMutation(id, pair);
    assert(`${id} produces byte-identical output twice`, JSON.stringify(a) === JSON.stringify(b));
  }
}

console.log('\n4. rename-axis renames BOTH halves of the pair');
{
  const applied = applyMutation('rename-axis', pair);
  assert('it applies to al-button', !!applied);
  assert('the target names a real rename, not X -> X', applied.target.from !== applied.target.to);
  const axes = applied.pair.canvasContract.variantAxes.map((a) => a.name);
  const props = applied.pair.canvasContract.componentProperties.map((p) => p.name);
  assert('the variant axis was renamed', axes.includes(applied.target.to) && !axes.includes(applied.target.from));
  assert('the matching component property was renamed too — half a rename is invisible to the differ',
    props.includes(applied.target.to) && !props.includes(applied.target.from));
  assert('and it actually moves the differ',
    diffContracts(applied.pair).disagreements.length !== diffContracts(pair).disagreements.length);
}

console.log('\n5. No mutation targets the State axis');
{
  for (const id of ['drop-variant-value', 'add-variant-value', 'rename-axis']) {
    const applied = applyMutation(id, pair);
    if (!applied) continue;
    assert(`${id} did not target State`, !/"(axis|from)":\s*"State"/.test(JSON.stringify(applied.target)));
  }
}

console.log('\n6. retoken mutates what the differ actually reads');
{
  const applied = applyMutation('retoken', pair);
  assert('it applies to al-button', !!applied);
  // Both surfaces, deliberately. The differ WALKS anatomy boundVariables and
  // falls back to the flat `tokens` list, so a mutation that moves only one of
  // them goes invisible the moment the differ prefers the other — which is
  // exactly how this test caught the nested-instance delegation landing.
  assert('the flat tokens list changed',
    JSON.stringify(applied.pair.canvasContract.tokens) !== JSON.stringify(pair.canvasContract.tokens));
  assert('and anatomy.boundVariables changed too — the surface the differ actually walks',
    JSON.stringify(applied.pair.canvasContract.anatomy) !== JSON.stringify(pair.canvasContract.anatomy));
  const baseKeys = new Set(diffContracts(pair).disagreements.map((d) => `${d.dimension}|${d.key}|${d.kind}`));
  const injected = diffContracts(applied.pair).disagreements.filter((d) => !baseKeys.has(`${d.dimension}|${d.key}|${d.kind}`));
  assert('and it injects a token-binding disagreement', injected.some((d) => d.dimension === 'token-binding'));
}

console.log('\n7. `none` is a real case, not an oversight');
{
  assert('the mutation set includes it', !!mutationById('none'));
  assert('it changes nothing', JSON.stringify(applyMutation('none', pair).pair) === JSON.stringify(pair));
  assert('exactly one no-op mutation exists — an eval that only asks "find the drift" measures an agent that always finds drift',
    MUTATIONS.filter((m) => m.side === 'none').length === 1);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
