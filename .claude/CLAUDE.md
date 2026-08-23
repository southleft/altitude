<!-- BEGIN MM-MANAGED -->
<!-- mm-template-rev: 6 -->
<!-- Monday Morning manages everything between these markers and rewrites it on every reinstall. Do not edit inside this block — changes here are lost on the next reinstall. Put your own working agreements BELOW the END marker, in "Our Collaboration Norms"; that region is yours and is never overwritten. -->

# Monday Morning Project

This project uses a modular task, note, and issue tracking system integrated with Monday Morning. The region between the markers (this section through "## Remember") is managed by Monday Morning and refreshed on reinstall; the "Our Collaboration Norms" section at the bottom of this file is yours to edit.

## How to Work in This Project

Monday Morning expects Claude to work as a reasoning partner, not only a code producer. This stance holds in every session — attended or headless:

- **Verify before asserting.** Don't state how code, config, or tooling behaves unless you've read it this session; cite `path:line`. Say "I'm inferring" when you haven't confirmed. "I haven't checked" is an acceptable answer; a confident wrong one is not.
- **Flag uncertainty explicitly.** If you're unsure of an approach or detail, say so before proceeding rather than projecting false confidence.
- **Attended vs. unattended.** When a human is in the loop and intent is unclear, ask or propose before acting. When running unattended (parallel specs, `claude -p`, the orchestrator), don't block — choose the most reasonable interpretation, proceed, and capture the assumption (or a better alternative) as a Monday Morning idea or note so it survives the session.
- **You're licensed to challenge the goal, not just refine the details.** If there's a simpler or longer-lasting path to the same outcome, surface it before building.

## How `.mm/` Is Shared (Two Independent Lanes)

Seeing `.mm/` in `.gitignore` is **by design, not a bug**. Do not flag it as a problem, and never `git add -f` past it or hand-edit the managed `# >>> monday-morning:mm >>>` block.

- **Cloud lane (primary):** the "Team visibility" toggle in Settings syncs durable `.mm` artifacts (specs, product, docs, notes, proposals, standards) to teammates through the Monday Morning cloud workspace. Scoped per team + project; no git involvement.
- **Git lane (legacy, default OFF):** the "Advanced: also mirror .mm to git" toggle rewrites the managed `.gitignore` block so durable artifacts commit to git. New projects default to private (blanket `.mm/` ignore).

Consequences worth knowing:

- **Gitignored ≠ hidden from teammates.** A spec absent from git may still reach the team via the cloud lane.
- `.mm` files committed before the ignore rule stay git-tracked (the toggle is deliberately non-destructive), so a mixed tracked/ignored state is normal — not an error to fix.
- To change what's shared, use the Settings toggles, not manual `.gitignore` edits.

## Directory Structure

```
.mm/
├── config.json          # Monday Morning project configuration
├── specs/               # Feature specifications (PRESERVE)
│   ├── order.json       # Project-wide build order (waves), from /mm:order-specs
│   └── YYYY-MM-DD-slug/
│       ├── spec.md          # includes the `## Tasks` section
│       ├── requirements.md
│       ├── tasks.md
│       ├── implementation.md  # legacy specs only
│       └── visuals/
├── tasks/               # Standalone tasks (PRESERVE)
├── issues/              # Issue tracking (PRESERVE)
├── notes/               # Project notes (PRESERVE)
├── features/            # Feature groupings (PRESERVE)
├── product/             # Mission, roadmap, tech-stack (PRESERVE)
├── proposals/           # LEGACY (deprecated) — new ideas → .mm/ideas (/mm:idea); client docs → /mm:doc
├── session/             # Session context
├── reviews/             # Project reviews
└── conversations/       # Archived conversations
```

**Never delete** — This contains all your project's specifications, tasks, and documentation.

## How to Reference Project State

### Check Current Tasks

Read `.mm/tasks/tasks.md` to see:

- **Active tasks** - Currently being worked on
- **Backlog tasks** - Planned for future
- **Completed tasks** - Finished work

Individual task files are linked from the dashboard.

### Check Open Issues

Read `.mm/issues/issues.md` to see:

- **Open issues** - Need attention
- **In Progress** - Being worked on
- **Resolved issues** - Fixed problems

### Check Project Notes

Read `.mm/notes/notes.md` to see:

- Architecture decisions
- Meeting notes
- Important context

## Available Commands

When user asks you to track work or manage the project, use these commands:

### Task Management

- `/mm:task` - Create a new task
- `/mm:complete --task-only` - Mark a task as completed
- `/mm:review --project` - Get AI-powered analysis and recommendations

### Issue Tracking

- `/mm:issue` - Create a new issue
- `/mm:issue-close` - Mark an issue as resolved

### Documentation

- `/mm:note` - Create a project note (decisions, meetings, etc.)

### Reviews

- `/mm:review --project` - Review THIS project's status
- `/mm:review --all` - Review ALL registered projects (run from anywhere)

### Planning & Specs

- `/mm:plan` - Define product vision
- `/mm:spec` - Create a spec (the unit of work)
- `/mm:order-specs` - Compute the project-wide build order (waves) from spec dependencies
- `/mm:spec-start` - Start implementing a spec

## Monday Morning Entity Reference

This section defines exactly how to create each entity type so it appears correctly in the Monday Morning dashboard.

### Entity Hierarchy

The **Spec is the primary unit of work.** Specs are sequenced by their **dependencies**
(`depends_on`), not by feature membership. A Feature is an _optional_ label for grouping
related specs on the dashboard — it is no longer required to create a spec or to order work.

```
Spec (detailed specification for a piece of work — the primary unit)
    ├── Tasks (in spec.md's `## Tasks` section; legacy specs: implementation.md)
    │       └── Subtasks (checklist items within tasks)
    └── depends_on: [other-spec-slugs]   # what must be done first → build order

Feature (OPTIONAL — groups related specs for at-a-glance progress; does not drive order)

Standalone entities (not hierarchical):
- Issues (bugs, problems to fix)
- Notes (decisions, meeting notes, context)
- Ideas (captured for future work — `.mm/ideas/`, via `/mm:idea`)
```

### 1. Features (optional)

**Purpose:** An _optional_ label that groups related specs for at-a-glance progress on the
dashboard. Features no longer drive build order and are never required to create or sequence a
spec — that comes from each spec's `depends_on` and `/mm:order-specs` (see "Spec Ordering &
Dependencies" below). Create a feature only when grouping genuinely helps; otherwise skip it.

**Likeness store (LLM-parseable):** `feature.json` `linked_specs` is the single canonical
record of which specs belong together. Before shaping or implementing new work, read the
project's `.mm/features/*/feature.json` files to judge overlap with existing specs — no other
parser or store exists for spec likeness. The desktop's All Specs browser maintains these
links through a reviewed flow (confidence-scored suggestions and cluster proposals; only
near-duplicate matches ever auto-link), so treat `linked_specs` as curated, human-confirmed
grouping signal.

**Location:** `.mm/features/{feature-slug}/feature.json`

**Required Structure:**

```json
{
  "id": "feature-slug",
  "name": "Human Readable Feature Name",
  "description": "What this feature accomplishes",
  "status": "planning",
  "priority": "high",
  "progress": {
    "total_specs": 0,
    "completed_specs": 0,
    "percentage": 0
  },
  "linked_specs": [],
  "notes": "",
  "wave": null,
  "wave_label": null,
  "depends_on": [],
  "created": "2025-12-03T10:00:00Z",
  "updated": "2025-12-03T10:00:00Z"
}
```

**Critical Rules:**

- `id` and `name` CANNOT be empty (validation fails)
- `linked_specs` must be an array (can be empty)
- Spec paths in `linked_specs` are relative to `.mm/features/` directory
- Use `../specs/2025-MM-DD-spec-slug` format for spec paths
- Status must be: `planning`, `in-progress`, `complete`, or `on-hold`
- Progress is auto-calculated from linked specs when displayed
- `wave` / `wave_label` — optional phase grouping for roadmap ordering
- `depends_on` — array of feature IDs this feature blocks on

### 2. Specs

**Purpose:** Detailed specification for a piece of work, contains tasks.

**Location:** `.mm/specs/{YYYY-MM-DD-slug}/`

**Required Files:**

```
.mm/specs/2025-12-03-my-feature/
├── spec.md              # REQUIRED - The specification, including the `## Tasks` section
├── requirements.md      # Optional - Detailed requirements
├── tasks.md             # Optional - Task breakdown
└── implementation.md    # LEGACY only - pre-literate specs track tasks here; do NOT create for new specs
```

**spec.md Format:**

```markdown
---
status: planning
# depends_on — the specs that MUST be completed before this one. This is what
# sequences the work; omit (or leave empty) for a spec with no prerequisites.
depends_on:
  - 2025-12-01-auth-schema
  - 2025-12-03-session-store
# source — optional: the roadmap item/instruction/conversation/issue this spec
# serves; enables intent tracing from roadmap through to verification.
source: 'Roadmap Q1 item: faster onboarding'
---

# Specification: Spec Name

## Goal

What this spec accomplishes.

## Requirements

- R1: First requirement
- R2: Second requirement

## Out of Scope

- What this does NOT include

## Tasks

#### Completed

- [x] T1: Finished task (R1)

#### In Progress

- [ ] T2: Task being worked on (R2)

#### Blocked

#### Backlog

- [ ] T3: Planned task (R2)
```

**Requirement IDs (the intent join):** each requirement carries a stable id (`R1`, `R2`, …).
Tasks cite the id(s) they satisfy as a trailing `(R1)` / `(R1, R3)`; `/mm:verify-spec` keys its
scorecard and `summary.json` to these ids and checks every `R<n>` is covered by a task. Ids are
stable once assigned — never renumber on edit; append the next free one. Use `(R0)` for a task
that serves no single requirement (scaffolding/tooling).

`depends_on` lists **spec folder slugs** (the `YYYY-MM-DD-slug` directory names). It is the
single source of truth for ordering: the dashboard derives build "waves" from it and marks a
spec **blocked** until every spec it depends on is done.

`source` is optional — the roadmap item/instruction this spec serves; enables intent tracing.

**Task tracking (literate specs):** tasks live in spec.md's `## Tasks` section, under the four
`#### Completed` / `#### In Progress` / `#### Blocked` / `#### Backlog` sub-headers shown above.
`mm_create({entity: "task"})` writes there; new specs get an empty `## Tasks` section at creation.
Do **not** create `implementation.md` for new specs.

**Legacy specs only:** older specs without a `## Tasks` section track tasks in a separate
`implementation.md` (same checkbox format, `## Completed` / `## In Progress` / `## Backlog` with
two hashes). Tools fall back to it automatically; leave it in place for those specs but never add
it to a spec that has `## Tasks`.

**Critical Rules:**

- Folder name MUST follow `YYYY-MM-DD-slug` pattern
- `spec.md` MUST exist for the spec to be recognized
- Tasks appear in the dashboard from spec.md `## Tasks` (or legacy `implementation.md` if the spec predates literate tasks)
- Tasks MUST use checkbox format: `- [x]` (done) or `- [ ]` (pending)
- Task IDs should contain letters AND numbers (e.g., `T1:`, `T1-1:`) not just numbers

**Done semantics (verification-gated, 2026-07-04):** a spec is done iff its `status:`
frontmatter is `done`. That status is reachable only via (1) a passing `/mm:verify-spec`
verdict (`verified` or `verified-with-caveats` — caveats count) or (2) an explicit human
override (e.g. "Mark done anyway" on the kanban/spec-detail confirm step). **All tasks
checked off with no passing verdict reads as `in-review` everywhere — never `done`.**
Pre-existing `status: done` specs are grandfathered and never auto-demoted by a later
`gaps-remain` run. `/mm:verify-spec` is the only automatic path into `done`.

### Spec Ordering & Dependencies

**This is how work is sequenced — by dependencies between specs, not by features.**

1. **Declare prerequisites on each spec.** In `spec.md` frontmatter, set `depends_on` to the
   list of spec slugs that must finish first (see the spec.md format above). A spec with no
   prerequisites omits it or leaves it empty.

2. **Compute the build order.** Run `/mm:order-specs`. It reads every incomplete spec's
   `depends_on`, topologically sorts them into numbered **waves** (wave 1 = no unmet
   prerequisites; later waves depend on earlier ones), lets you confirm, and writes a
   project-wide `.mm/specs/order.json`:

   ```json
   {
     "feature_id": "project",
     "generated": "<ISO-8601 timestamp>",
     "phases": [
       {
         "phase": 1,
         "label": "Foundation",
         "parallel": true,
         "specs": [{ "spec": "2025-12-01-auth-schema", "reason": "No prerequisites" }]
       }
     ],
     "unordered": []
   }
   ```

   - `parallel: true` — specs in the wave have no dependencies on each other and can run
     concurrently. `parallel: false` — run them sequentially.
   - `.mm/specs/order.json` is project-wide (one file for the whole project). It supersedes the
     old per-feature `order.json`.

3. **The Conductor shows it.** Specs are grouped under their wave, and any spec still waiting on
   an unfinished prerequisite is marked **blocked by <spec>**. Even before you run
   `/mm:order-specs`, the Conductor derives waves directly from `depends_on` so the order is
   always visible.

### 3. Tasks (within Specs)

**Purpose:** Individual work items tracked in the spec.

**Location:** Inside `.mm/specs/{spec-folder}/spec.md`, under the `## Tasks` section (legacy
specs without `## Tasks`: a separate `implementation.md`)

**Format (inside spec.md):**

```markdown
## Tasks

#### Completed

- [x] Finished task

#### In Progress

- [ ] Task description here

#### Blocked

#### Backlog

- [ ] Another task description
- [ ] Third task with (2h) time estimate
```

**Critical Rules:**

- Prefer `mm_create({entity: "task", spec_path, titles: [...]})` over hand-editing — it batches the whole list in one write
- Sub-section headers MUST use `#### ` (four hashes) inside `## Tasks`; legacy implementation.md uses `## ` (two hashes)
- **DO NOT use `### ` (three hashes)** - the parser will not recognize these sections
- Must use markdown checkbox syntax: `- [ ]` or `- [x]`
- Time estimates are optional: `(2h)`, `(30m)`

### 4. Quick Tasks (NOT tied to specs)

**Purpose:** One-off tasks that don't belong to a spec (quick fixes, maintenance, etc.).

**Location:** `.mm/tasks/{slug}-{MM-DD-YYYY}.md` (individual files)

**CRITICAL**: Each standalone task MUST be its own file. Do NOT just add a line to `tasks.md`.

**File Format (Quick Task — created by the Conductor):**

```markdown
---
title: Task Title Here
type: quick
status: building
priority: medium
created: 2025-12-08T10:00:00Z
updated: 2025-12-08T10:00:00Z
---

# Task Title Here
```

**Frontmatter fields:**

- `title` — human-readable name
- `type: quick` — marks this as a Quick task (omit for legacy standalone tasks)
- `status` — one of `parked`, `building`, `in-review`, `done`
- `priority` — `high`, `medium`, or `low`
- `created` / `updated` — ISO 8601 timestamps

### 5. Issues

**Purpose:** Track bugs, problems, and blockers.

**Location:** `.mm/issues/issues.md` (dashboard) + individual files

**issues.md Format:**

```markdown
# Issues Dashboard

Last updated: 2025-12-03 10:00

## Open

- [ ] [Issue Title](./issue-name-12-03-2025.md) [CRITICAL]
- [ ] [Another Issue](./another-issue-12-03-2025.md)

## In Progress

- [ ] [WIP Issue](./wip-issue-12-03-2025.md)

## Resolved

- [x] [Fixed Issue](./fixed-12-03-2025.md) - Fixed 2025-12-03
```

### 6. Notes

**Purpose:** Document decisions, meeting notes, important context.

**Location:** `.mm/notes/notes.md` (dashboard) + individual files

**notes.md Format:**

```markdown
# Notes Dashboard

Last updated: 2025-12-03 10:00

## Notes

- **2025-12-03** - [Note Title](./note-name-12-03-2025.md) - Category
- **2025-12-02** - [Earlier Note](./earlier-note-12-02-2025.md) - Architecture
```

### Quick Reference: Creating Entities

| Entity         | Command/Action                                     | Key File                                          |
| -------------- | -------------------------------------------------- | ------------------------------------------------- |
| Feature        | Create folder + `feature.json`                     | `.mm/features/{slug}/feature.json`                |
| Spec           | `mm_create({entity: "spec"})` (folder + `spec.md`) | `.mm/specs/{YYYY-MM-DD-slug}/spec.md`             |
| Spec Task      | `mm_create({entity: "task"})` → spec.md `## Tasks` | `- [ ] Task description` under `#### ` sub-header |
| **Quick Task** | **Create individual file**                         | **`.mm/tasks/{slug}-{MM-DD-YYYY}.md`**            |
| Issue          | Create individual file                             | `.mm/issues/{slug}-{MM-DD-YYYY}.md`               |
| Note           | Add to `notes.md` + create file                    | `.mm/notes/{slug}-{MM-DD-YYYY}.md`                |

### Common Mistakes That Break Display

1. **Specs in wrong directory** - Must be in `.mm/specs/` (WITH dot)
2. **Wrong linked_specs path** - Must be `../specs/{YYYY-MM-DD-slug}` (relative from features folder)
3. **Empty required fields** - `id`, `name` in feature.json
4. **Wrong folder naming** - Specs must be `YYYY-MM-DD-slug`
5. **Missing dashboards** - `tasks.md`, `issues.md`, `notes.md` must exist
6. **Wrong section headers** - Must use `## ` or `#### ` (NOT `### `), names must match exactly
7. **Wrong checkbox format** - Must be `- [ ]` not `- []` or `[ ]`
8. **Missing `## Tasks` section in spec.md** - Required for spec task tracking (legacy specs use implementation.md instead; never create it for new specs)
9. **Quick task added to tasks.md** - Must be individual file in `.mm/tasks/`
10. **Wrong task type field** - Quick tasks need `type: quick` in frontmatter
11. **Wrong task status** - Quick tasks use `parked`/`building`/`in-review`/`done`, not `pending`/`completed`

## MCP Tool Conventions

### `project_path` — required on every `mm_*` tool call

Every Monday Morning MCP tool requires a `project_path` parameter (the absolute path to the
project root — the directory that contains `.mm/`). **Always pass it.**

How to determine it: use the current working directory. In a Claude Code session, this is
the directory shown at startup (e.g. `D:\my-project` or `/home/user/my-project`). When in
doubt, run `git rev-parse --show-toplevel` and use the result. Cache the value for the
session — it never changes mid-conversation.

### Cross-platform path handling (Windows)

On Windows, Claude Code runs bash via Git Bash (MSYS2). A few things to keep in mind:

- **For MCP tool arguments** (`project_path`, `spec_path`, file paths): use the native
  Windows path format shown in the working directory (e.g. `D:\my-project`). Forward slashes
  also work (`D:/my-project`).
- **For bash commands**: use forward slashes. Git Bash handles them natively.
- **For the Read/Write/Edit tools**: use the absolute path with either slash style.
- **Do not** mix MSYS2-style paths (`/d/my-project`) with native Windows paths in the same
  tool call.

## Remember

Always check `.mm/` files to understand project state before making recommendations. This ensures your suggestions are contextual and relevant to current work.

<!-- END MM-MANAGED -->

## Our Collaboration Norms

_This section is yours._ Monday Morning seeds it once and never overwrites it. Add the working agreements you want every Claude session in this project to follow. Some teams start from these (delete or rewrite freely):

- **Ask, don't assume.** If intent, architecture, or requirements are unclear, ask before writing code.
- **Simplest thing that works.** Before adding an abstraction or flexibility, name the second concrete caller that needs it; if you can't, don't add it.
- **Don't touch unrelated code** — but do surface design smells you notice, as separate issues to address later.
- **Suggest better ways.** Don't hesitate to propose a better approach, especially one with longer-lasting impact than a tactical fix.
