// Deterministic component-usage grader (R4): score = matched − missing −
// unexpected, modelled on Storybook's MCP eval grader
// (storybookjs/mcp). Pure functions, no network, no LLM call — this is
// what makes scoring NOT 100% LLM-judged: it is regression-testable against
// RECORDED fixtures for the cost of `node test/grader.test.mjs` (zero
// dollars), unlike the run-judge.mjs synthesis pass.
//
// The pinned answer keys are documented in fixtures/canonical-contracts.md
// (Task A + Task B sections) — this module only encodes them as data.
// test/grader.test.mjs asserts every tag in EXPECTED_TASK_A / EXPECTED_TASK_B
// exists in the real, committed CEM digest (.altitude/ai-readiness/cem-digest.json)
// so THIS module cannot itself drift into hallucinating a tag that doesn't
// exist — the one property the task brief specifically asked for.
//
// Task C (violation-spotting) does not compose components, so it has no
// matched/missing/unexpected shape. Instead gradeTaskC deterministically
// flags "false positives": violations whose text reports the exact
// sanctioned (doNotFlag) al-tag/al-chip dismissal pattern as if it were a
// defect. Same guarantee — pure function, no LLM, unit-tested.

// ---------------------------------------------------------------------------
// Task A — "user profile card" composition.
//
// Pulled directly from AGENTS.md's "Header row / atom cluster inside a
// slot" + "Kebab menu" + "Card with a primary action in the corner" recipes
// (AGENTS.md ~lines 437-522), which is what the task prompt
// (tasks/A-composition.md) asks the agent to reproduce: avatar + name +
// status badge header, a 3-dot kebab action menu, a body, and a primary
// "View profile" button, all inside al-card, all inside al-theme.
export const EXPECTED_TASK_A = [
  'al-theme',
  'al-card',
  'al-layout',
  'al-avatar',
  'al-heading',
  'al-badge',
  'al-popover',
  'al-button',
  'al-icon',
  'al-menu',
  'al-menu-item',
];

// Task B — al-stat-card EVAL FIXTURE (fixtures/canonical-contracts.md).
// The contract's ONLY required real-component composition is the chevron /
// optional leading icon: "Use <al-icon name="caret-up">/<al-icon
// name="caret-down">. Do NOT hand-roll a CSS triangle..." and "Slot:
// slot="icon" for an optional leading icon." Everything else in the
// contract (typography mixins, tokens, CSS parts) is not a component tag,
// so it is out of scope for a component-USAGE grader.
export const EXPECTED_TASK_B = ['al-icon'];

const AL_TAG_RE = /<(al-[a-z][a-z0-9-]*)\b/gi;

/**
 * Storybook's formula. Pure: same inputs -> same output, always.
 * @param {string[]} usedTags
 * @param {string[]} expectedTags
 */
export function gradeComponentUsage(usedTags, expectedTags) {
  const used = new Set((usedTags || []).map((t) => String(t).toLowerCase()));
  const expected = new Set((expectedTags || []).map((t) => String(t).toLowerCase()));
  const matched = [...expected].filter((t) => used.has(t)).sort();
  const missing = [...expected].filter((t) => !used.has(t)).sort();
  const unexpected = [...used].filter((t) => !expected.has(t)).sort();
  const score = matched.length - missing.length - unexpected.length;
  return { matched, missing, unexpected, score };
}

/** Task A's structured output already lists tags in `usedComponents[].tag`. */
export function extractUsedTagsFromComposition(parsed) {
  if (!parsed || !Array.isArray(parsed.usedComponents)) return [];
  return [...new Set(parsed.usedComponents.map((c) => c && c.tag).filter(Boolean))];
}

/**
 * Task B's structured output is scaffolded file contents, not a tag list —
 * scan every file's `content` for `<al-*` open-tag references (e.g. an
 * `<al-icon name="caret-up">` inside the .ts render() template).
 */
export function extractUsedTagsFromScaffold(parsed) {
  if (!parsed || !Array.isArray(parsed.files)) return [];
  const tags = new Set();
  for (const f of parsed.files) {
    const content = (f && f.content) || '';
    for (const m of content.matchAll(AL_TAG_RE)) tags.add(m[1].toLowerCase());
  }
  return [...tags];
}

export function gradeTaskA(parsed) {
  return gradeComponentUsage(extractUsedTagsFromComposition(parsed), EXPECTED_TASK_A);
}

export function gradeTaskB(parsed) {
  return gradeComponentUsage(extractUsedTagsFromScaffold(parsed), EXPECTED_TASK_B);
}

// ---------------------------------------------------------------------------
// Task C — doNotFlag false-positive detector.
//
// tasks/C-violation.md hands the agent a fixed `al-tag` snippet whose
// `handleClose()` dispatches a bare `close` CustomEvent and owns no
// `isDismissed` state. Per the CEM digest's `al-tag.doNotFlag` entry
// ('dispatch-only-handler-IS-controlled-close') AND
// fixtures/canonical-contracts.md's "Dismissal model" row, that is a
// SANCTIONED shape, not a defect. A reviewer that flags "missing
// isDismissed" / "incomplete dismissal model" anyway is a false positive —
// the same rule run-judge.mjs's LLM judge is separately asked to apply,
// but this is a second, deterministic vote that requires no LLM call and
// cannot itself hallucinate.
//
// Deliberately narrow keyword windows (not a bare /close/ match, which
// would also fire on the LEGITIMATE finding that the event should be named
// `onTagClose` with a `detailObj.value`, per the canonical contract's
// "Close event" row) — see test/grader.test.mjs for both the
// false-positive and the true-negative case.
const MISSING_ISDISMISSED_RE = /\b(missing|lacks?|no|without|does\s?n[o']?t\s+(have|own)|absent)\b[^.]{0,60}\bisdismissed\b/i;
const INCOMPLETE_DISMISSAL_RE = /\b(incomplete|partial|neither)\b[^.]{0,60}\bdismiss/i;

export function gradeTaskC(parsed) {
  const violations = (parsed && Array.isArray(parsed.violations)) ? parsed.violations : [];
  const falsePositives = violations.filter((v) => {
    const text = [v && v.what, v && v.why, v && v.fix, v && v.conventionRef].filter(Boolean).join(' ');
    return MISSING_ISDISMISSED_RE.test(text) || INCOMPLETE_DISMISSAL_RE.test(text);
  });
  return {
    falsePositiveCount: falsePositives.length,
    falsePositives: falsePositives.map((v) => v.what || '(no "what" field)'),
    // Mirrors the matched/missing/unexpected sign convention (lower is
    // better is inverted for this task — 0 false positives is the ceiling
    // score, not a floor), so callers can still treat "score" uniformly.
    score: -falsePositives.length,
  };
}

// ---------------------------------------------------------------------------
// Task D - reconciliation accuracy (T6, spec
// 2026-08-29-parity-judgement-gates-and-evals).
//
// This is the grader the whole eval half of that spec is built around, and it
// is the cheapest one here: the answer key is COMPUTED, not labelled.
// `contract-diff.mjs` already decides deterministically which props / variant
// values / states / token bindings disagree between a component's code
// contract and its canvas contract, so `build-drift-cases.mjs` can hand this
// grader an exact expected set. No human labelled it and no LLM is in the
// scoring path, which means re-grading a recorded attempt costs nothing and
// the grader is itself unit-testable.
//
// Findings are compared on the {dimension, key, kind} TRIPLE, normalised.
// Deliberately NOT on `detail`: the wording is prose and two correct agents
// will phrase the same finding differently. `key` is normalised the same way
// contract-diff.mjs normalises it, so "Icon After" and "iconAfter" are the
// same key - an agent should not lose points for reporting a name in the
// casing its own side of the pair uses.

/** Same normalisation contract-diff.mjs uses, so grading agrees with the answer key. */
const normFindingKey = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const findingId = (f) => `${String(f?.dimension ?? '').toLowerCase()}|${normFindingKey(f?.key)}|${String(f?.kind ?? '').toLowerCase()}`;

/**
 * @param {object} parsed the agent's structured output
 * @param {object} context `{ case: <corpus case> }` - carries `expected` (the
 *   full answer key) and `injected` (the defect this case planted, if any).
 */
export function gradeTaskD(parsed, context) {
  const caseRecord = context && context.case;
  if (!caseRecord) {
    // No case, no answer key. Returning a zero score here would look like a
    // measured failure; this says "not measured" instead, which is the only
    // honest thing an ungraded attempt can report.
    return { score: null, reason: 'no case attached to this attempt - nothing to grade against' };
  }

  const reported = Array.isArray(parsed?.findings) ? parsed.findings : [];
  const observed = Array.isArray(parsed?.sourceUsed) ? parsed.sourceUsed : [];

  // UNOBSERVED, not wrong. An agent that read neither contract has not
  // performed the comparison at all, and scoring that as F1 = 0 is a lie the
  // eval tells about the model: it is indistinguishable from an agent that
  // read both sides and missed every disagreement. The first real Task D run
  // hit exactly this — the cases were materialized outside the child's
  // sandbox, every attempt reported zero findings, and the summary called all
  // three `gradeable`. Named, counted and excluded, never silently zeroed;
  // `unobserved` is on the record so a run cannot quietly consist of these.
  // Deliberately NOT conditioned on the case having expected findings. A
  // clean case rewards an empty answer with 1.0, so exempting clean cases
  // would hand "always answer in-sync, never read anything" a perfect score
  // on every clean pair and a null (excluded) on every dirty one — a
  // constant strategy averaging 1.0. Not reading is not an answer either way.
  if (!reported.length && !observed.length) {
    return {
      caseId: caseRecord.id,
      mutation: caseRecord.mutation,
      unobserved: true,
      score: null,
      reason: 'agent reported no findings AND read no sources - the comparison was never performed, so there is nothing to score',
    };
  }

  const expectedIds = new Set((caseRecord.expected ?? []).map(findingId));

  // RENAMES: the differ has no rename concept. `contract-diff.mjs` sees one
  // name vanish from a side and another appear on the other, so it records a
  // rename as a PAIR — {old, missing-in-canvas} + {new, missing-in-code}, or
  // the mirror. An agent that recognises the rename and reports it as ONE
  // finding is doing the BETTER analysis, and the first baseline scored
  // exactly that as 0 true positives / 1 spurious: it named the right axis,
  // the right new name and the right winner, and the eval called it wrong
  // for not guessing the differ's internal encoding. The schema now carries
  // an optional `renamedTo`, and a finding that sets it expands to the two
  // ids it actually covers.
  //
  // The expansion is deliberately narrow. It fires ONLY when both halves are
  // in the answer key AND they carry OPPOSITE kinds (missing-in-canvas vs
  // missing-in-code) — the shape a genuine rename pair always has. Otherwise
  // "A was renamed to B" for two arbitrary keys would harvest credit for two
  // unrelated disagreements. When it does not fire, the finding is scored
  // literally, so a wrong rename claim still counts as spurious.
  const expandFinding = (f) => {
    const literal = findingId(f);
    const other = String(f?.renamedTo ?? '').trim();
    if (!other) return [literal];
    const dim = String(f?.dimension ?? '').toLowerCase();
    const a = normFindingKey(f?.key);
    const b = normFindingKey(other);
    if (!a || !b || a === b) return [literal];
    const id = (key, kind) => `${dim}|${key}|${kind}`;
    for (const [ka, kb] of [['missing-in-canvas', 'missing-in-code'], ['missing-in-code', 'missing-in-canvas']]) {
      const pair = [id(a, ka), id(b, kb)];
      if (pair.every((x) => expectedIds.has(x))) return pair;
    }
    return [literal];
  };

  // Expanded on BOTH sides of the ratio: a rename finding contributes the two
  // ids it covers to the reported count as well, so precision cannot exceed 1
  // and one finding cannot outscore two correct ones.
  const reportedIds = new Set(reported.flatMap(expandFinding));
  const injectedIds = new Set((caseRecord.injected ?? []).map(findingId));

  const truePositives = [...expectedIds].filter((id) => reportedIds.has(id));
  const missed = [...expectedIds].filter((id) => !reportedIds.has(id));
  const spurious = [...reportedIds].filter((id) => !expectedIds.has(id));

  const precision = reportedIds.size ? truePositives.length / reportedIds.size : (expectedIds.size ? 0 : 1);
  const recall = expectedIds.size ? truePositives.length / expectedIds.size : 1;
  const f1 = (precision + recall) ? (2 * precision * recall) / (precision + recall) : 0;

  // The planted defect, scored separately. A case with a big pre-existing
  // disagreement set can score a respectable F1 while missing the ONE thing
  // deliberately broken, and that distinction is the point of injecting it.
  const injectedFound = injectedIds.size
    ? [...injectedIds].every((id) => reportedIds.has(id))
    : null;

  // A clean case is the one where `verdict` carries real information: did the
  // agent resist inventing drift that is not there?
  const verdictCorrect = typeof parsed?.verdict === 'string'
    ? (parsed.verdict === 'in-sync') === (expectedIds.size === 0)
    : null;

  return {
    caseId: caseRecord.id,
    mutation: caseRecord.mutation,
    reported: reportedIds.size,
    expected: expectedIds.size,
    truePositives: truePositives.length,
    missed: missed.length,
    spurious: spurious.length,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    injectedFound,
    verdictCorrect,
    // Uniform with the other graders: a single `score` callers can roll up.
    // F1 on 0..1 rather than the matched-minus-missing integer, because
    // precision matters as much as recall here - an agent that reports every
    // possible finding would otherwise score perfectly.
    score: Number(f1.toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Task E - direction policy (T7, spec
// 2026-08-29-parity-judgement-gates-and-evals).
//
// One disagreement, three possible answers, one right one. Exact match on
// `winner` against the hand-authored key in fixtures/direction-cases.json.
//
// The interesting part is not the match, it is the DEGENERATE-STRATEGY
// detector below. This eval has only three answers, so an agent that always
// says "code" scores whatever fraction of the corpus happens to be code-wins.
// Per-attempt that is invisible; across a fleet it is the single most likely
// way for this eval to report a good number while measuring nothing. The
// rollup names it explicitly rather than leaving it to be noticed.

const DIRECTIONS = ['code', 'canvas', 'ask-a-human'];

export function gradeTaskE(parsed, context) {
  const caseRecord = context && context.case;
  if (!caseRecord) {
    return { score: null, reason: 'no case attached to this attempt - nothing to grade against' };
  }
  const answered = typeof parsed?.winner === 'string' ? parsed.winner.trim().toLowerCase() : null;
  const expected = String(caseRecord.expected ?? '').toLowerCase();
  const correct = answered !== null && answered === expected;

  // A justification that only echoes the scenario is not a justification. This
  // is a cheap, deterministic floor -- NOT a quality judgement, which is what
  // the LLM judge is for. It catches the empty-shell answer, nothing subtler.
  const justification = typeof parsed?.justification === 'string' ? parsed.justification.trim() : '';
  const justified = justification.length >= 40;

  return {
    caseId: caseRecord.id,
    dimension: caseRecord.dimension ?? null,
    expected,
    answered,
    correct,
    validAnswer: answered !== null && DIRECTIONS.includes(answered),
    justified,
    confidence: parsed?.confidence ?? null,
    // Binary. There is no partial credit for a direction: acting on the wrong
    // side of a disagreement is wrong however well it is argued.
    score: correct ? 1 : 0,
  };
}

/**
 * Fleet-level check for Task E: did the agent actually discriminate, or did it
 * answer the same thing every time?
 *
 * Call with every Task E grader result from a run. Returns null when there is
 * too little data to say - fewer than 3 attempts cannot distinguish a constant
 * strategy from a run of genuinely similar cases.
 */
export function detectConstantDirection(graderResults) {
  const answers = (graderResults || []).map((g) => g && g.answered).filter(Boolean);
  if (answers.length < 3) return null;
  const distinct = new Set(answers);
  const expectedDistinct = new Set((graderResults || []).map((g) => g && g.expected).filter(Boolean));
  return {
    attempts: answers.length,
    distinctAnswers: [...distinct].sort(),
    distinctExpected: [...expectedDistinct].sort(),
    // Only degenerate if the CASES were varied and the ANSWERS were not.
    // Three code-wins cases answered "code" three times is correct, not lazy.
    constant: distinct.size === 1 && expectedDistinct.size > 1,
  };
}

// ---------------------------------------------------------------------------
// Task F - curation review (T8).
//
// Binary verdict against a corpus that is balanced 50/50 by construction, so
// the two degenerate strategies ("everything is fine" and "everything is
// broken") both land on 0.5 rather than either one scoring well. Same
// detector shape as Task E, on the other axis.

export function gradeTaskF(parsed, context) {
  const caseRecord = context && context.case;
  if (!caseRecord) {
    return { score: null, reason: 'no case attached to this attempt - nothing to grade against' };
  }
  const answered = typeof parsed?.verdict === 'string' ? parsed.verdict.trim().toLowerCase() : null;
  const expected = String(caseRecord.expected ?? '').toLowerCase();
  const correct = answered !== null && answered === expected;

  // Calling a curation wrong without saying what it should be is half an
  // answer: it identifies a problem nobody can act on. Tracked, but NOT scored
  // - the correction's quality is a judge question, and penalising a correct
  // detection for a weak correction would blur two different failures.
  const correctedValue = typeof parsed?.correctedValue === 'string' ? parsed.correctedValue.trim() : '';
  const offeredCorrection = answered === 'wrong' ? correctedValue.length > 0 : null;

  return {
    caseId: caseRecord.id,
    tag: caseRecord.tag ?? null,
    key: caseRecord.key ?? null,
    historical: caseRecord.historical === true,
    expected,
    answered,
    correct,
    validAnswer: answered === 'correct' || answered === 'wrong',
    offeredCorrection,
    confidence: parsed?.confidence ?? null,
    score: correct ? 1 : 0,
  };
}

/**
 * Fleet-level check for Task F: did the agent review, or just answer the same
 * thing every time? The corpus is balanced 50/50, so a constant answer scores
 * ~0.5 - respectable-looking and completely uninformative.
 */
export function detectConstantVerdict(graderResults) {
  const answers = (graderResults || []).map((g) => g && g.answered).filter(Boolean);
  if (answers.length < 3) return null;
  const distinct = new Set(answers);
  const expectedDistinct = new Set((graderResults || []).map((g) => g && g.expected).filter(Boolean));
  return {
    attempts: answers.length,
    distinctAnswers: [...distinct].sort(),
    constant: distinct.size === 1 && expectedDistinct.size > 1,
  };
}

export const GRADERS = { gradeTaskA, gradeTaskB, gradeTaskC, gradeTaskD, gradeTaskE, gradeTaskF };

/**
 * Look up and run a task's grader by the tasks-registry.mjs `grader` key (a
 * string name), or return null if the task has none.
 *
 * `context` (T6) carries whatever the task needs beyond the agent's own
 * output - Task D needs the corpus case its attempt was posed from. The
 * older graders ignore it, so this stays backwards compatible.
 */
export function runGrader(graderName, parsed, context = null) {
  const fn = graderName ? GRADERS[graderName] : null;
  return fn ? fn(parsed, context) : null;
}
