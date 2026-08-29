#!/usr/bin/env node
/**
 * build-drift-cases.mjs — build the reconciliation eval corpus and its answer
 * key from the repo's own tracked contracts.
 *
 *   node scripts/ai-readiness/build-drift-cases.mjs [--project <id>] [--write] [--check]
 *
 * T5, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * For every component that has BOTH a code contract
 * (.altitude/contracts/<project>/<tag>.contract.json) and an extracted canvas
 * contract, apply each applicable named mutation from lib/drift-mutations.mjs
 * and record what `diffContracts()` says the disagreements are. That is the
 * answer key: deterministic, machine-checkable, and free — no human labelling
 * and no LLM anywhere in the grading path.
 *
 * WHAT IS TRACKED IS THE MANIFEST, NOT THE MUTATED CONTRACTS. A case is
 * `{tag, mutation, expected[]}`. Because every mutation is deterministic, the
 * harness re-derives the mutated pair at run time from the tracked contracts
 * plus the mutation id. Materializing ~200 mutated contract files would be
 * repo weight that can silently drift from the sources it was derived from;
 * this cannot.
 *
 * `--check` re-derives and byte-compares against the tracked file, so the
 * corpus has a drift gate like every other generated artifact here.
 *
 * A mutation that produces NO disagreements is reported as a defect and fails
 * the run. It means either the mutation is a no-op on that component or the
 * differ is blind to that dimension — and a case whose answer key is empty
 * would silently grade every agent as perfect.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { argOf, hasFlag } from '../lib/argv.mjs';
import { MUTATIONS, applyMutation } from './lib/drift-mutations.mjs';
import { resolveProject } from '../../libs/altitude-mcp/src/lib/ds-project.mjs';
import { diffContracts } from '../../libs/altitude-mcp/src/lib/contract-diff.mjs';
import { REPO_ROOT } from '../../libs/altitude-mcp/src/lib/paths.mjs';

const project = resolveProject(argOf('--project'));
const WRITE = hasFlag('--write');
const CHECK = hasFlag('--check');

const codeDir = join(REPO_ROOT, '.altitude', 'contracts', project.id);
const canvasDir = join(project.resolved.figmaSyncDir, 'canvas-contracts');
const outPath = join(REPO_ROOT, '.altitude', 'ai-readiness', `drift-cases.${project.id}.json`);

if (!existsSync(codeDir)) {
  console.error(`[drift-cases] no code contracts at ${codeDir}`);
  process.exit(1);
}
if (!existsSync(canvasDir)) {
  console.error(`[drift-cases] no canvas contracts at ${canvasDir} — run: pnpm run contracts:canvas`);
  process.exit(1);
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

// `<tag>.canvas.json` only. A name with more dots (`al-button.pilot.canvas.json`)
// is a throwaway extraction experiment, not the tracked view of a component.
const tags = readdirSync(canvasDir)
  .filter((f) => f.endsWith('.canvas.json') && f.split('.').length === 3)
  .map((f) => f.replace('.canvas.json', ''))
  .filter((tag) => existsSync(join(codeDir, `${tag}.contract.json`)))
  .sort();

const cases = [];
const defects = [];

for (const tag of tags) {
  const pair = {
    codeContract: readJson(join(codeDir, `${tag}.contract.json`)),
    canvasContract: readJson(join(canvasDir, `${tag}.canvas.json`)),
  };

  // The UNMUTATED baseline.
  //
  // MEASURED, NOT ASSUMED: the real tracked pairs are NOT clean. 33 of 35
  // components already disagree, 448 property-level disagreements in total
  // (prop 222, token-binding 146, state 38, variant-axis 30, slot 8,
  // variant-value 4). An earlier draft of this generator subtracted the
  // baseline and asked only "what did the mutation add" — which reported 140
  // of 163 mutations as no-ops, because on a pair that already disagrees
  // everywhere, removing one variant value adds nothing new.
  //
  // So `expected` is the FULL disagreement set of the pair as handed to the
  // agent. That is also the honest task: "report everything that disagrees",
  // not "spot the needle we hid". `injected` records the needle separately so
  // a grader can score both overall precision/recall AND whether the specific
  // planted defect was found.
  const baseline = diffContracts(pair);
  const keyOf = (d) => `${d.dimension}|${d.key}|${d.kind}`;
  const baselineKeys = new Set(baseline.disagreements.map(keyOf));
  const slim = (d) => ({ dimension: d.dimension, key: d.key, kind: d.kind });

  for (const mutation of MUTATIONS) {
    const applied = applyMutation(mutation.id, pair);
    if (!applied) continue;

    const diff = diffContracts(applied.pair);
    const mutatedKeys = new Set(diff.disagreements.map(keyOf));
    const injected = diff.disagreements.filter((d) => !baselineKeys.has(keyOf(d))).map(slim);
    const resolved = baseline.disagreements.filter((d) => !mutatedKeys.has(keyOf(d))).map(slim);

    if (mutation.id === 'none') {
      cases.push({
        id: `${tag}.none`,
        tag,
        mutation: 'none',
        side: 'none',
        describe: `${mutation.describe({})} beyond whatever the tracked pair already disagrees about`,
        injected: [],
        expected: baseline.disagreements.map(slim),
      });
      continue;
    }

    // Neither added nor removed a disagreement: the differ cannot see this
    // mutation on this component. Excluded and NAMED — a case whose answer key
    // is indistinguishable from its baseline grades every agent identically.
    if (injected.length === 0 && resolved.length === 0) {
      // Be precise about WHY. There are two different reasons, and conflating
      // them would have had this file claiming the differ was blind when it
      // was not. If the full disagreement objects changed but their
      // {dimension, key, kind} triples did not, the differ SAW the mutation —
      // the answer key just is not granular enough to separate it, because
      // this component's axis already disagrees and the mutation only moved
      // the values inside an existing value-mismatch.
      const detailChanged = JSON.stringify(diff.disagreements) !== JSON.stringify(baseline.disagreements);
      defects.push({
        tag,
        mutation: mutation.id,
        why: detailChanged
          ? 'the differ saw the mutation but only the disagreement DETAIL changed — this key already disagrees, and the answer key is keyed by {dimension, key, kind}, so the case is not separable at that granularity'
          : 'the differ reports identical disagreements with and without this mutation — nothing distinguishes the case',
      });
      continue;
    }

    cases.push({
      id: `${tag}.${mutation.id}`,
      tag,
      mutation: mutation.id,
      side: mutation.side,
      describe: mutation.describe(applied.target),
      target: applied.target,
      injected,
      ...(resolved.length ? { resolved } : {}),
      expected: diff.disagreements.map(slim),
    });
  }
}

const corpus = {
  schemaVersion: 1,
  project: project.id,
  // No timestamp: this file must be byte-identical across runs so --check is a
  // real drift gate. A generated-at field would make every run a diff.
  components: tags.length,
  cases: cases.sort((a, b) => a.id.localeCompare(b.id)),
  defects: defects.sort((a, b) => `${a.tag}.${a.mutation}`.localeCompare(`${b.tag}.${b.mutation}`)),
};

const serialized = `${JSON.stringify(corpus, null, 2)}\n`;

if (CHECK) {
  if (!existsSync(outPath)) {
    console.error(`[drift-cases] ${outPath} does not exist — run with --write.`);
    process.exit(1);
  }
  const onDisk = readFileSync(outPath, 'utf8');
  if (onDisk !== serialized) {
    console.error(`[drift-cases] DRIFT — ${outPath} is not what the current contracts + mutations produce.`);
    console.error('Re-run with --write and commit the result.');
    process.exit(1);
  }
  console.log(`[drift-cases] ok — ${cases.length} case(s) across ${tags.length} component(s), matches disk.`);
  process.exit(0);
}

const withNeedle = cases.filter((c) => (c.injected ?? []).length > 0);
console.log(`[drift-cases] ${tags.length} component(s) with both contracts`);
console.log(`[drift-cases] ${cases.length} case(s): ${withNeedle.length} carry an injected defect, ${cases.length - withNeedle.length} are the components as they really are`);
const byMutation = new Map();
for (const c of cases) byMutation.set(c.mutation, (byMutation.get(c.mutation) ?? 0) + 1);
for (const [m, n] of [...byMutation].sort()) console.log(`  ${String(n).padStart(3)}  ${m}`);
console.log(`[drift-cases] ${corpus.cases.reduce((n, c) => n + c.expected.length, 0)} expected disagreement(s) in total, ${corpus.cases.reduce((n, c) => n + (c.injected ?? []).length, 0)} of them injected`);

if (defects.length) {
  console.log(`\n[drift-cases] ${defects.length} mutation(s) produced no disagreement and were EXCLUDED:`);
  for (const d of defects.slice(0, 20)) console.log(`  ${d.tag} / ${d.mutation}`);
  if (defects.length > 20) console.log(`  ... ${defects.length - 20} more`);
}

if (WRITE) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, serialized, 'utf8');
  console.log(`\n[drift-cases] wrote ${outPath}`);
} else {
  console.log('\n[drift-cases] dry run — pass --write to update the tracked corpus.');
}
