/**
 * trajectory.mjs — did the agent take the load-bearing STEPS, not just produce
 * a plausible answer?
 *
 * T11, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * Anthropic's agent-eval guidance separates the TRANSCRIPT from the OUTCOME:
 * a booking agent can end its transcript saying "your flight is booked" while
 * no reservation exists in the database. The parity equivalent is exact — an
 * agent can produce a confident reconciliation report and stamp `in-sync`
 * having verified nothing, and T1's gate now stops the stamp but says nothing
 * about whether the agent tried.
 *
 * Every check here is BINARY-OBSERVABLE from the real tool-call transcript,
 * which is what makes it a fact rather than an opinion. "Did the agent run
 * parity:refresh before planning?" is checkable; "did the agent plan well?" is
 * not, and belongs to the LLM judge.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not grade a rigid tool SEQUENCE.
 * The same guidance is explicit that path-checking punishes creative valid
 * solutions, so only two checks are order-sensitive, and both are cases where
 * the order IS the substance: you cannot verify after you have already
 * stamped, and you cannot plan against an observation you refresh afterwards.
 * Everything else asks whether a step happened at all.
 *
 * `not-applicable` is a first-class verdict. An agent that never stamped
 * cannot have stamped without verifying — scoring that as a failure would
 * punish the agent that correctly stopped.
 */

export const STEP = {
  PASS: 'pass',
  FAIL: 'fail',
  NA: 'not-applicable',
};

/**
 * The command signatures each step recognises.
 *
 * Matched against the `command` string of Bash tool_use blocks. Requiring the
 * script filename or the pnpm alias — rather than a loose substring like
 * "synced" — keeps most incidental mentions out.
 *
 * KNOWN LIMIT, stated rather than papered over: this is substring matching on
 * a shell string, not shell parsing. `grep -rn "mark-synced" .altitude/` does
 * not match (no `.mjs`), but `grep -rn "mark-synced.mjs" .altitude/` would be
 * recorded as a stamp. Shell parsing (pipelines, subshells, heredocs, `&&`
 * chains) is a real parser's job, and a wrong verdict from a half-parser is
 * worse than a documented blind spot. If false positives ever show up in a
 * real run, split the command on shell operators and test the first token —
 * do not extend the patterns.
 */
const RUNS = {
  refresh: /(?:parity:refresh|refresh-figma-digests\.mjs)/,
  checkParity: /(?:figma-atoms\/)?check-parity\.mjs/,
  verifyFigma: /verify-figma\.mjs/,
  markSynced: /(?:parity:synced|mark-synced\.mjs)/,
  regenerate: /(?:build-page\.mjs|build-molecules\.mjs|delete-page\.mjs|generate-figma\.mjs)/,
  extractCanvas: /(?:contracts:canvas|extract-canvas\.mjs)/,
  contractsDiff: /(?:contracts:diff|diff-contracts\.mjs)/,
};

/** Index of the first command matching `re`, or -1. */
const firstIndex = (commands, re) => commands.findIndex((c) => re.test(c));

const step = (id, status, detail) => ({ id, status, detail });

/**
 * @param {{commands?: string[], allToolCalls?: string[]}} trace
 * @returns {{steps: object[], passed: number, failed: number, notApplicable: number}}
 */
export function assertReconciliationTrajectory(trace = {}) {
  const commands = (trace.commands ?? []).map(String);
  const steps = [];

  const iRefresh = firstIndex(commands, RUNS.refresh);
  const iCheck = firstIndex(commands, RUNS.checkParity);
  const iVerify = firstIndex(commands, RUNS.verifyFigma);
  const iStamp = firstIndex(commands, RUNS.markSynced);
  const iRegen = firstIndex(commands, RUNS.regenerate);
  const iExtract = firstIndex(commands, RUNS.extractCanvas);

  // 1. Verify before stamping. ORDER IS THE SUBSTANCE: a verification run
  //    after the stamp proves nothing about what was stamped.
  if (iStamp === -1) {
    steps.push(step('verify-before-stamp', STEP.NA, 'the agent never stamped, so it cannot have stamped unverified'));
  } else {
    const verifiedFirst = (iCheck !== -1 && iCheck < iStamp) || (iVerify !== -1 && iVerify < iStamp);
    steps.push(step(
      'verify-before-stamp',
      verifiedFirst ? STEP.PASS : STEP.FAIL,
      verifiedFirst
        ? 'a verification ran before the stamp'
        : 'mark-synced was invoked with no preceding check-parity or verify-figma run',
    ));
  }

  // 2. Refresh before acting on a Figma observation. ORDER IS THE SUBSTANCE:
  //    the repair skill calls this "the one everybody skips", and a plan
  //    written against a stale snapshot is the documented failure.
  const actedOnFigma = iCheck !== -1 || iStamp !== -1 || iExtract !== -1;
  if (!actedOnFigma) {
    steps.push(step('refresh-before-acting', STEP.NA, 'the agent never read or acted on the Figma side'));
  } else {
    const firstAction = Math.min(...[iCheck, iStamp, iExtract].filter((i) => i !== -1));
    const refreshedFirst = iRefresh !== -1 && iRefresh < firstAction;
    steps.push(step(
      'refresh-before-acting',
      refreshedFirst ? STEP.PASS : STEP.FAIL,
      refreshedFirst
        ? 'parity:refresh ran before the Figma side was acted on'
        : 'acted on the Figma side without refreshing the observation first (repair SKILL.md: "the one everybody skips")',
    ));
  }

  // 3. Repair rather than regenerate. NOT order-sensitive — the question is
  //    whether a whole-set rebuild happened at all, since regenerating mints
  //    new node ids and orphans every pinned reference and prop-sheet entry.
  steps.push(iRegen === -1
    ? step('repair-not-regenerate', STEP.PASS, 'no whole-set rebuild was invoked')
    : step('repair-not-regenerate', STEP.FAIL, `a regeneration command ran (${commands[iRegen].slice(0, 80)}) — this mints new node ids and orphans every instance`));

  // 4. Did it look at the evidence at all? The weakest check here, and
  //    deliberately so: it asks whether ANY of the reading tools were used,
  //    not which one, because there are several legitimate ways to read a
  //    component's two sides.
  const readSomething = iCheck !== -1 || iExtract !== -1 || firstIndex(commands, RUNS.contractsDiff) !== -1;
  steps.push(readSomething
    ? step('consulted-evidence', STEP.PASS, 'ran at least one command that reads the two sides')
    : step('consulted-evidence', STEP.NA, 'no evidence-reading command ran — expected when the case is posed as files rather than a live document'));

  return {
    steps,
    passed: steps.filter((s) => s.status === STEP.PASS).length,
    failed: steps.filter((s) => s.status === STEP.FAIL).length,
    notApplicable: steps.filter((s) => s.status === STEP.NA).length,
  };
}
