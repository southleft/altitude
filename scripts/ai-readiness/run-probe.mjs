#!/usr/bin/env node
// Run the AI-readiness fleet phase: N attempts per task per model per
// treatment, with a concurrency cap.
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
//   node scripts/ai-readiness/run-probe.mjs [--fleet=N] [--models=claude,codex]
//     [--tasks=A,B,C,G] [--treatments=mcp-off,mcp-on,with-skill] [--model=<name>]
//     [--concurrency=N] [--max-budget-usd=N] [--dry-run]
//   CLAUDE_BIN=/custom/path/claude node scripts/ai-readiness/run-probe.mjs
//
// --dry-run resolves binaries, builds the full job list, and prints what
// WOULD be invoked (bin, args, prompt length) without spawning a single
// child process or spending a token. Use it to sanity-check binary
// discovery on a new machine, or to smoke-test the harness in CI.
//
// --treatments (R3): mcp-off (control, default) / mcp-on / with-skill. Pass
// a comma list, or `--treatments=all` for the full 3-arm matrix. See
// lib/treatment.mjs for what each arm actually changes. Applies to the
// `claude` model only — codex has no verified --mcp-config equivalent this
// wave, so codex jobs always run the mcp-off arm regardless of this flag
// (logged, not silent).
//
// --model (defect 5, wave-1 Findings): the harness used to pass no model to
// the `claude` CLI, so the ACCOUNT DEFAULT decided which model ran — cost
// became account-dependent and unenforceable. Every invocation now pins an
// explicit model; --model overrides the default (which matches the model
// wave 1's real $1.3469 measurement actually used, for baseline
// continuity — see DEFAULT_MODEL below).
//
// --max-budget-usd (defect 5 continued, R7): forwarded to the `claude` CLI's
// own --max-budget-usd per invocation. Defaults to $3 — comfortably above
// the measured $1.3469 single-attempt cost so a normal run isn't clipped,
// but enough to hard-stop a runaway attempt before it burns an order of
// magnitude more. Pass --max-budget-usd=0 to disable (unbounded, discouraged).
//
// --concurrency (defect 3): the fleet used to Promise.all EVERY attempt with
// no cap — fine at 1 model x 1-3 tasks, but the treatment axis multiplies
// the job count 3x, and a real run could spawn dozens of concurrent `claude`
// child processes. Default 4, matching the fixture-build concurrency
// convention used elsewhere in this repo's scripts/.
//
// Writes:
//   .altitude/ai-readiness/runs/<runId>/attempts/<task>-<model>-<treatment>-<n>.json
//   .altitude/ai-readiness/runs/<runId>/run.json   (manifest of all attempts)

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBinary, runChild, extractJson, nowStamp, TMPDIR } from './lib.mjs';
import { caseSource } from './lib/case-sources.mjs';
import { assertReconciliationTrajectory } from './lib/trajectory.mjs';
import { TASKS } from './lib/tasks-registry.mjs';
import { runGrader } from './lib/grader.mjs';
import { extractCostUsd, extractLatencyMs } from './lib/metrics.mjs';
import { createAxeRenderer, computeAxeForAttempt } from './lib/axe-check.mjs';
import {
  TREATMENTS,
  claudeArgsForTreatment,
  promptSuffixForTreatment,
  writeMcpConfig,
  extractToolCallsFromStreamJson,
  lastJsonLine,
  assertExpectedMcpTools,
} from './lib/treatment.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const SCRIPT_DIR = resolve(fileURLToPath(import.meta.url), '..');
const TASKS_DIR = resolve(SCRIPT_DIR, 'tasks');
const SCHEMAS_DIR = resolve(SCRIPT_DIR, 'schemas');
const RUNS_DIR = resolve(ROOT, '.altitude/ai-readiness/runs');
// The tmp-dir mirrors of the two ground-truth digests. Every harness script
// resolves this from the SAME lib.mjs constant (os.tmpdir(), not a literal
// /tmp — see lib.mjs for why the two differ on Windows), so the probe, the
// judge, and both digest builders always agree on one location.
const CEM_DIGEST_TMP = resolve(TMPDIR, 'ai-readiness-cem-digest.json');
const TOKENS_DIGEST_TMP = resolve(TMPDIR, 'ai-readiness-tokens-digest.json');

// R9 — live docs-site artifacts (verified this wave: genuinely text/plain,
// 11/11). Deliberately NOT altitude.pages.dev/production — that currently
// serves SPA shells for these routes, which would make Task G measure
// nothing. See spec Findings.
const LLMS_TXT_URL = 'https://feature-v2-brooke.altitude.pages.dev/docs/llms.txt';
const LLMS_TOKENS_URL = 'https://feature-v2-brooke.altitude.pages.dev/docs/llms-tokens.txt';
const LLMS_COMPONENTS_URL = 'https://feature-v2-brooke.altitude.pages.dev/docs/llms-components.txt';
const COMPONENTS_MD_URL = 'https://feature-v2-brooke.altitude.pages.dev/docs/components.md';

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
const DEFAULT_MODEL = 'claude-opus-5'; // matches the model wave 1's real $1.3469 measurement used — see header comment
const MODEL_PIN = String(argv.model ?? DEFAULT_MODEL);
const CONCURRENCY = Math.max(1, Number(argv.concurrency ?? 4));
const MAX_BUDGET_USD = argv['max-budget-usd'] !== undefined ? Number(argv['max-budget-usd']) : 3;
const TREATMENTS_TO_RUN = argv.treatments === 'all'
  ? [...TREATMENTS]
  : String(argv.treatments ?? 'mcp-off').split(',').filter(Boolean);
for (const t of TREATMENTS_TO_RUN) {
  if (!TREATMENTS.includes(t)) {
    console.error(`Unknown treatment: ${t}. Supported: ${TREATMENTS.join(', ')} (or --treatments=all)`);
    process.exit(2);
  }
}
// --dry-run: resolve binaries, build the full job list, print what WOULD be
// invoked, then exit — no child process is spawned, no token is spent. This
// is what makes the harness testable in CI, and by a future agent, without
// a budget.
const DRY_RUN = argv['dry-run'] === true || argv['dry-run'] === 'true';

// ---------- context preamble (injected into every prompt except Task G) ----------

const CONTEXT = `# Context (the docs an AI consumer would have)

You may Read these files:
- ${ROOT}/CLAUDE.md (project orientation, dev commands, architecture)
- ${ROOT}/AGENTS.md (the agent contract: guardrails, authoring rules, Naming + API conventions, Precedent map, Composition recipes, Tokens you may reference, ALElement public API)
- ${ROOT}/MIGRATION.md (1.x → 2.x migration, theme/registry/SSR)

GROUND TRUTH MANIFEST: ${ROOT}/.altitude/ai-readiness/cem-digest.json (also mirrored at ${CEM_DIGEST_TMP})
This is a JSON map of every real \`<al-*>\` tag with its real attributes (with **enum value sets** in the \`type\` field — e.g. al-button variant is \`"'secondary' | 'tertiary' | 'bare' | 'danger'"\`), slots (with descriptions), events, cssParts, cssProperties. If you reference a tag/attr/event/slot/enum-value that is NOT in this file, that is a hallucination.

GROUND TRUTH TOKENS: ${ROOT}/.altitude/ai-readiness/tokens-digest.json (also mirrored at ${TOKENS_DIGEST_TMP})
Every \`--al-*\` design-token name with its resolved value, grouped by family, plus a \`conventions\` block. Token names in the digest are listed WITH the \`--\` prefix in \`groups\` and WITHOUT it as flat keys in the source \`libs/al-web-components/styles/dist/tokens.json\`. If you reference a token NOT in either form, that is a token-name hallucination.

**Note on overrides:** the digest enforces "no fabricated \`--al-theme-*\` names" — it does NOT forbid declaring brand-new \`--al-<component>-<role>\` override hooks for a component you're scaffolding. Those hooks are declared by the component and intentionally not in the digest; document them via \`@cssproperty\`.

**Note on \`doNotFlag\`:** every tag in the digest carries a \`doNotFlag\` array of MACHINE-READABLE sanctioned patterns. For Task C (violation review), you MUST read the relevant tag's \`doNotFlag\` array before enumerating findings, and you MUST NOT report any pattern listed there as a convention violation. Examples: \`al-chip.doNotFlag\` includes "controlled-close-without-isDismissed" — a chip-like component that has a public \`close()\` without owning \`isDismissed\` state is acceptable and must not be flagged. Reproducing the cited prose AGENTS.md rules as findings is also a misuse of the docs.

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

// DRY_RUN tolerates a missing binary (records null, keeps going) rather
// than hard-exiting — this is what lets --dry-run run in a CI environment
// with no `claude`/`codex` CLI installed at all (see
// .github/workflows/v2-checks.yml's ai-readiness-dry-run job, which is
// deliberately hermetic so it can run on EVERY PR with zero external
// installs and zero dollars spent — the same "ran on every PR so it can't
// silently rot" reasoning as this workflow's mcp-smoke job comment). A real
// (non-dry-run) invocation still hard-exits on a missing binary, same as
// before.
function discoverBinaries() {
  const out = {};
  for (const m of MODELS) {
    if (m === 'claude') {
      const bin = findBinary('claude', 'CLAUDE_BIN');
      if (!bin) {
        if (DRY_RUN) { out.claude = null; continue; }
        console.error('claude binary not found. Set CLAUDE_BIN or install Claude Code CLI.');
        process.exit(2);
      }
      out.claude = bin;
    } else if (m === 'codex') {
      const bin = findBinary('codex', 'CODEX_BIN');
      if (!bin) {
        if (DRY_RUN) { out.codex = null; continue; }
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
  for (const [k, v] of Object.entries(out)) console.log(`  ${k} → ${v ?? 'NOT FOUND (tolerated — dry-run only)'}`);
  return out;
}

// ---------- attempt runners ----------
//
// An attempt's `parsed` is the model's structured output. When the schema is
// loose (every top-level field is `required` but the values are arrays that
// can be `[]`), a model that returns an empty object passes validation but
// carries no signal — `files: [], usedComponents: [], violations: []`. Those
// "void" payloads scored 0/0/0 in v6 and dragged a model's average. The
// judge can't know the difference between "agent declined" and "agent
// thought there was nothing to say", so we detect emptiness here.

function isVoidPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  // A payload is void if every array-typed field is empty AND every
  // string-typed field is missing/empty. Conservative: if at least one
  // array has elements OR a non-empty string is present, the payload is
  // considered substantive.
  let arrCount = 0, nonEmptyArrCount = 0, strCount = 0, nonEmptyStrCount = 0;
  for (const v of Object.values(parsed)) {
    if (Array.isArray(v)) {
      arrCount++;
      if (v.length > 0) nonEmptyArrCount++;
    } else if (typeof v === 'string') {
      strCount++;
      if (v.trim().length > 0) nonEmptyStrCount++;
    }
  }
  if (arrCount === 0 && strCount === 0) return false; // nothing to judge
  return nonEmptyArrCount === 0 && nonEmptyStrCount === 0;
}

// Claude runs with --output-format stream-json --verbose (not plain `json`)
// so a real MCP tool-call trace is available for R5 (see lib/treatment.mjs
// header comment for the verification this wave did of that mechanism).
// stream-json's LAST line carries the identical result envelope shape
// (total_cost_usd, usage, structured_output) that --output-format json
// returns as its single line — confirmed directly, not assumed.
async function runClaudeAttempt({ bin, prompt, schemaPath, label, treatment, mcpConfigPath }) {
  const schema = readFileSync(schemaPath, 'utf8');
  const args = [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--model', MODEL_PIN,
    ...claudeArgsForTreatment(treatment, mcpConfigPath),
    ...(MAX_BUDGET_USD > 0 ? ['--max-budget-usd', String(MAX_BUDGET_USD)] : []),
    '--json-schema', schema,
    prompt,
  ];
  const t0 = Date.now();
  const res = await runChild(bin, args, { timeoutMs: 12 * 60 * 1000 });
  const envelope = lastJsonLine(res.stdout);
  let parsed = null;
  if (envelope) {
    parsed = envelope.structured_output ?? extractJson(envelope.result ?? '');
  } else {
    parsed = extractJson(res.stdout);
  }
  const { allToolCalls, mcpToolCalls } = extractToolCallsFromStreamJson(res.stdout);
  const { costUsd, reason: costReason } = extractCostUsd(envelope, 'claude');
  return {
    label, model: 'claude', treatment, exitCode: res.exitCode, durationMs: Date.now() - t0,
    raw: res.stdout, stderrTail: res.stderr.slice(-500),
    parsed,
    void: isVoidPayload(parsed),
    costUsd, costReason,
    allToolCalls, mcpToolCalls,
  };
}

async function runCodexAttempt({ bin, prompt, schemaPath, label, treatment }) {
  const fullPrompt = `${prompt}\n\n---\n\nReturn JSON matching the schema attached via --output-schema.`;
  const lastMessageFile = resolve(TMPDIR, `codex-last-${label.replace(/[^\w-]/g, '_')}-${Date.now()}.json`);
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
  // 15 min — codex consistently hits >8m on B-scaffold.
  const res = await runChild(bin, args, { timeoutMs: 15 * 60 * 1000 });
  let lastMessage = '';
  if (existsSync(lastMessageFile)) {
    try { lastMessage = readFileSync(lastMessageFile, 'utf8'); } catch {}
  }
  const parsed = extractJson(lastMessage) || extractJson(res.stdout);
  return {
    label, model: 'codex', treatment, exitCode: res.exitCode, durationMs: Date.now() - t0,
    raw: lastMessage || res.stdout, stderrTail: res.stderr.slice(-500),
    parsed,
    void: isVoidPayload(parsed),
    // Codex cost field not verified this wave (codex CLI not installed on
    // this machine — see spec Findings). extractCostUsd() records the same
    // honest null+reason a live run would.
    costUsd: null, costReason: 'codex cost field not verified this wave — codex CLI is not installed on this machine',
    allToolCalls: [], mcpToolCalls: [],
  };
}

const RUNNERS = { claude: runClaudeAttempt, codex: runCodexAttempt };

// --dry-run only: mirror each runner's real arg construction (minus the
// spawn) so the printed preview is trustworthy, not a guess. Kept in sync by
// hand with runClaudeAttempt / runCodexAttempt above — if those change their
// arg list, update this too.
function previewArgs(j) {
  if (j.model === 'claude') {
    const treatmentArgs = j.treatment === 'mcp-on'
      ? '--strict-mcp-config --mcp-config <generated mcp config>'
      : '--strict-mcp-config';
    const budgetArgs = MAX_BUDGET_USD > 0 ? `--max-budget-usd ${MAX_BUDGET_USD}` : '';
    return `--print --output-format stream-json --verbose --model ${MODEL_PIN} ${treatmentArgs} ${budgetArgs} --json-schema <contents of ${j.schemaPath}> "<prompt, ${j.prompt.length} chars>"`.replace(/\s+/g, ' ').trim();
  }
  if (j.model === 'codex') {
    const lastMessageFile = resolve(TMPDIR, `codex-last-${j.label.replace(/[^\w-]/g, '_')}-<ts>.json`);
    return `exec --json --output-schema ${j.schemaPath} --output-last-message ${lastMessageFile} --sandbox read-only --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check "<prompt, ${j.prompt.length} chars>"`;
  }
  return '<unknown model>';
}

// One-shot retry wrapper: if the first attempt comes back void (or
// completely unparseable on an exit-0 run), try once more with a sharper
// "do not return an empty payload" instruction prepended. Logs the retry
// so it's visible in the per-attempt JSON.
async function runWithRetry(runner, opts) {
  const first = await runner(opts);
  const needsRetry = first.exitCode === 0 && (first.void || !first.parsed);
  if (!needsRetry) return first;
  const augmented = `IMPORTANT: A prior call returned an empty payload (no findings / files / components). Do not do that here — every top-level array MUST be substantive, or your response is not useful. Read the digests first if needed.\n\n${opts.prompt}`;
  const retry = await runner({ ...opts, prompt: augmented });
  return {
    ...retry,
    label: opts.label,
    retried: true,
    firstAttemptVoid: first.void,
    firstAttemptParsed: !!first.parsed,
  };
}

// Bounded-concurrency map (defect 3 — the fleet used to Promise.all every
// attempt with no cap at all).
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

// ---------- main ----------

async function main() {
  if (DRY_RUN) {
    console.log('[dry-run] skipping digest refresh (no build side effects)');
  } else {
    refreshDigests();
  }
  const binaries = discoverBinaries();

  const runId = `run-${nowStamp()}`;
  const runDir = resolve(RUNS_DIR, runId);
  const attemptsDir = resolve(runDir, 'attempts');
  // Case inputs live under the run dir so the sandboxed child can read them.
  const casesDir = resolve(runDir, 'cases');
  if (!DRY_RUN) { mkdirSync(attemptsDir, { recursive: true }); mkdirSync(casesDir, { recursive: true }); }
  console.log(`[run] ${runId}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`[fleet] tasks=${TASK_IDS.join(',')} models=${MODELS.join(',')} treatments=${TREATMENTS_TO_RUN.join(',')} fleet=${FLEET_SIZE} model-pin=${MODEL_PIN} max-budget-usd=${MAX_BUDGET_USD || 'unbounded'} concurrency=${CONCURRENCY}`);
  if (MODELS.includes('codex') && TREATMENTS_TO_RUN.some((t) => t !== 'mcp-off')) {
    console.log('[note] codex has no verified --mcp-config equivalent this wave — codex jobs always run the mcp-off arm, regardless of --treatments.');
  }

  const mcpConfigPath = (!DRY_RUN && TREATMENTS_TO_RUN.includes('mcp-on')) ? writeMcpConfig(TMPDIR) : null;

  // Build the full list of attempts to run.
  const jobs = [];
  // Cases the corpus can no longer pose — named and counted, never silent.
  const unposable = [];
  for (const tid of TASK_IDS) {
    const task = TASKS[tid];
    if (!task) { console.error(`Unknown task: ${tid}. Supported: ${Object.keys(TASKS).join(', ')}`); continue; }
    const promptTemplate = readFileSync(resolve(TASKS_DIR, task.prompt), 'utf8');
    const schemaPath = resolve(SCHEMAS_DIR, task.schema);
    const isTaskG = tid === 'G';
    // T6/T7: a case-driven task poses a DIFFERENT question per attempt, drawn
    // deterministically from its corpus. Loaded once per task, not per attempt.
    const source = caseSource(task.cases);
    const corpus = source ? source.load() : null;
    if (source && !corpus) {
      console.error(`[fleet] task ${tid} needs its ${source.kind} corpus — ${source.hint}`);
      continue;
    }
    for (const model of MODELS) {
      const treatmentsForThisModel = model === 'claude' ? TREATMENTS_TO_RUN : ['mcp-off'];
      for (const treatment of treatmentsForThisModel) {
        for (let i = 1; i <= FLEET_SIZE; i++) {
          // T6: pose this attempt's case before building its prompt. A case
          // that cannot be materialized (no canvas contract on this machine)
          // THROWS rather than degrading — see lib/reconcile-cases.mjs for
          // why a silently half-built case is worse than a loud failure.
          let attemptCase = null;
          let casePlaceholders = {};
          if (source) {
            attemptCase = source.forAttempt(corpus, i);
            if (!attemptCase) {
              console.error(`[fleet] the ${source.kind} corpus has no selectable cases — rebuild it.`);
              continue;
            }
            // Materialize INSIDE the repo, not into TMPDIR. The child
            // `claude` runs sandboxed to its working directory, so a case
            // written to os.tmpdir() is unreadable to the very agent being
            // asked to read it — the first real Task D run scored 0/3 with
            // `reported: 0` on every attempt, and the transcripts showed an
            // agent correctly refusing to compare files it could not open.
            // A measurement artifact that looks exactly like a model failure
            // is the worst thing an eval can produce. The run dir is
            // gitignored (.gitignore:62), so this leaves no tracked residue.
            // A case that cannot be posed must not be silently graded — that
            // is why materializeCase THROWS. But the throw used to escape
            // this synchronous loop all the way to main().catch, so ONE
            // stale Task D case killed the entire fleet: tasks A/B/C/E/F/G
            // never ran and no run.json was written, though none of them
            // touch the drift corpus. Found by the verify-spec adversarial
            // pass, 2026-08-29.
            //
            // The narrow intent is kept and the blast radius is cut: this
            // attempt is dropped as a NAMED, counted miss and the rest of
            // the fleet proceeds. Never a silent skip — an unposable case is
            // printed, carried into run.json, and if it leaves NOTHING
            // posable the run exits non-zero rather than reporting success
            // over an empty job list.
            let paths = null;
            if (!DRY_RUN) {
              try {
                paths = source.materialize(attemptCase, casesDir);
              } catch (err) {
                const reason = String(err && err.message ? err.message : err).slice(0, 300);
                unposable.push({ task: tid, attempt: i, caseId: attemptCase.id ?? null, reason });
                console.error(`[fleet] UNPOSABLE ${tid} attempt ${i} (${attemptCase.id ?? 'no id'}): ${reason}`);
                continue;
              }
            }
            casePlaceholders = source.placeholders(attemptCase, paths);
          }
          let rawPrompt = promptTemplate
            .replace(/\{\{ATTEMPT\}\}/g, String(i));
          for (const [key, value] of Object.entries(casePlaceholders)) {
            rawPrompt = rawPrompt.split(`{{${key}}}`).join(String(value));
          }
          rawPrompt = rawPrompt
            .replace(/\{\{TMPDIR\}\}/g, TMPDIR)
            .replace(/\{\{LLMS_TXT_URL\}\}/g, LLMS_TXT_URL)
            .replace(/\{\{LLMS_TOKENS_URL\}\}/g, LLMS_TOKENS_URL)
            .replace(/\{\{LLMS_COMPONENTS_URL\}\}/g, LLMS_COMPONENTS_URL)
            .replace(/\{\{COMPONENTS_MD_URL\}\}/g, COMPONENTS_MD_URL);
          // Task G is deliberately NOT given the shared CONTEXT preamble —
          // its entire point is "answer from the published docs site only",
          // which the shared CONTEXT (pointing at local repo files) would
          // undermine.
          const preamble = isTaskG ? '' : `${CONTEXT}${promptSuffixForTreatment(treatment)}\n\n---\n\n`;
          const prompt = isTaskG ? `${promptSuffixForTreatment(treatment)}\n\n${rawPrompt}` : `${preamble}${rawPrompt}`;
          const label = `${task.id}-${model}-${treatment}-${i}`;
          jobs.push({ task, taskShortKey: tid, model, treatment, i, prompt, schemaPath, label, case: attemptCase });
        }
      }
    }
  }

  if (unposable.length) {
    console.error(`[fleet] ${unposable.length} attempt(s) could not be posed — rebuild the corpus: pnpm run evals:drift-cases -- --write`);
  }
  if (!jobs.length) {
    console.error('[fleet] NOTHING to run — every attempt was unposable. Exiting non-zero rather than reporting an empty success.');
    process.exit(1);
  }
  console.log(`[fleet] ${jobs.length} attempts to run (concurrency ${CONCURRENCY})`);

  if (DRY_RUN) {
    console.log('\n=== dry-run: jobs that would be invoked (no child process spawned, no tokens spent) ===');
    for (const j of jobs) {
      const bin = binaries[j.model];
      console.log(`  ${j.label}`);
      console.log(`    bin      : ${bin}`);
      console.log(`    schema   : ${j.schemaPath}`);
      console.log(`    args     : ${previewArgs(j)}`);
      console.log(`    prompt   : ${j.prompt.length} chars`);
    }
    console.log(`\n[dry-run] would write attempts under: ${attemptsDir}`);
    console.log('[dry-run] no attempts run, no run.json written.');
    return;
  }

  // The axe renderer (R6) is expensive to build (esbuild bundle + browser
  // launch) — build it once for the whole run, only if a Task A attempt is
  // actually queued, and only once regardless of how many Task A attempts
  // there are.
  const needsAxe = jobs.some((j) => j.task.axeRenderable);
  const axeRenderer = needsAxe ? await createAxeRenderer() : null;
  if (axeRenderer && !axeRenderer.available) {
    console.log(`[axe] renderer unavailable: ${axeRenderer.reason}`);
  }

  const results = await mapWithConcurrency(jobs, CONCURRENCY, async (j) => {
    const bin = binaries[j.model];
    const runner = RUNNERS[j.model];
    console.log(`[start] ${j.label}`);
    const out = await runWithRetry(runner, { bin, prompt: j.prompt, schemaPath: j.schemaPath, label: j.label, treatment: j.treatment, mcpConfigPath });

    const grader = runGrader(j.task.grader, out.parsed, j.case ? { case: j.case } : null);
    const axe = await computeAxeForAttempt({ taskShortKey: j.taskShortKey, axeRenderable: j.task.axeRenderable, parsed: out.parsed }, axeRenderer);
    const processAssertion = assertExpectedMcpTools(out.mcpToolCalls, j.task.expectedMcpTools, j.treatment);
    // T11: the TRAJECTORY half. Computed for every attempt because it is pure
    // and cheap; on tasks that run no commands every step reports
    // `not-applicable`, which is an honest reading rather than a zero.
    const trajectory = assertReconciliationTrajectory({ commands: out.commands, allToolCalls: out.allToolCalls });
    const { latencyMs } = extractLatencyMs(out);

    const outPath = resolve(attemptsDir, `${j.label}.json`);
    const record = {
      taskId: j.task.id,
      model: j.model,
      treatment: j.treatment,
      attempt: j.i,
      // T6: WHICH question this attempt was asked. Without it a Task D
      // attempt file cannot be re-graded or compared across runs — the
      // prompt varies per attempt, so the case id is part of the result.
      ...(j.case ? { case: { id: j.case.id, tag: j.case.tag ?? null, mutation: j.case.mutation ?? null, expected: j.case.expected ?? null } } : {}),
      ...out,
      latencyMs,
      grader,
      axe,
      processAssertion,
      trajectory,
    };
    writeFileSync(outPath, JSON.stringify(record, null, 2));
    const status = !out.parsed ? 'NO-PARSE'
      : out.void ? 'VOID'
      : grader?.unobserved ? 'UNOBSERVED'
      : 'ok';
    const retryNote = out.retried ? ` retried(firstVoid=${out.firstAttemptVoid})` : '';
    const costNote = out.costUsd != null ? ` $${out.costUsd.toFixed(4)}` : ' $?';
    console.log(`[done ] ${j.label}  exit=${out.exitCode}  ${status}${retryNote}${costNote}  ${(out.durationMs / 1000).toFixed(1)}s`);
    return {
      label: j.label, taskId: j.task.id, model: j.model, treatment: j.treatment,
      ok: !!out.parsed && !out.void,
      parsedButVoid: !!out.parsed && !!out.void,
      retried: !!out.retried,
      exitCode: out.exitCode,
      durationMs: out.durationMs,
      costUsd: out.costUsd,
      graderScore: grader?.score ?? null,
      // A grader may decline to score — `unobserved` on Task D means the
      // agent read neither side, so nothing was measured. It is NOT a zero
      // and it must not vanish into a null average: the run summary counts
      // it out loud, because a run that is quietly all-unobserved looks
      // exactly like a run with no findings to report.
      unobserved: grader?.unobserved === true,
      axeViolationCount: axe?.violationCount ?? null,
      processAssertionPassed: processAssertion.passed,
    };
  });

  if (axeRenderer) await axeRenderer.close();

  // Manifest
  const manifest = {
    runId,
    startedAt: new Date().toISOString(),
    unposable,
    config: { fleetSize: FLEET_SIZE, models: MODELS, tasks: TASK_IDS, treatments: TREATMENTS_TO_RUN, modelPin: MODEL_PIN, maxBudgetUsd: MAX_BUDGET_USD, concurrency: CONCURRENCY },
    binaries,
    attempts: results,
    summary: {
      total: results.length,
      gradeable: results.filter(r => r.ok).length,
      void: results.filter(r => r.parsedButVoid).length,
      unposable: unposable.length,
      unobserved: results.filter(r => r.unobserved).length,
      noParse: results.filter(r => !r.ok && !r.parsedButVoid).length,
      retried: results.filter(r => r.retried).length,
      totalCostUsd: results.reduce((sum, r) => sum + (r.costUsd || 0), 0),
      byModel: Object.fromEntries(MODELS.map(m => [m, {
        gradeable: results.filter(r => r.model === m && r.ok).length,
        void: results.filter(r => r.model === m && r.parsedButVoid).length,
        noParse: results.filter(r => r.model === m && !r.ok && !r.parsedButVoid).length,
        total: results.filter(r => r.model === m).length,
      }])),
      byTreatment: Object.fromEntries(TREATMENTS.map(t => [t, {
        gradeable: results.filter(r => r.treatment === t && r.ok).length,
        total: results.filter(r => r.treatment === t).length,
        totalCostUsd: results.filter(r => r.treatment === t).reduce((sum, r) => sum + (r.costUsd || 0), 0),
      }])),
    },
  };
  writeFileSync(resolve(runDir, 'run.json'), JSON.stringify(manifest, null, 2));

  console.log('\n=== fleet summary ===');
  console.log(`  gradeable: ${manifest.summary.gradeable}/${manifest.summary.total}`);
  console.log(`  void     : ${manifest.summary.void}`);
  console.log(`  unposable: ${manifest.summary.unposable}${manifest.summary.unposable ? '  <- cases the corpus can no longer pose; the rest of the fleet still ran' : ''}`);
  console.log(`  unobserved: ${manifest.summary.unobserved}${manifest.summary.unobserved ? '  <- graded nothing: the agent read neither side. Check the case files are readable from the child sandbox.' : ''}`);
  console.log(`  no-parse : ${manifest.summary.noParse}`);
  console.log(`  retried  : ${manifest.summary.retried}`);
  console.log(`  cost     : $${manifest.summary.totalCostUsd.toFixed(4)}`);
  for (const [m, s] of Object.entries(manifest.summary.byModel)) {
    console.log(`  ${m}: gradeable ${s.gradeable}/${s.total}`);
  }
  for (const [t, s] of Object.entries(manifest.summary.byTreatment)) {
    if (s.total === 0) continue;
    console.log(`  ${t}: gradeable ${s.gradeable}/${s.total}  $${s.totalCostUsd.toFixed(4)}`);
  }
  console.log(`\nRun dir: ${runDir}`);
  console.log('Next: node scripts/ai-readiness/run-judge.mjs ' + runDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
