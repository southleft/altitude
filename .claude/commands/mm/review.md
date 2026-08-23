# Review — Code, Project, Portfolio, and Health

One review entry point with four scopes. Bare `/mm:review` is a **code review** of your current
changes (unchanged behavior). The project-scoped modes absorbed the former `/mm:review-project`,
`/mm:review-all-projects`, and `/mm:health` commands.

## Usage

```
/mm:review                          # CODE review of current changes (default)
/mm:review --auto-fix               # Code review + apply high-confidence fixes
/mm:review --dry-run                # Preview what auto-fix would do
/mm:review --auto-fix --dry-run     # Same as --dry-run
/mm:review --agents conventions     # Run specific review agents only

/mm:review --project                # THIS project's status review (was review-project)
/mm:review --all                    # ALL registered projects (was review-all-projects)
/mm:review --health [--auto-issue] [--stale-days N] [--verbose]
                                    # Health scan: stale/stuck/aged findings (was health)
```

**Mode selection:** `--project`, `--all`, and `--health` are mutually exclusive with each other
and with the code-review flags. When one is present, skip the code-review workflow entirely and
jump to the matching mode section at the end of this document. Code-review flags:

- `--auto-fix` — Enable confidence-based triage and apply high-confidence fixes
- `--dry-run` — Run full pipeline but write report instead of applying changes
- `--agents {list}` — Comma-separated list of specific review agents to run (default: all)

---

## Step 0: Parse Flags and Determine Mode

Parse the command for flags:

- `--auto-fix` → Set `auto_fix = true`
- `--dry-run` → Set `dry_run = true` (overrides auto-fix — nothing is applied)
- `--agents {list}` → Set `selected_agents` to the comma-separated list

Determine the operating mode:

| Flags                  | Mode     | Behavior                                              |
| ---------------------- | -------- | ----------------------------------------------------- |
| (none)                 | Advisory | Run review, report all findings                       |
| `--auto-fix`           | Auto-fix | Triage + apply high-confidence fixes + suggest medium |
| `--dry-run`            | Dry-run  | Triage + write report, no changes                     |
| `--auto-fix --dry-run` | Dry-run  | Same as --dry-run                                     |

### Detect Spec Context

Check for active spec context:

1. Read `.mm/session/last-context.md` for `**Spec:**` line
2. If found, set `spec_path` for report output location
3. If not found, reports go to stdout

Display:

```
Code Review starting...
Mode: {Advisory | Auto-fix | Dry-run}
Spec: {spec-name or "none (standalone)"}
Agents: {all or comma-separated list}
```

---

## Step 1: Analyze Changes

### Identify What to Review

```bash
git diff --name-only HEAD
git diff --staged --name-only
git log -1 --name-only --pretty=format:""
```

Collect all changed files (staged, unstaged, and last commit). These are the review targets.

If no changes found:

```
No changes detected to review.

Review works on:
- Unstaged changes (git diff)
- Staged changes (git diff --staged)
- Last commit (git log -1)

Make some changes first, or specify files to review.
```

Exit gracefully.

### Load Review Context

For each changed file, read its contents. Also read:

- `.claude/schemas/review-output-contract.md` — The finding format
- `.claude/schemas/review-triage.md` — Triage rules (if auto-fix or dry-run mode)
- `spec.md` and `requirements.md` from the active spec (if spec context exists)
- `CLAUDE.md` — Project conventions

---

## Step 2: Run Review Agents

### Agent Roster

Run these 5 review passes on the changed files:

1. **Requirements Review** — Do changes align with the active spec's requirements?
2. **Conventions Review** — Do changes follow project conventions from CLAUDE.md?
3. **Build/Type Review** — Are there type errors, missing imports, unused variables?
4. **Security Review** — Are there injection risks, exposed secrets, insecure patterns?
5. **Minimalism Review** — Is there over-engineering, dead code, unnecessary abstractions, hand-rolled stdlib replacements, or YAGNI violations? Emit each finding with `category: minimalism` and set `subcategory` to the matching code-discipline code (`yagni`, `stdlib`, `native`, `shrink`, `delete`); see the code-discipline skill (`.claude/skills/code-discipline.md`) for definitions.

If `--agents` flag is set, only run the specified subset.

### For Each Agent

Produce findings following the Review Agent Output Contract (`.claude/schemas/review-output-contract.md`):

- Each finding has: `id`, `agent`, `category`, `subcategory`, `severity`, `confidence`, `title`, `description`, `file`, `line`, `fixable`, `fix_description`, `diff_suggestion`
- Set `confidence` based on the heuristics in `.claude/schemas/review-triage.md`
- For fixable issues, include `diff_suggestion` in unified diff format

### Collect All Findings

Merge findings from all agents into a single list.

---

## Step 3: Triage Findings

Follow the triage rules from `.claude/schemas/review-triage.md`:

1. **auto_fix** — `confidence: high` AND `fixable: true` AND `diff_suggestion` non-empty
2. **suggestions** — `confidence: medium` AND `fixable: true`
3. **advisory** — Everything else

Apply dependency ordering for auto-fix findings (imports first, top-to-bottom, deletions last).

Display triage summary:

```
Triage Summary:
  Auto-fix:    {count} findings (will be applied automatically)
  Suggestions: {count} findings (proposed for review)
  Advisory:    {count} findings (informational only)
  Total:       {count} findings from {agent_count} agents
```

---

## Step 4: Execute Based on Mode

### Advisory Mode (default, no flags)

Display all findings grouped by file:

```
Review Results — {total} findings

{file_path}:
  [{severity}] {title} (line {line})
    {description}

{file_path}:
  [{severity}] {title} (line {line})
    {description}

---
{count} errors, {count} warnings, {count} info
```

No changes are made. Exit.

### Dry-Run Mode

Generate a dry-run report following the format in `.claude/schemas/review-dry-run-report.md`.

If spec context exists, write to `.mm/specs/{spec}/review/dry-run-report.md`.
Otherwise, output to stdout.

```
Dry-run report generated.
{Location: .mm/specs/{spec}/review/dry-run-report.md | Output above}

To apply high-confidence fixes: /mm:review --auto-fix
```

Exit. No changes made.

### Auto-Fix Mode

1. **Apply high-confidence fixes** using the review fix engine (`.claude/commands/mm/review-fix-engine.md`):
   - Apply each fix and commit atomically with `review-fix:` prefix
   - Skip fixes that can't be applied cleanly
   - Run post-fix test verification

2. **Present medium-confidence suggestions:**

   For each medium-confidence finding, display with proposed diff:

   ````
   Suggestion {n}/{total}: {finding.title}
     Agent: {finding.agent}
     File:  {finding.file}:{finding.line}

     {finding.description}

     Proposed fix: {finding.fix_description}

     ```diff
     {finding.diff_suggestion}
   ````

   ```

   **In interactive mode** (default — user is present), offer to apply each:

   ```

   Apply this suggestion?
   [1] Yes, apply and commit
   [2] Skip
   [3] Skip all remaining suggestions

   ```

   - If [1]: Apply the fix using the same mechanism as auto-fix (edit file, commit with `review-fix: {description} ({agent})`), then move to next suggestion
   - If [2]: Skip this suggestion, move to next
   - If [3]: Skip all remaining suggestions, proceed to advisory report

   **In auto mode** (when called from `/mm:complete --review` or with `--no-prompt`), do NOT prompt — include all suggestions in the summary output without applying:

   ```

   Suggestions ({count} — not applied in auto mode):
   - {finding.id}: {finding.title} ({finding.file}:{finding.line})
   - {finding.id}: {finding.title} ({finding.file}:{finding.line})

   Run /mm:review --auto-fix interactively to review and apply suggestions.

   ```

   ```

3. **Report advisory findings** (low-confidence):

   ```
   Advisory ({count}):
     - {finding.title} ({finding.file}:{finding.line})
     - {finding.title} ({finding.file}:{finding.line})
   ```

4. **Final summary:**

   ```
   Review Complete

   Auto-fixed: {count} issues ({count} commits)
   Suggestions: {count} issues (not applied)
   Advisory: {count} issues (informational)

   {if test_result} Tests: {PASSED | FAILED}
   ```

---

## Error Handling

| Scenario                  | Response                                    |
| ------------------------- | ------------------------------------------- |
| No changes to review      | Exit gracefully with message                |
| No findings               | "Review complete — no issues found."        |
| All findings are advisory | Report findings, no fixes attempted         |
| Fix engine failure        | Report error, continue with remaining fixes |
| Spec context not found    | Run without spec, reports go to stdout      |

---

## Mode: `--project` — Review THIS Project

**Tier check — required first step.** Call `mm_check_tier` (no arguments). `tier` `"pro"` or
`"team"` → continue. `"free"` → STOP and output verbatim, then end:

```
This feature is available with Monday Morning Pro.

AI-powered project review is a Pro feature. You can still browse issues, tasks, and notes manually.

Pro — $12/mo (annual) / $15/mo (monthly)
Unlimited projects, parallel orchestration, full session history,
product planning, document generation, health & reviews.

→ Upgrade at getmondaymorning.com/pro
→ Already have a key? Run /mm:activate
```

**Workflow:**

1. Read `.mm/config.json` for project name/settings.
2. Call `mm_get_status({ project_path })` — the single source of truth (canonical spec.md
   `## Tasks` with legacy implementation.md fallback); do NOT parse checkboxes yourself.
   - `status.activeTasks` → in-progress + "up next"; `status.stalledCount` → stalled work.
   - `status.openIssues` → open issues (highlight critical).
   - `status.quickTasks[]` → standalone quick tasks (`parked | building | in-review | done`;
     `parked` = Conductor inbox capture). Fold non-`done` into the task picture.
   - `status.specs[]` → per-spec `{ name, totalTasks, completedTasks, inProgressTasks,
     blockedTasks, backlogTasks }`; completion % = completed/total.
   - `status.recentNotes` → recent decisions/context.
3. Output the project review: Quick Summary (Status: Healthy/Needs Attention/Blocked · active
   spec + % · up next), Tasks (active/backlog/completed), Issues (open/critical/in-progress),
   Active Spec Progress, Recent Activity, Recommendations (prioritized), Next Steps.

Run when starting work, checking in, before stand-ups, or when switching projects.

---

## Mode: `--all` — Review ALL Registered Projects

1. Load `~/.claude/projects-registry.json` (all registered project paths).
2. Per project, call `mm_get_status({ project_path })` (same field usage as `--project` above —
   specs, activeTasks, stalledCount, openIssues, recentNotes, quickTasks; never hand-parse).
3. Analyze cross-project priorities: critical issues, blocked/stalled projects, what needs
   attention.
4. Output the report in this EXACT structure (tables required for parsing): `# Monday Morning -
   All Projects Review` → Quick Summary metric table (Total Projects / Projects with Critical
   Issues / Total Active Tasks / Total Open Issues / Total Backlog Tasks) → `## Projects
   Requiring Attention` (per project: path, blockers, status, details) → `## Project Status
   Overview` (numbered per-project attribute tables: Status/Path/Active Spec/Tasks/Issues/Last
   Activity + progress/issues/notes bullets) → `## Recommendations` (prioritized) → `## Summary`
   (overall health + per-project health table + suggested focus).
5. **Save the review** to the CURRENT project's `.mm/reviews/review-YYYY-MM-DD-HH-MM.md` — the
   desktop Reviews panel reads it.

Run for day/week kickoff, picking the next project, or monthly health checks.

---

## Mode: `--health` — Project Health Scan

**Tier check — required first step.** Same `mm_check_tier` gate as `--project` above, with this
free-tier message instead: `Project health checks are a Pro feature. You can still browse issues
and tasks manually.` (rest of the upgrade block identical).

**Flags:** `--auto-issue` (create issues for critical findings) · `--stale-days N` (default 14)
· `--verbose` (per-spec detail table).

**Workflow:**

1. Read `mcp-servers/monday-morning/src/lib/health-analyzer.ts` for the types/logic reference.
2. Call `mm_get_status({ project_path })` once — `status.specs[]` is the task-count source;
   `status.stalledCount` cross-checks step 3. Per spec, get last-modified via
   `git log -1 --format="%ai" -- .mm/specs/{path}/` and build `SpecHealth` (folder, name, counts,
   completionPct, lastModified, daysSinceModified). Scan `.mm/issues/issues.md` (title, severity
   from `[CRITICAL]`/`[HIGH]` tags, created date from frontmatter or git) and `.mm/features/*/
   feature.json` (name, completionPct, lastModified).
3. Apply the health checks with `HealthConfig { staleDays: {flag or 14}, stuckTaskDays: 7,
   agedIssueDays: 30, nearlyDonePct: 80 }`: stale specs (open tasks, no activity > staleDays;
   cross-check `status.stalledCount`) · stuck tasks (in-progress, > 7d) · nearly-done (> 80%,
   unfinished) · empty specs (0 tasks) · aged issues (> 30d; critical > 90d) · stalled features.
   Thresholds: Stale Spec warn >14d / crit >30d · Stuck Task >7d · Nearly Done info · Empty Spec
   always warn · Aged Issue warn >30d / crit >90d · Stalled Feature >14d.
4. Report (`formatHealthReport` shape): SUMMARY (spec counts, overall %, issues, findings by
   severity) then CRITICAL / WARNINGS / INFO entries each with `[{type}] {message}` and a `→
   recommendation`. Append the per-spec table when `--verbose`.
5. Save as a note: `.mm/notes/health-report-{MM-DD-YYYY}.md` (formatHealthNote shape) + add the
   dashboard row at the top of `.mm/notes/notes.md`'s Notes section:
   `- [ ] **{YYYY-MM-DD}** [Project Health Report](./health-report-{MM-DD-YYYY}.md) - Development`
6. `--auto-issue` only: for each critical finding, skip if `.mm/issues/issues.md` already tracks
   its entityRef; else `mm_create({entity: "issue", title: "Health: {message ≤80 chars}",
   description: "{message}\n\nRecommendation: {rec}\n\nAuto-created by /mm:review --health",
   severity: "critical"})`. Report created vs already-tracked.
7. Final summary: report path, finding counts, issues auto-created.

---

## Related Commands

- `/mm:complete --review` — Run code review as part of the done workflow
- `/mm:verify-spec` — Verify implementation against spec requirements
- `/mm:qa` — Interactive QA session for manual fixes
- `/mm:health-fix` — Audit-fix-verify loop over `.mm/` hygiene (separate command by design —
  it edits `.mm/`, never code; the code-review fix engine is code-only)
