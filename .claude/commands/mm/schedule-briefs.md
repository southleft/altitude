# Schedule Briefs - Set up Daily AM/PM Routines

Scaffold two scheduled routines on Anthropic's RemoteTrigger so `/mm:recap` runs each weekday morning and `/mm:pm` runs each weekday evening, keeping the desktop "Today" panel and the conversational hand-off always fresh — without requiring Claude Code to be open at the time.

## When to use

Run this once per project after the project's `.mm/product/roadmap.md` has been seeded (via `npx tsx scripts/migrate-roadmap.ts` or `/mm:doc-scaffold sow`). The two routines persist server-side; you do not need to re-run this command unless you want to change the times.

## Instructions

You are setting up scheduled briefs. Follow these steps in order.

### Step 1: Verify project state

Check the following files in the **current project root**:

1. `.mm/product/roadmap.md` exists AND parses to at least one `## Phase {N}: {title}` section. If the file is missing or has no Phase headers, **stop and warn the user**:

   ```
   No structured roadmap found.

   Briefs work best when anchored to the Roadmap. Run the migration first:

       npx tsx scripts/migrate-roadmap.ts

   Then populate phases from your SOW deliverables, or run /mm:doc-scaffold sow.

   Continue scheduling without a roadmap? (y/N)
   ```

   If the user declines, abort. If they continue, the briefs will still generate — the `roadmap_position` section will just render empty.

2. `.mm/config.json` exists. If not, the project hasn't been initialized with Monday Morning — abort and instruct the user to install the project from the desktop app.

### Step 2: Confirm times

Default schedule (override only if the user provides explicit times):

- **`/mm:pm`** at **6:00 PM local time, weekdays** (cron: `0 18 * * 1-5`)
- **`/mm:recap`** at **7:00 AM local time, weekdays** (cron: `0 7 * * 1-5`)

Show the user the proposed schedule and ask:

```
Proposed schedule for {project name}:

  /mm:pm  →  weekdays at 6:00 PM  (writes evening-brief-{date}.md)
  /mm:recap  →  weekdays at 7:00 AM  (writes morning-brief-{date}.md)

Both routines inherit your active MCP plugin connections at fire time.
If GitHub / Grain are disabled, those brief sections degrade to "No data".

Schedule these now? (Y/n)
```

If the user declines, abort. If they want different times, ask for both new cron expressions and use those.

### Step 3: Create the two routines

For each routine, invoke the `schedule` skill (`Skill(schedule)`) with arguments equivalent to:

```
create "/mm:pm" --cron "0 18 * * 1-5" --description "Daily PM brief — Monday Morning"
create "/mm:recap" --cron "0 7 * * 1-5"  --description "Daily AM brief — Monday Morning"
```

Pass the absolute project path in the routine's working-directory context so the brief is written into this project's `.mm/session/` folder, not somewhere else.

If the `schedule` skill returns an error for either routine, **report the error verbatim** and ask the user whether to retry or abort. Do not silently swallow scheduling failures.

### Step 4: Write the local marker file

After both routines are created, write a marker file at `.mm/session/scheduled-briefs.json` so the desktop UI can display "Scheduled" status instead of the "Generate brief" CTA. Create the directory if missing.

The marker shape is exact — match it precisely:

```json
{
  "scheduled_at": "{ISO 8601 timestamp of when this command ran}",
  "am_cron": "{the AM cron expression, e.g. \"0 7 * * 1-5\"}",
  "pm_cron": "{the PM cron expression, e.g. \"0 18 * * 1-5\"}",
  "am_label": "{human-readable, e.g. \"weekdays at 7:00 AM\"}",
  "pm_label": "{human-readable, e.g. \"weekdays at 6:00 PM\"}",
  "am_routine_id": "{the routine id returned by Skill(schedule)}",
  "pm_routine_id": "{the routine id returned by Skill(schedule)}"
}
```

If only one routine succeeded, omit the failed side's `*_cron`, `*_label`, and `*_routine_id` keys. Do not write a marker if both routines failed.

### Step 5: Confirm

After both routines are created and the marker is written, output:

```
Briefs scheduled:

  ✓ /mm:pm  →  weekdays at 6:00 PM  (id: {pm-routine-id})
  ✓ /mm:recap  →  weekdays at 7:00 AM  (id: {am-routine-id})

Marker written:  .mm/session/scheduled-briefs.json
The desktop "Today" panel will now show schedule status instead of the Generate-brief CTA.

The next brief will land in .mm/session/ on the next scheduled fire.
Run /schedule list to see all your routines, or /schedule delete {id} to remove one.
```

If only one routine succeeded, output that one and flag the failed one explicitly.

### Step 5: Optional — generate today's brief now

Ask the user:

```
Generate today's morning brief now so the dashboard has content immediately?
```

If yes, dispatch `/mm:recap` directly in the current conversation. This bypasses the schedule and gives the user an immediate Today panel render.

---

## MCP plugin inheritance

Scheduled routines run in Anthropic's hosted environment with **your active MCP plugin connections**. This means:

- If GitHub is enabled in `.mm/config.json` AND your GitHub plugin is authenticated at fire time, the brief includes `open_prs` / `recently_merged_prs`.
- If Grain is enabled AND authenticated, the brief includes `latest_meetings`.
- If a plugin is disabled or unauthenticated at fire time, the corresponding brief section renders as "No data" — exactly the same fallback as a local run.

There is no separate scheduled-environment provisioning. Whatever's enabled for you locally is what the routine sees.

---

## Troubleshooting

- **"schedule skill not available"** — RemoteTrigger requires an active Claude Code subscription. Run `/mm:recap` and `/mm:pm` manually until it's available.
- **Routine fires but no brief file appears** — confirm the routine's working directory is the project root. Check `.mm/session/` for the date-stamped file. The routine writes the file as part of `/mm:recap` Step 4 / `/mm:pm` Step 5.
- **Want different times** — re-run `/mm:schedule-briefs` and provide alternate cron expressions. The new routine replaces the old one (delete the old one first via `/schedule delete {id}`). The marker file is overwritten.
- **Want to disable temporarily** — `/schedule disable {id}` keeps the routine but stops firing it. Re-enable with `/schedule enable {id}`. To clear the desktop "Scheduled" status as well, delete `.mm/session/scheduled-briefs.json`.
- **Desktop UI shows "Scheduled" but routines were deleted manually via `/schedule delete`** — the marker file is stale. Delete `.mm/session/scheduled-briefs.json` to restore the Generate-brief CTA, or re-run `/mm:schedule-briefs` to recreate the routines.

---

## Related Commands

- `/mm:recap` — Manually generate today's morning brief
- `/mm:pm` — Manually generate today's evening brief
- `/schedule` — Built-in schedule skill for managing routines directly
