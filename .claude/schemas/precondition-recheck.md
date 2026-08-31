# Precondition Recheck Protocol

Version: 1.0

## Purpose

A spec's `preconditions:` (frontmatter, alongside `predicted:`) are beliefs about the codebase
with a grep-checkable `check:` attached to each — not predictions. The frozen `predicted:` block
(retires/tasks/risk/spawns/confidence) is written once at spec-write time and never touched
again; `preconditions:` is the live half and is re-run at every trigger below. Time between a
spec being written and a spec being started (or between an upstream spec completing and a
downstream one starting) is exactly the window where a `holds` precondition can silently rot
into `broken` — this protocol is what catches that instead of letting the stale belief carry
into implementation.

## Procedure

1. Re-run every `check:` command in `spec.md`'s frontmatter `preconditions:` list.
2. For each item, set `status` to one of `holds | broken | unknown | moot` from the result, and
   set `verified` to today's date.
3. Append one entry to `status_history`:

   ```yaml
   status_history:
     - {
         status: <current overall status>,
         at: '<ISO-8601 timestamp>',
         note: 'decomp-eval recheck <trigger>: k/n hold, misses: <ids or none>'
       }
   ```

   `k/n` = preconditions currently `holds` over total preconditions. `misses` lists the ids (or
   claim text if items are unlabeled) of any `broken` items, or `none`. `<trigger>` is one of:
   - `at spec-start` — the spec itself is about to be started.
   - `(upstream <slug> completed)` — a spec this one `depends_on` just completed.

## Never proceed silently past a broken precondition

A `broken` result means a belief the spec's requirements were built on no longer matches the
codebase — proceeding without surfacing it risks implementing against a fiction. Two surfaces:

- **Interactive:** ask once — show the broken claim and its `check:`, let the human decide
  whether to replan, adjust scope, or proceed anyway.
- **`--auto` / headless:** never block — log the broken precondition and record it in the run's
  retro Deviations section, then proceed.

Either way, the broken precondition must be visible somewhere a human will see it (the ask, or
the retro/summary) — it must never simply vanish into an updated `status:` field with nothing
surfacing the flip.

## Record it (R5c, spec `2026-08-27-recorded-for-outcome`)

Both surfaces append to `## Recorded` — this is in addition to (never instead of) the
`status_history` entry above and the ask/retro visibility rule.

**Anchor.** Use `mm-run://<run_id>/<seq>` of the journal `gate` event that logged this recheck
(spec-start step 2a mints `run_id` on its first `mm_run({phase:"log", ...})` call; `seq` is that
call's return value — reuse the same pair for both lines below). When no journal exists (a bare
`/mm:verify-spec` invocation with no spec-start run behind it), fall back to
`mm-verify://<verification_run_id>`.

**The moment an item flips to `broken`** (step 2, before the ask/log step below runs), append:

```
mm_record({
  phase: "append", project_path, spec_folder,
  lines: [{
    kind: "finding",
    text: "<the broken claim's text> — check: <its check: command>",
    for: "spec",
    outcome: "contradicts",
    provenance: { session_id, agent, model, timestamp: "<ISO now>", anchor: "mm-run://<run_id>/<seq>" | "mm-verify://<verification_run_id>" },
  }],
})
```

**Interactive:** after the human answers, append the decision:

```
mm_record({
  phase: "append", project_path, spec_folder,
  lines: [{
    kind: "decision",
    text: "<the human's stated reasoning> — by <actor>",
    for: "spec",
    outcome: "replanned" | "proceeded",  // replanned when they chose to adjust scope/replan, proceeded when they chose to proceed anyway
    provenance: { session_id, agent, model, timestamp: "<ISO now>", anchor: "<same anchor as the finding above>" },
  }],
})
```

**`--auto` / headless:** the decision is always `proceeded`, `actor` is `"auto"`, and the retro's
Deviations entry for this recheck should reference the same anchor so the two are cross-legible:

```
mm_record({
  phase: "append", project_path, spec_folder,
  lines: [{
    kind: "decision",
    text: "auto-proceeded past broken precondition — no human in the loop",
    for: "spec",
    outcome: "proceeded",
    provenance: { session_id, agent, model, timestamp: "<ISO now>", anchor: "<same anchor as the finding above>" },
  }],
})
```

A failed `mm_record` call here is logged and never blocks the recheck itself — recording is
additive evidence, not a gate.

## Callers

- **`/mm:spec-start`** — step 2, "Decomposition recheck" — runs this protocol against the spec
  being started, trigger `at spec-start`.
- **`/mm:complete`** — the downstream precondition recheck step after the spec-complete cascade
  — runs this protocol against every spec in `dependents_to_recheck`, trigger
  `(upstream <completed-slug> completed)`.

Both callers reference this file rather than restating the procedure — it lives once.
