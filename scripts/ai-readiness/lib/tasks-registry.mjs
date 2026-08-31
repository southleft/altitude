// Single source of truth for "which prompt/schema file does taskId X use".
//
// DEFECT FIXED (wave-1 survey, run-judge.mjs:174): the judge used to
// reconstruct the prompt filename from the taskId by splitting on '-' and
// taking the first two segments — `taskId.split('-')[0] + '-' +
// taskId.split('-')[1] + '.md'`. That happens to work for 'A-composition'
// ('A' + '-' + 'composition' -> 'A-composition.md') but silently reads the
// WRONG FILE (or throws ENOENT) for any taskId whose id has a different
// shape — e.g. this wave's 'G-llms-docs' would resolve to 'G-llms.md',
// which does not exist. Both run-probe.mjs and run-judge.mjs now import
// this one map instead of each deriving the filename their own way.
//
// grader: the deterministic-grader entry point for this task (R4), or null
// if the task has no deterministic grading defined (see lib/grader.mjs).
// expectedMcpTools: MCP tool names (server-qualified, e.g.
// 'mcp__altitude__altitude_get_tokens') a competent agent would plausibly
// call for this task WHEN the mcp-on treatment is active — used only for
// the R5 process assertion, never to infer tool use from output text.

export const TASKS = {
  A: {
    id: 'A-composition',
    schema: 'composition.schema.json',
    prompt: 'A-composition.md',
    grader: 'gradeTaskA',
    expectedMcpTools: ['mcp__altitude__altitude_list_components', 'mcp__altitude__altitude_get_component', 'mcp__altitude__altitude_validate'],
    axeRenderable: true,
  },
  B: {
    id: 'B-scaffold',
    schema: 'scaffold.schema.json',
    prompt: 'B-scaffold.md',
    grader: 'gradeTaskB',
    expectedMcpTools: ['mcp__altitude__altitude_get_tokens', 'mcp__altitude__altitude_list_components'],
    axeRenderable: false,
  },
  C: {
    id: 'C-violation',
    schema: 'violation.schema.json',
    prompt: 'C-violation.md',
    grader: 'gradeTaskC',
    expectedMcpTools: ['mcp__altitude__altitude_get_component', 'mcp__altitude__altitude_validate'],
    axeRenderable: false,
  },
  // T6, spec 2026-08-29-parity-judgement-gates-and-evals. The PRODUCER lane:
  // A/B/C/G all measure whether an outside consumer can build with Altitude's
  // published docs; D measures whether OUR OWN reconciliation agent can read a
  // component's two contracts and correctly say what disagrees.
  //
  // `cases: 'drift'` is what makes it different from every task above: instead
  // of one fixed prompt, each attempt is posed from one case in the tracked
  // drift corpus (.altitude/ai-readiness/drift-cases.<project>.json), and the
  // grader is handed that case's computed answer key. See
  // lib/reconcile-cases.mjs.
  D: {
    id: 'D-reconcile',
    schema: 'reconcile.schema.json',
    prompt: 'D-reconcile.md',
    grader: 'gradeTaskD',
    expectedMcpTools: ['mcp__altitude__altitude_check_parity', 'mcp__altitude__altitude_get_component'],
    axeRenderable: false,
    cases: 'drift',
  },
  // T7. The DIRECTION-POLICY eval: given one disagreement, which side is the
  // source of truth? Unlike D, no differ can compute the answer — "who wins"
  // is policy, so the answer key IS the policy, hand-authored in
  // fixtures/direction-cases.json with each case citing the rule it tests.
  E: {
    id: 'E-direction',
    schema: 'direction.schema.json',
    prompt: 'E-direction.md',
    grader: 'gradeTaskE',
    expectedMcpTools: [],
    axeRenderable: false,
    cases: 'direction',
  },
  // T8. The CURATION eval. Deliberately a REVIEW task, not a generation task:
  // the curated `anatomyCase` values are MEASURED CASE NAMES from a gitignored
  // artifact, not code prop values (al-badge's curation is
  // `Variant=default,Shape=label` while its contract declares
  // `variant: [danger, info, success, warning]` and no Shape prop at all), so
  // "produce the curation" cannot be posed fairly from tracked data. "Is this
  // curation right?" can. See lib/curation-cases.mjs.
  F: {
    id: 'F-curation',
    schema: 'curation.schema.json',
    prompt: 'F-curation.md',
    grader: 'gradeTaskF',
    expectedMcpTools: ['mcp__altitude__altitude_get_component'],
    axeRenderable: false,
    cases: 'curation',
  },
  G: {
    id: 'G-llms-docs',
    schema: 'llms-docs.schema.json',
    prompt: 'G-llms-docs.md',
    grader: null,
    expectedMcpTools: [],
    axeRenderable: false,
  },
};

// taskId ('A-composition') -> the TASKS entry, for consumers (run-judge.mjs)
// that only have the id string, not the short key.
export function taskById(taskId) {
  return Object.values(TASKS).find((t) => t.id === taskId) || null;
}
