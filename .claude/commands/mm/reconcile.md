# Reconcile — Audit and Fix Spec Task Status

> **Note (2026-05-17):** The literate spec format (single `spec.md` with inline
> `## Tasks`) makes the file-drift role of this command obsolete — there is no
> longer a `tasks.md` / `implementation.md` pair to drift apart. The
> codebase-audit role (verifying checkbox state against actual code) remains
> useful. See `.mm/specs/2026-05-17-literate-spec-format/`.

Scan all specs (or a specific spec) and reconcile task checkboxes with the actual state of the codebase. Tasks live in `spec.md`'s `## Tasks` section for migrated specs and in `implementation.md` for any remaining legacy specs. Fixes stale task tracking caused by parallel implementations, interrupted workflows, or merge conflicts.

## Usage

```
/mm:reconcile [spec-name] [--dry-run] [--auto]
```

- No arguments: reconcile ALL specs with incomplete tasks
- `spec-name`: reconcile a specific spec only
- `--dry-run`: show what would change without modifying files
- `--auto`: **autonomous mode** — apply fixes without pausing and, when any spec changed, refresh the
  project build order by running `/mm:order-specs --auto`. Treat the run as autonomous whenever
  there's no human in the loop (the orchestrator, `claude -p`, a scheduled routine), not only when the
  flag is passed. Mutually exclusive with `--dry-run`.

> **Why refresh the order?** Reconciling completion status changes which specs are unblocked and which
> **wave** each falls into. Left alone, `.mm/specs/order.json` and the Conductor's waves go stale the
> moment a spec flips to done — so in autonomous mode reconcile self-heals the build order too. This is
> the self-healing half of the roadmap's autonomous-orchestration goal.

## When to Use

- After parallel spec implementations (`/mm:spec-start --parallel`) where agents didn't update implementation.md
- After worktree merges where checkbox state was lost
- After interrupted implementations
- Anytime the dashboard shows wrong progress percentages
- As a periodic sanity check

## Workflow

### Step 1: Identify Specs to Reconcile

**If spec-name provided:** Find the matching spec in `.mm/specs/`.

**If no spec-name:** Scan all specs in `.mm/specs/` and identify those with pending tasks (`- [ ]` in implementation.md).

For each spec, read:

- `.mm/specs/{spec}/implementation.md` — current task status
- `.mm/specs/{spec}/spec.md` — requirements to verify against

### Step 2: Analyze Each Task Against Codebase

For each task that is `- [ ]` (unchecked) in implementation.md:

1. **Read the task description** — understand what it's supposed to implement
2. **Search the codebase** for evidence that the task was completed:
   - Look for files, functions, components, or patterns described in the task
   - Check git log for commits that reference the task ID or description
   - Check if the task's requirements are met by existing code
3. **Classify the task:**
   - **DONE** — Implementation exists in codebase, checkbox is wrong
   - **PARTIAL** — Some sub-tasks done, some not
   - **NOT DONE** — No evidence of implementation

### Step 3: Display Reconciliation Report

```
Spec Reconciliation Report
══════════════════════════════════════════════════════

{spec-name}
  Current: {completed}/{total} tasks ({progress}%)

  Tasks to mark complete:
    ✓ T1: {task title} — code exists at {file}:{line}
    ✓ T3: {task title} — committed in {hash}
    ~ T4: {task title} — PARTIAL (2/4 sub-tasks done)

  Tasks still pending:
    ○ T5: {task title} — no implementation found
    ○ T6: {task title} — no implementation found

  After reconciliation: {new_completed}/{total} tasks ({new_progress}%)

══════════════════════════════════════════════════════
Total specs scanned: {N}
Specs with changes: {N}
Tasks to update: {N}
```

**If `--dry-run`:** Stop here.

```
DRY RUN — no changes applied. Remove --dry-run to execute.
```

### Step 4: Apply Changes

For each spec with tasks to update:

1. **Read** `.mm/specs/{spec}/implementation.md`
2. **Move completed tasks** from `## In Progress` or `## Backlog` to `## Completed`
3. **Mark them** `- [x]` (including all sub-tasks)
4. **For PARTIAL tasks**, mark completed sub-tasks `- [x]` but keep the parent as `- [ ]`
5. **Update frontmatter** counts:
   ```
   total_tasks: {count}
   completed_tasks: {count}
   ```
6. **Write** the updated file

### Step 5: Update Feature Progress

For each spec that changed:

1. Check if the spec is linked to a feature in `.mm/features/`
2. If linked, recalculate the feature's progress:
   - Count completed specs vs total linked specs
   - Update `feature.json` progress fields

### Step 5b: Refresh build order (autonomous mode)

Completion changes ripple into the build order: a spec that just flipped to done unblocks whatever
`depends_on` it, shifting waves. Keep the order in sync with the status you just corrected.

- **Autonomous run** (`--auto`, or invoked unattended by the orchestrator / `claude -p` / a scheduled
  routine) **AND at least one spec changed in Step 4** → run **`/mm:order-specs --auto`**. It
  re-derives `.mm/specs/order.json` from the updated dependency graph without prompting. Skip it when
  nothing changed — there's nothing to re-order.
- **Attended run** → don't run it automatically. If specs changed, suggest it once:
  `Spec status changed — run /mm:order-specs to refresh the build order.`
- **`--dry-run`** → never runs (Step 3 already stopped before any changes).

### Step 6: Summary

```
Reconciliation Complete
══════════════════════════════════════════════════════
Specs updated:    {N}
Tasks corrected:  {N} marked complete
Features updated: {N}
Build order:      {refreshed via /mm:order-specs --auto | unchanged | suggested}

Updated specs:
  {spec-name}: {old}% → {new}%
  {spec-name}: {old}% → {new}%

Unchanged specs (already accurate):
  {spec-name}: {progress}%
══════════════════════════════════════════════════════
```

## Important Rules

1. **Only mark tasks done if the code actually exists.** Don't assume — verify by reading files, searching for patterns, or checking git history.
2. **When in doubt, leave as unchecked.** False positives (marking undone work as done) are worse than false negatives.
3. **Check sub-tasks individually.** A parent task may be partially done.
4. **Respect the `## Completed` / `## In Progress` / `## Backlog` section structure.** Move tasks between sections, don't just toggle checkboxes.
5. **Never delete tasks.** Only change their status.

## Related Commands

- `/mm:spec-status` — View current spec progress
- `/mm:order-specs` — Recompute the project build order (waves); reconcile runs this in autonomous mode
- `/mm:merge-worktrees` — Merge parallel implementations (includes reconciliation)
- `/mm:review --health` — Project health audit
- `/mm:spec-start` — Implement tasks (updates task state after each task)
