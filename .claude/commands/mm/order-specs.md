# Order Specs

Analyze the project's specs and determine the build order, grouping them into numbered **waves**
driven by each spec's dependencies (`depends_on`). Writes a project-wide `.mm/specs/order.json`
that the Conductor reads to group and gate work.

## Usage

```
/mm:order-specs [--auto] [--prioritize]
```

- `--auto` — **autonomous mode**: derive and write `.mm/specs/order.json` without the confirmation
  prompt. For unattended callers (e.g. `/mm:reconcile --auto`, the orchestrator, `claude -p`,
  scheduled routines).
- `--prioritize` — **analysis mode** (absorbed the former `/mm:prioritize`): before ordering,
  read the specs (and standalone tasks) in depth to discover *implicit* dependencies, score
  priorities, and write `priority_score`/`unblocks`/`critical_path` back to spec frontmatter —
  then produce the same `order.json` through the deterministic tool. See **Prioritize mode**
  below.

---

## Workflow

### Step 1: Call the MCP Tool

Call `mm_order_specs` with `project_path` (no `write`) to get the deterministic analysis. This
tool:

- Reads every spec folder, parses `depends_on` from frontmatter (including YAML lists)
- Computes progress from `implementation.md`
- Runs topological sort (Kahn's algorithm) into waves
- Detects dependency cycles
- Checks file overlaps within waves for parallelism (falls back to scraping file paths out of
  task text when a spec has no `manifest.md` bullets, so `parallel: true` means "no file
  collision we could find," not just "no dependency edge")
- Validates `depends_on` references exist on disk
- Filters out completed specs

Waves, `parallel`, and `file_overlaps` are this tool's own deterministic computation — nothing in
this workflow ever hand-derives or transcribes them.

The result contains:

- `specs` — all incomplete specs with slug, title, status, depends_on, progress, primary_files
- `completed` — completed specs (excluded from ordering)
- `waves` — topologically sorted waves with parallelism info
- `cycles` — specs involved in dependency cycles (if any)
- `missing_deps` — slugs referenced in depends_on but not found
- `undeclared` — specs with no depends_on (may need heuristic edges)

### Step 2: Review & Enrich

Using the tool's output:

1. **Report issues** — cycles, missing deps, warnings
2. **Label each wave** — give it a short descriptive name based on the specs' titles and goals
   (e.g., "Foundation", "Backend + Auth", "UI Polish", "Integration")
3. **Review `undeclared` specs** — specs with no `depends_on`. Consider whether any should depend
   on others based on their titles and the overall project structure. Propose backfilling
   `depends_on` into those specs' `spec.md` frontmatter (skip in `--auto` mode).
4. **Summarize** — present the ordering clearly

**Output format:**

```
Proposed build order ({wave_count} waves, {spec_count} specs)

Wave 1: {label} (parallel)
  1. {spec-slug} — {title} ({progress}%)
  2. {spec-slug} — {title} ({progress}%)

Wave 2: {label}
  3. {spec-slug} — blocked by {prerequisite-slug} ({progress}%)

Completed (excluded): {count}
  - {spec-slug}: {title}

Warnings:
  - {cycle / missing dep / other issues}

Inferred dependencies to backfill (optional):
  - {spec-slug}.depends_on += [{inferred-slug}]
```

### Step 3: Confirm & Write

Use `AskUserQuestion` to confirm (skip in `--auto` mode). Options:

- "Yes, write order.json" (+ backfill inferred deps if any were proposed and accepted)
- "Adjust ordering" — let the user describe changes, then regenerate
- "Cancel" — abort without writing

### Step 4: Write order.json

Call `mm_order_specs` again, this time with `write: true` and a `labels` argument carrying only
the prose you composed in Step 2 — the tool recomputes waves/parallel/file_overlaps itself and
writes `.mm/specs/order.json` (it does not trust or reuse anything from the Step 1 call for the
write):

```json
{
  "project_path": "<project root>",
  "write": true,
  "labels": {
    "1": {
      "label": "<your wave 1 label>",
      "reasons": {
        "<spec-folder-name>": "<why this spec is in wave 1>"
      }
    }
  }
}
```

`labels` is optional and per-phase — omit a phase (or the whole argument) to get deterministic
defaults ("Wave N", a dependency-derived reason). The tool's response includes `order_json` (the
exact content it wrote) and `order_json_path` — use those to confirm rather than re-reading the
file.

If the user accepted backfill proposals, also update those specs' `spec.md` frontmatter
to add/merge the `depends_on:` list.

### Step 5: Confirm

```
Build order saved to .mm/specs/order.json

{wave_count} waves, {spec_count} specs ordered, {unordered_count} unordered
{backfilled_count} specs had depends_on backfilled

The Conductor now groups specs by wave and flags blocked specs.
Re-run /mm:order-specs after adding specs or changing dependencies.
```

---

## Prioritize mode (`--prioritize`)

Runs BEFORE the deterministic ordering above, enriching the graph it sorts. This is the analysis
the old `/mm:prioritize` did; the write path is unified so the two can't diverge.

### P1. Load active specs AND standalone tasks

Read every spec in `.mm/specs/` whose status is not `done`/`complete` — `spec.md` in full (Goal,
Requirements, Tasks, existing `depends_on`/`next_spec`/`blocked_by`). Also read every incomplete
`.md` in `.mm/tasks/` (quick + standalone tasks) — they appear on the board too and can depend on
or block specs.

### P2. Discover implicit dependencies

Beyond the explicit frontmatter, read for: spec A creates an API/component/schema B references;
A and B modify the same shared file (merge-conflict risk → serialize); A establishes a pattern B
should follow; A is a prerequisite feature (auth, schema, core lib). Record each discovered edge
as `from` / `to` / one-sentence `reason` / `confidence` (high/medium/low).

### P3. Score priorities

Per spec: **unblock count** (direct + transitive dependents), **critical path** (on the longest
chain?), **readiness** (all prerequisites done?), **size** (task count), **staleness**. Priority =
unblocks the most work and is ready now.

### P4. Write frontmatter, then order

Update each spec's frontmatter with `priority_score`, `unblocks`, `critical_path` — and merge any
accepted discovered edges into `depends_on`.

> **`depends_on` MUST be a plain list of bare spec-folder slugs** — one slug per line, nothing
> after it. Do NOT use `- spec:/reason:/confidence:` mapping form and do NOT add trailing
> `# comments`: the build-order parser reads the raw text after each `- ` as the slug, so anything
> else becomes a phantom "missing dependency". Record reason/confidence in `order.json`'s `reason`
> field, never here.

Then continue with **Step 1 above** (the deterministic `mm_order_specs` → waves → `order.json`
flow) so the topological ordering stays canonical. Also write the analysis summary to
`.mm/session/priority-analysis.md` (recommended execution order with scores, dependency graph,
parallelizable pairs, any cycles) and report: order with scores, newly discovered dependencies,
what can parallelize, cycles as errors.

**When to use it:** after creating several specs, after completing one, or when the Queue view's
ordering looks stale. Plain `/mm:order-specs` (no flag) stays the cheap deterministic re-sort.

---

## Related Commands

- `/mm:spec` — create a spec and declare what it `depends_on`
- `/mm:spec-start` — start implementing a spec
- `/mm:spec-start --all` — implement specs in wave order
