#!/usr/bin/env node
// Self-test for lib/grader.mjs (R4 — deterministic component-usage grader).
//
// Deliberately hand-rolled assert()/PASS/FAIL, matching the convention in
// scripts/__tests__/*.test.mjs rather than pulling in a test runner. No
// network access, no LLM call, no cost — this is the entire point of R4:
// scoring that can be regression-tested for free.
//
// Fixtures:
//   fixtures/attempts/A-composition-claude-1.real.json — a REAL recorded
//     attempt (Claude, opus-class, 2026-08-25, the same $1.3469 run cited
//     in this spec's Findings). Copied verbatim from
//     .altitude/ai-readiness/runs/run-2026-08-25T14-32-06-494Z/.
//   Everything else below is SYNTHETIC — hand-authored to exercise grader
//     edge cases (missing/unexpected/false-positive), NOT a claim about any
//     real model's output. Labelled inline.
//
// Run: node scripts/ai-readiness/test/grader.test.mjs

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  gradeComponentUsage,
  extractUsedTagsFromComposition,
  extractUsedTagsFromScaffold,
  gradeTaskA,
  gradeTaskB,
  gradeTaskC,
  EXPECTED_TASK_A,
  EXPECTED_TASK_B,
} from '../lib/grader.mjs';

const SCRIPT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(SCRIPT_DIR, '..', '..');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ✓ ${desc}`); PASS++; }
  else { console.log(`  ✗ ${desc}`); FAIL++; }
}
function deepEqual(a, b) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
}

// ---------------------------------------------------------------------------
console.log('==> gradeComponentUsage — pure formula (synthetic inputs)');
{
  const r = gradeComponentUsage(['al-button', 'al-card', 'al-badge'], ['al-button', 'al-card', 'al-icon']);
  assert('matched = [al-button, al-card]', deepEqual(r.matched, ['al-button', 'al-card']));
  assert('missing = [al-icon]', deepEqual(r.missing, ['al-icon']));
  assert('unexpected = [al-badge]', deepEqual(r.unexpected, ['al-badge']));
  assert('score = matched(2) - missing(1) - unexpected(1) = 0', r.score === 0);
}
{
  const r = gradeComponentUsage([], []);
  assert('empty/empty -> score 0, no matched/missing/unexpected', r.score === 0 && r.matched.length === 0 && r.missing.length === 0 && r.unexpected.length === 0);
}
{
  const r = gradeComponentUsage(['AL-BUTTON'], ['al-button']);
  assert('case-insensitive tag matching', r.matched.length === 1 && r.missing.length === 0);
}

// ---------------------------------------------------------------------------
console.log('\n==> Task A — REAL recorded attempt (opus-class, $1.3469 run, 2026-08-25)');
{
  const attemptPath = resolve(SCRIPT_DIR, 'fixtures/attempts/A-composition-claude-1.real.json');
  const attempt = JSON.parse(readFileSync(attemptPath, 'utf8'));
  const usedTags = extractUsedTagsFromComposition(attempt.parsed);
  assert('extracted 12 unique tags from usedComponents', usedTags.length === 12);
  assert('al-theme extracted', usedTags.includes('al-theme'));
  assert('al-menu-item extracted', usedTags.includes('al-menu-item'));

  const graded = gradeTaskA(attempt.parsed);
  assert('every EXPECTED_TASK_A tag matched (real attempt covers the full recipe)', graded.missing.length === 0);
  assert('al-text-block is unexpected (extra vs. the pinned AGENTS.md recipe, which uses a bare <p>)', graded.unexpected.includes('al-text-block'));
  assert(
    `score = matched(${graded.matched.length}) - missing(${graded.missing.length}) - unexpected(${graded.unexpected.length})`,
    graded.score === graded.matched.length - graded.missing.length - graded.unexpected.length,
  );
  console.log(`     (real) matched=${graded.matched.length} missing=${graded.missing.length} unexpected=${JSON.stringify(graded.unexpected)} score=${graded.score}`);
}

// ---------------------------------------------------------------------------
console.log('\n==> Task A answer key cannot itself hallucinate — every EXPECTED_TASK_A tag exists in the real CEM digest');
{
  const digestPath = resolve(ROOT, '.altitude/ai-readiness/cem-digest.json');
  const digest = JSON.parse(readFileSync(digestPath, 'utf8'));
  for (const tag of EXPECTED_TASK_A) {
    const entry = digest[tag];
    assert(`"${tag}" is a REAL tag in cem-digest.json (not missing, not an eval-fixture stub)`, !!entry && entry.status !== 'eval-fixture');
  }
}
{
  // Task B's expected tag (al-icon) is real too — al-stat-card itself is the
  // (deliberate) eval-fixture stub, which is why it's the SUBJECT of Task B,
  // not in EXPECTED_TASK_B.
  const digestPath = resolve(ROOT, '.altitude/ai-readiness/cem-digest.json');
  const digest = JSON.parse(readFileSync(digestPath, 'utf8'));
  for (const tag of EXPECTED_TASK_B) {
    const entry = digest[tag];
    assert(`"${tag}" is a REAL tag in cem-digest.json`, !!entry && entry.status !== 'eval-fixture');
  }
  assert('al-stat-card (the Task B SUBJECT) is correctly marked eval-fixture, not real', digest['al-stat-card']?.status === 'eval-fixture');
}

// ---------------------------------------------------------------------------
console.log('\n==> Task B — SYNTHETIC fixtures (hand-authored, not a real API attempt)');
{
  // SYNTHETIC: a scaffold that composes exactly the contract's al-icon usage.
  const parsed = {
    files: [
      { path: 'stat-card.ts', role: 'component', content: 'render() { return html`<div class="al-c-stat-card"><al-icon name="caret-up" size="sm"></al-icon></div>`; }' },
      { path: 'stat-card.scss', role: 'styles', content: '.al-c-stat-card { padding: var(--al-theme-space-md); }' },
    ],
  };
  const used = extractUsedTagsFromScaffold(parsed);
  assert('extracted al-icon from scaffolded file content', deepEqual(used, ['al-icon']));
  const graded = gradeTaskB(parsed);
  assert('matched=[al-icon], missing=[], unexpected=[], score=1', graded.matched.length === 1 && graded.missing.length === 0 && graded.unexpected.length === 0 && graded.score === 1);
}
{
  // SYNTHETIC: a scaffold that forgets the icon AND hallucinates composing
  // <al-chip> instead of building the stat-card's own markup.
  const parsed = {
    files: [{ path: 'stat-card.ts', role: 'component', content: 'render() { return html`<al-chip>${this.value}</al-chip>`; }' }],
  };
  const graded = gradeTaskB(parsed);
  assert('missing=[al-icon] (contract requires it), unexpected=[al-chip] (hallucinated composition)', deepEqual(graded.missing, ['al-icon']) && deepEqual(graded.unexpected, ['al-chip']));
  assert('score = 0 - 1 - 1 = -2', graded.score === -2);
}
{
  // Edge case: no files at all (void payload) should not throw.
  const graded = gradeTaskB({ files: [] });
  assert('empty files array does not throw, grades as all-missing', graded.missing.length === 1 && graded.score === -1);
}

// ---------------------------------------------------------------------------
console.log('\n==> Task C — doNotFlag false-positive detector (SYNTHETIC violation text)');
{
  // SYNTHETIC true positive (a real doNotFlag false positive the grader must catch).
  const falsePositiveCase = {
    violations: [
      { what: 'Missing isDismissed property', why: 'The dismissal model is incomplete without owned state', fix: 'Add an isDismissed boolean', severity: 'medium', conventionRef: 'AGENTS.md dismissible-atom recipe' },
    ],
  };
  const graded = gradeTaskC(falsePositiveCase);
  assert('flags "Missing isDismissed" as a false positive', graded.falsePositiveCount === 1);
  assert('score is negative (a penalty, not a bonus)', graded.score === -1);
}
{
  // SYNTHETIC true negative: a LEGITIMATE finding that happens to mention
  // "close" — must NOT be caught by the false-positive detector, since it is
  // not the sanctioned pattern (missing isDismissed / incomplete dismissal),
  // it is the genuinely-real event-naming-convention violation.
  const legitimateCase = {
    violations: [
      { what: 'Non-conventional close event', why: "dispatchEvent(new CustomEvent('close')) does not match the al-* event API — should be this.dispatch({eventName: 'onTagClose', detailObj: { value: this.value } })", fix: "Use this.dispatch(...)", severity: 'medium', conventionRef: 'canonical al-tag contract, Close event row' },
    ],
  };
  const graded = gradeTaskC(legitimateCase);
  assert('does NOT flag the legitimate event-naming finding as a false positive', graded.falsePositiveCount === 0);
}
{
  const graded = gradeTaskC({ violations: [] });
  assert('empty violations array grades as zero false positives, does not throw', graded.falsePositiveCount === 0 && graded.score === 0);
}
{
  const graded = gradeTaskC({});
  assert('missing violations key does not throw', graded.falsePositiveCount === 0);
}

// ---------------------------------------------------------------------------
console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
