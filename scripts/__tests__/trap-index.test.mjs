#!/usr/bin/env node
/**
 * Self-test for scripts/ai-readiness/build-trap-index.mjs (T9, spec
 * 2026-08-29-parity-judgement-gates-and-evals).
 *
 * The trap index is a DENOMINATOR — "N of 52 traps have an eval case" — and a
 * denominator that silently undercounts is worse than no measurement at all,
 * because it makes the gap look smaller than it is. That is not hypothetical:
 * the first version of the extractor matched only list-style traps
 * (`1. **Title**`) and reported altitude-figma-repair as having ZERO traps
 * while its file carries fourteen in heading style (`### 1. Title`). The
 * coverage percentage looked better for it.
 *
 * So the assertions here are mostly about the extractor NOT missing things,
 * and about the coverage count being citation-based rather than fuzzy.
 *
 * Run: node scripts/__tests__/trap-index.test.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { citedTraps, extractTraps } from '../ai-readiness/build-trap-index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const INDEX = join(ROOT, '.altitude/ai-readiness/trap-index.json');

let PASS = 0;
let FAIL = 0;
function assert(desc, cond) {
  if (cond) { console.log(`  ok - ${desc}`); PASS++; }
  else { console.log(`  NOT OK - ${desc}`); FAIL++; }
}

console.log('== trap index self-test ==');

console.log('\n1. Both trap conventions are extracted');
{
  const listStyle = [
    '## Traps',
    '1. **First trap** something bad happened',
    '2. **Second trap** something else',
    '## Layout',
    '1. **Not a trap** this is a different list',
  ].join('\n');
  const list = extractTraps(listStyle, 'demo');
  assert('list-style traps are found', list.length === 2);
  assert('the section boundary is respected — a numbered list after the traps heading is not a trap',
    !list.some((t) => t.title.includes('Not a trap')));

  const headingStyle = [
    '## Hard-won traps',
    '### 1. A pinned node id keeps resolving',
    'body text',
    '### 2. Opacity is a percentage',
    '## Something else',
    '### 1. Not a trap',
  ].join('\n');
  const headings = extractTraps(headingStyle, 'demo');
  assert('heading-style traps are found — the undercount that made repair report zero', headings.length === 2);
  assert('and their titles are cleaned of markup', headings[0].title === 'A pinned node id keeps resolving');
  assert('the section boundary is respected here too', !headings.some((t) => t.title === 'Not a trap'));
}

console.log('\n2. Against the real skills');
{
  const skills = ['altitude-figma-generate', 'altitude-figma-repair', 'altitude-figma-snippet', 'altitude-figma-sync'];
  for (const skill of skills) {
    const file = join(ROOT, '.claude/skills', skill, 'SKILL.md');
    if (!existsSync(file)) { assert(`${skill} SKILL.md exists`, false); continue; }
    const traps = extractTraps(readFileSync(file, 'utf8'), skill);
    assert(`${skill}: found ${traps.length} traps (non-zero)`, traps.length > 0);
    assert(`  ...every one has a number, a title and a line`,
      traps.every((t) => Number.isInteger(t.number) && t.title.length > 5 && t.line > 0));
    assert('  ...and ids are unique within the skill', new Set(traps.map((t) => t.id)).size === traps.length);
  }
}

console.log('\n3. Coverage is by citation, never by resemblance');
{
  assert('a citation with a skill hint resolves',
    citedTraps('altitude-figma-repair SKILL.md trap 4').includes('altitude-figma-repair#4'));
  assert('the short form works too — "repair SKILL.md trap 2"',
    citedTraps('repair SKILL.md trap 2').includes('altitude-figma-repair#2'));
  assert('a citation with NO skill hint is not counted — four skills each have a trap 4, and guessing would inflate the number',
    citedTraps('see trap 4').length === 0);
  assert('prose that merely resembles a trap counts for nothing',
    citedTraps('this is a lot like the opacity problem in the repair skill').length === 0);
  assert('several citations in one string all resolve',
    citedTraps('repair SKILL.md trap 9 and trap 10').length === 2);
}

console.log('\n4. The tracked index');
{
  if (!existsSync(INDEX)) {
    assert('the index exists (pnpm run evals:traps -- --write)', false);
  } else {
    const index = JSON.parse(readFileSync(INDEX, 'utf8'));
    assert('it counts 52 traps — the real number, not the "~70" an early estimate claimed',
      index.totals.traps === 52);
    assert('every skill contributes', Object.values(index.totals.bySkill).every((n) => n > 0));
    assert('the per-skill counts sum to the total',
      Object.values(index.totals.bySkill).reduce((a, b) => a + b, 0) === index.totals.traps);
    assert('coverage is counted and is honest about being partial',
      index.totals.covered > 0 && index.totals.covered < index.totals.traps);
    assert('every covered trap names the case that covers it',
      index.traps.filter((t) => t.coveredBy.length).every((t) => t.coveredBy.every((c) => typeof c === 'string' && c.length > 2)));
    assert('uncovered traps carry an empty array, not a missing field — the gap is explicit',
      index.traps.every((t) => Array.isArray(t.coveredBy)));
    assert('no timestamp, so --check is a real drift gate', !JSON.stringify(index).includes('generatedAt'));
    assert('traps are sorted, so a rebuild diffs reviewably',
      index.traps.map((t) => t.id).join() === index.traps.map((t) => t.id).slice()
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).join());
  }
}

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
