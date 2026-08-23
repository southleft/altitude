# Review Fix Engine

Internal engine used by `/mm:review --auto-fix` to apply high-confidence fixes from review findings.

## Overview

This engine takes triaged review findings (high-confidence, fixable) and applies them to the working tree as atomic commits. It handles dependency ordering, conflict detection, and graceful failure recovery.

## Input

A list of high-confidence, fixable `ReviewFinding` objects (see `.claude/schemas/review-output-contract.md`) sorted by the triage module's dependency ordering (see `.claude/schemas/review-triage.md`).

## Execution Flow

### Step 1: Validate Findings

For each finding in the auto-fix list:

1. Verify the target `file` exists in the working tree
2. Verify the target `line` (if specified) is within the file's line count
3. Verify `diff_suggestion` is non-empty
4. If any validation fails, move the finding to the suggestions list and log:
   ```
   Skipped: {finding.id} — {reason}
   ```

### Step 2: Group by File

Group validated findings by `file` path. Within each file group, sort by:

1. Import additions (top of file) first
2. Line number ascending
3. Deletions last

### Step 3: Apply Fixes

For each finding, in dependency order:

1. **Read the current file** contents
2. **Apply the fix** using the `diff_suggestion`:
   - If it's a unified diff, apply it
   - If the exact `old` text from the diff can be found in the file, replace it
   - If the text cannot be matched (file changed since analysis), skip and downgrade:
     ```
     Skipped: {finding.id} — file content changed since analysis, downgraded to suggestion
     ```
3. **Write the modified file**

### Step 4: Commit Each Fix Atomically

After each successful fix application:

```bash
git add {file_path}
git commit -m "review-fix: {finding.fix_description} ({finding.agent})"
```

If the commit fails, log and continue:

```
Warning: Failed to commit fix {finding.id} — {error}
```

### Step 5: Report Results

After all fixes are processed, output:

```
Auto-Fix Results:
  Applied: {count} fixes committed
  Skipped: {count} fixes downgraded to suggestions
  Failed:  {count} fixes could not be applied

Applied fixes:
  - {commit_hash} review-fix: {description} ({agent})
  - {commit_hash} review-fix: {description} ({agent})

Skipped (downgraded to suggestions):
  - {finding.id}: {reason}
```

### Step 6: Post-Fix Test Verification

After all fixes are applied and committed, run the project's test suite to verify no regressions were introduced.

#### Detect and Run Tests

Use the same test detection logic as `/mm:complete` Step 1:

| Check            | Condition          | Command         |
| ---------------- | ------------------ | --------------- |
| `package.json`   | Has `scripts.test` | `npm test`      |
| `Cargo.toml`     | Exists             | `cargo test`    |
| `pyproject.toml` | Exists             | `pytest`        |
| `go.mod`         | Exists             | `go test ./...` |
| `Makefile`       | Has `test` target  | `make test`     |

#### On Test Success

```
Post-fix tests: PASSED
All {count} auto-fix commits verified.
```

Continue to report results.

#### On Test Failure

If tests fail after fixes were applied:

1. **Identify the likely culprit** — the most recent fix commit
2. **Revert the last fix commit:**
   ```bash
   git revert HEAD --no-edit
   ```
3. **Re-run tests** to confirm the revert restores a clean state
4. **If tests pass after revert:**

   ```
   Post-fix tests: FAILED after fix {finding.id}
   Reverted: {commit_hash} review-fix: {description}
   Tests now passing after revert.

   The reverted fix has been downgraded to a suggestion.
   ```

5. **If tests still fail after revert** (pre-existing failure):

   ```
   Post-fix tests: FAILED (pre-existing)
   Tests were already failing before auto-fix. No fixes reverted.

   Run your test suite to investigate.
   ```

   Do NOT revert any more commits — the failure is not caused by the fixes.

#### Skip Condition

If no test command is detected, skip verification:

```
Post-fix tests: SKIPPED (no test command detected)
```

## Error Handling

| Scenario                             | Action                                      |
| ------------------------------------ | ------------------------------------------- |
| File not found                       | Skip, downgrade to suggestion               |
| Line out of range                    | Skip, downgrade to suggestion               |
| Diff doesn't match                   | Skip, downgrade to suggestion               |
| Git commit fails                     | Log warning, continue to next fix           |
| Multiple fixes conflict on same line | Apply first, downgrade second to suggestion |

## Important Constraints

- **Never force-push or rebase** — only create new commits
- **Never modify files outside the project root**
- **Each fix is one commit** — no batching multiple fixes into one commit
- **Preserve working tree state** — unstaged changes unrelated to fixes are not touched
- Commit messages always use the `review-fix:` prefix for easy identification and potential revert
