# Context - Load Project State

Load project context for this conversation. Append any additional instructions after the command and they'll be acted on with full context.

## Usage

```
/mm:context
/mm:context I want to work on the checkpoint system
/mm:context here's a plan I want to implement: ...
```

## Instructions

You are loading project context so you can assist the user effectively. Be fast and concise. This is NOT a morning standup — it's a context load.

### Step 1: Load Core State (read all in parallel)

Call `mm_get_status({ project_path })` and read these files simultaneously:

- `mm_get_status` — the authoritative project snapshot. Returns `{ success, status }` where
  `status` gives you `specs[]` (each `{ path, name, totalTasks, completedTasks,
  inProgressTasks, blockedTasks, backlogTasks }`), `activeTasks[]`, `openIssues[]`,
  `features[]`, `ungroupedSpecs[]`, `recentNotes[]`, and `stalledCount`. This is the single
  source for spec-task counts, active tasks, and open issues — do NOT hand-count checkboxes.
- `.mm/session/last-context.md` — what was happening last session
- `.mm/notes/notes.md` — recent notes (just scan the top 3-5)
- `.mm/analyses/analyses.md` — recent analyses (just scan the top 3, if file exists)
- `.mm/docs/docs.md` — living reference documents (API docs, guides, runbooks — if file exists)
- `.mm/product/mission.md` — product mission (one read, stays stable)

### Step 2: Load Feature Map

Read all `.mm/features/*/feature.json` files in parallel. These are small JSON files (~800 bytes each) that give you:

- Feature name, description, status, priority
- `linked_specs` — which specs belong to this feature
- `progress` — completion percentage

This is your **primary overview** of the project. Do NOT read individual spec files in this step.

### Step 3: Find Active Specs Only

Use the `status.specs[]` you already got from `mm_get_status` in Step 1 — no file reading or
checkbox counting needed. A spec is **active** if `completedTasks < totalTasks` (i.e. it still
has `inProgressTasks + blockedTasks + backlogTasks > 0`). `status.activeTasks[]` is the ready
list of currently in-progress tasks across all specs.

For each active spec, `status.specs[]` already gives you `completedTasks` / `totalTasks` for the
completion figure and the remaining-task count — canonical, sourced from spec.md's `## Tasks`
(with the legacy `implementation.md` fallback handled inside the tool).

Then, for only those active specs, check for `checkpoints/` directories — if present, read the
latest checkpoint for working context.

**Skip all fully-completed specs.** A spec is complete when `completedTasks === totalTasks`.

Typically only 5-10 specs are active at any time. `mm_get_status` returns them all in one call —
no per-spec file reads for counts.

### Step 4: Output Context Summary

Provide a **brief** summary (not a wall of text):

```
**Project State:**
- [N] features, [N] specs ([N] active), [N] open issues
- Last session: {one-line summary from last-context.md}

**Active Work:** (from feature map + active specs)
- {feature name}: {spec name} — {completion %}, {N} tasks remaining
- {feature name}: {spec name} — {completion %}, {N} tasks remaining

**Flagged:**
- {any critical issues or blockers, or "None"}

**Recent Analyses:** (only if analyses exist)
- {Title} ({Category}, {N} Q&As, {age})

**Docs:** (only if docs exist)
- {Title} ({Category}, {age})
```

If any in-progress specs have checkpoints, include a section per spec:

```
**{Spec Name} — Phase Context:**
- Last completed phase: Phase {N} - {name}
- What was built: {key bullets from "What Was Built"}
- Patterns: {key items from "Patterns Established"}
- Known issues: {items from "Known Issues / Workarounds", or "None"}
- Next: Phase {N+1} - {name from "Next Phase Preview"}
```

Keep the main summary concise. The checkpoint detail gives you working knowledge of what's already been built without re-reading the entire codebase.

### Step 4.5: Regenerate Project Identity

Regenerate `.mm/project-identity.md` from the state you just loaded:

1. Read `.mm/product/mission.md` for the mission one-liner
2. Count features from the feature map you loaded in Step 2
3. Count spec folders in `.mm/specs/`
4. Use the issue counts you already gathered
5. Determine current focus from most recently modified active spec

Write the file in this exact format (5 lines, no extras):

```markdown
**Project:** {project name from config.json}
**Stack:** {tech stack from product docs or CLAUDE.md}
**Mission:** {one-line mission from mission.md}
**Focus:** {current focus area from active specs/tasks}
**State:** {N} features, {N} specs, {N} open issues
```

### Step 5: Handle Additional Input

If the user included additional text after `/mm:context`:

- Treat it as their intent for this session
- Use the loaded context to inform your response
- Proceed directly with whatever they asked — don't ask "what would you like to do?"

If no additional text was provided:

- End with: "Context loaded. What are you working on?"
- Do NOT list out suggested tasks or next steps unprompted

---

**Key principle:** This command is a context loader, not a ceremony. Load state, summarize briefly, then get to work.
