# AI-Readiness Harness

Measures how well an AI consumer (Claude or Codex) can build correctly using only the documents + manifest the Altitude design system publishes. Repeatable across iterations — score deltas show which docs/manifest changes moved the needle.

## What it tests

Four task surfaces, each run by N agents per model per treatment:

| Task | What it asks the agent to do | Why |
|---|---|---|
| **A — Composition** | Compose a user profile card pattern using only real `<al-*>` components | Tests discoverability + comprehension of the composition surface |
| **B — Scaffold** | Generate a new `<al-stat-card>` component from scratch | Tests authoring conventions + token-name knowledge |
| **C — Violation spotting** | Audit a deliberately non-conformant `<al-tag>` PR | Tests how legible the conventions are to a reviewer |
| **G — Docs surface** | Answer questions using ONLY the docs site's `llms.txt` family + `.md` routes, no local repo files | Tests whether the published AI-facing documentation surface actually helps (R9) |

Each attempt returns strict JSON (validated against `schemas/*.schema.json`). Two independent
scoring paths run over every attempt, not one:

1. **A deterministic grader** (`lib/grader.mjs`, R4) — `score = matched − missing − unexpected`
   component usage (Storybook's formula) for Task A/B, and a doNotFlag false-positive detector
   for Task C. Pure function, no LLM call, unit-tested against recorded fixtures for $0
   (`test/grader.test.mjs`).
2. **An LLM judge** (`run-judge.mjs`) scores every attempt against the ground-truth CEM digest
   and token digest, per (task, treatment) pair; a synthesizer rolls scores into an overall
   AI-readiness number.

Every trial also records **cost in USD**, **latency**, an **axe accessibility violation count**
(where the output is renderable markup — Task A only, see `lib/axe-check.mjs`), and — when the
`mcp-on` treatment is active — **which MCP tools the agent actually called** (`lib/treatment.mjs`,
R5), a real process trace rather than an inference from the output text.

## Multi-model

The fleet runs **claude** and, optionally, **codex** CLIs in parallel for every attempt — true cross-model evidence about the docs (not about any one model's training distribution). `codex` is NOT required: it's a separate install (`npm i -g @openai/codex`, or via your package manager) that most machines won't have. Run Claude-only with `--models=claude` (see below) — the harness treats it as a normal, fully-supported configuration, not a degraded fallback. Add more models by extending `RUNNERS` in `run-probe.mjs`.

## Treatments (R3)

The same scenario runs under three arms — modelled on `@primer/agent-eval`'s MCP on/off/with-skill A/B test — so the Altitude MCP server (`libs/altitude-mcp`) and the `altitude-component-authoring` skill have to earn their keep with evidence, not assumption:

| Treatment | What changes | Purpose |
|---|---|---|
| `mcp-off` (default) | No MCP server attached (`--strict-mcp-config`, no `--mcp-config`) | Control — docs + digests only, today's harness default |
| `mcp-on` | The `altitude` MCP server (8 `altitude_*` tools) is attached; the prompt tells the agent to prefer it over reading the raw digest files | Does the MCP server change correctness / cost / latency? |
| `with-skill` | No MCP; the prompt instructs the agent to invoke the `altitude-component-authoring` skill first | Does the skill change output quality versus docs alone? |

```bash
# One arm (default — matches pre-treatment-axis behavior/cost):
node scripts/ai-readiness/run-probe.mjs --treatments=mcp-off

# The full 3-arm matrix:
node scripts/ai-readiness/run-probe.mjs --treatments=all
```

**Why `mcp-off` still passes `--strict-mcp-config`:** this repo's own root `.mcp.json` registers
the `altitude` MCP server for interactive Claude Code sessions. A child `claude --print` process
run from the repo root would silently inherit that config without `--strict-mcp-config` — making
"mcp-off" not actually be off. Every treatment arm passes it; only `mcp-on` additionally attaches
a config.

**Process assertions (R5):** when `mcp-on` is active, every attempt records `mcpToolCalls` (the
REAL MCP tool names the agent invoked, parsed from `claude`'s `--output-format stream-json
--verbose` transcript — not inferred from the output text) and `processAssertion` (whether any of
the task's `expectedMcpTools` were actually called). See `lib/treatment.mjs`.

**`codex` and treatments:** codex has no verified `--mcp-config` equivalent this wave (codex
itself isn't installed on the machine this was built on) — codex jobs always run the `mcp-off`
arm regardless of `--treatments` (logged, not silent).

## Cost, latency, and a11y per trial (R6)

Every attempt file records:
- `costUsd` — parsed from the `claude` CLI's own `total_cost_usd` field (verified against 5 real
  invocations this wave, $0.07–$1.35). `null` + a `costReason` if the field is missing (e.g.
  codex, whose cost field is unverified) — never a fabricated `0`.
- `latencyMs` — wall-clock duration around the child process.
- `axe` — `{ violationCount, violations, passCount, reason }`. Only Task A's `template` output is
  renderable markup; `lib/axe-check.mjs` bundles the REAL `al-web-components` library with esbuild
  (it externalizes `lit`/`@lit/*`), serves it over a same-origin local HTTP server (`file://`
  blocks the module + stylesheet loads), sets `window.alAutoRegistry = true` in an inline
  pre-module `<script>`, injects the attempt's template, and runs real `axe-core` against the real
  shadow DOM. Tasks B/C/G emit no renderable markup — `violationCount` is `null` with a `reason`,
  never a guessed `0`. Verified sensitive to real violations (see `test/axe-check.test.mjs`): a
  deliberately-injected `<img>` with no `alt` and an `<a>` with no accessible name were both
  caught.

## Model pin + budget cap (defect 5 / R7)

`run-probe.mjs` used to pass no `--model` to the `claude` CLI — the account default decided,
making cost account-dependent and any cap unenforceable. Every invocation now pins
`--model` (default `claude-opus-5`, matching the model wave 1's real $1.3469 measurement used;
override with `--model=`), and forwards `--max-budget-usd` (default `$3`, the CLI's own
hard-stop; `--max-budget-usd=0` disables it) to every `claude` invocation.

```bash
# Cheap, capped smoke run (this is what the label-gated CI workflow uses):
node scripts/ai-readiness/run-probe.mjs --fleet=1 --tasks=A --models=claude \
  --treatments=mcp-on --model=claude-haiku-4-5 --max-budget-usd=1
```

## Concurrency (defect 3)

The fleet used to `Promise.all` every attempt with no cap — fine at 1 model × 3 tasks, but the
treatment axis multiplies the job count up to 3×. `--concurrency=N` (default 4) bounds how many
`claude`/`codex` child processes run at once.

## Quick start

**0) Bootstrap — the digests must exist before the fleet can run.** `run-probe.mjs`
unconditionally tries to *regenerate* both ground-truth digests before every fleet run
(`refreshDigests()`), and it hard-exits if that regeneration fails. There are two digest
sources with different freshness guarantees on a clean clone:

- `libs/al-web-components/custom-elements.json` — **tracked in git**, so `build-cem-digest.mjs`
  (and therefore `.altitude/ai-readiness/cem-digest.json`) works on a fresh clone with no
  build step.
- `libs/al-web-components/styles/dist/tokens.json` — **build output, gitignored**
  (`libs/al-web-components/.gitignore`). It does **not exist on a fresh clone.**
  `build-tokens-digest.mjs` reads it unconditionally and throws `ENOENT` if it's missing,
  which aborts `run-probe.mjs` before a single token is spent.

So: `.altitude/ai-readiness/cem-digest.json` and `tokens-digest.json` **are both committed**
(you can inspect them right after cloning), but that doesn't save you — `run-probe.mjs` tries
to overwrite them from source on every invocation. Run this once per clone (or whenever
`libs/al-web-components` tokens have changed) before the first probe:

```bash
# Minimal: regenerates styles/dist/tokens.json and, as the last step of that chain,
# .altitude/ai-readiness/tokens-digest.json. Sufficient to unblock run-probe.mjs.
pnpm --filter @southleft/al-web-components build:tokens

# Full: also rebuilds custom-elements.json (already tracked, so only needed if you've
# changed component JSDoc/props locally) and compiles the library. Slower.
pnpm --filter @southleft/al-web-components build
```

If another process in your working tree (e.g. a parallel token-pipeline change) is actively
rebuilding `styles/dist/tokens.json`, the digest content you get reflects whatever that
process last wrote — that's expected, not a harness bug.

```bash
# 1) Run the fleet (defaults: 3 attempts × 3 tasks × 2 models = 18 invocations).
node scripts/ai-readiness/run-probe.mjs

# 2) Judge + synthesize that run.
node scripts/ai-readiness/run-judge.mjs .altitude/ai-readiness/runs/<runId>/
```

The fleet phase writes per-attempt JSON files plus a `run.json` manifest. The judge phase writes per-task `judge-*.json`, an overall `report.json`, and a human-readable `REPORT.md`.

### Common flags

```bash
# Increase fleet size for tighter confidence bounds (~150k tokens per +1):
node scripts/ai-readiness/run-probe.mjs --fleet=5

# Only Claude (skip Codex — no codex install required):
node scripts/ai-readiness/run-probe.mjs --models=claude

# Only a single task (good for iterating on one prompt):
node scripts/ai-readiness/run-probe.mjs --tasks=A

# Dry run: resolve binaries, build the full job list, print what WOULD be
# invoked (bin path, args, prompt length) — no child process spawned, no
# token spent. Tolerates a missing claude/codex binary entirely (this is
# what lets it run in CI with no CLI installed at all). Use this to
# sanity-check binary discovery on a new machine, or the job-list explosion
# across the full treatment matrix, before committing to a real (paid) run.
node scripts/ai-readiness/run-probe.mjs --dry-run --fleet=1 --tasks=A,B,C,G --models=claude --treatments=all

# Pin the model (default claude-opus-5) and cap spend per invocation
# (default $3 — the CLI's own --max-budget-usd):
node scripts/ai-readiness/run-probe.mjs --model=claude-haiku-4-5 --max-budget-usd=1

# Run the treatment axis (default mcp-off only — see "Treatments" below):
node scripts/ai-readiness/run-probe.mjs --treatments=all

# Bound how many child processes run at once (default 4):
node scripts/ai-readiness/run-probe.mjs --concurrency=2
```

## Binary discovery

The harness auto-finds the **real** CLI binary on every developer's machine. It explicitly skips agent-wrappers (Superconductor, Claude Code installer shims, etc.) that tail a session file and never exit on `--help`.

Discovery order:
1. `CLAUDE_BIN` / `CODEX_BIN` env vars
2. `PATH` directories, excluding any whose name contains `superconductor` / `claude-installer` / `nvm-shim`
3. Common install locations: `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin`, `~/.local/bin`, `~/.cargo/bin`, `~/.npm-global/bin`

If discovery fails:

```bash
# Pin to your machine's real binaries:
CLAUDE_BIN=/path/to/real/claude CODEX_BIN=/path/to/real/codex \
  node scripts/ai-readiness/run-probe.mjs
```

### Cross-platform (Windows included)

The harness runs on macOS, Linux, and Windows — `lib.mjs` is the single place all of this lives:

- **PATH parsing** uses `path.delimiter` (`;` on Windows, `:` elsewhere), not a hardcoded `:`.
- **Binary extensions**: on Windows, a bare name like `claude` almost never resolves directly —
  the real file carries a `PATHEXT` extension (`.EXE`, `.CMD`, `.BAT`, ...). `findBinary` probes
  the bare name (covers extensionless npm shims) and every `PATHEXT` extension.
- **`.cmd`/`.bat` shims** (how many npm-installed CLIs land on Windows) need `shell: true` to
  `child_process.spawn` — `runChild` opts into that only for resolved binaries that actually end
  in `.cmd`/`.bat`; the `claude` CLI's own `.exe` never needs it, avoiding shell-quoting risk for
  long JSON-schema / prompt arguments.
- **Temp directory**: every script imports one `TMPDIR` constant from `lib.mjs`
  (`os.tmpdir()`), never a literal `/tmp`. That literal matters on Windows: Git Bash maps `/tmp`
  to `%LOCALAPPDATA%\Temp`, but **Node resolves a bare `/tmp` path drive-relative** (e.g.
  `D:\tmp`) — two different directories on the same machine. Prompts that reference the tmp-dir
  mirror of a digest use a `{{TMPDIR}}` placeholder (see `tasks/A-composition.md`,
  `tasks/B-scaffold.md`) substituted at prompt-build time in `run-probe.mjs`, so the path an
  agent is told to `Read` is the path the digest was actually written to.

### CLI compatibility: schema draft

`schemas/*.schema.json` declare `"$schema": "http://json-schema.org/draft-07/schema#"`, not
draft 2020-12. This was a real, reproduced failure: `claude` CLI 2.1.235's offline `--json-schema`
validator doesn't have the 2020-12 meta-schema registered and rejects any schema that names it
(`Error: --json-schema is not a valid JSON Schema: no schema with key or ref
"https://json-schema.org/draft/2020-12/schema"`), failing every attempt at `exitCode=1` before a
single prompt token is spent. None of the schemas use a 2020-12-only keyword
(`prefixItems`, `unevaluatedProperties`, `$dynamicRef`), so draft-07 is a safe downgrade — but if
you add one of those keywords later, re-verify against your installed CLI version first.

## Cost + duration

The estimate below predates any real measured run. Real measured invocations this wave (all
`claude` CLI 2.1.235):

| Model | Task | Treatment | Cost | Duration |
|---|---|---|---|---|
| opus-class | A | mcp-off | $1.3469 | 96.6s |
| haiku | (trivial MCP call) | mcp-on | $0.0740 | ~7s |
| haiku | (trivial + `--json-schema`) | mcp-on | $0.1265 | ~8s |
| haiku | A | mcp-on | $0.2793 | 76.8s |

Opus is 5–13x haiku's cost for the same task. Treat any estimate as a rough order of magnitude,
not a budget guarantee, and measure with `--model=claude-haiku-4-5` before committing to a large
`--fleet` or `--treatments=all` on opus.

Per run with defaults (3 fleet × 3 tasks × 2 models, `mcp-off` only + 3 judges + 1 synth) —
**estimate, not verified at this scale**:
- ~20 LLM invocations
- ~600k–800k tokens
- ~5–8 min wall (bounded by `--concurrency`, default 4)
- ~$2–$4 in API spend on haiku; several times that on opus — measure per-model before running

## Score history over time (R8)

`build-scorecard.mjs --append-history` appends one compact, `schemas/history-entry.schema.json`-shaped
JSON line to `.altitude/ai-readiness/history.jsonl` per run — keyed by harness version (git SHA) +
date, small enough that a PR diff shows exactly the lines a new run added. Treatment arms are
first-class (`byTreatment.mcp-off` / `.mcp-on` / `.with-skill`), each carrying both the LLM-judged
score (if `run-judge.mjs` ran) and the deterministic (R4/R6) rollups — cost, latency, grader
score, axe violations, process-assertion pass rate — which are available even on an unjudged run:

```bash
node scripts/ai-readiness/run-probe.mjs --tasks=A --treatments=mcp-on ...
node scripts/ai-readiness/build-scorecard.mjs .altitude/ai-readiness/runs/<runId>/ --append-history
```

`history.jsonl` is tracked (not gitignored — same tier as the two digests). The single-snapshot
`runs/baseline/scorecard.json` (schemaVersion 2 now, additively — `treatmentScores` and
`deterministicByTreatment` alongside the original fields) still exists for the "current baseline"
use case; `history.jsonl` is for trend-over-time.

## CI (R7)

- **`ai-readiness-dry-run`** (`.github/workflows/v2-checks.yml`) runs on every PR: the
  deterministic grader/metrics/treatment unit tests, then `run-probe.mjs --dry-run` across the
  FULL treatment matrix (`--treatments=all`, all 4 tasks). Spends $0 — `--dry-run` never spawns a
  child process, and (as of this wave) tolerates a missing `claude`/`codex` binary entirely, so it
  runs on a bare `ubuntu-latest` runner with no CLI install. This is deliberately on every PR —
  the neighboring `mcp-smoke` job's own comment records what happens to a check that only runs
  behind a gate (`libs/altitude-mcp/test/smoke.mjs` rotted silently for exactly that reason).
- **`ai-readiness-eval.yml`** is separate and **label-gated** (`run-ai-readiness` on a PR) — it
  spends real money (one Task-A / `mcp-on` / haiku attempt, hard-capped at `--max-budget-usd=1`,
  well above the $0.28 a comparable real haiku attempt measured this wave). Never runs on a bare
  push/PR. **Not yet exercised in a real GitHub Actions run** — see the workflow's own header
  comment for what is and isn't verified about it.

## Layout

```
scripts/ai-readiness/
├── README.md                      # this file
├── run-probe.mjs                  # fleet phase (multi-model, multi-treatment)
├── run-judge.mjs                  # judge + synthesis phase (per task+treatment)
├── build-cem-digest.mjs            # regenerate the manifest digest
├── build-tokens-digest.mjs         # regenerate the tokens digest
├── build-scorecard.mjs            # distill a run into the tracked baseline scorecard + history.jsonl
├── lib.mjs                        # shared helpers (findBinary, runChild, extractJson, TMPDIR, resolvePkg)
├── lib/
│   ├── tasks-registry.mjs         # single source of truth: taskId -> {prompt file, schema, grader, expectedMcpTools}
│   ├── grader.mjs                 # R4 — deterministic component-usage grader
│   ├── metrics.mjs                # R6 — cost + latency extraction
│   ├── axe-check.mjs              # R6 — axe render (Task A only) via esbuild + Playwright + axe-core
│   └── treatment.mjs              # R3/R5 — treatment axis, MCP config, tool-call trace parsing
├── tasks/                         # prompt files, one per task
│   ├── A-composition.md
│   ├── B-scaffold.md
│   ├── C-violation.md
│   └── G-llms-docs.md
├── fixtures/
│   ├── canonical-contracts.md     # pinned answer keys: Task A component list, al-stat-card (B), al-tag (C)
│   └── attempts/                  # tracked fixtures for the unit tests — real recorded + explicitly-synthetic, see file headers
├── test/                          # grader/metrics/treatment/axe-check unit + integration tests — `node scripts/ai-readiness/test/*.test.mjs`
└── schemas/                       # strict JSON Schemas; passed to both CLIs as --output-schema / --json-schema
    ├── composition.schema.json
    ├── scaffold.schema.json
    ├── violation.schema.json
    ├── llms-docs.schema.json      # Task G
    ├── scorecard.schema.json      # shape of the tracked baseline scorecard
    └── history-entry.schema.json  # shape of one .altitude/ai-readiness/history.jsonl line
```

`fixtures/canonical-contracts.md` holds the pinned contracts for `<al-stat-card>` and
`<al-tag>`. **Neither component exists** — they are the eval's subjects, and `al-stat` /
`al-chip` already ship those use cases. These contracts lived in `AGENTS.md` until
2026-08-23, which had two costs: an agent doing real product work was told to build a
redundant component, and the eval's answer key sat inside the document the eval measures.
`build-cem-digest.mjs` emits both tags as `FORWARD_STUBS` (`status: "eval-fixture"`) so the
judge's cross-references resolve.

The two **digests** the harness feeds agents as ground truth — `cem-digest.json` and
`tokens-digest.json` — are tracked in git under `.altitude/ai-readiness/`, regenerated by
`pnpm --filter @southleft/al-web-components build`, and drift-gated by the `cem-and-contracts` CI job.

Per-run outputs (attempts, judges, report) under `.altitude/ai-readiness/runs/<runId>/` are
**gitignored** — they're empirical measurements, can be multi-megabyte, and are reproducible
from a fresh run. The one exception is `.altitude/ai-readiness/runs/baseline/scorecard.json`,
which **is tracked**: `build-scorecard.mjs <runDir>` distills a completed (or honestly-partial —
see below) run into a small, diffable scorecard matching `schemas/scorecard.schema.json`, so the
delta loop described below has a real committed reference point instead of only commit-message
folklore. A scorecard's score fields are either a real measured number or `null` ("not
measured") — never a placeholder number standing in for a real one.

## Iterating on AI readiness

The point of the harness is the **delta** between runs. Workflow:

1. Run a baseline:
   ```bash
   node scripts/ai-readiness/run-probe.mjs
   node scripts/ai-readiness/run-judge.mjs .altitude/ai-readiness/runs/<id>/
   node scripts/ai-readiness/build-scorecard.mjs .altitude/ai-readiness/runs/<id>/
   ```
2. Read `REPORT.md`. The `topRecommendations` field is ordered by predicted impact.
3. Apply 1–3 of the top recommendations (typically edits to `AGENTS.md` or JSDoc).
4. Re-run the probe + judge + scorecard. Compare scores per task, and diff the tracked
   `scorecard.json` against its previous committed version.
5. Commit the *docs* / *manifest* changes that moved the needle, along with the updated
   `scorecard.json`.

If step 1's judge phase isn't affordable right now (see Cost above — a real single attempt has
been measured at ~$1.35, not the ~$0.10–0.20/invocation the estimate implies), run
`build-scorecard.mjs` against the fleet-only run anyway: it writes a `status: "unjudged"`
scorecard with `null` scores rather than skipping the commit entirely. `null` means "not
measured" — it is never filled in with a guess.

This loop is how the design system actually gets more AI-ready: empirical evidence, not "this AGENTS.md feels comprehensive."

## Extending

- **Add a task:** drop a new prompt in `tasks/` + a matching schema in `schemas/`, then add an entry to `lib/tasks-registry.mjs` (**not** a local map in `run-probe.mjs` — both `run-probe.mjs` and `run-judge.mjs` read this one registry; a taskId shaped differently than `A-composition` will silently resolve the wrong prompt file in the judge if you bypass it — see the "defect 1" comment at the top of `lib/tasks-registry.mjs`).
- **Add a model:** add a new runner function in `run-probe.mjs` (`RUNNERS.foo`), then run with `--models=claude,codex,foo`. Treatments and the MCP tool-call trace are currently claude-only — see `lib/treatment.mjs`.
- **Add a scoring dimension:** extend the judge schema in `run-judge.mjs` (`JUDGE_SCHEMA.properties.perAttempt.items.scores`), or add a new pure function to `lib/grader.mjs` if it can be computed deterministically (preferred — R4's whole point is scoring that doesn't need an LLM call to regression-test).

## Known gaps (honest, not fixed this wave)

- **The retry wrapper doesn't accumulate cost.** `runWithRetry` in `run-probe.mjs` re-invokes the
  CLI on a void/unparseable first attempt and records ONLY the retry's `costUsd` — the first
  (discarded) attempt's real spend is not summed in. A retried attempt's true cost is higher than
  its recorded `costUsd`. Worth fixing before trusting `fleetSummary.totalCostUsd` as an exact
  figure for a run with retries.
- **The judge is Claude-only**, even for a multi-model (claude+codex) fleet — noted as optional to
  fix in the spec; still true.
- **Codex has no verified MCP/treatment wiring** this wave — see "Treatments" above.
- **The `ai-readiness-eval.yml` label-gated workflow has not been exercised in a real GitHub
  Actions run** — authored against the same CLI flags this wave verified locally, but the CLI
  install step and secret wiring are unverified in an actual runner.
