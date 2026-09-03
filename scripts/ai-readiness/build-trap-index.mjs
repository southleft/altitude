#!/usr/bin/env node
/**
 * build-trap-index.mjs — inventory the four Figma skills' numbered TRAPS, and
 * give every one of them a LIFECYCLE.
 *
 *   node scripts/ai-readiness/build-trap-index.mjs [--write] [--check] [--json]
 *
 * T9, spec 2026-08-29-parity-judgement-gates-and-evals; lifecycle added
 * 2026-09-03 after an audit found the skills had "crossed from asset into scar
 * tissue" — 52 traps, 8 cited by an eval, and ZERO ever retired. A list that
 * only grows is not a knowledge base, it is a tax on every read.
 *
 * WHAT IS DERIVED, WHAT IS HAND-OWNED
 * -----------------------------------
 * Derived from the skills and the eval fixtures on every run, and therefore
 * never worth hand-editing: `id`, `skill`, `number`, `title`, `line`,
 * `canonical` (parsed out of the trap's own body) and `coveredBy`.
 *
 * Hand-owned, carried forward from the tracked index the way
 * `carryForwardPropAxisCuration` carries contract curation across a
 * `--refresh`: `disposition`, `gate`, `supersededBy`, `provenance`. A human
 * decides what now checks a trap; nothing can derive that.
 *
 * THE LIFECYCLE
 * -------------
 *   open        prose only. Nothing but a reading agent stands between the
 *               repo and this failure.
 *   evaluated   an eval case CITES it (`coveredBy` non-empty). Derived, never
 *               hand-written: coverage and disposition cannot disagree.
 *   gated       a script now refuses the wrong answer, so the prose is
 *               belt-and-braces and may be compressed to one line. A `gated`
 *               trap MUST name the gate — script path plus how it fails.
 *   superseded  the trap's diagnosis was wrong or its cause was removed. The
 *               prose says so in the TITLE and `supersededBy` names what
 *               replaced it.
 *
 * `--check` fails when:
 *   1. a trap claims `gated` and the named gate script is not on disk (or the
 *      entry does not say how it fails) — the gate was renamed or deleted and
 *      the trap is now unprotected while claiming otherwise;
 *   2. a trap's TITLE says SUPERSEDED/RETIRED but its disposition does not —
 *      the exact miss that let one superseded trap sit unmarked until a
 *      cross-session mailbox message happened to notice it;
 *   3. a NEW trap appears with no disposition — the author has not yet said
 *      what checks it, and "nothing" (`open`) is an acceptable answer that
 *      somebody still has to type;
 *   4. a trap claims `evaluated` while no eval case cites it — the case was
 *      deleted or renamed, and the trap silently lost its only check;
 *   5. a `canonical:` cross-reference points at a trap id that does not exist;
 *   6. the file on disk is not what the skills + fixtures + curation produce.
 *
 * The TITLE, not the body, carries the superseded marker. Bodies legitimately
 * mention things that were retired (the prop sheet, Storybook) while the trap
 * itself is very much alive — matching those would make this gate cry wolf,
 * and a gate that cries wolf is off within a week.
 *
 * COVERAGE IS BY CITATION, NOT BY GUESSWORK. A trap counts as covered when an
 * eval case's `source` field names it — `trap 4`, `trap 9`, and so on, together
 * with the skill it belongs to. No fuzzy matching on wording: a coverage
 * number produced by string similarity would drift up every time a case was
 * reworded, which is the opposite of a measurement.
 *
 * The numbers here are deliberately allowed to be BAD. This is a gap report,
 * not a score to optimise: 43 `open` traps is a truthful thing to know, and
 * driving the count down by deleting traps rather than gating them would be
 * the failure this file exists to make visible.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { hasFlag } from '../lib/argv.mjs';
import { REPO_ROOT } from '../../libs/altitude-mcp/src/lib/paths.mjs';

const WRITE = hasFlag('--write');
const CHECK = hasFlag('--check');
const JSON_OUT = hasFlag('--json');

const SKILLS = [
  'altitude-figma-generate',
  'altitude-figma-repair',
  'altitude-figma-snippet',
  'altitude-figma-sync',
];
const OUT = join(REPO_ROOT, '.altitude', 'ai-readiness', 'trap-index.json');

export const DISPOSITIONS = {
  open: 'prose only — nothing but a reading agent checks this',
  evaluated: 'an eval case cites it; the wrong answer is possible but scored',
  gated: 'a script refuses the wrong answer outright, so the prose is a backstop',
  superseded: 'the trap was wrong or its cause was removed; `supersededBy` says what replaced it',
};

/** The hand-owned half. Everything else is re-derived on every run. */
const CURATED_KEYS = ['disposition', 'gate', 'supersededBy', 'provenance'];

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
/** A numbered line in a trap section that is NOT in either convention. */
const TRAP_ITEM_LOOSE = /^(\d+)\.\s+\S/;
/** The cross-reference form a deduplicated trap uses to name its canonical home. */
const CANONICAL_REF = /canonical:\s*(altitude-figma-[a-z]+#\d+)/;
/** A trap whose TITLE retires it. Body text is deliberately not matched. */
const SUPERSEDED_TITLE = /\b(SUPERSEDED|RETIRED)\b/;

/**
 * Extract one skill's traps, plus the trap-shaped lines it could NOT parse.
 *
 * Scoped to the section under a "Traps" heading and stopping at the next
 * heading of the same level or higher. Scanning the whole file would sweep up
 * every numbered list in it — the generate skill's three-layer fact model is a
 * numbered list of three that is not a trap list at all.
 *
 * `skips` exists because silence is the forbidden failure. A trap written
 * `11. \`argOf(flag)\` takes …` — no bold title — is invisible to TRAP_ITEM,
 * so it can never be counted, never be cited, and never get a disposition. It
 * is now reported by name instead of vanishing from the denominator.
 */
export function extractTrapSection(markdown, skill) {
  const lines = markdown.split(/\r?\n/);
  const traps = [];
  const skips = [];
  let inTraps = false;
  let headingLevel = 0;
  let current = null;

  const bodyPush = (line) => {
    if (current) current.body.push(line);
  };

  lines.forEach((line, i) => {
    const heading = line.match(/^(#{1,6})\s/);
    if (heading) {
      if (TRAP_HEADING.test(line)) {
        inTraps = true;
        headingLevel = heading[1].length;
        current = null;
        return;
      }
      // Inside a trap section, a DEEPER numbered heading IS a trap (repair's
      // convention) rather than the end of the section.
      const asTrap = inTraps && heading[1].length > headingLevel ? line.match(TRAP_ITEM_HEADING) : null;
      if (asTrap) {
        current = {
          id: `${skill}#${asTrap[1]}`,
          skill,
          number: Number(asTrap[1]),
          title: asTrap[2].replace(/`/g, '').replace(/\*\*/g, '').trim(),
          line: i + 1,
          body: [],
        };
        traps.push(current);
        return;
      }
      // A heading at the same level or higher closes the section.
      if (inTraps && heading[1].length <= headingLevel) {
        inTraps = false;
        current = null;
      }
      return;
    }
    if (!inTraps) return;
    const item = line.match(TRAP_ITEM);
    if (item) {
      current = {
        id: `${skill}#${item[1]}`,
        skill,
        number: Number(item[1]),
        title: item[2].replace(/`/g, '').trim(),
        line: i + 1,
        body: [],
      };
      traps.push(current);
      return;
    }
    const loose = line.match(TRAP_ITEM_LOOSE);
    if (loose && !traps.some((t) => t.number === Number(loose[1]) && t.skill === skill)) {
      skips.push({
        skill,
        line: i + 1,
        number: Number(loose[1]),
        text: line.trim().slice(0, 80),
        reason: 'numbered line in a trap section with no **bold title** — not extractable, so it has no id and cannot be cited or dispositioned',
      });
      // An unextractable trap still OWNS the lines that follow it. Leaving
      // `current` pointing at the previous trap would attribute this one's
      // body — including any `canonical:` cross-reference — to its neighbour.
      current = null;
      return;
    }
    bodyPush(line);
  });

  // Second pass: a NUMBERED SUB-HEADING anywhere in the file that the walk did
  // not claim. `### 31. Overlay molecules need a measureRoot` sits under its
  // own heading in altitude-figma-sync, outside the "Traps" section that
  // numbered it, so the section-scoped walk cannot see it — it continues the
  // trap numbering all the same. Restricted to level 3+ because sync numbers
  // its top-level SECTIONS (`## 0. The file.`), which are not traps.
  const claimed = new Set(traps.map((t) => t.line));
  lines.forEach((line, i) => {
    const m = line.match(TRAP_ITEM_HEADING);
    if (!m || claimed.has(i + 1)) return;
    if (!/^#{3,6}\s/.test(line)) return;
    if (skips.some((s) => s.line === i + 1)) return;
    skips.push({
      skill,
      line: i + 1,
      number: Number(m[1]),
      text: line.trim().slice(0, 80),
      reason: 'numbered sub-heading outside any "Traps" section — it continues the trap numbering but has no id, so it cannot be cited or dispositioned',
    });
  });
  skips.sort((a, b) => a.line - b.line);

  return { traps, skips };
}

/**
 * Just the traps, as an array.
 *
 * Kept as the module's original signature on purpose: `scripts/__tests__/
 * trap-index.test.mjs` imports it and asserts on `.length`. Widening a
 * published function's return shape to add a second output is exactly the kind
 * of silent break this repo's gates exist to catch, so the new output got a
 * new name instead.
 */
export function extractTraps(markdown, skill) {
  return extractTrapSection(markdown, skill).traps;
}

/**
 * The `canonical: <id>` cross-reference in a deduplicated trap's body, if any.
 *
 * Matched against the body JOINED and whitespace-collapsed, not line by line:
 * these files are hard-wrapped at ~90 columns, so `canonical:` and the id it
 * names land on different lines about half the time. A per-line match found two
 * of the four real cross-references and silently dropped the rest — precisely
 * the undercount this module already learned to distrust.
 */
export function canonicalRef(bodyLines) {
  const m = bodyLines.join(' ').replace(/\s+/g, ' ').match(CANONICAL_REF);
  return m ? m[1] : null;
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

/**
 * The effective disposition, and any problem with the curated one.
 *
 * `evaluated` is DERIVED from coverage, never accepted as an assertion: if a
 * trap could claim to be evaluated while no case cites it, the claim would
 * outlive the case that justified it — which is the ledger-drift failure
 * `check-judgement-ledger.mjs` exists to prevent, one level up.
 */
export function resolveDisposition(curated, coveredBy) {
  const covered = coveredBy.length > 0;
  if (curated === 'gated' || curated === 'superseded') return { disposition: curated, problem: null };
  if (covered) return { disposition: 'evaluated', problem: null };
  if (curated === 'evaluated') {
    return {
      disposition: 'evaluated',
      problem: {
        kind: 'coverage-lost',
        detail: 'claims `evaluated` but no eval case cites it. Restore the case, or set the disposition to `open` — an unchecked trap is an honest state, a phantom eval is not.',
      },
    };
  }
  if (curated === 'open') return { disposition: 'open', problem: null };
  if (!curated) {
    return {
      disposition: null,
      problem: {
        kind: 'no-disposition',
        detail: 'a new trap with no lifecycle. Add `"disposition": "open"` (nothing checks it yet), `"gated"` with a `gate`, or `"superseded"` with a `supersededBy`.',
      },
    };
  }
  return {
    disposition: null,
    problem: {
      kind: 'unknown-disposition',
      detail: `"${curated}" is not one of: ${Object.keys(DISPOSITIONS).join(', ')}.`,
    },
  };
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

/** Curation from the tracked index, keyed by trap id. */
function existingCuration() {
  if (!existsSync(OUT)) return new Map();
  let prior;
  try {
    prior = JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    return new Map();
  }
  const map = new Map();
  for (const t of prior.traps ?? []) {
    const carried = {};
    for (const k of CURATED_KEYS) if (t[k] !== undefined && t[k] !== null) carried[k] = t[k];
    map.set(t.id, carried);
  }
  return map;
}

/**
 * The CLI body, guarded so this module can be IMPORTED for its pure
 * functions (extractTraps / citedTraps / resolveDisposition) without running
 * the whole indexer. Its self-test imports them; without this guard that
 * import would walk the skills, print a report and, in --check mode, call
 * process.exit.
 */
function main() {
  const traps = [];
  const skips = [];
  for (const skill of SKILLS) {
    const file = join(REPO_ROOT, '.claude', 'skills', skill, 'SKILL.md');
    if (!existsSync(file)) continue;
    const found = extractTrapSection(readFileSync(file, 'utf8'), skill);
    traps.push(...found.traps);
    skips.push(...found.skips);
  }

  const cases = evalCaseTexts();
  const coverage = new Map();
  for (const { caseId, text } of cases) {
    for (const trapId of citedTraps(text)) {
      if (!coverage.has(trapId)) coverage.set(trapId, []);
      coverage.get(trapId).push(caseId);
    }
  }

  const curation = existingCuration();
  const ids = new Set(traps.map((t) => t.id));
  const problems = [];

  const entries = traps.map((t) => {
    const carried = curation.get(t.id) ?? {};
    const coveredBy = coverage.get(t.id) ?? [];
    const { disposition, problem } = resolveDisposition(carried.disposition, coveredBy);
    if (problem) problems.push({ id: t.id, ...problem });

    // A `gated` trap must name a gate that exists and say how it fails.
    if (disposition === 'gated') {
      const gate = carried.gate;
      if (!gate || !gate.script) {
        problems.push({ id: t.id, kind: 'gate-missing', detail: 'disposition is `gated` but no `gate.script` names the check that replaced the prose.' });
      } else if (!existsSync(join(REPO_ROOT, gate.script))) {
        problems.push({
          id: t.id,
          kind: 'gate-not-on-disk',
          detail: `\`gated\` by ${gate.script}, which does not exist. The gate was renamed or deleted; the trap is unprotected while claiming otherwise.`,
        });
      } else if (!gate.fails || String(gate.fails).trim().length < 10) {
        problems.push({ id: t.id, kind: 'gate-unexplained', detail: `${gate.script} is named but \`gate.fails\` does not say how it fails. "A script exists" is not a gate.` });
      }
    } else if (carried.gate) {
      problems.push({ id: t.id, kind: 'gate-without-gated', detail: 'carries a `gate` but its disposition is not `gated`.' });
    }

    // Prose that retires a trap must be matched by the lifecycle.
    const retiredInProse = SUPERSEDED_TITLE.test(t.title);
    if (retiredInProse && disposition !== 'superseded') {
      problems.push({
        id: t.id,
        kind: 'superseded-in-prose-only',
        detail: `the title says ${t.title.match(SUPERSEDED_TITLE)[1]} but the disposition is \`${disposition ?? 'none'}\`. Set \`"disposition": "superseded"\` and name what replaced it in \`supersededBy\`.`,
      });
    }
    if (disposition === 'superseded' && !carried.supersededBy) {
      problems.push({ id: t.id, kind: 'superseded-without-replacement', detail: 'disposition is `superseded` but nothing names what replaced it.' });
    }

    const canonical = canonicalRef(t.body);
    if (canonical && !ids.has(canonical)) {
      problems.push({ id: t.id, kind: 'canonical-unresolved', detail: `cross-references \`${canonical}\`, which is not a trap in any skill. Deduplication must point at a live id.` });
    }
    if (canonical === t.id) {
      problems.push({ id: t.id, kind: 'canonical-self', detail: 'cross-references itself.' });
    }

    return {
      id: t.id,
      skill: t.skill,
      number: t.number,
      title: t.title,
      line: t.line,
      disposition,
      canonical: canonical ?? null,
      gate: carried.gate ?? null,
      supersededBy: carried.supersededBy ?? null,
      coveredBy,
      provenance: carried.provenance ?? null,
    };
  });

  entries.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

  const byDisposition = {};
  for (const d of Object.keys(DISPOSITIONS)) byDisposition[d] = entries.filter((e) => e.disposition === d).length;

  const index = {
    schemaVersion: 2,
    $comment:
      'Generated by scripts/ai-readiness/build-trap-index.mjs. `disposition`, `gate`, `supersededBy` and `provenance` are HAND-OWNED and carried forward on every rebuild; everything else is re-derived from the skills and the eval fixtures. `evaluated` is derived from `coveredBy` and must never be hand-written. The counts below are a GAP REPORT, not a score — driving `open` down by deleting traps instead of gating them is the failure this file exists to make visible.',
    dispositions: DISPOSITIONS,
    totals: {
      traps: entries.length,
      bySkill: Object.fromEntries(SKILLS.map((s) => [s, entries.filter((t) => t.skill === s).length])),
      covered: entries.filter((t) => t.coveredBy.length).length,
      byDisposition,
      deduplicated: entries.filter((t) => t.canonical).length,
    },
    // Trap-shaped lines the extractor could not turn into an id. Named rather
    // than dropped: a trap missing from the denominator makes the gap look
    // smaller than it is.
    skips,
    traps: entries,
  };

  const serialized = `${JSON.stringify(index, null, 2)}\n`;

  if (JSON_OUT) {
    console.log(JSON.stringify({ ...index, problems }, null, 2));
    if (CHECK) process.exit(problems.length ? 1 : 0);
    return;
  }

  if (CHECK) {
    if (problems.length) {
      console.error(`[traps] FAIL — ${problems.length} lifecycle problem(s):`);
      for (const p of problems) console.error(`  ${p.kind.padEnd(28)} ${p.id}\n      ${p.detail}`);
      console.error('\nEdit .altitude/ai-readiness/trap-index.json (the curated half), then re-run with --write.');
      process.exit(1);
    }
    if (!existsSync(OUT)) {
      console.error(`[traps] ${OUT} does not exist — run with --write.`);
      process.exit(1);
    }
    if (readFileSync(OUT, 'utf8') !== serialized) {
      console.error('[traps] DRIFT — the trap index is not what the skills + eval fixtures + curation currently produce.');
      console.error('Re-run with --write and commit the result.');
      process.exit(1);
    }
    console.log(
      `[traps] ok — ${index.totals.traps} traps, all dispositioned `
        + `(${Object.entries(byDisposition).map(([d, n]) => `${n} ${d}`).join(', ')}), matches disk.`
    );
    process.exit(0);
  }

  console.log(`[traps] ${index.totals.traps} numbered traps across ${SKILLS.length} skills`);
  for (const [skill, n] of Object.entries(index.totals.bySkill)) console.log(`  ${String(n).padStart(2)}  ${skill}`);
  console.log('[traps] lifecycle:');
  for (const [d, n] of Object.entries(byDisposition)) console.log(`  ${String(n).padStart(2)}  ${d.padEnd(11)} ${DISPOSITIONS[d]}`);
  console.log(`[traps] ${index.totals.deduplicated} trap(s) are cross-references to a canonical statement elsewhere`);
  const cited = entries.filter((t) => t.coveredBy.length);
  for (const t of cited) console.log(`  evaluated  ${t.id.padEnd(28)} ${t.title.slice(0, 55)}`);
  if (skips.length) {
    console.log(`\n[traps] SKIPPED — ${skips.length} trap-shaped line(s) with no extractable id:`);
    for (const s of skips) console.log(`  ${s.skill}:${s.line}  ${s.text}`);
    console.log('  (give it a **bold title** to bring it into the index — that changes the denominator, so re-pin the self-test with it)');
  }
  if (problems.length) {
    console.log(`\n[traps] ${problems.length} lifecycle problem(s) — --check would fail:`);
    for (const p of problems) console.log(`  ${p.kind.padEnd(28)} ${p.id}  ${p.detail}`);
  }
  console.log('[traps] these numbers are a GAP REPORT, not a score — `open` is meant to be high until gates and cases exist.');

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
