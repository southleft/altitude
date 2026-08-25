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

export const GRADERS = { gradeTaskA, gradeTaskB, gradeTaskC };

/** Look up and run a task's grader by the tasks-registry.mjs `grader` key (a string name), or return null if the task has none. */
export function runGrader(graderName, parsed) {
  const fn = graderName ? GRADERS[graderName] : null;
  return fn ? fn(parsed) : null;
}
