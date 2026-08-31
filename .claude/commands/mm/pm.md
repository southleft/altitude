# PM - End of Day Summary

Review today's work and create a summary note for the day.

## Instructions

You are helping the user wrap up their work day and create a summary of what was accomplished.

### Step 1: Review Today's Progress

Read `.mm/tasks/tasks.md` and identify:

- Tasks that were marked as completed today (check for today's date)
- Tasks that are currently in progress
- What's next in the backlog

### Step 2: Check for Issues

Read `.mm/issues/issues.md` and note:

- Any critical issues that need attention
- Issues that were resolved today
- Any new issues added today

### Step 3a: Collect Numbers

Before generating the narrative summary, gather concrete counts for the "Today in numbers" section. Run each of these in parallel and capture the raw results. **If a command fails or returns nothing, omit that bullet — never emit a placeholder or error.**

Data sources:

- **Commits today** — `git log --since=midnight --author="$(git config user.email)" --oneline | wc -l`
- **Commit diff stats** — `git log --since=midnight --author="$(git config user.email)" --shortstat` → total files changed, insertions, deletions
- **PRs opened today** — `gh pr list --author @me --search "created:>=$(date +%Y-%m-%d)" --json number,title`
- **PRs merged today** — `gh pr list --author @me --state merged --search "merged:>=$(date +%Y-%m-%d)" --json number,title`
- **Comments addressed on active PRs** — `gh api repos/{owner}/{repo}/pulls/{pr}/comments --jq 'length'` for each open PR you touched today
- **Tasks completed today** — count `- [x]` lines added to `.mm/tasks/tasks.md` (and spec `implementation.md` files) with today's date
- **Issues resolved today** — count entries moved to `## Resolved` in `.mm/issues/issues.md` today
- **Test results** — if the most recent test run is discoverable (CI output, terminal scrollback, `.mm/session/`), capture the passing/total ratio (e.g. `189/189 tests passing`)

### Step 3: Generate Summary

Create a summary that includes (in this exact order):

1. **Today in numbers** — 4–8 bullet points of concrete measurements from the day's work. Draw from Step 3a. Rules:
   - Each bullet is a single concrete count, ratio, or fact
   - Integers preferred; percentages/ratios OK (`189/189 tests passing`)
   - **No adjectives, no qualitative statements, no narration** — only counts and raw facts
   - This is the scannable headline; the narrative sections below are for context
2. **Today's Accomplishments** — What tasks were completed
3. **Current Status** — Overall project progress (e.g., "7/43 tasks complete, 16%")
4. **Milestones** — Any major milestones reached (e.g., "Phase A Complete!")
5. **Tomorrow's Plan** — What's next in the backlog (top 3–5 items)
6. **Notes** — Any important context or decisions made today

**Canonical example output:**

```markdown
# PM — April 14, 2026

## Today in numbers

- 2 PRs opened (#979, #980)
- 5 commits on #979, 1 commit on #980
- 10 Copilot comments addressed
- 5,480 lines removed across 23 files
- 189/189 tests passing

## Today's Accomplishments

...narrative continues...
```

### Step 4: Create Note

Use the `/mm:note` command to create a note with:

- **Title**: "PM - [Current Date]"
- **Category**: "Development"
- **Content**: The summary you generated above

**Ordering is required:** `## Today in numbers` MUST appear directly after the title `# PM — {Date}` and before any narrative section (`## Today's Accomplishments`, `## Current Status`, etc.). The numbers section is the first thing a reader sees.

Include references to tasks.md and any relevant specs.

### Step 5: Persist evening brief to `.mm/session/`

In addition to the dated note, write the same summary content to:

```
.mm/session/evening-brief-{YYYY-MM-DD}.md
```

(Create the directory if missing.) This is the file `/mm:am` reads the next morning to render the "Yesterday" section, and the desktop dashboard reads it as a fallback when no morning brief exists yet.

Then append today's date as a new line to:

```
.mm/session/last-pm.txt
```

If the file already exists, append; do not overwrite. `/mm:am` reads the last line in O(1) to find the most recent PM note without globbing.

### Step 6: Confirm

Let the user know:

- The note path (`.mm/notes/pm-{date}.md`) — the long-term record
- The session brief path (`.mm/session/evening-brief-{date}.md`) — the file the dashboard / `/mm:am` reads tomorrow
- The pointer file was updated (`.mm/session/last-pm.txt`)

---

## Recommended schedule

Run this on a `schedule` routine each weekday at 6:00 PM local time so the morning experience always has fresh context. The routine inherits your active MCP plugin connections — if GitHub or Grain are not enabled at fire time, those numbers degrade to "No data" the same as a local run.

To set up:

```
/schedule create "/mm:pm" --cron "0 18 * * 1-5"
```

---

**Note**: This command should be run at the end of each work day to maintain a daily log of progress.
