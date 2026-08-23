# Session Retro (Monday Morning)

Reflect on the current working session and capture the things that would otherwise evaporate
when the session ends — bugs, footguns, workarounds, bottlenecks, design smells, and assumptions
made under ambiguity — as durable Monday Morning entities, each stamped with **when and during
what** it was discovered.

This is **user-invoked** (run it at the end of a session or after finishing a spec/milestone).
It does not run automatically. It always **proposes** before it files.

## When to run

- After completing a spec, task, or a meaningful chunk of work.
- At the end of a session, before context is lost.
- The user types `/mm:retro` (optionally `/mm:retro <spec-folder>` to pin the context spec).

## Step 1 — Establish context

1. Date: run `date '+%Y-%m-%d'` → `{DATE}`. Do NOT guess.
2. Active spec: if the user passed a spec folder, use it. Otherwise infer the spec this session
   worked on (from the conversation, the `<monday-morning-context>` hook, or `mm_get` status). If
   genuinely ambiguous, ask: "Which spec should I tag these findings against (or 'none')?"
3. `{PROJECT_PATH}` = the project root (the dir containing `.mm/`; `git rev-parse --show-toplevel`
   if unsure).

## Step 2 — Scan the session for findings

Review THIS session's actual work and extract genuine findings. A finding qualifies only if a
future reader would want to know it. Look specifically for:

- **Bugs / correctness footguns** — wrong-by-default helpers, latent multi-X hazards, anything you
  worked *around* rather than through.
- **Workarounds** — "I had to `--no-verify` / force / skip / patch because …". The workaround is a
  signal that something underneath is wrong.
- **Bottlenecks / friction** — slow gates, redundant steps, broken tooling, repeated manual setup.
- **Design smells / reuse gaps** — "claimed reusable but wasn't", missing API verbs, half-built
  surfaces, duplication.
- **Assumptions / decisions made under ambiguity** — choices made unattended that a human should
  ratify, or that constrain later work.

**Do NOT file:** normal implementation choices, work you completed cleanly, restating the spec, or
trivia. Over-filing destroys the signal — when unsure, leave it out or fold it into a related item.

## Step 3 — Classify each finding

Route by type (don't dump everything into Issues):

| Type | Entity | Tool |
| --- | --- | --- |
| Bug, correctness footgun, workflow friction | **Issue** (severity-rated) | `mm_create_issue` / `/mm:issue` |
| Improvement, design smell, tech debt | **Issue** titled `[Improvement] …` (low) OR **Idea** | `mm_create_issue` / `/mm:idea` |
| Assumption, decision, "why" worth preserving | **Note** | `/mm:note` template |

Assign issue **severity**: `critical` (data loss / security), `high` (wrong results / real risk),
`medium` (UX gap / friction with a workaround), `low` (improvement / nicety).

## Step 4 — Dedup against what already exists

Before proposing, list current entities and skip near-duplicates:

- `mm_list` (entity=issue) and scan `.mm/notes/notes.md`.
- If a finding already exists, do NOT re-file — note it as "already tracked: <title>" and, if this
  session adds detail, suggest appending rather than creating.

## Step 5 — Propose, then confirm (REQUIRED)

Present the deduped findings as a table and STOP for approval. Never file without confirmation.

```
Session retro — {SPEC or "no spec"} @ {DATE}

Proposed:
  1. [Issue/high]  {title}                         (path:line)
  2. [Issue/med]   {title}                          (path:line)
  3. [Idea/low]    {title}
  4. [Note]        {title}
Already tracked (skipping): {titles}

File these? (all / pick numbers / edit / none)
```

Let the user drop, edit titles/severity, or reclassify before anything is written.

## Step 6 — File the approved items with a provenance flag

Every filed entity carries the same flag so the user always knows where it came from.

**Issue / Idea — put the flag at the top of the description body:**

```
**Discovered during:** {SPEC-FOLDER} — session retro, {DATE}
**Type:** {Correctness footgun | Bug | Workflow friction | Improvement | Design smell}
**Location:** {path:line}

{What it is, why it matters, and the recommended fix.}
```

**Note — also add provenance frontmatter (queryable), then the body:**

```markdown
---
title: { Title }
category: { Decision | Development }
created: { YYYY-MM-DD HH:MM }
updated: { YYYY-MM-DD HH:MM }
discovered_during: { SPEC-FOLDER }
discovered_at: { DATE }
source: session-retro
---
```

(Follow `/mm:note` for the rest of the note flow + index update; `/mm:issue` / `/mm:idea` for those.)

When no spec applies, use `discovered_during: (no spec)` so the flag is still present.

## Step 7 — Confirm

```
Retro filed — {SPEC or "no spec"} @ {DATE}

Issues:  {n}   ({titles})
Ideas:   {n}
Notes:   {n}
Skipped (already tracked): {n}

View in Monday Morning > Issues / Ideas / Notes
```

## Notes for the runner

- Quality over volume: a 3-item retro the user trusts beats a 15-item dump they ignore.
- Prefer concrete `path:line` evidence over vague observations — cite what you actually saw this
  session.
- This command only reads the session + `.mm/`; it never edits source code.
