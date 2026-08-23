# Merge Worktrees — Recovery & Cleanup

Merge completed parallel worktree branches back into the source branch and clean up.

## Usage

```
/mm:merge-worktrees [--auto]
```

- Default: interactive (ask before each merge)
- `--auto`: merge all clean branches without asking

## Overview

This command recovers from interrupted parallel runs. When `/mm:spec-start --parallel` completes specs in worktrees but the merge step never ran (sidebar closed, context limit, etc.), this command picks up where it left off.

## Workflow

### Step 1: Read Manifest

Read `.claude/parallel-runs.json`. If it doesn't exist, check for orphaned worktrees anyway:

```bash
git worktree list
```

If no manifest and no worktrees under `.claude/worktrees/`, report:

```
No parallel runs or orphaned worktrees found. Nothing to do.
```

### Step 2: Assess Each Worktree

For each spec in the manifest (or each worktree if no manifest):

1. **Check worktree exists**: `ls {worktree_path}` — if prunable/missing, skip
2. **Check branch exists**: `git branch --list {branch_name}`
3. **Read implementation.md** from the worktree to get task completion status
4. **Determine merge status**:
   - `complete` — all tasks `[x]`, ready to merge
   - `partial` — some tasks done, still worth merging
   - `empty` — no changes vs source branch, skip

Run `git log {source_branch}..{branch_name} --oneline` to see what commits exist.

Display a summary table:

```
Worktree Status Report
══════════════════════════════════════════════════════
Spec                          Tasks     Commits  Status
────────────────────────────  ────────  ───────  ──────
PM Dashboard Layout           5/5       3        Ready
AI Chat Sidebar               4/4       2        Ready
Integration Settings          6/6       4        Ready
Harvest Integration           3/3       2        Ready
Trello Board Reports          4/4       3        Ready
Slack Report Delivery         3/3       2        Ready
LOE Estimates                 5/5       3        Ready
══════════════════════════════════════════════════════
```

### Step 3: Merge Safety Check

For each branch with commits, test merge cleanliness:

```bash
git merge --no-commit --no-ff {branch_name} 2>&1
git merge --abort
```

Report any conflicts.

### Step 4: Merge

**Interactive mode (default):**

For each branch, show diff stats and ask:

```
{Spec Title} — {N} commits, {files} files changed
Merge into {source_branch}? [Y/n/skip]
```

**Auto mode (`--auto`):**

Merge all clean branches sequentially without asking.

For each merge:

```bash
git merge {branch_name} -m "Merge: {spec_title} (parallel worktree implementation)"
```

If a merge has conflicts, abort it and report — move to the next branch.

### Step 4b: Reconcile implementation.md Files

**CRITICAL**: Git merges often keep the source branch's `implementation.md` (all `[ ]`) instead of the worktree's version (all `[x]`), because both sides modified the same file and the merge strategy picks one. After each successful merge, you MUST fix this.

For each merged spec:

1. Read `.mm/specs/{spec_folder}/implementation.md` on the current branch
2. If tasks are still showing `- [ ]` (unchecked) despite the spec being implemented:
   - The worktree agent completed the work but the merge didn't pick up the checkbox changes
   - Move all tasks to `## Completed` and mark them `- [x]`
3. Verify by checking that the implementation code actually exists (the merge brought the code in, just not the checkbox updates)

This can also be done by reading the worktree's copy before removing the worktree:

```bash
# Before removing the worktree, grab its implementation.md
cp {worktree_path}/.mm/specs/{spec_folder}/implementation.md \
   .mm/specs/{spec_folder}/implementation.md
```

**Why this happens**: Worktree agents update `implementation.md` in their isolated copy. The source branch also has `implementation.md` (with all `[ ]`). During merge, if both sides touched the file, git may pick the source branch version or produce a conflict that resolves to the wrong side. The code changes merge fine because they're new files, but the checkbox state gets lost.

### Step 4c: Trello Auto-Move for Completed Specs

After reconciling implementation.md files, check each newly-complete spec for Trello auto-move:

1. For each spec that is now 100% complete (all `[x]`):
   a. Read `spec.md` frontmatter — look for `trello.card_id`
   b. Read `.mm/integrations.json` — look for `trello.done_list_id`
   c. If both exist, move the Trello card:

   ```bash
   # Use the Tauri command via the invoke pattern, or call the Trello API directly
   # The auto_move_completed_spec Tauri command handles all the logic:
   invoke('auto_move_completed_spec', { projectPath: '{project_root}', specFolder: '{spec_folder}' })
   ```

   d. Report the move: `Moved Trello card for "{spec title}" to Done list`

2. If the Trello move fails, log a warning but don't fail the merge — it's non-critical.

### Step 5: Clean Up Worktrees

After merging (or skipping) each branch:

1. Remove the worktree:
   ```bash
   git worktree remove {worktree_path} --force
   ```
2. Delete the branch (only if it was merged):
   ```bash
   git branch -d {branch_name}
   ```

Also prune any stale worktrees:

```bash
git worktree prune
```

### Step 6: Update Manifest

After all merges and cleanup:

- If all specs merged: **delete** `.claude/parallel-runs.json`
- If some remain: **update** the manifest to remove merged specs

### Step 7: Final Report

```
Merge & Cleanup Complete
══════════════════════════════════════════════════════
Merged:   5 branches
Skipped:  1 branch (conflicts)
Cleaned:  5 worktrees removed

Remaining branches (need manual resolution):
  git merge worktree-agent-xyz123  (conflicts in: src/foo.ts)

Worktrees cleaned. Parallel runs manifest cleared.
```

---

## Error Handling

- **Dirty working tree**: Warn user and ask to stash or commit first
- **Merge conflicts**: Abort that merge, continue to next, report at end
- **Missing worktree but branch exists**: Still offer to merge the branch
- **No manifest but orphaned worktrees**: List them and offer cleanup

---

## Related Commands

- `/mm:spec-start --parallel` — Launch parallel spec implementations
- `/mm:spec-status` — Check implementation progress
