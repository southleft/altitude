#!/usr/bin/env node
// Distill a completed (or partial) fleet run into the compact, diffable
// scorecard tracked at .altitude/ai-readiness/runs/baseline/scorecard.json.
//
// Why this exists: the harness has always produced rich per-run artifacts
// (attempts/*.json, run.json, judge-*.json, report.json, REPORT.md) but
// never a small stable-schema summary that's cheap to commit and diff in a
// PR. Those per-run artifacts stay gitignored (can be multi-megabyte); this
// script reads them and writes the durable, tracked summary.
//
// A run that only completed the fleet phase (no run-judge.mjs pass yet —
// e.g. because judging was skipped to stay under a cost cap) still produces
// a scorecard, with status "unjudged" and null scores, rather than nothing.
// A null score means "not measured", never a fabricated number.
//
// R8 — score history over time: pass --append-history to ALSO append a
// compact, append-only record to .altitude/ai-readiness/history.jsonl,
// keyed by harness version (git SHA) + date, one JSON object per line so a
// PR diff shows exactly the lines a new run added. Treatment arms
// (mcp-off/mcp-on/with-skill — see lib/treatment.mjs) are first-class in
// each record via `byTreatment`, since the point of tracking history is
// comparing arms over time, not just a single blended number.
//
// Usage:
//   node scripts/ai-readiness/build-scorecard.mjs <runDir> [--out <path>] [--append-history]
//
// Writes: .altitude/ai-readiness/runs/baseline/scorecard.json (default)
//         .altitude/ai-readiness/history.jsonl (only with --append-history)

import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const DEFAULT_OUT = resolve(ROOT, '.altitude/ai-readiness/runs/baseline/scorecard.json');
const HISTORY_PATH = resolve(ROOT, '.altitude/ai-readiness/history.jsonl');

const argv = process.argv.slice(2);
const runDirArg = argv.find((a) => !a.startsWith('--'));
if (!runDirArg) {
  console.error('Usage: node scripts/ai-readiness/build-scorecard.mjs <runDir> [--out <path>] [--append-history]');
  process.exit(2);
}
const runDir = resolve(runDirArg);
const outFlagIdx = argv.indexOf('--out');
const outPath = outFlagIdx !== -1 && argv[outFlagIdx + 1] ? resolve(argv[outFlagIdx + 1]) : DEFAULT_OUT;
const APPEND_HISTORY = argv.includes('--append-history');

function gitShortSha() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const runJsonPath = resolve(runDir, 'run.json');
if (!existsSync(runJsonPath)) {
  console.error(`No run.json at ${runJsonPath} — is this a valid run dir (from run-probe.mjs)?`);
  process.exit(2);
}
const run = JSON.parse(readFileSync(runJsonPath, 'utf8'));

const reportPath = resolve(runDir, 'report.json');
const hasReport = existsSync(reportPath);
const report = hasReport ? JSON.parse(readFileSync(reportPath, 'utf8')) : null;

const taskScores = {};
// taskId -> treatment -> judged score (R3/R8: treatment arms first-class).
// Falls back to a bare taskId key with treatment "mcp-off" for judgements
// produced before the treatment axis landed (backward compatible with any
// already-committed report.json).
const treatmentScores = {};
for (const t of report?.synthesis?.taskBreakdown ?? []) {
  taskScores[t.taskId] = t.score; // legacy/blended field, kept for existing consumers
  const treatment = t.treatment || 'mcp-off';
  (treatmentScores[t.taskId] = treatmentScores[t.taskId] || {})[treatment] = t.score;
}

// Deterministic-grader + cost + latency + axe rollups, straight from the
// attempt files (R4/R6) — available even on an "unjudged" scorecard, since
// none of these require the LLM judge phase to have run.
const attemptsDir = resolve(runDir, 'attempts');
const deterministicByTreatment = {};
if (existsSync(attemptsDir)) {
  const files = readdirSync(attemptsDir).filter((f) => f.endsWith('.json'));
  const buckets = {};
  for (const f of files) {
    const a = JSON.parse(readFileSync(resolve(attemptsDir, f), 'utf8'));
    const treatment = a.treatment || 'mcp-off';
    const b = (buckets[treatment] = buckets[treatment] || { costs: [], latencies: [], graderScores: [], axeCounts: [], processPassed: 0, processApplicable: 0 });
    if (typeof a.costUsd === 'number') b.costs.push(a.costUsd);
    if (typeof a.latencyMs === 'number') b.latencies.push(a.latencyMs);
    if (typeof a.grader?.score === 'number') b.graderScores.push(a.grader.score);
    if (typeof a.axe?.violationCount === 'number') b.axeCounts.push(a.axe.violationCount);
    if (a.processAssertion?.applicable) {
      b.processApplicable++;
      if (a.processAssertion.passed) b.processPassed++;
    }
  }
  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  for (const [treatment, b] of Object.entries(buckets)) {
    deterministicByTreatment[treatment] = {
      avgCostUsd: avg(b.costs),
      avgLatencyMs: avg(b.latencies),
      avgGraderScore: avg(b.graderScores),
      avgAxeViolationCount: avg(b.axeCounts),
      processAssertionPassRate: b.processApplicable ? b.processPassed / b.processApplicable : null,
    };
  }
}

const scorecard = {
  schemaVersion: 2,
  runId: run.runId,
  generatedAt: new Date().toISOString(),
  harnessVersion: gitShortSha(),
  config: run.config,
  status: hasReport ? 'judged' : 'unjudged',
  overallReadinessScore: report?.synthesis?.overallReadinessScore ?? null,
  taskScores,
  treatmentScores,
  deterministicByTreatment,
  fleetSummary: run.summary,
  ...(hasReport ? {} : {
    note: 'Fleet phase completed but the judge/synthesis phase (run-judge.mjs) was not run for this scorecard — task/overall scores are null by design, not zero. See run.json in the (gitignored) run directory for the raw per-attempt results this scorecard was distilled from.',
  }),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(scorecard, null, 2) + '\n');
console.log(`Wrote scorecard: ${outPath}`);
console.log(`  status: ${scorecard.status}`);
console.log(`  overallReadinessScore: ${scorecard.overallReadinessScore}`);

if (APPEND_HISTORY) {
  const historyEntry = {
    schemaVersion: 1,
    date: new Date().toISOString().slice(0, 10),
    generatedAt: scorecard.generatedAt,
    harnessVersion: scorecard.harnessVersion,
    runId: scorecard.runId,
    status: scorecard.status,
    overallReadinessScore: scorecard.overallReadinessScore,
    byTreatment: Object.fromEntries(
      [...new Set([...Object.values(treatmentScores).flatMap((t) => Object.keys(t)), ...Object.keys(deterministicByTreatment)])].map((treatment) => [
        treatment,
        {
          judgedTaskScores: Object.fromEntries(Object.entries(treatmentScores).filter(([, byT]) => treatment in byT).map(([taskId, byT]) => [taskId, byT[treatment]])),
          ...(deterministicByTreatment[treatment] || {}),
        },
      ]),
    ),
  };
  mkdirSync(dirname(HISTORY_PATH), { recursive: true });
  appendFileSync(HISTORY_PATH, JSON.stringify(historyEntry) + '\n');
  console.log(`Appended history entry: ${HISTORY_PATH}`);
}
