# Create Spec (Monday Morning)

Create a new specification — the universal unit of work. Specs stand on their own and are
sequenced by their dependencies, not by a feature.

## Entity Format Reference (load first)

Before creating or editing any `.mm/` entity file, Read `<project_path>/.mm/reference/entity-format.md` — it is the authoritative on-demand reference for file formats, folder naming, frontmatter, and dashboard rules. If the file does not exist (legacy install), fall back to the "Monday Morning Entity Reference" section of the managed `.claude/CLAUDE.md` block. Do not proceed from memory.

## Usage

```
/mm:spec ["short description"] [--stage shape|write|tasks|brief [spec-folder]] [--phase [n]] [--auto]
```

No args → start shaping interactively. Description → quick mode. (Grouping a spec under a feature
is optional and comes last; it is never required to create or order a spec.)

`--stage` runs a **single stage** of this same pipeline against an existing spec folder instead of
the full flow — the replacement for the retired `/mm:shape-spec`, `/mm:write-spec`, and
`/mm:create-tasks` commands. See **Single-stage runs** at the end.

`--stage brief <spec-folder>` shapes a **filed brief** (a spec dispatched straight from the board
with `intent:`/`guide:` and no tasks, see `docs/brief-format.md`) into a real, tasked spec — the
same three stages below, run unattended and in one go from the brief's own record. See
**Single-stage runs** at the end.

`--phase [n]` shapes specs for **every unshaped feature in one roadmap phase** — the replacement
for the retired `/mm:spec-all`. See **Phase mode** at the end. `--auto` (with `--phase`) skips
the per-feature description questions and generates from `feature.json` descriptions.

---

## Workflow

This command is a dialog script. Deterministic work lives in MCP tools and subagents; the prose below is what to ask the user and which tool to call next.

**When delegating to any subagent (spec-shaper, spec-writer, tasks-list-creator), pass the ABSOLUTE
spec folder path** (e.g. `<project_path>/.mm/specs/<slug>`), not a bare slug or a cwd-relative
`.mm/specs/...` path. Subagents do not necessarily share your working directory (you may be running
from a git worktree), so relative reads can silently miss `requirements.md` / `prior-work.md`.

**Modes.** Default is **interactive shaping**: a raw idea runs the full shaper Q&A (step 2) and the
task critic loop (step 4). When the design is **already shaped** — promoted from an approved plan,
converted `from issue <path>`, or an `.mm/ideas` entry with detailed content — take the **fast path**:
create the folder (step 1, passing the known `depends_on`), write `requirements.md` and the spec body
directly from the shaped source, then register tasks (step 4d) — skipping the interactive shaper Q&A
and the critic loop. Use the fast path only when requirements genuinely already exist. A third mode,
**unattended delegation** (parallel specs, `claude -p`, orchestrator-driven runs), still delegates to
the shaper and critic loop but never blocks for a human — see step 2 and spec-shaper.md's Operating
modes section (the canonical definition; do not restate it here). `--stage brief` (below) is a
member of the fast-path family too: the brief's own frontmatter (`intent:`/`summary:`/`guide:`/
`roadmap:`) IS the already-shaped source, so it runs unattended end to end with no human ask at any
stage.

**Fast path still persists source materials.** The shaper (step 2) is normally what copies design
sources — screenshots, design canvases, briefs, reference code — into the spec's `visuals/` folder;
skipping it must not drop them. On the fast path, copy any source materials the shaped design came
from into `visuals/` (or `.mm/product/source-docs/` if they're product-wide) yourself, and reference
them from `requirements.md`, so implementers aren't left with prose that points at files nobody saved.

### 1. Create the spec folder (first — the folder must exist before shaping)

`mm_create({entity: "spec", project_path, name, description, source, summary?, depends_on?, idea_folder?, issue_path?})`
— mints the spec folder and scaffolds `spec.md` (literate: frontmatter + empty `## Tasks`),
`raw-idea.md` (seeded from `description`, so the shaper's read never misses), `manifest.md`, and
auto-generated `prior-work.md`. Do NOT re-create `implementation.md` or pre-populate tasks.
`project_path` is the absolute path to the project root (the directory containing `.mm/`) — use the
current working directory. Specs are created **unlinked**; do not pass a feature here (grouping is
optional and comes last, step 6).

**Pass `summary`.** On the fast path (design already shaped), you write it yourself — one
plain-English sentence, ≤110 chars, what this spec changes for the person using the product.
Otherwise leave it out here; spec-writer (step 3) writes it into the frontmatter once it has the
full requirements. Either way `mm_create` clamps the folder slug to three meaningful words
(`docs/naming-caps.md`) regardless of how long `name` is — `title:` always keeps the full name. The
result carries `slug_clamped: boolean` and, when clamped, `requested_slug`; note both in the step 7
output line when `slug_clamped` is true.

**Declare dependencies via the tool.** If the prerequisites are already known (from a plan, an issue,
or the description), pass them as `depends_on: ["YYYY-MM-DD-slug", ...]`. `mm_create` writes them into
the spec.md frontmatter — the single source of truth the dashboard/Conductor use to derive
build-order waves and the **blocked** state. Omit for a wave-1 spec. If shaping (step 2) surfaces new
prerequisites, add them to the `depends_on` block then (edit the frontmatter, preserving the rest).

**Record `source`.** Pass `source` to `mm_create` — the roadmap item, instruction, conversation,
or issue that prompted this spec — and the tool writes it into the spec.md frontmatter. If it can't
be derived from context, ask the user one short question ("What prompted this spec — a roadmap
item, an instruction, a conversation?") before calling. Never leave `source` out of a newly created
spec. Resulting frontmatter:

```yaml
---
type: spec
title: <Name>
status: backlog
depends_on:
  - 2025-12-01-auth-schema
tags: [spec]
source: "Roadmap Q1 item: faster onboarding"
roadmap: P1.M3
---
```

**Declare the roadmap parent.** Pass `roadmap` to `mm_create` when it's known: `P<p>.M<n>` when
the milestone is named (the desktop app's Shape dispatch sends "Roadmap milestone: M<n> in phase
<p>" — use that), `feature:<id>` when this spec belongs to a feature. For deliberately
out-of-plan work, pass `roadmap: "none"` with `roadmap_reason` explaining why. Omit only when
genuinely unknown — the tool validates the ref and it will show as an orphan in roadmap health
until assigned later.

**Shaping an existing idea?** If the invoking context mentioned an idea folder (e.g. "Shape idea ... Idea location: `.mm/ideas/<YYYY-MM-DD-slug>`" or the user pointed at a specific `.mm/ideas/...` folder), pass that path as `idea_folder`. The MCP tool will stamp `shaped_to: <new-spec-folder>` onto the idea's `idea.md` frontmatter so the kanban Shaping column dedups the promoted idea. Omit `idea_folder` for greenfield specs not derived from an existing `.mm/ideas/` entry.

**Converting an issue?** If invoked as "from issue `<path>`" (the desktop app sends `/mm:spec from issue .mm/issues/<name>.md`), read that issue file first for context (problem, severity, source) and fold it into the requirements, then pass the same path as `issue_path`. The MCP tool will write `converted_to: ./specs/<new-spec-folder>` onto the issue's frontmatter so the kanban marks the issue as converted to a spec. Omit `issue_path` for specs not derived from an issue.

**Shaping a roadmap milestone?** When `roadmap` was a milestone ref, `mm_create` itself stamps
the reciprocal `` — `spec:<slug>` `` tail ref onto that milestone's line in
`.mm/product/roadmap.md` — no manual step needed. Only if the tool's result carries a `warning`
(roadmap.md missing, milestone line not found, etc.) fall back to doing it by hand: find that
milestone's `- [ ] M<n>: ...` line (match the `M<n>:` id within the named phase, else match the
title) and append `` — `spec:<slug>` `` to the end of the line, changing nothing else. That ref
is the ONLY way the roadmap board and Reconcile resolve a milestone to its spec — without it the
milestone reads "No spec yet" no matter what ships.

### 2. Gather requirements (shape)

Delegate to the **spec-shaper** subagent, passing the **absolute spec folder path**. It reads
`raw-idea.md` + product context, asks the user for the problem, key requirements, visual assets, **and
which existing specs this one depends on**, reads any persisted source materials in
`.mm/product/source-docs/` (design handoffs, briefs, screenshots, reference code), copies relevant
screenshots into the spec's `visuals/`, and writes `requirements.md` into the spec folder. Do **not**
ask the user to pick a feature here. If shaping surfaces prerequisites not already in `depends_on`,
add them to the spec.md frontmatter now (see step 1). For the **fast path** (design already shaped),
skip this delegation and write `requirements.md` directly from the shaped source.

**Delegating unattended.** When invoking the shaper from a parallel spec run, `claude -p`, or the
orchestrator, tell it explicitly that the run is unattended and pass the approved analysis/context,
verified code anchors, and explicit answers for out-of-scope and `depends_on` — do not leave it to
infer them. Per spec-shaper.md's Operating modes section (canonical; not restated here), the shaper
then self-answers its standard questions from what you gave it, never blocks for a human, and records
anything it genuinely can't resolve as an Open Question in `requirements.md` rather than stalling.
Those open questions are resolved downstream by spec-writer (step 3). As with any upstream output,
treat the shaper's `requirements.md` as a starting point: spec-writer and tasks-list-creator re-verify
its claims against the actual codebase before building on them.

**DesignSync size cap.** DesignSync's `get_file` truncates at 256 KiB — large `.dc.html` design
canvases can exceed that and truncate **silently**. When pulling a design source via DesignSync,
check the returned size against the file's actual size (or read the file from disk with the Read
tool instead) before treating it as the complete design.

### 3. Expand the spec body

Delegate to the **spec-writer** subagent with the spec folder, requirements, and visuals. Pass along `prior-work.md` if present.

**Decomposition record (always).** Write `predicted:` and `preconditions:` into `spec.md`'s
frontmatter — `predicted` (retires/tasks/risk/spawns/confidence) is frozen once written, never
edited after; `preconditions` is a list of claims with a grep-checkable `check:`, each RUN once now
and its `status` (`holds | broken | unknown | moot`) and `verified` date set from that run. Applies
on the fast path too.

```yaml
predicted:
  retires: "…"
  tasks: 5
  risk: "…"
  spawns: "…"
  confidence: 0.7
preconditions:
  - claim: "…"
    check: "grep -n … # expect …"
    status: holds | broken | unknown | moot
    verified: 2026-08-16
    note: "…"          # optional
    resolved: "…"      # optional
```

### 3.5. Refresh prior work

`mm_retrieve_prior_work({project_path, spec_path})` — idempotent. On failure, log a warning and continue.

### 4. Generate tasks (reflection loop)

(Fast path — design already shaped: you may author the task list directly and skip the
delegation + critic loop, going straight to 4d. The interactive loop below is for raw-idea specs.)

4a. Delegate to **tasks-list-creator** with `spec.md`, `requirements.md`, refreshed `prior-work.md`,
visuals. The agent applies a scope gate over its own change map: ~3 distinct files or fewer and it
annotates task titles inline with `[files: ...]`; more than that and it writes
`.mm/specs/{slug}/plan.md` per `.claude/schemas/plan-format.md` instead. It MAY also write
`tasks.md` as prose breakdown detail, and MUST NOT write `implementation.md`. Either way its final
message is the ordered `T1: ...`, `T2: ...` task-titles list — that's what 4d passes to `mm_create`.
See tasks-list-creator.md's scope-gate probe and Output contract sections for the canonical detail.

4b. Switch to critic mode and emit:

```
TASK CRITIQUE
  Coverage:    {PASS | uncovered requirements}
  Gaps:        {PASS | missing implicit work}
  Redundancy:  {PASS | overlapping tasks}
  Ordering:    {PASS | dependency violations}
  Scope creep: {PASS | out-of-scope tasks}
  Granularity: {PASS | split/merge}
  Plan quality: {PASS | plan.md task IDs don't match returned titles / scope gate not honored}
  Verdict: {PASS | REVISE}
```

4c. On REVISE, feed critique back to tasks-list-creator. Max 2 revisions; then proceed with the best version and note remaining concerns.

4d. Register the whole list in ONE call: `mm_create({entity: "task", project_path, spec_path,
titles: ["T1: ...", "T2: ...", ...]})`. Tasks land in Backlog in the given order. Do not loop
single-`title` calls — they're N sequential round trips and all rewrite the same spec.md.

### 5. Confirm the build order

The spec's `depends_on` (set in step 2) is what sequences it — no per-feature linking needed.
If you added or changed dependencies, suggest the user run `/mm:order-specs` to refresh the
project-wide build order (`.mm/specs/order.json`). The Conductor also derives waves from
`depends_on` directly, so the order shows up even before that runs.

### 6. Group under a feature (optional)

Only if grouping genuinely helps the dashboard. Ask once: "Group this spec under a feature?"
Default **no**. If yes, `mm_link({entity: "spec", project_path, spec_path, feature_id})` (or create
one with `mm_create({entity: "feature", ...})` first). Features are a label only — they do not
affect build order. Most specs skip this.

### 7. Output (plain markdown, no code fence)

**Spec created** — {spec-slug}
path `.mm/specs/{date}-{spec-slug}/`
depends_on {comma-separated slugs or "none — wave 1"}
feature {Feature Name or "none"}
tasks {count} · critique {PASS | PASS after N revisions | N concerns}
record {N} preconditions · conf {c}
{slug clamped from "{requested_slug}" — only when mm_create returned slug_clamped: true}
next → `/mm:spec-start {spec-slug}`

---

## Single-stage runs (`--stage`)

Each stage is one of the steps above, run alone against an existing spec. Resolve the spec folder
from the argument, else the most recent in `.mm/specs/*/`, else ask. Always pass subagents the
**absolute** spec folder path (top note).

- **`--stage shape`** — steps 1–2 only: create the folder if it doesn't exist (`mm_create`), then
  run the **spec-shaper** Q&A to produce `requirements.md` (+ `visuals/`). Relay the shaper's
  numbered questions to the user and wait; surface follow-ups the same way. Do NOT run
  `/mm:order-specs` here — when bulk-shaping, the conductor runs it once after the whole queue to
  avoid concurrent `order.json` writes. Finish: `Requirements gathered → next: /mm:spec --stage
  write {folder}`.
- **`--stage write`** — step 3 only: the folder and `requirements.md` must exist (if not, say
  which stage to run first and stop). Delegate to **spec-writer** with requirements, visuals,
  `prior-work.md`, and the spec's `source` (derive it; one short question if underivable). Finish:
  `spec.md ready → next: /mm:spec --stage tasks {folder}`.
- **`--stage tasks`** — step 4's full reflection loop (4a–4d) for an existing spec: needs
  `spec.md` and/or `requirements.md` (if neither is findable, ask where they are and stop).
  Run tasks-list-creator → critique → register via ONE batch `mm_create({entity: "task", titles})`
  call. Finish with the task/plan.md summary and `next: /mm:spec-start {folder}`.
- **`--stage brief <spec-folder>`** — shapes a filed brief into a real, tasked spec, entirely from
  the brief's own record, in one unattended pass (Stages A–C below). **Headless-safe: this stage
  never calls `AskUserQuestion`, at any stage** — it may be running with that tool denied
  (a conductor `shape` session), and even when it isn't, a brief-shape run must never block for a
  human. Anything the stage can't resolve goes to `requirements.md`'s Open Questions instead of an
  ask.

  **Preconditions.** `<spec-folder>/spec.md` must exist and carry `intent:` in its frontmatter —
  else stop: `not a brief — run --stage shape`. `## Tasks` must have no `- [ ]`/`- [x]` items —
  else stop: `already shaped`.

  **Gather the record** (all from `<spec-folder>/spec.md` frontmatter plus the folder itself):
  `intent:` (the request, verbatim), `summary:`, `guide:` (list the files already under
  `visuals/` — do not copy or re-fetch anything, they're in place), `owner:`, `roadmap:` (when it's
  `P<p>.M<n>`, also read that milestone's own line from `.mm/product/roadmap.md` for the fuller
  context), and `raw-idea.md`.

  **Stage A — shape.** Delegate to **spec-shaper**, unattended (its Operating modes section),
  passing the gathered record as the approved analysis: `intent:` is the problem statement,
  `summary:` is the one-line goal, the `guide:`/`visuals/` files are the source materials (already
  persisted — do not copy them again), the `roadmap:` milestone is the fit, out-of-scope is "not
  stated — keep to the intent" unless the intent itself names an exclusion, and `depends_on` is
  none unless the intent names a prerequisite spec by name. It writes `requirements.md`; anything
  it can't resolve from the record goes to Open Questions there, never a blocking ask.

  **Stage B — write.** Delegate to **spec-writer** with `requirements.md`, `visuals/`, and
  `prior-work.md`, under the **preserve rule**: when `spec.md` already exists (a brief, or any
  re-write), rewrite the BODY only — from `# Specification:` down. Keep every existing frontmatter
  key and value verbatim (`intent`, `guide`, `summary`, `roadmap`, `source`, `owner`, `created`,
  `status`, `status_history`, `critical_requirements`, `tags` — a shaped brief keeps
  `tags: [spec, brief]`); add `predicted:`/`preconditions:` after the existing keys as usual; never
  touch `## Recorded`. `summary:` is only written when the frontmatter doesn't already have one.

  **Stage C — tasks.** Run tasks-list-creator → critique (one pass, unattended — REVISE feeds back
  once then proceeds with the best version, no second interactive loop) → register the whole list
  in ONE `mm_create({entity: "task", titles})` call.

  Finish: `Brief shaped → {n} tasks · next: /mm:spec-start {folder}`.

## Phase mode (`--phase [n]`)

Shape the **unshaped milestones of one roadmap phase** into real specs — just-in-time, never the
whole roadmap up front. Tasks written against an imagined codebase rot: earlier specs change the
substrate later ones build on, so shape this phase, build it, then shape the next (which can read
what the first built). Need a single milestone instead? Plain `/mm:spec` (or the roadmap's
**Shape** button).

1. **Resolve the phase.** Read `.mm/product/roadmap.md`; use the phase named in the argument, else
   the earliest phase that isn't fully done. Only consider features/milestones WITHIN that phase.
   For each, unshaped = `linked_specs` empty or missing in its `feature.json`. No features at all →
   `Run /mm:plan first.` All shaped → list them and point at plain `/mm:spec {feature}` for
   additional specs.
2. **Gather minimal context** — ONE set of questions for all specs: a 1–2 sentence description per
   feature (user may answer `auto` to use the `feature.json` descriptions; `--auto` skips the ask
   entirely).
3. **Create each spec** through THIS command's own pipeline, abbreviated per feature:
   `mm_create({entity: "spec", project_path, name, description, feature_id})` (creates the literate
   folder and links the feature) → **spec-writer** expands the body, grounded in the persisted
   source-docs AND the current codebase → **tasks-list-creator** produces the task list →
   register via ONE `mm_create({entity: "task", titles: [...]})` batch call → verify the `## Tasks`
   block exists. Declare any inter-spec `depends_on` you can see between the new specs.
4. **Progress + summary:** show `[i/N] {feature} → {spec-folder} → {t} tasks` as you go; on
   failure, log and continue, reporting failures at the end. After all specs: run `/mm:order-specs`
   once (never per-spec — concurrent order.json writes) and print the created/skipped totals with
   `next → /mm:spec-start {first-spec}` (or `/mm:spec-start --all`).

## Related

- `/mm:plan` — set up product docs first
- `/mm:order-specs` — compute the project-wide build order from dependencies
- `/mm:spec-start` — implement a spec
