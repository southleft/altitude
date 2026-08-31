# Health Fix — Audit-Fix-Verify Loop

Autonomous audit-fix-verify loop. Scans project health, applies fixes from a closed vocabulary, then re-audits to verify improvements.

## Usage

```
/mm:health-fix [--dry-run] [--stale-days N]
```

**Flags:**

- `--dry-run` — Show the fix plan without applying any changes
- `--stale-days N` — Override default stale threshold (default: 14)

## Reference Files

Read these before starting:

- `mcp-servers/monday-morning/src/lib/health-analyzer.ts` — types and check functions
- `mcp-servers/monday-morning/src/lib/health-fixer.ts` — FixAction types, resolveFixActions, formatHealthFixReport

## Workflow

### Step 1: Parse Flags

Check the command arguments:

- `--dry-run` → Set `dry_run = true`
- `--stale-days N` → Set `stale_days = N`

Defaults: `dry_run = false`, `stale_days = 14`

### Step 2: AUDIT Phase (Before)

Perform the exact same project scan as `/mm:review --health`:

#### 2a: Scan Specs

1. List all folders in `.mm/specs/`
2. For each spec folder, read `implementation.md`
3. Parse tasks: count `- [x]` as completed, `- [ ]` under `## In Progress` as in_progress, `- [ ]` under `## Backlog` as backlog
4. Get last modification date via: `git log -1 --format="%ai" -- .mm/specs/{folder}/`
5. Build a `SpecHealth` object for each spec

#### 2b: Scan Issues

1. Read `.mm/issues/issues.md`
2. For each unchecked `- [ ]` line, extract title, severity, creation date
3. Build `IssueInfo` objects

#### 2c: Scan Features

1. List all folders in `.mm/features/`
2. For each feature, read `feature.json`
3. Build `FeatureInfo` objects

#### 2d: Run Health Analysis

Apply health check logic with config:

```
HealthConfig {
  staleDays: {stale_days},
  stuckTaskDays: 7,
  agedIssueDays: 30,
  nearlyDonePct: 80
}
```

Output the audit results:

```
Health Fix — Audit-Fix-Verify Loop
==================================

AUDIT (before)
  Findings: {critical} critical, {warnings} warnings, {info} info
```

### Step 3: RESOLVE Phase — Generate Fix Plan

Apply `resolveFixActions` logic to the findings. Map each finding to fix actions using **only** this closed vocabulary:

| Finding           | Severity         | Action                  | Behavior                                                                                                                      |
| ----------------- | ---------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `stale-spec`      | critical (>30d)  | `archive_spec`          | Add `**Status:** Archived` line to spec.md, move all open tasks to `## Completed` with `[ARCHIVED]` prefix                    |
| `stale-spec`      | warning (14-30d) | _skip_                  | Too early to archive                                                                                                          |
| `stuck-task`      | warning          | `move_tasks_to_backlog` | In implementation.md, move items from `## In Progress` to `## Backlog`                                                        |
| `empty-spec`      | warning          | `generate_tasks`        | Read spec.md requirements, generate 3-5 task titles, add to `## Backlog` in implementation.md                                 |
| `aged-issue`      | critical (>90d)  | `close_aged_issue`      | In issues.md, move from `## Open` to `## Resolved`, add note: "Auto-closed: open >90 days, needs re-triage if still relevant" |
| `aged-issue`      | warning (30-90d) | _skip_                  | Not old enough to auto-close                                                                                                  |
| `stalled-feature` | warning          | _skip_                  | Feature-level decisions need human judgment                                                                                   |
| `nearly-done`     | info             | _skip_                  | No action needed                                                                                                              |

If any actions were generated, also add `update_dashboard` to refresh issues.md timestamps.

Output the fix plan:

```
FIX PLAN
  [{action_type}]          "{entityRef}" — {description}
  [{action_type}]          "{entityRef}" — {description}
  ...

  Skipped ({N}): {summary of skip reasons}
```

**If `--dry-run`:** Stop here and output:

```
DRY RUN — no changes applied. Remove --dry-run to execute.
```

### Step 4: FIX Phase — Apply Actions

For each action in the fix plan, apply it:

#### archive_spec

1. Read `.mm/specs/{folder}/spec.md`
2. Add `**Status:** Archived` after the title line
3. Read `.mm/specs/{folder}/implementation.md`
4. Move all `- [ ]` items from `## In Progress` and `## Backlog` to `## Completed`, changing them to `- [x] [ARCHIVED] {original text}`
5. Report: `✓ archive_spec: {folder}`

#### move_tasks_to_backlog

1. Read `.mm/specs/{folder}/implementation.md`
2. Move all `- [ ]` items (and their subtasks) from `## In Progress` to the top of `## Backlog`
3. Keep `- [x]` items in `## In Progress` where they are (they're actually done)
4. Report: `✓ move_tasks_to_backlog: {folder}`

#### generate_tasks

1. Read `.mm/specs/{folder}/spec.md`
2. Extract requirements from the `## Requirements` section
3. Generate 3-5 concrete task titles based on the requirements (use `T1:`, `T2:` format)
4. Register them in ONE batch call: `mm_create({entity: "task", project_path, spec_path, titles: ["T1: ...", ...]})` — this writes the canonical `## Tasks` checkboxes in spec.md. Only fall back to hand-editing `## Backlog` in implementation.md when the spec is verifiably pre-literate (implementation.md already exists AND spec.md has no `## Tasks` section)
5. Report: `✓ generate_tasks: {folder}`

#### close_aged_issue

1. Read `.mm/issues/issues.md`
2. Find the issue line matching the entityRef title
3. Move it from `## Open` (any subsection) to `## Resolved`
4. Change `- [ ]` to `- [x]` and append ` - Auto-closed {YYYY-MM-DD} (>90 days, re-triage if still relevant)`
5. Report: `✓ close_aged_issue: {entityRef}`

#### update_dashboard

1. Update the `Last updated:` timestamp in `.mm/issues/issues.md` to today's date
2. Report: `✓ update_dashboard`

Output results as they're applied:

```
APPLYING...
  ✓ archive_spec: {folder}
  ✓ close_aged_issue: {title}
  ✗ generate_tasks: {folder}
    Error: {what went wrong}
  ✓ update_dashboard
```

### Step 5: VERIFY Phase — Re-audit

Re-run the **exact same scan** from Step 2 (re-read all files since they've changed):

1. Re-scan specs, issues, features
2. Re-run health analysis with the **same config**
3. Compare before vs after

Output:

```
VERIFY (after)
  Findings: {critical} critical, {warnings} warnings, {info} info

DIFF
  Critical:  {before} → {after}  ({delta})
  Warnings:  {before} → {after}  ({delta})
  Info:      {before} → {after}  ({delta})
  Total:    {before} → {after}  ({delta} resolved)
```

### Step 6: Save Report

1. Generate a combined report note with all sections (audit, plan, results, verify, diff)
2. Save to `.mm/notes/health-fix-report-{MM-DD-YYYY}.md` with frontmatter:

   ```markdown
   ---
   title: Health Fix Report
   category: Development
   created: { YYYY-MM-DD HH:MM }
   updated: { YYYY-MM-DD HH:MM }
   ---

   # Health Fix Report

   **Category:** Development
   **Created:** {YYYY-MM-DD HH:MM}

   ## Summary

   - Applied {N} fix actions, {M} failed
   - Findings: {before_total} → {after_total} ({resolved} resolved)

   ## Audit (Before)

   {finding summary}

   ## Fix Plan

   {action list}

   ## Results

   {applied/failed list}

   ## Verify (After)

   {finding summary + diff}
   ```

3. Update `.mm/notes/notes.md` — add entry at top:
   ```
   - **{YYYY-MM-DD}** - [Health Fix Report](./health-fix-report-{MM-DD-YYYY}.md) - Development
   ```
4. Report: `Report saved: .mm/notes/health-fix-report-{MM-DD-YYYY}.md`

---

## Closed Vocabulary Constraint

**CRITICAL:** You may ONLY perform the fix actions listed in the table above. Do NOT:

- Edit code files (only `.mm/` files)
- Delete any files
- Create issues for non-critical findings
- Change feature.json files (except via update_dashboard)
- Make subjective judgment calls about what to archive or close — follow the severity rules exactly

This constraint is what makes the loop trustworthy and autonomous. The user can always `git diff` or `git revert` the result.

## Related Commands

- `/mm:review --health` — Audit-only (no fixes)
- `/mm:review --project` — Full project review
- `/mm:issue-close` — Manual issue closure
