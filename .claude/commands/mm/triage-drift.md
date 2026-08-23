# Triage Drift — Classify Stale/Drifted Context Docs

Triage the docs flagged in the Context Console's **Staleness & Drift** section. For
each drifted doc, decide what should happen to it — and propose, never apply. The
human confirms and applies from the UI.

A doc is "drifted" when it mentions a source file whose last commit is newer than the
doc itself (a git + text heuristic — `detect_context_drift`). Because the match is by
path/basename, **false positives are common**: a session log that merely name-drops
`route.ts` is not really describing it. Resolving those is the main job here.

## Usage

```
/mm:triage-drift
```

Launched by the Staleness & Drift UI (per-row "Triage" or "Triage all drift"). The UI
writes the candidates to `.mm/session/drift-triage-input.json` first, then runs this
command in the project's orchestrator terminal. Run from the project root.

## Contract (do not deviate — the UI parses your output file)

**Input** — read `.mm/session/drift-triage-input.json`. It is a JSON array of:

```json
{ "doc_path": "<absolute>", "doc_changed_days": 12, "code_changed_days": 0,
  "drifted_files": ["src/app/api/.../route.ts", "..."] }
```

If the file is missing or empty, write an empty report (entries: []) and stop.

**Output** — write `.mm/session/drift-triage.json` (overwrite) with exactly:

```json
{
  "generated_at": "<ISO-8601 UTC, e.g. 2026-06-25T18:30:00Z>",
  "project_path": "<absolute project root>",
  "entries": [
    { "doc_path": "<absolute, echoed from input>",
      "disposition": "update | exclude | archive | keep",
      "rationale": "<one line: why>",
      "confidence": 0.0,
      "registered": true }
  ]
}
```

You **mutate nothing else**. Do not edit, delete, exclude, or archive any doc. Do not
run git write commands. Your only write is this one report file.

## Dispositions

Classify each doc into exactly one:

- **update** — an evergreen doc (architecture, workflow, design, runbook) that
  *genuinely describes* the changed code and has fallen behind it. Needs a human
  rewrite. You only flag it.
- **exclude** — a doc still worth keeping but that you can't fix now, or that the
  agent should simply stop trusting. Universally safe (works for any `.md`).
- **archive** — an ephemeral or superseded doc safe to soft-delete: one-shot session
  logs (`response-*.md`), notes obsoleted by the code, or a clear false-positive that
  has no lasting value. **Only propose `archive` when the doc is registered in
  `.mm/docs/docs.md`** — otherwise the UI can't archive it; use `exclude` instead.
- **keep** — false drift / no real staleness. The doc doesn't actually describe the
  changed code (basename coincidence), or it's already current. Clears the flag.

## Workflow

1. Read `.mm/session/drift-triage-input.json`. If absent/empty → write an empty report
   and stop.
2. Read `.mm/docs/docs.md` once and note which doc paths are registered there (used for
   the `registered` flag and to gate `archive`).
3. For each candidate:
   a. Read the doc.
   b. Read (or skim) the `drifted_files` it supposedly describes.
   c. Decide whether the doc **genuinely describes** that code, or merely name-drops it
      (false positive). Session logs / `response-*.md` are almost always false positives.
   d. Pick the disposition per the rules above. Set `registered` from step 2; if the doc
      is not registered, never choose `archive` (fall back to `exclude` or `keep`).
   e. Write a one-line `rationale` and a `confidence` in 0..1.
4. Write `.mm/session/drift-triage.json` with all entries (one per input candidate, in
   input order). Stamp `generated_at` (current UTC) and `project_path`.
5. Print a short human-readable summary table: doc name · disposition · confidence ·
   rationale, then a per-disposition count line. End by telling the user to return to
   the Staleness & Drift panel and confirm the proposals.

## Notes

- `update` is flag-only this round — do not draft or apply doc edits.
- Prefer `keep` when unsure whether a match is real; the cost of wrongly excluding live
  context is higher than leaving a flag up.
- Keep `rationale` terse (≤ ~12 words). The UI renders it inline next to each row.
