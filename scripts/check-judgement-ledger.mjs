#!/usr/bin/env node
/**
 * check-judgement-ledger.mjs — is `.altitude/judgement-ledger.json` still true?
 *
 *   node scripts/check-judgement-ledger.mjs [--json]
 *
 * T12, spec 2026-08-29-parity-judgement-gates-and-evals (R8).
 *
 * The 13 judgement points in that ledger were found by a one-off read-only
 * sweep. Nothing would surface the 14th — somebody adds a new "decide with a
 * human" handoff or a new curation key, and it joins the pile of decisions
 * nobody checks, invisibly. This is the thing that makes it visible.
 *
 * Two checks, both offline and zero-dependency:
 *
 *   1. ANCHORS RESOLVE. Every ledger point names a file and a distinctive
 *      string in it. If the string is gone, the ledger has drifted from the
 *      code — the comment was reworded, the branch moved, or the judgement
 *      point was removed — and the entry is describing something that no
 *      longer exists. That is exactly as bad as an unrecorded point: a ledger
 *      nobody can trust is a ledger nobody reads.
 *
 *   2. NO UNRECORDED MARKERS. This repository already marks its own judgement
 *      calls in prose ("a documented judgment call", "not a derivable fact",
 *      "decide with a human"). Every FILE carrying such a marker must either
 *      back a ledger point or appear in `markerFilesAcknowledged`. A new file
 *      with a marker fails the check until somebody decides which it is.
 *
 * Deliberately file-level, not line-level. Line numbers churn on every edit,
 * and a checker that cried wolf on every reformat would be turned off within a
 * week — which is how the repo lost the mcp-smoke test for months.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { hasFlag } from './lib/argv.mjs';
import { REPO_ROOT } from '../libs/altitude-mcp/src/lib/paths.mjs';

const JSON_OUT = hasFlag('--json');
const LEDGER = join(REPO_ROOT, '.altitude', 'judgement-ledger.json');

/**
 * The prose this repo uses when it is recording a judgement call.
 *
 * Drawn from the real comments, not invented: `component-config.mjs` says
 * "JUDGMENT CALLS" and "a judgment call per component pair, not a derivable
 * fact"; `parity.mjs` says "Decide with a human".
 */
const MARKERS = [
  /judgment call/i,
  /judgement call/i,
  /decide with a human/i,
  /not a derivable fact/i,
];

const SEARCH_ROOTS = [
  join(REPO_ROOT, 'scripts'),
  join(REPO_ROOT, 'libs', 'altitude-mcp', 'src'),
];

// Never walk into these. `.claude/worktrees/` in particular holds whole-repo
// snapshots — an unscoped walk reports every marker several times over and
// makes findings look like new code (CLAUDE.md § Repo hygiene).
const SKIP_DIRS = new Set(['node_modules', 'worktrees', 'dist', '__fixtures__', '__tests__', 'runs']);

/**
 * Test files are scaffolding, not pipeline code.
 *
 * Found the hard way: this checker's own self-test quotes the marker phrases
 * (it writes a synthetic file containing "judgment call" to prove the checker
 * goes red), so scanning tests made the checker permanently fail on itself.
 * A ledger point is a decision the PIPELINE makes; a test that describes one
 * is not a second instance of it.
 */
const isTestFile = (name) => name.endsWith('.test.mjs') || name.endsWith('.test.js');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if ((entry.endsWith('.mjs') || entry.endsWith('.js')) && !isTestFile(entry)) out.push(full);
  }
  return out;
}

const rel = (p) => relative(REPO_ROOT, p).split(sep).join('/');

if (!existsSync(LEDGER)) {
  console.error(`[judgement-ledger] missing: ${rel(LEDGER)}`);
  process.exit(1);
}
const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'));
const problems = [];

// ── 1. anchors resolve ────────────────────────────────────────────────────
for (const point of ledger.points ?? []) {
  const file = join(REPO_ROOT, point.location);
  if (!existsSync(file)) {
    problems.push({ kind: 'missing-file', id: point.id, detail: `${point.location} does not exist` });
    continue;
  }
  if (!readFileSync(file, 'utf8').includes(point.anchor)) {
    problems.push({
      kind: 'anchor-lost',
      id: point.id,
      detail: `${point.location} no longer contains "${point.anchor}" — the ledger entry describes something that has moved or been removed`,
    });
  }
}

// ── 2. no unrecorded markers ──────────────────────────────────────────────
const recorded = new Set([
  ...(ledger.points ?? []).map((p) => p.location),
  ...(ledger.markerFilesAcknowledged ?? []),
]);
// This checker's own MARKERS array would otherwise flag itself.
recorded.add('scripts/check-judgement-ledger.mjs');

const marked = [];
for (const root of SEARCH_ROOTS) {
  for (const file of walk(root)) {
    const text = readFileSync(file, 'utf8');
    if (!MARKERS.some((re) => re.test(text))) continue;
    const path = rel(file);
    marked.push(path);
    if (!recorded.has(path)) {
      problems.push({
        kind: 'unrecorded-marker',
        id: null,
        detail: `${path} records a judgement call in a comment but is not in the ledger. Add a point for it, or add it to markerFilesAcknowledged with a reason.`,
      });
    }
  }
}

// ── report ────────────────────────────────────────────────────────────────
const byDisposition = {};
for (const p of ledger.points ?? []) byDisposition[p.disposition] = (byDisposition[p.disposition] ?? 0) + 1;

if (JSON_OUT) {
  console.log(JSON.stringify({ points: (ledger.points ?? []).length, byDisposition, markerFiles: marked, problems }, null, 2));
} else {
  console.log(`[judgement-ledger] ${(ledger.points ?? []).length} judgement point(s)`);
  for (const [d, n] of Object.entries(byDisposition).sort()) console.log(`  ${String(n).padStart(2)}  ${d}`);
  console.log(`[judgement-ledger] ${marked.length} source file(s) carry a judgement-call marker, all accounted for${problems.length ? ' — except:' : ''}`);
  for (const p of problems) console.log(`  ${p.kind.padEnd(19)} ${p.id ? p.id + ' — ' : ''}${p.detail}`);
  const open = (ledger.points ?? []).filter((p) => p.disposition === 'open');
  if (open.length) {
    console.log(`\n[judgement-ledger] ${open.length} point(s) still have NOTHING checking them:`);
    for (const p of open) console.log(`  ${p.id}  ${p.decision}`);
    console.log('  (that is the honest state, not a failure — this check exists so it stays visible)');
  }
}

process.exit(problems.length ? 1 : 0);
