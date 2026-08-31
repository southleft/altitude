# Review Entity

Review a single spec, issue, or feature to determine if it's still relevant and take action.

## Usage

```
/mm:review-entity {type} {identifier}
```

**Examples:**

- `/mm:review-entity spec 2026-02-23-single-entity-review`
- `/mm:review-entity issue sec-01-curl-pipe-bash-rce-12-01-2025`
- `/mm:review-entity feature entity-review`

ARGUMENTS: $ARGUMENTS

---

## Step 1: Parse Arguments

Extract entity type and identifier from arguments. Expected format: `{type} {identifier}`

- `type` must be one of: `spec`, `issue`, `feature`
- `identifier` is the filesystem slug (spec folder name, issue file stem, or feature id)

If arguments are missing or invalid, show usage and exit.

## Step 2: Route by Entity Type

### If type is `spec`:

1. **Read spec files:**
   - `.mm/specs/{identifier}/spec.md`
   - `.mm/specs/{identifier}/requirements.md` (if exists)

2. **Get canonical task counts:**
   - Call `mm_get_status({ project_path })` and find the entry in `status.specs[]` whose
     `path` equals `{identifier}`. It gives you `totalTasks`, `completedTasks`,
     `inProgressTasks`, `blockedTasks`, and `backlogTasks` — sourced from spec.md's `## Tasks`
     (with the legacy `implementation.md` fallback handled inside the tool). Do NOT hand-count
     checkboxes.

3. **Analyze the codebase:**
   - Search for files, functions, and components mentioned in the spec
   - Check if the described functionality already exists
   - Compare the spec's tasks against actual code state

4. **Assess relevance:**
   - **All tasks done + code exists** → "Fully implemented, ready to archive"
   - **Some tasks done** → "Partially implemented, update task statuses"
   - **Code exists but spec not updated** → "Implemented but spec is stale"
   - **Nothing implemented** → "Not started, still relevant" or "Superseded by other work"

5. **Offer actions** (use AskUserQuestion):
   - Archive spec (if fully implemented)
   - Mark specific tasks complete (if code exists for them)
   - Update spec status
   - No action (just informational)

### If type is `issue`:

1. **Find and read the issue file:**
   - Look for `.mm/issues/{identifier}.md`
   - If not found, try `.mm/issues/{identifier}` with common date suffixes

2. **Analyze the codebase:**
   - Search for the described bug/problem in current code
   - Check git log for recent commits that may have addressed it
   - Look for the specific files/functions mentioned in the issue

3. **Assess relevance:**
   - **Problem no longer exists in code** → "Appears resolved"
   - **Problem still exists** → "Still relevant"
   - **Code has changed significantly** → "Needs re-evaluation"

4. **Offer actions** (use AskUserQuestion):
   - Close issue (if resolved) — follow the same process as `/mm:issue-close`
   - Update severity
   - Add resolution notes
   - No action

### If type is `feature`:

1. **Read feature data:**
   - `.mm/features/{identifier}/feature.json` (for `linked_specs` and current status)
   - Read each linked spec's `spec.md` for content/context as needed

2. **Analyze health:**
   - Call `mm_get_status({ project_path })` and filter `status.specs[]` to the entries whose
     `path` matches this feature's `linked_specs` slugs. Use each entry's `completedTasks` /
     `totalTasks` — sourced from spec.md's `## Tasks` (legacy `implementation.md` fallback
     handled inside the tool). Do NOT hand-count checkboxes.
   - Calculate overall progress by summing `completedTasks` and `totalTasks` across the linked specs
   - Identify specs that are 100% complete (`completedTasks === totalTasks`)
   - Identify specs with no progress (stale) — `completedTasks === 0`
   - Check if feature status matches actual progress

3. **Assess relevance:**
   - **All specs complete** → "Feature complete, ready to mark done"
   - **Mix of complete/incomplete** → "In progress, {N} specs remaining"
   - **No specs started** → "Not started" or "Stale — consider removing"

4. **Offer actions** (use AskUserQuestion):
   - Mark feature complete (if all specs done)
   - Archive completed specs
   - Update feature status to match reality
   - No action

## Step 3: Output Review Report

Display a structured assessment:

```
# Entity Review: {Title}

## Status Assessment
- Type: {spec/issue/feature}
- Identifier: {identifier}
- Current Status: {current status from file}
- Relevance: {Still Needed / Partially Addressed / No Longer Needed}

## Findings
- {Specific findings from codebase analysis}
- {Files found/not found}
- {Tasks that appear done but aren't marked}

## Recommended Actions
1. {Primary recommendation with rationale}
2. {Secondary recommendation if applicable}
```

## Step 4: Execute Approved Actions

After the user selects actions via AskUserQuestion:

- **Archive spec:** Use the same archive mechanism as the dashboard
- **Close issue:** Follow the `/mm:issue-close` process (update issue file + issues.md)
- **Mark feature complete:** Update `feature.json` status to `complete`
- **Update task statuses:** Move tasks between sections in the spec's canonical task source —
  spec.md's `## Tasks` (`#### Completed` / `#### In Progress` / `#### Blocked` / `#### Backlog`),
  or the legacy `implementation.md` for pre-literate specs that lack a `## Tasks` section

Report what was done:

```
## Actions Taken
- {Action 1}: {result}
- {Action 2}: {result}

Files modified:
- {list of changed files}
```
