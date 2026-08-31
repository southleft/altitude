# Audit Command

Audit a Monday Morning command doc against tool reality, its own prior fixes, and a live run — then close findings as a spec.

## Usage

```
/mm:audit-command <command-name> [--static-only]
```

- `<command-name>` — the doc to audit, e.g. `spec-start` → `.claude/commands/mm/spec-start.md`
- `--static-only` — skip the live run (gate 2 auto-records SKIPPED with your stated reason; use only when a live run is impossible this session)

> Born from the two spec-start audits (2026-06-30, 2026-07-05). Both proved the same
> lesson: static review finds prose drift; **only a live run finds the bugs that bite**
> (skipped verify gate; `git commit -- $PATHS -m` being invalid syntax; `check-ignore`
> lying in hybrid repos). This command bakes that standard in.

---

## The artifact IS the audit

Everything below is gated on one file, created at the START of the run:

```
.mm/reviews/audit-{command}-{YYYY-MM-DD}.md
```

Every gate writes its verdict + evidence into that file as you go — not at the end from
memory. **If the report file does not exist with a per-gate verdict table when you finish,
the audit did not happen — go back and produce it.** A gate row without cited evidence is
automatically FAIL, never PASS: you cannot assert a check you cannot show.

### When to run

Read `.mm/reviews/spec-start-runs/` first (see gate 1). If every retro since the last audit
report is clean (no deviations), **skip the audit** — write nothing but a one-line deferral
note ("N clean runs since {date}, audit deferred") appended to the prior report or reported
to the user, and stop. Observation is free; judgment is conditional — only pull the full
audit when the retro pile (or a stale/empty pile) says there's something to judge.

This command produces a report and, on findings, a spec — and stops there. It never invokes
`/mm:spec-start` or any command it audits; running the fix is a separate, human-started cycle.

Automation observes and proposes; a person certifies that the command actually improved —
the loop's positive terminal is human verification, not another automated pass.

Report skeleton (write this first, fill as you go):

```markdown
# Command Audit: {command} — {date}

human_ack: pending
<!-- a human closes this cycle by flipping this to `human_ack: {name} {date}` — by
     editing this file or telling the session. Un-acked reports cannot be cited for
     trend claims (see gate 1 and gate 6). -->

| Gate | Verdict | Evidence |
| ---- | ------- | -------- |
| 1. Deferred items    | PASS/FAIL | {prior report path + prior ack status + items carried} |
| 2. Live run          | PASS/FAIL/SKIPPED | {run target, errors observed, or retro pile cited} |
| 3. Prior-fix regression | PASS/FAIL | {each prior fix re-tested, path:line} |
| 4. Drift sweep       | PASS/FAIL | {refs checked vs reality} |
| 5. Evidence rule     | PASS/FAIL | {any findings dropped for lack of evidence} |
| 6. Closure           | PASS/FAIL | {spec slug or "no findings"; rework rate + trend} |
| 7. Fidelity sample   | PASS/FAIL | {trace: req → task → commit → verify row} |

## Findings
## Deferred to next audit
```

## Gates (run in order)

### 1. Deferred items first

FIRST, check the prior audit report's `human_ack`. If it's still `pending`, the prior
cycle's findings were never human-reviewed — record that as finding #1 before anything
else in this audit.

Read the PREVIOUS audit artifacts before anything else: prior
`.mm/reviews/audit-{command}-*.md` reports and the most recent related spec's
`verification/reflection-verification.md` "Remaining Issues" section. Every deferred or
caveated item becomes the first entries on this audit's checklist. (This is how the
sentinel-PID fix survived from audit #1 to audit #2 — deferrals live in artifacts, not
memory.)

Also read `.mm/reviews/spec-start-runs/` — every retro newer than the last audit report for
this command. Their **Deviations** sections join the deferred items as checklist seeds for
this run.

### 2. Live run (the load-bearing gate)

A retro pile (from gate 1) containing **at least one deviation** IS the live-run evidence —
N real production runs beat one synthetic run. Cite the retro(s) and their deviations in the
evidence column and move on; only stage a fresh live run when the pile is empty or clean
but stale (no runs since the last audit, or old enough to doubt current behavior).

When you do stage a live run, execute the command for real against a real target. If it
mutates git or shared state, run it in an isolated worktree. Rules:

- **Every mid-run error, workaround, or improvisation is a finding by default.** You must
  argue a finding *out* (with evidence), never in. If you had to deviate from the doc's
  literal instructions to make the run succeed, the doc is wrong — record it.
- Record the exact failure text (exit codes, git errors, tool errors) in the report at
  the moment it happens, not reconstructed later.
- `--static-only` runs record SKIPPED + reason; a SKIPPED gate 2 caps the audit verdict
  at **advisory** — findings ship, but the audit does not count as this cycle's full audit.

### 3. Prior-fix regression

Re-test each fix shipped by previous audits of this command, by observation during gate
2's run (or targeted probes): did the behavior the fix guarantees actually hold this run?
A silently regressed prior fix outranks any new finding — report it first.

### 4. Drift sweep (prose vs. tool reality)

For every reference the doc makes, verify the referent exists TODAY, citing where:

- MCP tools it calls → exist in `mcp-servers/monday-morning/src/tools/` (both dead
  references so far came from deleted subsystems the doc outlived)
- Config keys it reads → written/read by current code
- Flags, file paths, other commands, and cross-command semantics it relies on (e.g.
  done-status rules) → match those docs/code as of this run
- Embedded shell snippets → actually run them (`bash -n` at minimum; execute probes where
  safe). Both `git commit -- $PATHS -m` and the `check-ignore` probe parsed fine and
  failed only when executed.
- Source doc vs bundled mirror (`desktop/monday-morning/src-tauri/resources/commands/`)
  → byte-identical

### 5. Evidence rule

Sweep the Findings section: every finding cites `path:line` (or a reproduced
command + output). Delete any that don't and say so in the gate row — an evidence-free
finding is noise that erodes trust in the ones that matter.

### 6. Closure

Findings don't end in the report — they end in work:

1. Confirmed findings → a new spec (`.mm/specs/{date}-{command}-audit-{n}/`) with
   literate `## Tasks`, per the entity reference. One spec per audit, one task per finding.
2. Anything consciously not fixed → listed under **Deferred to next audit** in the report
   (gate 1's input next time). Nothing silently dropped.
3. If the audit produced zero findings, say so in the report — a clean audit is a result,
   not a skipped one.
4. **Rework rate.** For specs verified-done in the audited period, compute how many were
   reworked within 14 days: follow-up commits touching the spec's primary committed paths
   (`git log --since=... -- {paths}`, excluding the spec's own commits), `.mm/issues/`
   files referencing the spec slug, or a later spec that re-does its ground. Record the
   rate and its trend vs the prior report in this gate's evidence — but only assert a
   trend (better/worse than last time) if that prior report's `human_ack` is set; an
   un-acked prior report has no certified baseline to trend against. This rate is the
   effectiveness scoreboard for the verification gate itself: it answers whether
   "verified done" stays done.

### 7. Fidelity sample

Pick ONE requirement from ONE spec implemented in the audited period — bias toward specs
whose retro (gate 1) had deviations — and trace it end-to-end: `source:` intent → spec
requirement → task → commit diff → verification scorecard row. Any broken or unfalsifiable
link is a finding: a requirement with no testable claim ("improve UX"), a task with no
commit, a verification row with no evidence. One trace per audit, never a census — this
gate samples, it doesn't sweep.

## Completion card

Always end with (never stop silently):

```
Command Audit Complete: {command}
Gates: {n}/7 PASS{, m SKIPPED}
Findings: {count} ({fixed-in-run} fixed live, {speced} → spec {slug}, {deferred} deferred)
Report: .mm/reviews/audit-{command}-{date}.md
```

---

## Related

- `/mm:spec-start` — implement the spec this audit produces
- `/mm:verify-spec` — the graded gate that closes the loop on the fix spec
