#!/usr/bin/env node
// Judge + synthesize a completed fleet run.
//
// Reads all attempt files in <runDir>/attempts/*.json, asks Claude (via the
// claude CLI) to score each task+treatment's attempts against the
// ground-truth digests, then asks Claude to synthesize an overall readiness
// score + recommendations. Writes report.json and REPORT.md into <runDir>/.
//
// Usage:
//   node scripts/ai-readiness/run-judge.mjs <runDir>
//   CLAUDE_BIN=/custom/path/claude node scripts/ai-readiness/run-judge.mjs <runDir>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBinary, runChild, extractJson, TMPDIR } from './lib.mjs';
import { taskById } from './lib/tasks-registry.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const SCRIPT_DIR = resolve(fileURLToPath(import.meta.url), '..');
const CEM_DIGEST_TMP = resolve(TMPDIR, 'ai-readiness-cem-digest.json');
const TOKENS_DIGEST_TMP = resolve(TMPDIR, 'ai-readiness-tokens-digest.json');

const RUN_DIR = process.argv[2];
if (!RUN_DIR) {
  console.error('Usage: node run-judge.mjs <runDir>');
  process.exit(2);
}

const claude = findBinary('claude', 'CLAUDE_BIN');
if (!claude) { console.error('claude binary not found'); process.exit(2); }
console.log(`[discover] claude → ${claude}`);

// Load attempts grouped by (taskId, treatment) — R3: "Scores must be
// comparable across arms" requires the judge to score each treatment arm
// separately, not average mcp-off/mcp-on/with-skill attempts together into
// one indistinguishable bucket.
const attemptsDir = resolve(RUN_DIR, 'attempts');
const files = readdirSync(attemptsDir).filter(f => f.endsWith('.json'));
const byTaskTreatment = {};
for (const f of files) {
  const a = JSON.parse(readFileSync(resolve(attemptsDir, f), 'utf8'));
  // treatment is a field on every attempt written by run-probe.mjs since
  // the treatment axis landed; attempts from before that (or a
  // hand-crafted fixture) fall back to 'mcp-off' rather than throwing.
  const treatment = a.treatment || 'mcp-off';
  const key = `${a.taskId}::${treatment}`;
  (byTaskTreatment[key] = byTaskTreatment[key] || { taskId: a.taskId, treatment, attempts: [] }).attempts.push(a);
}

const JUDGE_SCHEMA = JSON.stringify({
  type: 'object',
  required: ['taskId', 'treatment', 'perAttempt', 'commonFailures', 'docGaps'],
  additionalProperties: false,
  properties: {
    taskId: { type: 'string' },
    treatment: { type: 'string' },
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
        required: ['taskId', 'treatment', 'score', 'commentary'],
        additionalProperties: false,
        properties: {
          taskId: { type: 'string' },
          treatment: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          commentary: { type: 'string' },
        },
      },
    },
    crossModelComparison: { type: 'string', description: 'Where claude and codex agreed/diverged' },
    crossTreatmentComparison: { type: 'string', description: 'Where mcp-off / mcp-on / with-skill agreed or diverged, and by how much — the R3 headline result' },
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
    const dumpPath = resolve(TMPDIR, `ai-readiness-${label.replace(/[^\w-]/g, '_')}-raw.txt`);
    try { writeFileSync(dumpPath, res.stdout); } catch {}
    console.error(`[${label}] failed to extract structured output. exit=${res.exitCode} stdout=${res.stdout.length}B → ${dumpPath}`);
    console.error(`  first 200 chars: ${res.stdout.slice(0, 200).replace(/\n/g, ' ')}`);
  }
  return { parsed, raw: res.stdout, exitCode: res.exitCode };
}

async function judgeTaskTreatment(taskId, treatment, attempts) {
  // DEFECT FIXED (wave-1 survey, this file:174 in the pre-wave-2 version):
  // the prompt filename used to be reconstructed from taskId by splitting
  // on '-' and taking the first two segments
  // (`taskId.split('-')[0] + '-' + taskId.split('-')[1] + '.md'`). That
  // happened to work for 'A-composition' but silently read the WRONG FILE
  // for any taskId shaped differently — this wave's 'G-llms-docs' would
  // have resolved to 'G-llms.md', which doesn't exist. taskById() is the
  // one shared lookup both run-probe.mjs and this file now use.
  const task = taskById(taskId);
  const promptFile = task ? task.prompt : null;
  if (!promptFile) {
    console.error(`[judge ] no tasks-registry entry for taskId "${taskId}" — cannot locate its prompt file, skipping judge for this group.`);
    return { taskId, treatment, perAttempt: [], commonFailures: [`no tasks-registry entry for taskId "${taskId}"`], docGaps: [] };
  }

  // DEFECT FIXED (wave-1 survey): run.json / each attempt's own void+retried
  // signals were computed by the probe but never reached the judge — a void
  // (empty-but-schema-valid) or retried attempt was scored by the LLM judge
  // with no idea it was looking at a retry-exhausted empty payload. Both
  // flags (plus the deterministic grader's score and the measured cost) are
  // now included in what the judge reads.
  const valid = attempts.filter(a => a.parsed).map(a => ({
    label: a.label,
    model: a.model,
    attempt: a.attempt,
    output: a.parsed,
    wasVoid: !!a.void,
    wasRetried: !!a.retried,
    deterministicGraderScore: a.grader?.score ?? null,
    measuredCostUsd: a.costUsd ?? null,
    processAssertionPassed: a.processAssertion?.passed ?? null,
  }));
  if (valid.length === 0) {
    return { taskId, treatment, perAttempt: [], commonFailures: ['no attempts parsed'], docGaps: [] };
  }
  const prompt = `You are scoring AI-agent attempts at an Altitude design-system task.

# Task
${readFileSync(resolve(SCRIPT_DIR, 'tasks', promptFile), 'utf8').replace(/\{\{ATTEMPT\}\}/g, 'JUDGED')}

# Treatment arm under evaluation: ${treatment}
${treatment === 'mcp-on' ? 'The Altitude MCP server was attached for these attempts — factor whether the agent actually used it (see processAssertionPassed per attempt) into completeness/correctness.' : treatment === 'with-skill' ? 'The altitude-component-authoring skill was available and the agent was instructed to invoke it for these attempts.' : 'Control arm — no MCP server, no skill instruction; docs + digests only.'}

# Attempts (mixed models: claude + codex)
${valid.map((a, i) => `## Attempt ${i + 1} (label=${a.label}, model=${a.model}, wasVoid=${a.wasVoid}, wasRetried=${a.wasRetried}, deterministicGraderScore=${a.deterministicGraderScore}, measuredCostUsd=${a.measuredCostUsd}, processAssertionPassed=${a.processAssertionPassed})\n\`\`\`json\n${JSON.stringify(a.output, null, 2)}\n\`\`\``).join('\n\n')}

# Ground truth
- CEM digest: ${ROOT}/.altitude/ai-readiness/cem-digest.json (also mirrored at ${CEM_DIGEST_TMP}). Verify tag/attr/slot/event/enum-value claims. Every tag carries a \`doNotFlag\` array of machine-readable sanctioned patterns reviewers MUST NOT cite as violations — if an attempt's "violations" array reports a finding that matches a doNotFlag pattern for the component under review, count it as a FALSE POSITIVE and dock conventionCompliance accordingly.
- Tokens digest: ${ROOT}/.altitude/ai-readiness/tokens-digest.json (also mirrored at ${TOKENS_DIGEST_TMP}). Verify every --al-* token name.
- Altitude docs: ${ROOT}/CLAUDE.md, ${ROOT}/AGENTS.md, ${ROOT}/MIGRATION.md
- Source: ${ROOT}/libs/al-web-components/components/

# Your job
Score each attempt 0–10 on correctness / conventionCompliance / completeness. Count fabricated tags / attrs / slots / events / enum-values / token names in hallucinationCount. Count files read beyond docs+digests in sourceFilesRead. Identify commonFailures across attempts and docGaps (point at specific file paths) where filling the gap would prevent these mistakes. Set taskId="${taskId}" and treatment="${treatment}".

**wasVoid attempts:** if wasVoid=true, the deterministic void-detector already found every array/string field empty after a retry was exhausted — score completeness very low (0-2) and note it in specificFailures as "void payload after retry", rather than treating it as a normal low-effort attempt.

**For Task C specifically:** any finding that matches a \`doNotFlag\` rule for the component under review is a FALSE POSITIVE — list it in \`specificFailures\` as "false positive: <pattern>" and apply a meaningful conventionCompliance penalty (typically -1 to -2 per false positive, capped at 0). Do not double-penalize the same false positive across attempts in commonFailures. deterministicGraderScore (falsePositiveCount, negated) is a second, non-LLM vote on the same question — if your own reading disagrees sharply with it, say so in specificFailures rather than silently overriding it.

If both claude and codex attempts are present, fill perModelSummary with avg scores per model so the synthesizer can compare distributions.

Return JSON matching the judge schema.`;
  console.log(`[judge ] ${taskId} / ${treatment} (${valid.length} attempts)...`);
  const r = await askClaude(prompt, JUDGE_SCHEMA, `judge:${taskId}:${treatment}`);
  return r.parsed || { taskId, treatment, perAttempt: [], commonFailures: ['judge failed'], docGaps: [] };
}

async function main() {
  const judgements = {};
  for (const [key, group] of Object.entries(byTaskTreatment)) {
    judgements[key] = await judgeTaskTreatment(group.taskId, group.treatment, group.attempts);
    writeFileSync(resolve(RUN_DIR, `judge-${group.taskId}-${group.treatment}.json`), JSON.stringify(judgements[key], null, 2));
  }

  const synthPrompt = `You are synthesizing AI-readiness probe results for the Altitude design system.

This run used multiple models (claude + codex) AND a treatment axis
(mcp-off / mcp-on / with-skill — see lib/treatment.mjs) for the fleet phase.

# Per-task-per-treatment judgements
\`\`\`json
${JSON.stringify(judgements, null, 2)}
\`\`\`

# Your job
1. Compute overallReadinessScore (0–100): how AI-ready the design system is RIGHT NOW.
2. taskBreakdown: one entry PER (taskId, treatment) pair — score (0–100) + a short commentary. Set both taskId and treatment on every entry so arms stay distinguishable.
3. crossModelComparison: one paragraph on how claude vs codex attempts differed (if both are present).
4. crossTreatmentComparison: one paragraph — did mcp-on or with-skill measurably outperform mcp-off (the control)? This is the headline R3 result: does the MCP server / skill earn its keep?
5. topFailureModes (3–5): most damaging recurring failure modes.
6. topRecommendations: prioritized concrete file edits. Each tied to a specific file path under the repo, ordered by expected impact.
7. repeatability: plain-English instructions for re-running this probe.

Return JSON matching the synthesis schema.`;
  console.log('[synth ] synthesizing across tasks and treatments...');
  const synth = await askClaude(synthPrompt, SYNTHESIS_SCHEMA, 'synthesize');
  const synthesis = synth.parsed || { overallReadinessScore: 0, taskBreakdown: [], topFailureModes: [], topRecommendations: [], repeatability: '' };

  const report = { runId: basename(RUN_DIR), judgements, synthesis };
  writeFileSync(resolve(RUN_DIR, 'report.json'), JSON.stringify(report, null, 2));

  // Human-readable summary
  let md = `# AI-Readiness Probe — ${report.runId}\n\n`;
  md += `## Overall: **${synthesis.overallReadinessScore} / 100**\n\n`;
  md += `| Task | Treatment | Score | Commentary |\n|---|---|---|---|\n`;
  for (const t of synthesis.taskBreakdown || []) {
    md += `| ${t.taskId} | ${t.treatment || '(unspecified)'} | ${t.score} | ${(t.commentary || '').replace(/\n/g, ' ')} |\n`;
  }
  if (synthesis.crossModelComparison) {
    md += `\n## Cross-model comparison\n\n${synthesis.crossModelComparison}\n`;
  }
  if (synthesis.crossTreatmentComparison) {
    md += `\n## Cross-treatment comparison (R3 headline)\n\n${synthesis.crossTreatmentComparison}\n`;
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
  for (const t of synthesis.taskBreakdown || []) console.log(`  ${t.taskId} / ${t.treatment}: ${t.score}`);
  console.log(`\nReport: ${resolve(RUN_DIR, 'REPORT.md')}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
