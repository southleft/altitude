# Recap - Canonical Morning Brief

Welcome back. `/mm:recap` produces a lean, structured morning brief — a prior-session hand-off, a unified top-5 focus list, and your roadmap position — and writes it to disk so the desktop "Today" panel can render it on launch. It renders the existing `mm_daily_brief` MCP tool's JSON; it does not run any supplementary git/gh/shell commands of its own.

## Instructions

You are helping the user re-enter flow fast at the start of their work day. Render, don't editorialize: keep every section tight, one fact per line, no padding.

### Step 1: Fetch the structured brief

Call the MCP tool `mm_daily_brief` with `{ project_path }` set to the absolute path of the project root.

The response shape is:

```ts
{
  success: true,
  brief: {
    roadmap_position: { current_phase, current_milestone, phase_progress_pct, milestone_progress_pct, total_phases, total_milestones },
    active_tasks:        [{ spec_path, spec_name, task_title, feature_priority }],
    blockers:            [{ spec_path, spec_name, task_title, age_days }],
    recently_completed:  [{ spec_path, spec_name, task_title }],
    upcoming:            [{ spec_path, spec_name, task_title, reason }],
    open_issues:         [{ path, title, severity, status, created }],
    recent_commits:      [{ sha, subject, ts }],
    open_prs:            [{ number, title, status, comments_unread, url }],
    recently_merged_prs: [{ number, title, merged_at, url }],
    latest_meetings:     [{ title, summary, date, url? }],
    slack_inbox:         [{ id, author, text, timestamp, permalink, reply_count, has_thread }],
    guidance_markdown?:  string,
    integrations:        { github?: {...}, grain?: {...}, ... }
  }
}
```

**Fixed windows (do not change, label honestly).** The tool bakes its own lookback windows: `recent_commits` is the last 24h, `recently_merged_prs` is merged today, `latest_meetings` is the last 7 days. Render these with their real window labels ("last 24h", "merged today", "last 7d"). Do NOT shell out to `git`, `gh`, or anything else to widen or verify them — render only what the tool returns.

**Degradation contract.** Every list field degrades to `[]` when its source is unavailable (plugin disabled, no git, no roadmap, etc.); `guidance_markdown` is simply absent. A missing/empty field renders as a "No data" line or a skipped section — **never** an error. If `mm_daily_brief` returns `success: false`, note the error inline and continue with whatever local files you can read (Steps 2–4); do not abort.

### Step 2: Prior-session hand-off (gap-aware)

Read `.mm/session/last-pm.txt`; take the date from its **last line**. Load the matching `.mm/session/evening-brief-{date}.md` for the last session's wrap-up.

Render up to **3 bullets** from that evening brief's hand-off, leading each with a fact.

Label the section by comparing that date to today:

- Adjacent (it was the previous calendar day): `## Yesterday ({weekday}, {date})`
- A gap (weekend / vacation): use the real weekday — `## Friday ({date})` — or `## Last session ({date})` when the weekday alone would be ambiguous.

**Fallback chain.** If `last-pm.txt` or the evening brief is missing: pull the most recent entry from `.mm/notes/notes.md` and render it as a single bullet under `## Last session`. If that is also unavailable: `No prior session recorded.`

### Step 3: Today — top-5 focus ranking

Build ONE ranked list of at most 5 items, drawn from across the brief's sources. This is the heart of the brief; the rules below are deterministic — follow them exactly.

**Tier order** (higher tier always outranks lower; "what I was building" outranks pending-on-others):

1. **Blockers** — `brief.blockers[]` (each entry, with `age_days`).
2. **In-progress** — `brief.active_tasks[]` (work already underway).
3. **Action-needed PR reviews** — `brief.open_prs[]` filtered to `status === "CHANGES_REQUESTED"` or `status === "REVIEW_REQUIRED"` ONLY. This is the `reviewDecision` passthrough. Do **NOT** rank any other PR status (`review_pending`, `APPROVED`, etc.), and **NEVER** use `comments_unread` as a signal — it is hardcoded `0` upstream and is meaningless.
4. **Slack needs-reply** — `brief.slack_inbox[]`, prioritizing items where `has_thread === true` or `reply_count > 0` (these are live conversations awaiting you). Items with neither signal rank below those that have it, within this tier.
5. **Upcoming** — `brief.upcoming[]` (queued next work).

**De-dup.** One underlying item appears once. If the same work surfaces in two sources (e.g. an `active_tasks` entry that is also a `blocker`, or a PR that maps to a task), keep only the higher-tier occurrence and drop the lower one. Match on `spec_path` / PR `number` / Slack `id` where available, otherwise on title.

**Tie-break within a tier.** Order by `feature_priority` (high > med/medium > low; missing priority sorts last), then by age (older first — `age_days` for blockers, `timestamp` for Slack, otherwise original list order).

**Render.** Fill the list top-down across tiers until you have 5 items or run out of candidates — render **as many as exist, up to 5**, no padding. **One sentence each**: lead with the item, add a single clause of why it matters or what state it's in. Tag each with its tier in lightweight prose where useful (e.g. "blocked 3d", "in progress", "needs review", "Slack").

If there are **zero** candidates across all five tiers, render exactly one line:

```
No active focus — pick from backlog.
```

### Step 4: Roadmap line

Render a single line from `brief.roadmap_position`:

```
Roadmap: Phase {N}/{total_phases} {current_phase.title} · Milestone {current_milestone.id} {milestone_progress_pct}%, updated {mtime}
```

where `{N}` is the current phase number. For `{mtime}`, use the **filesystem modification time** (date + time) of `.mm/product/roadmap.md` — stat the file. Do **NOT** use the frontmatter `last_updated` field; it goes stale and is not trustworthy. If `roadmap_position` is empty/unavailable, render `Roadmap: No data`.

### Step 5: Slack

If `brief.slack_inbox[]` is non-empty, render a `## Slack` section: one line per item — `{author}: {text}` (trimmed), flagging `↩ {reply_count}` when `reply_count > 0` and `🧵` when `has_thread`. **Skip the header entirely when the array is empty** — no empty section.

### Step 6: Heads up

If `brief.guidance_markdown` is present, render a `## Heads up` section containing that markdown **exactly as-is**. It is already brief-formatted upstream (`for_brief: true`) — do not reshape, summarize, re-rank, or re-query it. Skip the section entirely when the field is absent.

### Step 6b: Audit-loop status (one line, local files only)

Surface the spec-start observe→audit loop so nobody has to remember it exists. Read two
local sources (either may be absent — degrade silently, never error):

1. `.mm/reviews/spec-start-runs/*.md` — count retros **newer than** the newest
   `.mm/reviews/audit-spec-start-*.md` report (all retros if no report exists), and how
   many of those have a Deviations section that isn't "None".
2. The newest `.mm/reviews/audit-spec-start-*.md` — its `human_ack:` line.

Render exactly one line, appended to `## Heads up` (create the section if step 6 skipped it):

- Deviation-bearing retros waiting → `Audit loop: {M} of {N} retros since last audit have deviations — run /mm:audit-command spec-start`
- Retros waiting, all clean → `Audit loop: {N} clean runs since last audit — nothing to judge`
- Additionally, if the newest report still says `human_ack: pending` → append ` · last audit report awaits your ack ({path})`
- No retro directory and no reports → skip the line entirely (project isn't using the loop).

Status read only — never invoke the audit from here (the loop's no-recursion rule).

### Step 6c: Run-metrics status (one line, best-effort)

Same purpose as 6b: surface the spec-start run journal so nobody has to remember it exists.
Run the MM MCP server's `runs` CLI against `project_path` — in this repo:
`node mcp-servers/monday-morning/dist/src/index.js runs <project_path> --json`; in an installed
project, the bundled `monday-morning` sidecar binary with the same `runs <project_path> --json`
args. **Best-effort: if the CLI is absent or errors, skip the line entirely** — never fail a
brief over its own instrumentation.

Render exactly one line, appended to `## Heads up`, choosing the first that applies:

- `sentinels.leaked` non-empty → `Run metrics: {n} leaked sentinel(s) — {names}` (this is the
  bug class the journal exists to catch; lead with it)
- `runs_with_no_gates` non-empty → `Run metrics: {n} run(s) logged no gates — the runtime was bypassed`
- `totals.runs` is 0 → `Run metrics: no instrumented runs yet · {provenance.retros_recalled} retro(s) written from recall`
- otherwise → `Run metrics: {totals.runs} runs · gates {gate_compliance_rate as %} · {provenance.retros_recalled}/{provenance.retros} retros recalled`

Read-only. Never write, never re-run a spec from here.

### Step 7: Assemble + persist

Assemble the brief in this section order:

1. `# Morning Brief — {YYYY-MM-DD}` (system local date; append ` ({weekday})` when not Monday)
2. Prior-session hand-off (Step 2)
3. `## Today` (Step 3 ranked list)
4. Roadmap line (Step 4)
5. `## Slack` (Step 5, only when present)
6. `## Heads up` (Step 6, only when present)
7. A single `Start with: {item}` line — the one item from the Today list you'd begin with (typically the smallest scope-clearing item that unblocks the rest). One line, no paragraph.

Write the rendered markdown to `.mm/session/morning-brief-{YYYY-MM-DD}.md` (system local date), creating `.mm/session/` if it does not exist. This is the exact file the desktop "Today" panel reads on launch — keep the filename and format. Without it, the panel falls back to a "Generate brief" CTA.

**Rotation (automatic, do not touch).** `mm_daily_brief` owns rotation: every call deletes any `.mm/session/{morning,evening}-brief-*.md` older than 30 days as fire-and-forget cleanup. The permanent record stays in `.mm/notes/`. Do NOT add a rotation step here and do NOT delete any briefs yourself.

### Step 8: Display + close

Output the rendered brief to the conversation as well. Then close with a short prompt — pick one, keep it to a line or two:

- Proceed with the "Start with" item?
- Or work on something specific?
- Need more context on any task, PR, or Slack thread?

Do **not** emit a verbose "Recommended path" paragraph or a worked example. The `Start with:` line is the only recommendation.

---

## NON-RENDERED reference — Troubleshooting

> This block is operator/debugging reference for humans and scheduled-routine triage. It MUST NEVER appear in the written `morning-brief-{date}.md` or be echoed into the brief output. Do not render it.

- **Brief renders with empty sections** — verify `mm_daily_brief` is callable and integrations are enabled in `.mm/config.json`. The MCP tool returns `success: false` with an explicit error when the project lacks a `.mm/` directory.
- **No `roadmap_position`** — ensure `.mm/product/roadmap.md` exists and has at least one `## Phase N: …` header. If the file uses the legacy `1. [ ] item` flat-list format, the parser returns 0 phases; run `npx tsx scripts/migrate-roadmap.ts` to seed the structured scaffold (the script backs up the old content to `.mm/product/archive/` first).
- **No `recent_commits`** — the loader requires a `.git` directory at the project root and runs `git log --since="24 hours ago"` author-scoped to `git config user.email`. If commits exist but don't appear, check that `git config user.email` matches the author of the commits.
- **`open_prs` / `recently_merged_prs` are empty even though the GitHub plugin is enabled** — the loader shells out to `gh pr list`. Verify `gh` is installed and authenticated (`gh auth status`). The brief silently degrades on any `gh` failure.
- **PR shows but never ranks in "Today"** — only `CHANGES_REQUESTED` and `REVIEW_REQUIRED` review decisions rank. A PR with `review_pending` / `APPROVED` is intentionally excluded; `comments_unread` is hardcoded `0` and is never used.
- **`latest_meetings` is empty even though the Grain plugin is enabled** — the loader reads from `.grain/notes/` (locally imported notes), not the live Grain API. Run `/mm:import-meeting-notes` to refresh, or check whether the project has any imported notes from the last 7 days.
- **`slack_inbox` empty even though Slack is enabled** — the loader reads the Slack plugin's `inbox.json` and returns only "new" items; degrades silently to `[]` on any error.
- **Stale brief in the desktop "Today" panel** — the dashboard reads `.mm/session/morning-brief-{date}.md` for today first, then falls back to yesterday's `evening-brief-{date}.md`. If today's brief wasn't generated, the panel shows the "Generate brief" CTA. Click it (or run `/mm:recap` manually) to refresh.
- **"Last session" summary is missing** — recap looks at `.mm/session/last-pm.txt` for the most recent PM date. If `/mm:pm` was never run, the summary falls back to the latest `.mm/notes/notes.md` entry, then "No prior session recorded." Run `/mm:pm` once to seed the pointer.
- **Old brief files accumulating** — `mm_daily_brief` rotates anything older than 30 days at the start of every call. If they're not getting cleaned up, confirm the brief is actually firing (check the modification time of any recent `.mm/session/*.md` file). Manual cleanup: `find .mm/session -name 'morning-brief-*.md' -o -name 'evening-brief-*.md' -mtime +30 -delete`.
- **Scheduled routine fires but the file doesn't appear in the right project** — the routine's working directory must be set to the project root. Re-create via `/mm:schedule-briefs` (which sets the path correctly) or check `/schedule list` to inspect the existing routine config.
