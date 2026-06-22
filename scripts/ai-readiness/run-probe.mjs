#!/usr/bin/env node
// Run the AI-readiness fleet phase: N attempts per task per model, in parallel.
//
// Why a Node driver instead of a single Workflow script: the original probe
// ran every fleet member through the same model (Claude). True AI-readiness
// is a property of the docs, not of any one model — so we shell out to BOTH
// `claude` and `codex` CLIs and let each interpret the same prompt+digests
// against the same schema. Differences between the two surface docs that are
// only legible to one model's training distribution.
//
// Discovery: each binary is found at runtime by lib.mjs:findBinary, which
// skips Superconductor agent-wrappers and other shims (they tail interactive
// session files and never exit). Override per machine with CLAUDE_BIN /
// CODEX_BIN env vars.
//
// Usage:
//   node scripts/ai-readiness/run-probe.mjs [--fleet=N] [--models=claude,codex] [--tasks=A,B,C]
//   CLAUDE_BIN=/custom/path/claude node scripts/ai-readiness/run-probe.mjs
//
// Writes:
//   .altitude/ai-readiness/runs/<runId>/attempts/<task>-<model>-<n>.json
//   .altitude/ai-readiness/runs/<runId>/run.json   (manifest of all attempts)

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBinary, runChild, extractJson, nowStamp } from './lib.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const SCRIPT_DIR = resolve(fileURLToPath(import.meta.url), '..');
const TASKS_DIR = resolve(SCRIPT_DIR, 'tasks');
const SCHEMAS_DIR = resolve(SCRIPT_DIR, 'schemas');
const RUNS_DIR = resolve(ROOT, '.altitude/ai-readiness/runs');

// ---------- args ----------

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? true];
    }
    return [a, true];
  })
);
const FLEET_SIZE = Number(argv.fleet ?? 3);
const MODELS = String(argv.models ?? 'claude,codex').split(',').filter(Boolean);
const TASK_IDS = String(argv.tasks ?? 'A,B,C').split(',').filter(Boolean);

// ---------- tasks ----------

const TASKS = {
  A: { id: 'A-composition', schema: 'composition.schema.json', prompt: 'A-composition.md' },
  B: { id: 'B-scaffold',    schema: 'scaffold.schema.json',    prompt: 'B-scaffold.md' },
  C: { id: 'C-violation',   schema: 'violation.schema.json',   prompt: 'C-violation.md' },
};

// ---------- context preamble (injected into every prompt) ----------

const CONTEXT = `# Context (the docs an AI consumer would have)

You may Read these files:
- ${ROOT}/CLAUDE.md (project orientation, dev commands, architecture)
- ${ROOT}/AGENTS.md (the agent contract: guardrails, authoring rules, Naming + API conventions, Precedent map, Composition recipes, Tokens you may reference, ALElement public API)
- ${ROOT}/MIGRATION.md (1.x → 2.x migration, theme/registry/SSR)

GROUND TRUTH MANIFEST: /tmp/ai-readiness-cem-digest.json
This is a JSON map of every real \`<al-*>\` tag with its real attributes (with **enum value sets** in the \`type\` field — e.g. al-button variant is \`"'secondary' | 'tertiary' | 'bare' | 'danger'"\`), slots (with descriptions), events, cssParts, cssProperties. If you reference a tag/attr/event/slot/enum-value that is NOT in this file, that is a hallucination.

GROUND TRUTH TOKENS: /tmp/ai-readiness-tokens-digest.json
Every \`--al-*\` design-token name with its resolved value, grouped by family, plus a \`conventions\` block. If you reference a token NOT in this file, that is a token-name hallucination.

Source tree: ${ROOT}/libs/al-web-components/components/
You MAY explore source if the docs leave you uncertain — record every file you read in \`sourceUsed\`. Fewer source files = more AI-ready docs.

Return ONLY the JSON object that matches the requested schema. Do not wrap it in prose or markdown fences.
`;

// ---------- digest refresh ----------

function refreshDigests() {
  console.log('[refresh] regenerating CEM + tokens digests...');
  const a = spawnSync('node', [resolve(SCRIPT_DIR, 'build-cem-digest.mjs')], { stdio: 'inherit' });
  if (a.status !== 0) { console.error('CEM digest failed'); process.exit(1); }
  const b = spawnSync('node', [resolve(SCRIPT_DIR, 'build-tokens-digest.mjs')], { stdio: 'inherit' });
  if (b.status !== 0) { console.error('Tokens digest failed'); process.exit(1); }
}

// ---------- binary discovery ----------

function discoverBinaries() {
  const out = {};
  for (const m of MODELS) {
    if (m === 'claude') {
      const bin = findBinary('claude', 'CLAUDE_BIN');
      if (!bin) {
        console.error('claude binary not found. Set CLAUDE_BIN or install Claude Code CLI.');
        process.exit(2);
      }
      out.claude = bin;
    } else if (m === 'codex') {
      const bin = findBinary('codex', 'CODEX_BIN');
      if (!bin) {
        console.error('codex binary not found. Set CODEX_BIN or install OpenAI Codex CLI (`npm i -g @openai/codex` or via your package manager).');
        process.exit(2);
      }
      out.codex = bin;
    } else {
      console.error(`Unknown model: ${m}. Supported: claude, codex`);
      process.exit(2);
    }
  }
  console.log('[discover] binaries:');
  for (const [k, v] of Object.entries(out)) console.log(`  ${k} → ${v}`);
  return out;
}

// ---------- attempt runners ----------

async function runClaudeAttempt({ bin, prompt, schemaPath, label }) {
  const schema = readFileSync(schemaPath, 'utf8');
  const fullPrompt = `${CONTEXT}\n\n---\n\n${prompt}`;
  const args = [
    '--print',
    '--output-format', 'json',
    '--json-schema', schema,
    fullPrompt,
  ];
  const t0 = Date.now();
  const res = await runChild(bin, args, { timeoutMs: 8 * 60 * 1000 });
  let parsed = null;
  try {
    const envelope = JSON.parse(res.stdout);
    parsed = envelope.structured_output ?? extractJson(envelope.result ?? '');
  } catch {
    parsed = extractJson(res.stdout);
  }
  return {
    label, model: 'claude', exitCode: res.exitCode, durationMs: Date.now() - t0,
    raw: res.stdout, stderrTail: res.stderr.slice(-500),
    parsed,
  };
}

async function runCodexAttempt({ bin, prompt, schemaPath, label }) {
  const schema = readFileSync(schemaPath, 'utf8');
  const fullPrompt = `${CONTEXT}\n\n---\n\n${prompt}\n\n---\n\nReturn JSON matching the schema attached via --output-schema.`;
  // codex exec --json emits JSONL events; --output-last-message writes the
  // final agent message to a file. We use both.
  const lastMessageFile = `/tmp/codex-last-${label.replace(/[^\w-]/g, '_')}-${Date.now()}.json`;
  const args = [
    'exec',
    '--json',
    '--output-schema', schemaPath,
    '--output-last-message', lastMessageFile,
    '--sandbox', 'read-only',
    '--dangerously-bypass-approvals-and-sandbox',
    '--skip-git-repo-check',
    fullPrompt,
  ];
  const t0 = Date.now();
  // 15 min — codex consistently hits >8m on B-scaffold (heavy file reads
  // + structured-output strictness). Empirically 12-15m clears it.
  const res = await runChild(bin, args, { timeoutMs: 15 * 60 * 1000 });
  let lastMessage = '';
  if (existsSync(lastMessageFile)) {
    try { lastMessage = readFileSync(lastMessageFile, 'utf8'); } catch {}
  }
  return {
    label, model: 'codex', exitCode: res.exitCode, durationMs: Date.now() - t0,
    raw: lastMessage || res.stdout, stderrTail: res.stderr.slice(-500),
    parsed: extractJson(lastMessage) || extractJson(res.stdout),
  };
}

const RUNNERS = { claude: runClaudeAttempt, codex: runCodexAttempt };

// ---------- main ----------

async function main() {
  refreshDigests();
  const binaries = discoverBinaries();

  const runId = `run-${nowStamp()}`;
  const runDir = resolve(RUNS_DIR, runId);
  const attemptsDir = resolve(runDir, 'attempts');
  mkdirSync(attemptsDir, { recursive: true });
  console.log(`[run] ${runId}`);
  console.log(`[fleet] tasks=${TASK_IDS.join(',')} models=${MODELS.join(',')} fleet=${FLEET_SIZE}`);

  // Build the full list of attempts to run.
  const jobs = [];
  for (const tid of TASK_IDS) {
    const task = TASKS[tid];
    if (!task) { console.error(`Unknown task: ${tid}`); continue; }
    const promptTemplate = readFileSync(resolve(TASKS_DIR, task.prompt), 'utf8');
    const schemaPath = resolve(SCHEMAS_DIR, task.schema);
    for (const model of MODELS) {
      for (let i = 1; i <= FLEET_SIZE; i++) {
        const prompt = promptTemplate.replace(/\{\{ATTEMPT\}\}/g, String(i));
        const label = `${task.id}-${model}-${i}`;
        jobs.push({ task, model, i, prompt, schemaPath, label });
      }
    }
  }

  console.log(`[fleet] ${jobs.length} attempts to run in parallel`);

  const results = await Promise.all(
    jobs.map(async (j) => {
      const bin = binaries[j.model];
      const runner = RUNNERS[j.model];
      console.log(`[start] ${j.label}`);
      const out = await runner({ bin, prompt: j.prompt, schemaPath: j.schemaPath, label: j.label });
      const outPath = resolve(attemptsDir, `${j.label}.json`);
      writeFileSync(outPath, JSON.stringify({
        taskId: j.task.id,
        model: j.model,
        attempt: j.i,
        ...out,
      }, null, 2));
      console.log(`[done ] ${j.label}  exit=${out.exitCode}  parsed=${out.parsed ? 'yes' : 'NO'}  ${(out.durationMs / 1000).toFixed(1)}s`);
      return { label: j.label, taskId: j.task.id, model: j.model, ok: !!out.parsed };
    })
  );

  // Manifest
  const manifest = {
    runId,
    startedAt: new Date().toISOString(),
    config: { fleetSize: FLEET_SIZE, models: MODELS, tasks: TASK_IDS },
    binaries,
    attempts: results,
    summary: {
      total: results.length,
      parsedOk: results.filter(r => r.ok).length,
      byModel: Object.fromEntries(MODELS.map(m => [m, results.filter(r => r.model === m && r.ok).length])),
    },
  };
  writeFileSync(resolve(runDir, 'run.json'), JSON.stringify(manifest, null, 2));

  console.log('\n=== fleet summary ===');
  console.log(`  ${manifest.summary.parsedOk}/${manifest.summary.total} attempts parsed`);
  for (const [m, n] of Object.entries(manifest.summary.byModel)) {
    console.log(`  ${m}: ${n}/${results.filter(r => r.model === m).length}`);
  }
  console.log(`\nRun dir: ${runDir}`);
  console.log('Next: node scripts/ai-readiness/run-judge.mjs ' + runDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
