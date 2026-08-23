# Execute Task (Monday Morning)

### Sentinel (running visibility)

So Monday Morning desktop (and any other tool reading
`.mm/session/active/`) can detect this `/mm:` skill running outside the
desktop app, write a sentinel JSON file on entry and delete it on exit.
The trap covers clean exits and Ctrl-C; MM's 60s prune cycle covers
hard-kills (terminal window closed without a clean exit).

```bash
TASK_SLUG="${TASK_SLUG:-<resolved task slug>}"
SENTINEL_DIR=".mm/session/active"
mkdir -p "$SENTINEL_DIR"
SENTINEL="$SENTINEL_DIR/task-${TASK_SLUG}.json"
cat > "$SENTINEL" <<EOF
{
  "pid": $$,
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "host": "$(hostname -s)",
  "user": "${USER:-$(whoami)}",
  "cmd": "/mm:task ${TASK_SLUG}",
  "spec_folder": "task-${TASK_SLUG}",
  "session_kind": "task"
}
EOF
trap 'rm -f "$SENTINEL"' EXIT
```

One-shot task execution — from intent to committed code. For standalone work that doesn't need a full spec.

## Usage

```
/mm:task [description]
```

**Examples:**

- `/mm:task add a loading spinner to the dashboard`
- `/mm:task refactor the auth middleware to use async/await`
- `/mm:task fix the date formatting in the sidebar`
- `/mm:task` — interactive mode, asks what you need

## When to Use This vs Other Commands

| Use `/mm:task` when...     | Use `/mm:spec` when...   | Use `/mm:issue` when...         |
| -------------------------- | ------------------------ | ------------------------------- |
| Small, well-defined work   | Multi-task feature       | Bug report to investigate later |
| Can be done in one session | Needs planning/breakdown | Not ready to fix yet            |
| You want it done now       | Cross-cutting concerns   | Needs triage/prioritization     |

## Workflow

This command runs a **pipeline** — each phase flows into the next automatically. The user stays in control and can interrupt at any phase boundary.

### Phase 1: Ingest

Parse the user's intent into a structured task:

1. If description provided, extract:
   - **Title** — short action phrase (e.g., "Add loading spinner to dashboard")
   - **Scope** — which files/areas are likely affected
   - **Acceptance criteria** — what "done" looks like (infer from intent)
   - **Size estimate** — S (< 30 min), M (30-60 min), L (1-2 hrs)

2. If no description provided, ask:
   - "What do you need done?"
   - Then extract the above from the response

3. If the task seems too large (L+), suggest:
   - "This looks like it might benefit from a full spec. Want me to run `/mm:spec` instead, or proceed as a task?"

4. Present the parsed task for confirmation:

   ```
   Task: {Title}
   Scope: {files/areas}
   Criteria: {what done looks like}
   Size: {S/M/L}

   Proceed? (yes / edit / convert to spec)
   ```

### Phase 2: Plan

Use the **Explore** agent to understand the affected code:

1. Find the relevant files based on scope from Phase 1
2. Read existing patterns, types, and conventions in those files
3. Produce a brief implementation plan:

   ```
   Plan:
   1. {step} — {file}
   2. {step} — {file}
   3. {step} — {file}

   Tests: {what to test, or "no new tests needed" with reason}
   ```

4. Show the plan to the user. Wait for approval before proceeding.

### Phase 3: Implement

Use the **implementer** agent (or implement directly if simple enough):

1. Execute the plan from Phase 2
2. Write the code changes
3. If tests are needed, write them alongside the implementation
4. Run any affected tests to verify nothing is broken:
   - For TypeScript: `npm test` or the project's test command
   - For Rust: `cargo test`
   - If no test runner is configured, skip gracefully

### Phase 4: Verify

Self-check the work:

1. Review the diff — does it match the acceptance criteria from Phase 1?
2. Run linting/type checking if available
3. If UI-facing and browser tools are available, take a screenshot and verify visually
4. Produce a verification summary:

   ```
   Verification:
   - [x] {criterion 1}
   - [x] {criterion 2}
   - [ ] {criterion that couldn't be verified — reason}
   ```

5. If any criteria fail, loop back to Phase 3 with the specific failures. Max 2 retries.

### Phase 5: Commit

Prepare for commit (but ask before executing):

1. Stage only the files changed for this task
2. Draft a commit message using conventional commits:

   ```
   {type}: {description}

   Task: {title}
   ```

3. Present to user:

   ```
   Ready to commit:
   {list of staged files}

   Message: {commit message}

   Commit? (yes / edit message / skip commit)
   ```

4. If user approves, commit. Then ask:
   ```
   Push to remote? (yes / no)
   ```

### Phase 6: Record

Log the completed task in `.mm/tasks/tasks.md`:

1. Add to `## Completed` section:

   ```markdown
   - [x] **{date}** {Title} — {one-line summary of what was done}
   ```

2. Output final summary:

   ```
   Task Complete

   {Title}
   Files: {count} modified, {count} created
   Commit: {short hash} {message}
   Duration: {time from start to finish}
   ```

## Pipeline Control

The user can interrupt the pipeline at any phase boundary:

- **"skip tests"** — skip Phase 4 test running
- **"skip commit"** — stop after Phase 4
- **"skip push"** — commit but don't push
- **"stop"** or **"pause"** — stop the pipeline, keep changes uncommitted
- **"edit"** — at any confirmation prompt, lets user modify before continuing

## Error Recovery

If any phase fails:

- Show what went wrong clearly
- Offer options: retry, skip this phase, abort
- Never leave the codebase in a broken state — if implementation fails mid-way, offer to revert

## MCP Tools Used

| Step        | Tool                                                   | Purpose                                         |
| ----------- | ------------------------------------------------------ | ----------------------------------------------- |
| Record task | `mcp__monday-morning__mm_create` with `entity: "task"` | (Optional) Record in .mm if user wants tracking |
