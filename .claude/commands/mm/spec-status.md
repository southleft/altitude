# Spec Status

Display implementation progress and status for a spec.

## Overview

This command:

1. Reads the spec's task content from `spec.md`'s `## Tasks` section (canonical; legacy specs fall back to `implementation.md`)
2. Sources task-completion counts from the `mm_get_status` MCP tool (do not hand-count checkboxes)
3. Calculates progress percentage from those counts
4. Identifies blockers and dependencies
5. Shows linked tasks from `tasks.md`
6. Displays a visual progress summary

## Command Usage

```
/spec-status [spec-name]
```

**Parameters:**

- `spec-name` (optional) - Name or path of spec

If no spec name provided:

- Use the active spec from `tasks.md`
- Or list available specs and ask user to choose

## Step 1: Locate Spec

1. **If spec name provided:**
   - Check if it's a full path (contains `/`) or just a name
   - If just a name, look in `.mm/specs/` directories matching `*{spec-name}*`
   - If full path, use directly

2. **If no spec name provided:**
   - Read `.mm/tasks/tasks.md`
   - Parse spec references from tasks
   - Find the active spec (most incomplete tasks)
   - Use that spec

3. **Verify spec exists:**
   - Check if `{spec-path}/spec.md` exists
   - If not found, error: "Spec not found at {path}"

## Step 2: Read Task Content

1. **Locate the task content (for display):**
   - Read `{spec-path}/spec.md` and extract the `## Tasks` section — the canonical
     source of task titles/metadata (sub-headers use `#### `).
   - If the spec has no `## Tasks` section (legacy spec), fall back to
     `{spec-path}/implementation.md` (sub-headers use `## `).
   - If neither exists: "No tasks found. Run /mm:spec-start to generate tasks."

2. **Extract from the task content (titles, metadata, sections — NOT the counts):**
   - Task titles under each section:
     - **Completed** (`[x]`)
     - **In Progress** (`[ ]`)
     - **Blocked** (`[ ]`)
     - **Backlog** (`[ ]`)
   - Extract blockers section
   - Extract dependencies section
   - Extract metrics (if present)

   The completion **counts** come from `mm_get_status` in Step 3 — do not tally
   checkboxes here.

3. **Parse task format:**
   Each task should have format:
   ```markdown
   - [x] Task Title
     - **Estimated:** 4-8h
     - **Actual:** 6h (if completed)
     - **Priority:** high
     - **Requirement:** FR-1
     - **Task File:** .mm/tasks/tasks.md#task-anchor
   ```

## Step 3: Calculate Progress

1. **Get task counts from `mm_get_status` (do NOT hand-count checkboxes):**
   - Call the MCP tool `mm_get_status({ project_path })`. It returns `{ success, status }`.
   - Select this spec's summary: `status.specs.find(s => s.path === <spec-folder>)`
     (`<spec-folder>` is the spec's folder name, e.g. `2025-12-03-my-feature`).
   - Read the counts straight off that entry:
     - `completedTasks`, `inProgressTasks`, `blockedTasks`, `backlogTasks`, `totalTasks`
   - `mm_get_status` reads the spec's canonical `## Tasks` section (with automatic
     legacy `implementation.md` fallback), so these counts are correct by construction.

2. **Calculate percentage:**
   - Progress = (`completedTasks` / `totalTasks`) × 100
   - Round to whole number (0 if `totalTasks` is 0)

3. **Calculate time estimates:**
   - Sum estimated hours for backlog tasks
   - Sum estimated hours for in-progress tasks
   - Sum actual hours for completed tasks (if tracked)
   - Calculate velocity if possible (completed hours / time period)

## Step 4: Cross-Reference with tasks.md

1. **Find related tasks in tasks.md:**
   - Search for tasks with `spec: {spec-path}`
   - Group by status (Active, Backlog, Completed)
   - Compare with implementation.md tasks

2. **Identify discrepancies:**
   - Tasks in tasks.md but not in implementation.md
   - Tasks in implementation.md but not in tasks.md
   - Status mismatches between files

## Step 5: Display Status Report

Format and display comprehensive status:

```markdown
# Spec Status: {Spec Name}

**Path:** `{spec-path}`
**Last Updated:** {timestamp from implementation.md}

---

## Progress Overview

**{progress}%** Complete

[████████░░░░░░░░░░░░] {completed}/{total} tasks

- ✅ Completed: {completed} tasks
- 🔄 In Progress: {in_progress} tasks
- 📋 Backlog: {backlog} tasks

---

## Completed Tasks ✅

1. **{Task Title}** (FR-1)
   - Estimated: 4-8h | Actual: 6h
   - Completed: {timestamp}

2. **{Task Title}** (FR-2)
   - Estimated: 2-4h | Actual: 3h
   - Completed: {timestamp}

---

## In Progress Tasks 🔄

1. **{Task Title}** (FR-3)
   - Estimated: 8-16h
   - Priority: High
   - Started: {timestamp}
   - Status: 40% complete

---

## Backlog Tasks 📋

**High Priority:**

1. **{Task Title}** (FR-4) - Est: 4-8h
2. **{Task Title}** (FR-5) - Est: 2-4h

**Medium Priority:** 3. **{Task Title}** (FR-6) - Est: 4-8h

**Low Priority:** 4. **{Task Title}** (NFR-1) - Est: 2-4h

---

## Blockers 🚧

{If blockers section exists in implementation.md:}

1. **{Blocker Title}**
   - Blocks: Task FR-3, Task FR-4
   - Description: {blocker description}
   - Status: {blocker status}

{If no blockers:}
No blockers identified.

---

## Dependencies 🔗

{If dependencies exist:}

- **FR-3** depends on **FR-1** (completed ✅)
- **FR-5** depends on **FR-3** (in progress 🔄)
- **FR-6** depends on **FR-4** (backlog 📋)

---

## Time Tracking

**Estimated Remaining:** {sum of backlog + in-progress estimates}
**Actual Time Spent:** {sum of completed actual hours}
**Velocity:** {if trackable: hours per day/week}

---

## Linked Tasks in Monday Morning

**Active:** {count} tasks
**Backlog:** {count} tasks
**Completed:** {count} tasks

View in tasks.md: `.mm/tasks/tasks.md`

---

## Requirements Coverage

**Functional Requirements:**

- FR-1: ✅ Complete
- FR-2: ✅ Complete
- FR-3: 🔄 In Progress
- FR-4: 📋 Backlog
- FR-5: 📋 Backlog

**Non-Functional Requirements:**

- NFR-1: 📋 Backlog
- NFR-2: Not started

---

## Next Actions

**Immediate priorities:**

1. Complete {in-progress task title} (FR-3)
2. Begin {next high-priority backlog task} (FR-4)
3. Resolve blocker: {blocker if any}

**To continue implementation:**

- Pick a task from Backlog (high priority first)
- Update task status in tasks.md when starting
- Mark complete when done using `/mm:complete --task-only`

**Commands:**

- `/mm:spec-start` - Continue implementing tasks
- `/mm:task` - Manually add a task
```

## Step 6: Offer Quick Actions

After displaying status, optionally prompt:

```
What would you like to do next?

[1] View requirements.md
[2] View spec.md
[3] Edit implementation.md
[4] Generate more tasks (/implement-spec)
[5] View tasks in tasks.md
[6] Done

Your choice:
```

## Implementation Notes

### For Claude Code Agent

1. **Parsing task content (for display only — counts come from `mm_get_status`):**
   - Parse the spec's `## Tasks` section in `spec.md` (legacy: `implementation.md`)
   - Use regex to find task sections and titles: `- [x]`, `- [ ]`
   - Extract metadata from indented bullet points
   - Handle various formats gracefully
   - Do NOT tally checkboxes for progress — use the `mm_get_status` counts (Step 3)

2. **Progress visualization:**
   - Use Unicode block characters: █ ░
   - Calculate block fill based on percentage
   - Total width: 20 characters for clean display

3. **Time parsing:**
   - Parse estimates like "4-8h", "2d", "1w"
   - Convert to hours for calculations
   - Handle ranges (take average for estimates)

4. **Error handling:**
   - If implementation.md missing: Suggest creating it
   - If malformed: Show what you can parse, warn about errors
   - If tasks.md missing: Only show implementation.md data

5. **Performance:**
   - Cache parsed data if running multiple checks
   - Don't re-parse unnecessarily
   - Read files efficiently

### Validation

- Ensure progress percentage is 0-100
- Validate timestamps are valid dates
- Check that task counts add up correctly
- Warn if discrepancies found between files

### Edge Cases

- **Empty implementation.md:** Show "No tasks tracked yet"
- **No spec.md:** Warn but continue with implementation.md
- **Mismatched task counts:** Highlight discrepancy
- **No requirements.md:** Skip requirements coverage section

## Integration

- **Input:** `implementation.md`, `spec.md`, `tasks.md`, `requirements.md`
- **Output:** Status report (display only, no file modifications)
- **Links to:** `/mm:spec-start`, `/mm:task`, `/mm:complete --task-only`

---

**Version:** 1.0
**Phase:** 1.5-B (Auto-Generation & Task Proposals)
**Status:** Ready for implementation
