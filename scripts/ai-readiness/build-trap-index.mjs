#!/usr/bin/env node
/**
 * build-trap-index.mjs — inventory the four Figma skills' numbered TRAPS, and
 * measure how many of them any eval actually covers.
 *
 *   node scripts/ai-readiness/build-trap-index.mjs [--write] [--check]
 *
 * T9, spec 2026-08-29-parity-judgement-gates-and-evals.
 *
 * The skills carry roughly seventy numbered traps — each one a real, dated
 * failure with a known correct answer, written down at the moment it cost
 * somebody an hour. Anthropic's eval guidance says to start from real failures
 * rather than imagined ones, and this repository has an unusually good written
 * record of its own. "~70 traps" is not a measurement though; this turns the
 * prose into a counted inventory, then reports which traps an eval case cites.
 *
 * COVERAGE IS BY CITATION, NOT BY GUESSWORK. A trap counts as covered when an
 * eval case's `source` field names it — `trap 4`, `trap 9`, and so on, together
 * with the skill it belongs to. No fuzzy matching on wording: a coverage
 * number produced by string similarity would drift up every time a case was
 * reworded, which is the opposite of a measurement.
 *
 * The number this reports is deliberately allowed to be LOW. It is a gap
 * report, not a score to optimise — and a trap list of seventy with a handful
 * of cases is a truthful thing to know.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { hasFlag } from '../lib/argv.mjs';
import { REPO_ROOT } from '../../libs/altitude-mcp/src/lib/paths.mjs';

const WRITE = hasFlag('--write');
const CHECK = hasFlag('--check');

const SKILLS = [
  'altitude-figma-generate',
  'altitude-figma-repair',
  'altitude-figma-snippet',
  'altitude-figma-sync',
];
const OUT = join(REPO_ROOT, '.altitude', 'ai-readiness', 'trap-index.json');

/** Headings that open a trap list. Matched case-insensitively on the heading text. */
const TRAP_HEADING = /^#{2,3}\s+.*\btraps?\b/i;
/**
 * A numbered trap. The four skills use TWO conventions and both are real:
 *   - list style, `1. **Title** ...` (generate, snippet, sync)
 *   - heading style, `### 1. Title` (repair)
 * Matching only the first reported altitude-figma-repair as having ZERO traps
 * while its file carries fourteen — a silent undercount, which for a coverage
 * denominator is the worst possible failure: it makes the percentage look
 * better by shrinking the problem.
 */
const TRAP_ITEM = /^(\d+)\.\s+\*\*(.+?)\*\*/;
const TRAP_ITEM_HEADING = /^#{3,6}\s+(\d+)\.\s+(.+?)\s*$/;

/**
 * Extract one skill's traps.
 *
 * Scoped to the section under a "Traps" heading and stopping at the next
 * heading of the same level or higher. Scanning the whole file would sweep up
 * every numbered list in it — the generate skill's three-layer fact model is a
 * numbered list of three that is not a trap list at all.
 */
export function extractTraps(markdown, skill) {
  const lines = markdown.split(/\r?\n/);
  const traps = [];
  let inTraps = false;
  let headingLevel = 0;

  lines.forEach((line, i) => {
    const heading = line.match(/^(#{1,6})\s/);
    if (heading) {
      if (TRAP_HEADING.test(line)) {
        inTraps = true;
        headingLevel = heading[1].length;
        return;
      }
      // Inside a trap section, a DEEPER numbered heading IS a trap (repair's
      // convention) rather than the end of the section.
      const asTrap = inTraps && heading[1].length > headingLevel ? line.match(TRAP_ITEM_HEADING) : null;
      if (asTrap) {
        traps.push({
          id: `${skill}#${asTrap[1]}`,
          skill,
          number: Number(asTrap[1]),
          title: asTrap[2].replace(/`/g, '').replace(/\*\*/g, '').trim(),
          line: i + 1,
        });
        return;
      }
      // A heading at the same level or higher closes the section.
      if (inTraps && heading[1].length <= headingLevel) inTraps = false;
      return;
    }
    if (!inTraps) return;
    const item = line.match(TRAP_ITEM);
    if (item) {
      traps.push({
        id: `${skill}#${item[1]}`,
        skill,
        number: Number(item[1]),
        title: item[2].replace(/`/g, '').trim(),
        line: i + 1,
      });
    }
  });

  return traps;
}

/**
 * Which traps does an eval case cite?
 *
 * Reads `source` / `why` strings for "trap N" plus a skill hint. A case citing
 * "repair SKILL.md trap 4" covers altitude-figma-repair#4. Without a skill
 * hint the citation is ambiguous and is NOT counted — four skills each have a
 * trap 4, and guessing which one would inflate the number.
 */
export function citedTraps(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  const skillHint = SKILLS.find((s) => text.includes(s))
    || (/\brepair\b/i.test(text) ? 'altitude-figma-repair' : null)
    || (/\bsnippet\b/i.test(text) ? 'altitude-figma-snippet' : null)
    || (/\bgenerate\b/i.test(text) ? 'altitude-figma-generate' : null)
    || (/\bsync\b/i.test(text) ? 'altitude-figma-sync' : null);
  if (!skillHint) return out;
  for (const m of text.matchAll(/\btraps?\s+(\d+)/gi)) out.push(`${skillHint}#${Number(m[1])}`);
  return out;
}

/** Every eval case that can cite a trap, flattened to `{caseId, text}`. */
function evalCaseTexts() {
  const out = [];
  const push = (file, cases, idKey = 'id') => {
    if (!existsSync(file)) return;
    for (const c of JSON.parse(readFileSync(file, 'utf8')).cases ?? []) {
      out.push({ caseId: c[idKey], text: [c.source, c.why].filter(Boolean).join(' ') });
    }
  };
  push(join(REPO_ROOT, 'scripts', 'ai-readiness', 'fixtures', 'direction-cases.json'));
  push(join(REPO_ROOT, 'scripts', 'ai-readiness', 'fixtures', 'curation-negatives.json'));
  return out;
}

/**
 * The CLI body, guarded so this module can be IMPORTED for its pure
 * functions (extractTraps / citedTraps) without running the whole indexer.
 * Its self-test imports them; without this guard that import would walk the
 * skills, print a report and, in --check mode, call process.exit.
 */
function main() {
  const traps = SKILLS.flatMap((skill) => {
    const file = join(REPO_ROOT, '.claude', 'skills', skill, 'SKILL.md');
    if (!existsSync(file)) return [];
    return extractTraps(readFileSync(file, 'utf8'), skill);
  });

  const cases = evalCaseTexts();
  const coverage = new Map();
  for (const { caseId, text } of cases) {
    for (const trapId of citedTraps(text)) {
      if (!coverage.has(trapId)) coverage.set(trapId, []);
      coverage.get(trapId).push(caseId);
    }
  }

  const index = {
    schemaVersion: 1,
    // No timestamp: --check byte-compares, and a generated-at field would make
    // every run a diff.
    totals: {
      traps: traps.length,
      bySkill: Object.fromEntries(SKILLS.map((s) => [s, traps.filter((t) => t.skill === s).length])),
      covered: [...coverage.keys()].filter((id) => traps.some((t) => t.id === id)).length,
    },
    traps: traps
      .map((t) => ({ ...t, coveredBy: coverage.get(t.id) ?? [] }))
      .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })),
  };

  const serialized = `${JSON.stringify(index, null, 2)}\n`;

  if (CHECK) {
    if (!existsSync(OUT)) {
      console.error(`[traps] ${OUT} does not exist — run with --write.`);
      process.exit(1);
    }
    if (readFileSync(OUT, 'utf8') !== serialized) {
      console.error('[traps] DRIFT — the trap index is not what the skills + eval fixtures currently produce.');
      console.error('Re-run with --write and commit the result.');
      process.exit(1);
    }
    console.log(`[traps] ok — ${index.totals.traps} traps, ${index.totals.covered} cited by an eval case, matches disk.`);
    process.exit(0);
  }

  console.log(`[traps] ${index.totals.traps} numbered traps across ${SKILLS.length} skills`);
  for (const [skill, n] of Object.entries(index.totals.bySkill)) console.log(`  ${String(n).padStart(2)}  ${skill}`);
  const pct = index.totals.traps ? Math.round((index.totals.covered / index.totals.traps) * 100) : 0;
  console.log(`[traps] ${index.totals.covered}/${index.totals.traps} (${pct}%) are cited by at least one eval case`);
  const cited = index.traps.filter((t) => t.coveredBy.length);
  for (const t of cited) console.log(`  covered  ${t.id.padEnd(28)} ${t.title.slice(0, 60)}`);
  console.log('[traps] the rest are a GAP REPORT, not a score — this number is meant to be low until cases are written.');

  if (WRITE) {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, serialized, 'utf8');
    console.log(`[traps] wrote ${OUT}`);
  } else {
    console.log('[traps] dry run — pass --write to update the tracked index.');
  }

}

const invokedDirectly = String(process.argv[1] || '').endsWith('build-trap-index.mjs');
if (invokedDirectly) main();
