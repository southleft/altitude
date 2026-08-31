#!/usr/bin/env node
/**
 * Self-test for scripts/ai-readiness/lib/trajectory.mjs — the transcript half
 * of the eval (T11, spec 2026-08-29-parity-judgement-gates-and-evals).
 *
 * The distinction being tested is the one Anthropic's agent-eval guidance
 * makes: a transcript can END with a confident claim while the environment
 * says otherwise. An agent can report a clean reconciliation and stamp
 * `in-sync` having verified nothing.
 *
 * The property that matters most here is what does NOT fail:
 *   - An agent that never stamped cannot have stamped unverified. That is
 *     `not-applicable`, not a failure — scoring it as one would punish the
 *     agent that correctly stopped, which is the exact behaviour the parity
 *     prompt asks for on a `conflict`.
 *   - Only two checks are order-sensitive, and both are cases where the order
 *     IS the substance. Grading a rigid tool sequence punishes valid
 *     alternative paths, which the same guidance warns against explicitly.
 *
 * Run: node scripts/__tests__/trajectory.test.mjs
 */
import { assertReconciliationTrajectory, STEP } from '../ai-readiness/lib/trajectory.mjs';
import { extractToolCallsFromStreamJson } from '../ai-readiness/lib/treatment.mjs';

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

const stepOf = (result, id) => result.steps.find((s) => s.id === id);
const run = (commands) => assertReconciliationTrajectory({ commands });

console.log('== trajectory assertions self-test ==');

console.log('\n1. The failure this exists to catch: stamping without verifying');
{
  const r = run(['node scripts/figma-parity/mark-synced.mjs al-button']);
  assert('stamping with no prior verification FAILS', stepOf(r, 'verify-before-stamp').status === STEP.FAIL);
  assert('  ...and the detail names what was missing', /no preceding check-parity or verify-figma/.test(stepOf(r, 'verify-before-stamp').detail));

  const ok = run(['node scripts/figma-atoms/check-parity.mjs al-button', 'pnpm run parity:synced al-button']);
  assert('verifying first passes', stepOf(ok, 'verify-before-stamp').status === STEP.PASS);

  const backwards = run(['pnpm run parity:synced al-button', 'node scripts/figma-atoms/check-parity.mjs al-button']);
  assert('verifying AFTER the stamp still fails — order is the substance here',
    stepOf(backwards, 'verify-before-stamp').status === STEP.FAIL);

  const viaVerifyFigma = run(['node scripts/contracts/verify-figma.mjs --section hero', 'pnpm run parity:synced al-hero']);
  assert('either verifier satisfies it — the check is not tied to one tool',
    stepOf(viaVerifyFigma, 'verify-before-stamp').status === STEP.PASS);
}

console.log('\n2. Never stamping is NOT a failure');
{
  const r = run(['node scripts/contracts/diff-contracts.mjs al-button']);
  assert('an agent that never stamped gets not-applicable, not fail',
    stepOf(r, 'verify-before-stamp').status === STEP.NA);
  assert('  ...and says why', /never stamped/.test(stepOf(r, 'verify-before-stamp').detail));
  assert('a run with no commands at all fails nothing', run([]).failed === 0);
}

console.log('\n3. Refresh before acting — "the one everybody skips"');
{
  const skipped = run(['node scripts/figma-atoms/check-parity.mjs al-button']);
  assert('acting on the Figma side without refreshing fails',
    stepOf(skipped, 'refresh-before-acting').status === STEP.FAIL);
  assert('  ...and cites the skill', /everybody skips/.test(stepOf(skipped, 'refresh-before-acting').detail));

  const proper = run(['pnpm run parity:refresh', 'node scripts/figma-atoms/check-parity.mjs al-button']);
  assert('refreshing first passes', stepOf(proper, 'refresh-before-acting').status === STEP.PASS);

  const late = run(['node scripts/figma-atoms/check-parity.mjs al-button', 'pnpm run parity:refresh']);
  assert('refreshing afterwards does not count — the plan was already built on stale data',
    stepOf(late, 'refresh-before-acting').status === STEP.FAIL);

  const untouched = run(['cat libs/al-web-components/components/button/button.ts']);
  assert('never touching the Figma side is not-applicable',
    stepOf(untouched, 'refresh-before-acting').status === STEP.NA);
}

console.log('\n4. Repair, not regenerate');
{
  assert('no rebuild command passes', stepOf(run(['echo hi']), 'repair-not-regenerate').status === STEP.PASS);
  for (const cmd of [
    'node scripts/figma-atoms/build-page.mjs al-button',
    'node scripts/figma-atoms/delete-page.mjs al-button',
    'node scripts/contracts/generate-figma.mjs --component al-button',
  ]) {
    const r = run([cmd]);
    assert(`a rebuild is caught: ${cmd.split(' ')[1].split('/').pop()}`, stepOf(r, 'repair-not-regenerate').status === STEP.FAIL);
    assert('  ...and the detail explains the cost, not just the fact',
      /mints new node ids/.test(stepOf(r, 'repair-not-regenerate').detail));
  }
  assert('this check is NOT order-sensitive — a rebuild anywhere in the run is a rebuild',
    stepOf(run(['pnpm run parity:refresh', 'node scripts/figma-atoms/build-page.mjs x']), 'repair-not-regenerate').status === STEP.FAIL);
}

console.log('\n5. Incidental mentions — and the documented blind spot');
{
  const r = run(['grep -rn "mark-synced" .altitude/']);
  assert('a bare mention of the alias does not count as stamping',
    stepOf(r, 'verify-before-stamp').status === STEP.NA);

  // Pinned deliberately: this is substring matching on a shell string, not
  // shell parsing, so grepping for the FILENAME does read as a stamp. The
  // module documents the limit. Asserting the REAL behaviour keeps this test
  // honest — a test asserting the behaviour we wish we had would be the lie.
  const blindSpot = run(['grep -rn "mark-synced.mjs" .altitude/']);
  assert('KNOWN LIMIT: grepping for the filename is misread as running it — documented, not fixed',
    stepOf(blindSpot, 'verify-before-stamp').status === STEP.FAIL);
}

console.log('\n6. Rollup');
{
  const clean = run(['pnpm run parity:refresh', 'node scripts/figma-atoms/check-parity.mjs al-button', 'pnpm run parity:synced al-button']);
  assert('a correct trajectory fails nothing', clean.failed === 0);
  assert('  ...and passes every applicable step', clean.passed === clean.steps.length - clean.notApplicable);
  const bad = run(['node scripts/figma-atoms/build-page.mjs x', 'pnpm run parity:synced x']);
  assert('a bad one reports multiple failures', bad.failed >= 2);
  assert('every step carries an id, a status and a detail',
    clean.steps.every((s) => s.id && s.status && typeof s.detail === 'string' && s.detail.length > 10));
}

console.log('\n7. The transcript parser really yields the commands');
{
  const transcript = [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'pnpm run parity:refresh' } }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'mcp__altitude__altitude_check_parity', input: {} }] } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'pnpm run parity:synced al-button' } }] } }),
  ].join('\n');
  const parsed = extractToolCallsFromStreamJson(transcript);
  assert('Bash commands are extracted in order', parsed.commands.length === 2 && /refresh/.test(parsed.commands[0]));
  assert('the existing keys still work — this was an additive change',
    parsed.mcpToolCalls.length === 1 && parsed.allToolCalls.length === 3);
  const r = assertReconciliationTrajectory(parsed);
  assert('and the trajectory reads correctly off a real transcript shape',
    stepOf(r, 'refresh-before-acting').status === STEP.PASS && stepOf(r, 'verify-before-stamp').status === STEP.FAIL);
  assert('empty input does not throw', extractToolCallsFromStreamJson('').commands.length === 0);
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
