# Complete - Full Done Workflow

Complete your current work with a comprehensive workflow: test, build, commit, push, mark tasks complete, update changelog, and optionally create a PR.

## Overview

This command orchestrates the entire "done" workflow:

1. Run tests (auto-detected from project type)
2. Run build (auto-detected from project type)
3. Generate and commit changes with structured message
4. Push to current branch
5. Mark task(s) complete in the spec's task list (spec.md `## Tasks`; legacy specs: implementation.md)
6. Update CHANGELOG.md with entry
7. Offer PR creation (if on feature branch)
8. Suggest next task from backlog
9. Clean up session context

## Command Usage

```
/mm:complete [flags]
```

**Flags:**

- `--skip-tests` - Skip test step
- `--skip-build` - Skip build step
- `--no-push` - Commit but don't push
- `--no-pr` - Skip PR creation prompt
- `--message "..."` - Override commit message title
- `--review` - Run code review with auto-fix before committing
- `--review-dry-run` - Preview what review would fix (no changes)
- `--task-only [task-id]` - Mark a task complete WITHOUT the commit/push/changelog/PR workflow
  (absorbed the former `/mm:task-complete`). See **Task-Only Mode** below — when this flag is
  present, skip Steps 0–5 and 7–10 entirely.

**Examples:**

```
/mm:complete                          # Full workflow
/mm:complete --skip-tests             # Skip tests, run everything else
/mm:complete --message "Add feature"  # Use custom commit title
/mm:complete --no-pr                  # Skip PR creation prompt
/mm:complete --review                 # Review + auto-fix before commit
/mm:complete --review-dry-run         # Preview review findings only
```

---

## Task-Only Mode (`--task-only`)

Complete a task with the test gate and the verification cascade, but none of the git workflow.
Nothing here commits, pushes, or edits the changelog.

1. **Select the task.** If a task id/title argument was given, match it (case-insensitive,
   fuzzy on title; ask on multiple matches). Otherwise list candidates and ask:
   - Spec tasks — from the active spec's `## Tasks` (via `mm_get({entity: "spec"})`, using
     `.mm/session/last-context.md` to find the active spec), In Progress first then Backlog.
   - Standalone quick tasks — from `mm_get_status({project_path})`'s `status.quickTasks[]`
     (non-`done` entries).
2. **Complete it.**
   - Spec task → `mm_complete({entity: "task", project_path, spec_path, task_title, force: false})`.
     `force: false` matters: no test step ran in this mode, so let the tool's test gate catch
     failures. On `gated: true` failure, show the test output and stop — the task stays
     incomplete.
   - Quick task → `mm_complete({entity: "quick", project_path, id})`.
3. **Honor the verification cascade.** If the response has `verification_recommended: true`
   (last task of the spec), run the Step 6 gate exactly as below — `/mm:verify-spec {spec}
   --fix --adversarial --max-iterations 3`, T3 backlog surfaced record-only, revert on
   gaps-remain. Task-only mode skips the *git* workflow, never the *verification* gate.
4. **Confirm:** task title, spec progress `{old}% → {new}%`, and — when the user wants the
   change committed — point at full `/mm:complete`.

---

## Step 0: Parse Flags and Validate State

### Parse Command Flags

Check the command for any flags:

- `--skip-tests` - Set `skip_tests = true`
- `--skip-build` - Set `skip_build = true`
- `--no-push` - Set `no_push = true`
- `--no-pr` - Set `no_pr = true`
- `--message "..."` - Extract message text, set `custom_message`
- `--review` - Set `run_review = true` — Run code review + auto-fix between build and commit
- `--review-dry-run` - Set `review_dry_run = true` — Run review in dry-run mode (report only, no fixes)

### Validate Git State

Run:

```bash
git status
```

**Check for issues:**

1. **No changes:**

   ```
   Nothing to commit. Working tree is clean.

   If you've already committed, you can still mark tasks complete with:
   /mm:complete --task-only
   ```

   Exit gracefully.

2. **Merge conflicts:**

   ```
   Cannot complete - merge conflicts detected in:
   - src/file.ts
   - src/other.ts

   Resolve conflicts first, then run /mm:complete again.
   ```

   Exit.

3. **Detached HEAD:**

   ```
   Warning: You're in detached HEAD state.
   Create a branch first:

   git checkout -b {branch-name}
   ```

   Exit.

### Validate Project Structure

Check that `.mm/` directory exists:

- If not found, warn but continue (commit/push still work)
- Task completion and session cleanup will be skipped

---

## Step 1: Run Tests

**Skip if `--skip-tests` flag is set.**

### Auto-Detect Test Command

Check project files in this order:

| Check            | Condition          | Command            |
| ---------------- | ------------------ | ------------------ |
| `package.json`   | Has `scripts.test` | `npm test`         |
| `Cargo.toml`     | Exists             | `cargo test`       |
| `pyproject.toml` | Exists             | `pytest`           |
| `pytest.ini`     | Exists             | `pytest`           |
| `setup.py`       | Exists             | `python -m pytest` |
| `go.mod`         | Exists             | `go test ./...`    |
| `Makefile`       | Has `test` target  | `make test`        |

### Detection Logic

```bash
# Check for Node.js tests
if [ -f "package.json" ]; then
  # Check if scripts.test exists
  cat package.json | grep -q '"test":'
fi

# Check for Rust tests
if [ -f "Cargo.toml" ]; then
  # Cargo test is available
fi

# Check for Makefile test target
if [ -f "Makefile" ]; then
  grep -q "^test:" Makefile
fi
```

### Multi-Project Detection

For monorepos, check these subdirectories:

- `desktop/*/package.json`
- `backend/`, `frontend/`, `server/`, `client/`
- `packages/*/package.json`
- `apps/*/package.json`

Run tests in ALL detected projects.

### Execute Tests

Display:

```
Running tests...

Project: {path}
Command: {test-command}
```

Run the detected test command and capture output.

### On Test Failure

If tests fail (non-zero exit code):

```
Tests FAILED

Project: {path}
Exit code: {code}

{test output - last 50 lines}

Please fix the failing tests and run /mm:complete again.

Tip: Use --skip-tests to bypass (not recommended)
```

**Exit immediately. Do NOT proceed to build.**

### On Test Success

```
Tests passed.
```

Continue to next step.

---

## Step 2: Run Build

**Skip if `--skip-build` flag is set.**

### Auto-Detect Build Command

Check project files in this order:

| Check            | Condition           | Command                 |
| ---------------- | ------------------- | ----------------------- |
| `package.json`   | Has `scripts.build` | `npm run build`         |
| `Cargo.toml`     | Exists              | `cargo build --release` |
| `go.mod`         | Exists              | `go build ./...`        |
| `Makefile`       | Has `build` target  | `make build`            |
| `pyproject.toml` | Has build-system    | `pip install -e .`      |

### Detection Logic

```bash
# Check for Node.js build
if [ -f "package.json" ]; then
  cat package.json | grep -q '"build":'
fi

# Check for Makefile build target
if [ -f "Makefile" ]; then
  grep -q "^build:" Makefile
fi
```

### Execute Build

Display:

```
Running build...

Project: {path}
Command: {build-command}
```

Run the detected build command and capture output.

### On Build Failure

If build fails (non-zero exit code):

```
Build FAILED

Project: {path}
Exit code: {code}

{build output - last 50 lines}

Please fix the build errors and run /mm:complete again.

Tip: Use --skip-build to bypass (not recommended)
```

**Exit immediately. Do NOT proceed to commit.**

### On Build Success

```
Build succeeded.
```

Continue to next step.

---

## Step 2.5: Code Review (Optional)

**Skip if `--review` and `--review-dry-run` flags are NOT set.**

### Run Review Pipeline

If `review_dry_run` is set:

- Run `/mm:review --dry-run` to generate a report without modifying files
- Display the dry-run summary
- Continue to Step 3

If `run_review` is set:

- Run `/mm:review --auto-fix` to analyze changes and apply high-confidence fixes
- The review pipeline will:
  1. Analyze all changed files
  2. Triage findings by confidence level
  3. Apply high-confidence fixes as atomic `review-fix:` commits
  4. Run post-fix test verification
  5. Report medium/low confidence findings

### Review Summary

After review completes, display:

```
Review: {count} auto-fixed, {count} suggestions, {count} advisory
```

### On Review Failure

If the review pipeline encounters a fatal error:

```
Review failed: {error}

Continuing without review. Your changes are unaffected.
Use --skip-review or remove --review to skip next time.
```

Continue to Step 3. Review failure is non-blocking.

### Include in Commit Message

If review ran, add to the commit message body (Step 4):

```
Review: {count} auto-fixes applied, {count} suggestions, {count} advisory
```

---

## Step 3: Determine Task Context

Before committing, identify which task(s) are being completed.

### Source 1: Session Context (Primary)

Read `.mm/session/last-context.md` if it exists.

Look for:

- **Spec:** line (e.g., `**Spec:** 2025-12-07-context-delivery`)
- **Feature:** line
- Task information in "What We Were Working On" section

Extract:

- `spec_path` - The spec folder name
- `task_id` - Task identifier (e.g., "T11", "P1-T3")
- `task_name` - Full task name

### Source 2: Ask User (Fallback)

If no session context found or it's unclear:

```
Which task are you completing?

Recent specs with active tasks:

[1] 2025-12-08-feature-management-ui
    - P8-T3: Version bump and release
    - P8-T4: Update documentation

[2] 2025-12-07-context-delivery-optimization
    - T11: Add settings panel
    - T12: Implement batch mode

[3] Enter task ID/name manually
[4] Skip task completion (commit only)

Select:
```

### Source 3: Git Analysis (Hint)

Analyze staged changes to suggest relevant spec:

- If changes are in files that match a spec name, highlight that spec
- If changes are in `.mm/specs/{spec}/`, suggest that spec

### Store Task Context

Save for later steps:

```
task_context = {
  spec_path: ".mm/specs/2025-12-07-context-delivery",
  task_id: "T11",
  task_name: "Add settings panel for delivery mode"
}
```

If user selects "Skip task completion", set `skip_task = true`.

---

## Step 4: Generate Commit Message

### Analyze Changes

Run:

```bash
git status
git diff --staged
git diff
git log -3 --oneline
```

Identify:

- What files are staged
- What files have unstaged changes
- The current branch name
- Recent commit style for consistency

### Handle Unstaged Changes

If there are unstaged changes:

```
I found unstaged changes in:
- src/components/Button.tsx (modified)
- src/utils/helpers.ts (modified)

Include these in the commit?
[1] Yes, include all
[2] Let me select which ones
[3] No, only commit staged files
```

Stage selected files with `git add`.

### Generate Commit Message

**If `--message` flag provided:** Use as title, generate body.

**Otherwise:** Generate full message.

Follow this exact format:

```
{Title - imperative mood, <50 chars}

{Description sentence explaining what this commit accomplishes.}

What it does:

- {Bullet point explaining functionality}
- {Another bullet point}

{Section header - New files/Changes/etc.}:

- {File or feature} - {Brief description}
```

### Section Headers

Choose appropriate header(s) based on what changed:

- **New files:** - For newly created files
- **New endpoints:** - For API routes added
- **New components:** - For UI components added
- **Changes:** - For modifications to existing files
- **Removed:** - For deleted files/features
- **Integration:** - For how features connect
- **Database:** - For migrations or schema changes
- **Configuration:** - For config file changes

### Include Task Reference

If task context was identified, add to description:

```
Completes {task_id}: {task_name}
```

### Show Preview

```
Commit Preview
──────────────────────────────────────────

{Generated commit message}

──────────────────────────────────────────

Branch: {current-branch}
Files: {count} files changed
Task: {task_id}: {task_name}

[1] Commit and push
[2] Edit message
[3] Cancel

Select:
```

Wait for user confirmation. If [2], allow editing. If [3], exit.

---

## Step 5: Commit and Push

### Commit

Execute:

```bash
git add -A  # or selected files from Step 4
git commit -m "{message}"
```

### Push (unless --no-push)

If `--no-push` flag is NOT set:

```bash
git push origin {current-branch}
```

### Handle Push Failure

If push fails due to remote changes:

```
Remote has new changes.

[1] Pull and push (git pull --rebase && git push)
[2] Skip push (commit saved locally)

Select:
```

If [1], execute pull and retry push.

If push fails due to auth:

```
Push failed - authentication error.

Try: gh auth login

Your commit is saved locally. Push manually when ready.
```

### Confirm Success

```
Committed and pushed to {branch}

{commit-hash} {title}
{file-count} files changed, {insertions}(+), {deletions}(-)
```

---

## Step 6: Mark Task Complete

**Skip if `skip_task = true` or no task context.**

### Call mm_complete (entity: "task") with Test Gate

`mm_complete` (with `entity: "task"`) now runs the project's test suite before marking a task complete. If tests fail, the task is NOT marked complete and the tool returns an error.

**Determine `force` flag:**

- If Step 1 ran tests successfully (i.e., `--skip-tests` was NOT set): pass `force: true` — tests already passed, no need to re-run.
- If Step 1 was skipped (`--skip-tests`): pass `force: false` (or omit) — let the gate catch any failures.

Call the MCP tool:

```
mm_complete({
  entity: "task",
  project_path: "{project_root}",
  spec_path: "{spec_folder}",
  task_title: "{task_title}",
  force: {true if tests already passed in Step 1, false otherwise}
})
```

### On Test Gate Failure (success: false, gated: true)

If `mm_complete` (with `entity: "task"`) returns a test gate failure:

```
Task completion BLOCKED — tests failed.

{test_output from the response}

The task has NOT been marked complete. No commit or push will happen.

Fix the failing tests and run /mm:complete again.
```

**Exit immediately. Do NOT proceed to changelog, PR, or any further steps.**

### On Success

The tool handles locating the task, marking it `[x]`, marking subtasks complete, and recalculating spec/feature progress.

Display:

```
Task marked complete:

{task_id}: {task_name}

Spec progress: {old}% -> {new}% ({completed}/{total} tasks)
```

If `forced: true` was in the response, note:

```
(test gate bypassed — tests passed in Step 1)
```

### On spec_complete + verification_recommended

If the response has `verification_recommended: true`, this was the last task in the spec. **Before continuing to Step 7**, run spec verification:

1. **Invoke `/mm:verify-spec {spec_path} --fix --adversarial --max-iterations 3`** — runs the Generate->Critique->Revise loop (max 3 iterations) in auto-fix mode. `--max-iterations 3` is required for the fix loop to actually run: verify-spec's default budget is 1 iteration, and REVISE only fires while `iteration < max_iterations`. `--adversarial` runs the independent 3-prompt oracle because this is the done-promoting gate — the moment where an oracle uncorrelated with the implementer matters most. (Note: HIGH confidence additionally requires the iterative path to converge — `consecutive_stable >= 2` — so a gate run that passes on its first iteration reports LOW/MEDIUM by design; that does not fail the gate.)

2. **If verification passes** (all requirements PASS, or PARTIAL <= 1, zero MISS/REGRESSION, zero open T1/T2, every requirement covered, confidence not `unstable`):

   ```
   Spec verification passed: {pass}/{total} requirements verified · confidence {bucket}
   Spec: {spec_path} confirmed complete.
   ```

   **Then surface the T3 backlog (record-only — never blocks completion).** Call `mm_verify({phase: "check_triage", project_path, spec_folder})`. If it reports open T3 entries, show them so they aren't forgotten — but continue to Step 7 regardless:

   ```
   Note: {n} open T3 finding(s) recorded in findings-backlog.md for triage.
   These do not block completion. Triage with /mm:triage-drift or edit the file's
   status column (open → promoted | deferred | dismissed) when you get to them.
     - `{cluster}` {failure_mode}
   ```

   Continue to Step 7.

3. **If verification fails** (MISS or REGRESSION remain after 3 fix iterations):
   - The verification report has already been written to `.mm/specs/{spec}/verification/reflection-verification.md`
   - **Revert the spec completion** by calling:
     ```
     mm_revert_spec_completion({
       project_path: "{project_root}",
       spec_path: "{spec_folder}",
       reason: "Verification failed: {count} MISS, {count} REGRESSION after 3 fix iterations"
     })
     ```
   - **Surface a structured failure summary:**

     ```
     Spec verification FAILED — spec completion reverted.

     Spec: {spec_path}
     Tasks remain [x] but spec is not counted as complete.

     Requirements that failed verification:
       MISS:
         - #{id}: {requirement text}
         - #{id}: {requirement text}
       REGRESSION:
         - #{id}: {requirement text}

     To fix these specific requirements and re-verify:
       1. Address the gaps listed above
       2. Run /mm:verify-spec {spec_path} --fix
       3. When verification passes, re-complete the last task:
          mm_complete({ entity: "task", ..., task_title: "{last_task}" })

     Full report: .mm/specs/{spec}/verification/reflection-verification.md
     ```

   - **Do NOT exit the workflow.** Continue to Step 7 (changelog, commit, push) so the partial work is saved. The agent or user can re-enter the implementation loop targeting the specific failed requirements.

If the response has `verification_skipped: true`:

```
Spec complete — verification deferred (--skip-verify).
Run /mm:verify-spec {spec_path} --fix when ready.
```

Continue to Step 7.

---

## Step 7: Update CHANGELOG.md

### Locate CHANGELOG.md

Check project root for `CHANGELOG.md`.

If not found:

```
No CHANGELOG.md found. Skipping changelog update.
```

Continue to next step.

### Find [Unreleased] Section

Read CHANGELOG.md and find `## [Unreleased]` section.

If not found, create it after the header:

```markdown
# Changelog

## [Unreleased]

{new entry will go here}

---

## [1.4.1] - 2025-12-10

...
```

### Determine Change Type

Based on the commit, categorize as:

- **Added** - New features, files, components, endpoints
- **Changed** - Modifications to existing functionality
- **Fixed** - Bug fixes
- **Removed** - Deleted features or files
- **Security** - Security-related changes

### Generate Entry

Create entry from commit message and task context:

```markdown
### {Type}

- **{Feature/Component Name}** - {Brief description}
  - {Detail from commit bullets}
```

**Example:**

```markdown
### Added

- **Context Delivery Settings** - New settings panel for delivery mode
  - Toggle between streaming and batch delivery
  - Configurable buffer size option
```

### Insert Entry

Add entry under the appropriate type heading in `[Unreleased]`.

If the type heading doesn't exist, create it:

```markdown
## [Unreleased]

### Added

- **{new entry}**
```

### Confirm

```
CHANGELOG.md updated with entry under [Unreleased] -> {Type}
```

---

## Step 8: Offer PR Creation

**Skip if `--no-pr` flag is set.**

### Detect Branch Type

```bash
git branch --show-current
```

**Feature branch indicators:**

- Branch name starts with: `feature/`, `feat/`, `fix/`, `bugfix/`, `hotfix/`
- Branch name contains: issue number (e.g., `issue-123`, `123-feature`)
- Branch is NOT: `main`, `master`, `develop`, `dev`, `staging`, `production`

### If NOT on Feature Branch

Skip PR offer. Display:

```
Pushed to {branch} branch.
```

Continue to next step.

### If on Feature Branch

```
You're on branch: {branch-name}

Create a pull request?
[1] Yes, create PR
[2] No, skip PR

Select:
```

If [2], continue to next step.

### Generate PR Content

**Title:** Use commit title or derive from task name

```
{Commit title}
```

**Body:**

```markdown
## Summary

- {Bullet point 1 from commit}
- {Bullet point 2 from commit}

## Test plan

- [ ] Tests pass locally
- [ ] Build completes successfully
- [ ] Manual testing completed

## Related

- Spec: {spec_path}
- Task: {task_id}: {task_name}

---

Generated with [Claude Code](https://claude.com/claude-code)
```

### Create PR

Execute:

```bash
gh pr create --title "{title}" --body "{body}"
```

### Handle Errors

If `gh` is not installed:

```
GitHub CLI (gh) not found. Install with:
  brew install gh

Skipping PR creation.
```

If auth fails:

```
GitHub authentication required. Run:
  gh auth login

Skipping PR creation.
```

### Confirm Success

```
PR created: https://github.com/{owner}/{repo}/pull/{number}
```

---

## Step 9: Suggest Next Task

### Read Remaining Tasks

Using spec_path from task context, read the spec's task list — spec.md's
`## Tasks` section (legacy specs without one: implementation.md).

Find tasks in:

1. `#### In Progress` section (highest priority; legacy implementation.md uses `## In Progress`)
2. `#### Backlog` section (legacy: `## Backlog`)

### Identify Next Task

Select first uncompleted task:

1. First `- [ ]` item in In Progress
2. If none, first `- [ ]` item in Backlog

### Display Suggestion

```
Task completed! Here's what's next:

Spec: {spec-name}

UP NEXT:
  {next_task_id}: {next_task_name} [{estimate if available}]

Other backlog tasks:
  - {task_id}: {task_name}
  - {task_id}: {task_name}
  - ... ({remaining_count} more)

[1] Start next task
[2] View all tasks (/mm:spec-status)
[3] Done for now

Select:
```

### If User Selects [1]

Prepare context for next task:

- Update session context (Step 10)
- Suggest: "Ready to start. What would you like to know about this task?"

### If No Tasks Remaining

```
All tasks completed for this spec!

Spec: {spec-name}
Status: 100% complete

Would you like to:
[1] Verify implementation against spec requirements (/mm:verify-spec)
[2] Review another spec
[3] Create a new task
[4] Done for now

Select:
```

---

## Step 10: Clean Up Session

### Archive/Clear Session Context

If `.mm/session/last-context.md` exists:

**Option A: Clear for Fresh Start**

Truncate or delete the file if user selected "Done for now":

```bash
echo "" > .mm/session/last-context.md
```

**Option B: Update for Next Task**

If user is starting the next task, update with new context:

```markdown
# Last Session Context

**Updated:** {ISO timestamp}
**Feature:** {feature-name or N/A}
**Spec:** {spec-slug}

## What We Were Working On

Starting task: {next_task_id}: {next_task_name}

## Progress Since Last Session

- [ ] {next_task_id}: {next_task_name}

## Key Decisions Made

Continuing from previous work on this spec.

## Open Questions

None recorded.

## Next Steps

1. Review task requirements
2. Implement {next_task_name}
3. Update implementation.md with progress
```

### Confirm Cleanup

```
Session context {cleared/updated for next task}.
```

---

## Error Handling Summary

| Step      | Failure                   | Response                                       |
| --------- | ------------------------- | ---------------------------------------------- |
| Tests     | Test failure              | Show output, exit, suggest fix                 |
| Build     | Build failure             | Show output, exit, suggest fix                 |
| Git       | No changes                | Inform user, exit gracefully                   |
| Git       | Merge conflict            | Show files, exit, explain resolution           |
| Push      | Remote changes            | Offer pull and retry                           |
| Push      | Auth failure              | Show error, suggest `gh auth login`            |
| Task      | Test gate failure         | Show test output, exit — do not commit or push |
| Task      | Task not found            | Ask user to identify manually                  |
| Task      | implementation.md missing | Warn, skip task update                         |
| Review    | Review pipeline error     | Warn, continue without review                  |
| Changelog | CHANGELOG.md missing      | Skip changelog update                          |
| PR        | Not feature branch        | Skip PR offer                                  |
| PR        | `gh` not installed        | Warn, skip PR creation                         |
| PR        | Auth failure              | Warn, skip PR creation                         |

### No Automatic Rollback

If a step fails:

- Prior completed steps remain in effect
- User is informed exactly where it failed
- User can fix the issue and re-run
- Command is idempotent where possible

---

## Project Detection Reference

### Test Detection Matrix

| Project Type | Detection File                             | Test Command    |
| ------------ | ------------------------------------------ | --------------- |
| Node.js      | `package.json` with `scripts.test`         | `npm test`      |
| Rust         | `Cargo.toml`                               | `cargo test`    |
| Python       | `pyproject.toml`, `pytest.ini`, `setup.py` | `pytest`        |
| Go           | `go.mod`                                   | `go test ./...` |
| Make         | `Makefile` with `test:` target             | `make test`     |

### Build Detection Matrix

| Project Type | Detection File                      | Build Command           |
| ------------ | ----------------------------------- | ----------------------- |
| Node.js      | `package.json` with `scripts.build` | `npm run build`         |
| Rust         | `Cargo.toml`                        | `cargo build --release` |
| Go           | `go.mod`                            | `go build ./...`        |
| Make         | `Makefile` with `build:` target     | `make build`            |
| Python       | `pyproject.toml` with build-system  | `pip install -e .`      |

### Monorepo Subdirectories

Check these paths for additional projects:

- `desktop/*/`
- `backend/`, `frontend/`
- `server/`, `client/`
- `packages/*/`
- `apps/*/`
- `services/*/`

---

## Integration

**Related Commands:**

- `/mm:commit` - Commit-only workflow (no tests/build/task)
- `/mm:complete --task-only` - Task completion only (no git workflow)
- `/mm:task-start` - Start a new task
- `/mm:spec-status` - View spec progress

**Triggered By:**

- Completing work on a task
- Ready to merge feature branch
- End of development session

**Triggers:**

- Desktop app refresh (progress bars update)
- GitHub PR creation
- Session context update

---

**Version:** 1.0
**Created:** 2025-12-17
