#!/usr/bin/env node
// Judge + synthesize a completed fleet run.
//
// Reads all attempt files in <runDir>/attempts/*.json, asks Claude (via the
// claude CLI) to score each task's attempts against the ground-truth digests,
// then asks Claude to synthesize an overall readiness score + recommendations.
// Writes report.json and REPORT.md into <runDir>/.
//
// Usage:
//   node scripts/ai-readiness/run-judge.mjs <runDir>
//   CLAUDE_BIN=/custom/path/claude node scripts/ai-readiness/run-judge.mjs <runDir>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBinary, runChild, extractJson } from './lib.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const SCRIPT_DIR = resolve(fileURLToPath(import.meta.url), '..');

const RUN_DIR = process.argv[2];
if (!RUN_DIR) {
  console.error('Usage: node run-judge.mjs <runDir>');
  process.exit(2);
}

const claude = findBinary('claude', 'CLAUDE_BIN');
if (!claude) { console.error('claude binary not found'); process.exit(2); }
console.log(`[discover] claude → ${claude}`);

// Load attempts grouped by task
const attemptsDir = resolve(RUN_DIR, 'attempts');
const files = readdirSync(attemptsDir).filter(f => f.endsWith('.json'));
const byTask = {};
for (const f of files) {
  const a = JSON.parse(readFileSync(resolve(attemptsDir, f), 'utf8'));
  (byTask[a.taskId] = byTask[a.taskId] || []).push(a);
}

const JUDGE_SCHEMA = JSON.stringify({
  type: 'object',
  required: ['taskId', 'perAttempt', 'commonFailures', 'docGaps'],
  additionalProperties: false,
  properties: {
    taskId: { type: 'string' },
    perAttempt: {
      type: 'array',
      items: {
        type: 'object',
        required: ['attemptLabel', 'model', 'scores', 'verdict', 'specificFailures'],
        additionalProperties: false,
        properties: {
          attemptLabel: { type: 'string' },
          model: { type: 'string' },
          scores: {
            type: 'object',
            additionalProperties: false,
            required: ['correctness', 'conventionCompliance', 'completeness', 'hallucinationCount', 'sourceFilesRead'],
            properties: {
              correctness: { type: 'number', minimum: 0, maximum: 10 },
              conventionCompliance: { type: 'number', minimum: 0, maximum: 10 },
              completeness: { type: 'number', minimum: 0, maximum: 10 },
              hallucinationCount: { type: 'number', minimum: 0 },
              sourceFilesRead: { type: 'number', minimum: 0 },
            },
          },
          verdict: { type: 'string' },
          specificFailures: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    commonFailures: { type: 'array', items: { type: 'string' } },
    docGaps: {
      type: 'array',
      items: {
        type: 'object',
        required: ['gap', 'where', 'recommendation'],
        additionalProperties: false,
        properties: {
          gap: { type: 'string' },
          where: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
    perModelSummary: {
      type: 'object',
      description: 'avg scores broken out by model: { claude: {...}, codex: {...} }',
    },
  },
});

const SYNTHESIS_SCHEMA = JSON.stringify({
  type: 'object',
  required: ['overallReadinessScore', 'taskBreakdown', 'topFailureModes', 'topRecommendations', 'repeatability'],
  additionalProperties: false,
  properties: {
    overallReadinessScore: { type: 'number', minimum: 0, maximum: 100 },
    taskBreakdown: {
      type: 'array',
      items: {
        type: 'object',
        required: ['taskId', 'score', 'commentary'],
        additionalProperties: false,
        properties: {
          taskId: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          commentary: { type: 'string' },
        },
      },
    },
    crossModelComparison: { type: 'string', description: 'Where claude and codex agreed/diverged' },
    topFailureModes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['failureMode', 'frequency', 'impact'],
        additionalProperties: false,
        properties: {
          failureMode: { type: 'string' },
          frequency: { type: 'string' },
          impact: { type: 'string' },
        },
      },
    },
    topRecommendations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['recommendation', 'targetFile', 'expectedImpact'],
        additionalProperties: false,
        properties: {
          recommendation: { type: 'string' },
          targetFile: { type: 'string' },
          expectedImpact: { type: 'string' },
        },
      },
    },
    repeatability: { type: 'string' },
  },
});

// Claude CLI with --json-schema in `--output-format json` returns a result
// envelope. The validated structured output lives at result.structured_output.
async function askClaude(prompt, schemaJson, label) {
  const args = ['--print', '--output-format', 'json', '--json-schema', schemaJson, prompt];
  const res = await runChild(claude, args, { timeoutMs: 12 * 60 * 1000 });
  let parsed = null;
  try {
    const envelope = JSON.parse(res.stdout);
    parsed = envelope.structured_output ?? extractJson(envelope.result ?? '');
  } catch {
    parsed = extractJson(res.stdout);
  }
  if (!parsed) {
    const dumpPath = `/tmp/ai-readiness-${label.replace(/[^\w-]/g, '_')}-raw.txt`;
    try { writeFileSync(dumpPath, res.stdout); } catch {}
    console.error(`[${label}] failed to extract structured output. exit=${res.exitCode} stdout=${res.stdout.length}B → ${dumpPath}`);
    console.error(`  first 200 chars: ${res.stdout.slice(0, 200).replace(/\n/g, ' ')}`);
  }
  return { parsed, raw: res.stdout, exitCode: res.exitCode };
}

async function judgeTask(taskId, attempts) {
  const valid = attempts.filter(a => a.parsed).map(a => ({
    label: a.label, model: a.model, attempt: a.attempt, output: a.parsed,
  }));
  if (valid.length === 0) {
    return { taskId, perAttempt: [], commonFailures: ['no attempts parsed'], docGaps: [] };
  }
  const prompt = `You are scoring AI-agent attempts at an Altitude design-system task.

# Task
${readFileSync(resolve(SCRIPT_DIR, 'tasks', `${taskId.split('-')[0]}-${taskId.split('-')[1]}.md`), 'utf8').replace(/\{\{ATTEMPT\}\}/g, 'JUDGED')}

# Attempts (mixed models: claude + codex)
${valid.map((a, i) => `## Attempt ${i + 1} (label=${a.label}, model=${a.model})\n\`\`\`json\n${JSON.stringify(a.output, null, 2)}\n\`\`\``).join('\n\n')}

# Ground truth
- CEM digest: ${ROOT}/.altitude/ai-readiness/cem-digest.json (also /tmp). Verify tag/attr/slot/event/enum-value claims. Every tag carries a \`doNotFlag\` array of machine-readable sanctioned patterns reviewers MUST NOT cite as violations — if an attempt's "violations" array reports a finding that matches a doNotFlag pattern for the component under review, count it as a FALSE POSITIVE and dock conventionCompliance accordingly.
- Tokens digest: ${ROOT}/.altitude/ai-readiness/tokens-digest.json (also /tmp). Verify every --al-* token name.
- Altitude docs: ${ROOT}/CLAUDE.md, ${ROOT}/AGENTS.md, ${ROOT}/MIGRATION.md
- Source: ${ROOT}/libs/al-web-components/components/

# Your job
Score each attempt 0–10 on correctness / conventionCompliance / completeness. Count fabricated tags / attrs / slots / events / enum-values / token names in hallucinationCount. Count files read beyond docs+digests in sourceFilesRead. Identify commonFailures across attempts and docGaps (point at specific file paths) where filling the gap would prevent these mistakes. Set taskId="${taskId}".

**For Task C specifically:** any finding that matches a \`doNotFlag\` rule for the component under review is a FALSE POSITIVE — list it in \`specificFailures\` as "false positive: <pattern>" and apply a meaningful conventionCompliance penalty (typically -1 to -2 per false positive, capped at 0). Do not double-penalize the same false positive across attempts in commonFailures.

If both claude and codex attempts are present, fill perModelSummary with avg scores per model so the synthesizer can compare distributions.

Return JSON matching the judge schema.`;
  console.log(`[judge ] ${taskId} (${valid.length} attempts)...`);
  const r = await askClaude(prompt, JUDGE_SCHEMA, `judge:${taskId}`);
  return r.parsed || { taskId, perAttempt: [], commonFailures: ['judge failed'], docGaps: [] };
}

async function main() {
  const judgements = {};
  for (const [taskId, attempts] of Object.entries(byTask)) {
    judgements[taskId] = await judgeTask(taskId, attempts);
    writeFileSync(resolve(RUN_DIR, `judge-${taskId}.json`), JSON.stringify(judgements[taskId], null, 2));
  }

  const synthPrompt = `You are synthesizing AI-readiness probe results for the Altitude design system.

This run used multiple models (claude + codex) in parallel for the fleet phase — a true cross-model probe of how well the docs+manifest let an AI consumer build correctly.

# Per-task judgements
\`\`\`json
${JSON.stringify(judgements, null, 2)}
\`\`\`

# Your job
1. Compute overallReadinessScore (0–100): how AI-ready the design system is RIGHT NOW.
2. taskBreakdown: per-task score (0–100) + a short commentary noting where claude vs codex diverged.
3. crossModelComparison: one paragraph on how the two models' attempts differed — what does that tell us about the docs?
4. topFailureModes (3–5): most damaging recurring failure modes.
5. topRecommendations: prioritized concrete file edits. Each tied to a specific file path under the repo, ordered by expected impact.
6. repeatability: plain-English instructions for re-running this probe.

Return JSON matching the synthesis schema.`;
  console.log('[synth ] synthesizing across tasks...');
  const synth = await askClaude(synthPrompt, SYNTHESIS_SCHEMA, 'synthesize');
  const synthesis = synth.parsed || { overallReadinessScore: 0, taskBreakdown: [], topFailureModes: [], topRecommendations: [], repeatability: '' };

  const report = { runId: basename(RUN_DIR), judgements, synthesis };
  writeFileSync(resolve(RUN_DIR, 'report.json'), JSON.stringify(report, null, 2));

  // Human-readable summary
  let md = `# AI-Readiness Probe — ${report.runId}\n\n`;
  md += `## Overall: **${synthesis.overallReadinessScore} / 100**\n\n`;
  md += `| Task | Score | Commentary |\n|---|---|---|\n`;
  for (const t of synthesis.taskBreakdown || []) {
    md += `| ${t.taskId} | ${t.score} | ${t.commentary.replace(/\n/g, ' ')} |\n`;
  }
  if (synthesis.crossModelComparison) {
    md += `\n## Cross-model comparison\n\n${synthesis.crossModelComparison}\n`;
  }
  md += `\n## Top failure modes\n\n`;
  for (const f of synthesis.topFailureModes || []) {
    md += `- **${f.failureMode}** — freq: ${f.frequency} — impact: ${f.impact}\n`;
  }
  md += `\n## Top recommendations\n\n`;
  for (const r of synthesis.topRecommendations || []) {
    md += `- **${r.targetFile}** — ${r.recommendation}  _(expected: ${r.expectedImpact})_\n`;
  }
  md += `\n## Repeatability\n\n${synthesis.repeatability || ''}\n`;
  writeFileSync(resolve(RUN_DIR, 'REPORT.md'), md);

  console.log(`\n=== synthesized ===`);
  console.log(`Overall: ${synthesis.overallReadinessScore}`);
  for (const t of synthesis.taskBreakdown || []) console.log(`  ${t.taskId}: ${t.score}`);
  console.log(`\nReport: ${resolve(RUN_DIR, 'REPORT.md')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
