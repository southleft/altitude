#!/usr/bin/env node
/**
 * check-vision-calibration.mjs — may a vision judge be used to screen visual
 * fidelity yet?
 *
 *   node scripts/ai-readiness/check-vision-calibration.mjs [--json] [--certify]
 *
 * T10, spec 2026-08-29-parity-judgement-gates-and-evals (R6).
 *
 * THE RULE THIS ENFORCES. Numbers gate; a model screens only what the
 * comparator cannot express, and only once it has been shown to agree with
 * known answers. This repo learned that the expensive way — the snippet
 * skill's trap 9 records chips that "looked right" red at thumbnail scale
 * while the measured facts were correct and the eyeball was wrong. A vision
 * model is another eyeball until somebody proves otherwise, and "it seemed to
 * work on the examples I tried" is not that proof.
 *
 * So this is the gate that stands BEFORE any vision judge is written: it reads
 * the calibration ledger, and `--certify` exits non-zero unless the ledger has
 * enough labelled cases and the recorded agreement clears the threshold.
 *
 * IT IS CURRENTLY BLOCKED, AND THE REASON IS THE POINT. The ledger is empty
 * because the labelled cases do not exist: `.altitude/visual-compare/auto/` is
 * gitignored run output, and the one documented visual defect (al-toggle's
 * "giant square") lost its evidence when the fix regenerated the PNG in place.
 * Visual defects in this repo erase their own evidence as they are repaired,
 * so a calibration set cannot be assembled retroactively — it has to be
 * captured at the moment a defect is found. The ledger carries that procedure.
 *
 * Deliberately NOT included: the judge itself. Writing a vision-model call
 * that nobody can calibrate would be shipping the part that cannot be
 * verified and skipping the part that decides whether it may be trusted.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { hasFlag } from '../lib/argv.mjs';
import { REPO_ROOT } from '../../libs/altitude-mcp/src/lib/paths.mjs';

const LEDGER = join(REPO_ROOT, '.altitude', 'ai-readiness', 'vision-calibration.json');
const JSON_OUT = hasFlag('--json');
const CERTIFY = hasFlag('--certify');

if (!existsSync(LEDGER)) {
  console.error(`[vision] missing calibration ledger: ${LEDGER}`);
  process.exit(1);
}

const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const cases = ledger.cases ?? [];
const threshold = ledger.threshold ?? { minCases: 12, minAgreement: 0.75 };

const judged = cases.filter((c) => typeof c.judgeVerdict === 'string');
const agreed = judged.filter((c) => c.judgeVerdict === c.expectedVerdict);
const agreement = judged.length ? agreed.length / judged.length : null;

// Balance matters as much as the count. A set of twelve defective cases would
// certify a judge that says "defective" to everything — the same degenerate
// strategy Tasks E and F each have a detector for.
const defective = cases.filter((c) => c.expectedVerdict === 'defective').length;
const correct = cases.filter((c) => c.expectedVerdict === 'correct').length;
const balanced = cases.length > 0 && Math.min(defective, correct) / cases.length >= 0.3;

const blockers = [];
if (cases.length < threshold.minCases) {
  blockers.push(`only ${cases.length} labelled case(s); ${threshold.minCases} required`);
}
if (!balanced) {
  blockers.push(`the set is not balanced (${defective} defective / ${correct} correct); each must be at least 30% of the total, or a judge that answers one way every time would certify`);
}
if (agreement === null) {
  blockers.push('no case has a recorded judge verdict yet, so agreement cannot be computed');
} else if (agreement < threshold.minAgreement) {
  blockers.push(`agreement ${(agreement * 100).toFixed(0)}% is below the ${(threshold.minAgreement * 100).toFixed(0)}% threshold`);
}

const certified = blockers.length === 0;

if (JSON_OUT) {
  console.log(JSON.stringify({
    cases: cases.length, defective, correct, judged: judged.length, agreement, threshold, certified, blockers,
  }, null, 2));
} else {
  console.log(`[vision] calibration ledger: ${cases.length} case(s) (${defective} defective, ${correct} correct), ${judged.length} judged`);
  console.log(`[vision] agreement: ${agreement === null ? 'not computable' : `${(agreement * 100).toFixed(0)}%`} | threshold: ${(threshold.minAgreement * 100).toFixed(0)}% over ${threshold.minCases} cases`);
  console.log(`[vision] certified: ${certified ? 'YES — a vision judge may screen (never gate)' : 'NO'}`);
  for (const b of blockers) console.log(`  blocked: ${b}`);
  if (!cases.length && Array.isArray(ledger.why_empty)) {
    console.log('\n[vision] why the ledger is empty:');
    for (const w of ledger.why_empty) console.log(`  - ${w}`);
    console.log('\n[vision] to unblock it, follow captureProcedure in the ledger — the evidence only exists');
    console.log('         at the moment a defect is found, because fixing one regenerates the image over it.');
  }
}

// Without --certify this is a REPORT and exits 0: asking "how far off are we?"
// should not fail a build. --certify is the assertion, for whoever eventually
// wires a judge in and needs a hard answer to "am I allowed to?".
process.exit(CERTIFY && !certified ? 1 : 0);
