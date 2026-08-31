# Verify Spec — Reflection-Based Verification

Validate a completed spec against its requirements using a **Generate → Critique → Revise** loop (default 1 iteration; `--thorough` for 3).

**Default = the cheap floor (2026-08-03-lean-context-perf-baseline R5).** A default run is a
single diff-anchored reflection pass: one implementation-verifier subagent reading the change +
its blast radius (steps 0–1), plus the deterministic bookkeeping. The adversarial panel (step 1b)
runs ONLY on explicit opt-in (`--adversarial` / `--thorough`) or when the deterministic risk
classifier (step 0.6) escalates. No other path fans out.

## Usage

```
/mm:verify-spec [spec-name] [--fix] [--thorough] [--adversarial] [--max-iterations N] [--strict] [--code-path <path>]
```

- `[spec-name]` — folder name in `.mm/specs/`. If omitted, resolve from session context.
- `--fix` — auto-fix gaps (default: report only).
- `--thorough` — up to 3 revision cycles (default: 1); implies `--adversarial`. Use for release-critical specs.
- `--adversarial` — run the independent adversarial oracle (3-prompt bank) in addition to the verifier. Implied by `--thorough`; otherwise it fires only when the deterministic risk classifier escalates (step 0.6) — including on completion-gate runs, which are no longer force-adversarial. Necessary for HIGH confidence but not sufficient — HIGH also requires the iterative path (`decision: converged` with `consecutive_stable >= 2`), so a single-pass run caps at LOW regardless of nulls (see step 1c.5). A low-risk run skips the oracle to stay cheap; its confidence caps at LOW/MEDIUM, which is acceptable — the gate promotes on the verdict, not the bucket.
- `--max-iterations N` — explicit override of the cycle budget.
- `--strict` — zero PARTIAL allowed.
- `--code-path <path>` — absolute path to the checkout/worktree holding the CODE under verification. Defaults to the project root. Pass when the spec's `.mm/` lives in the main checkout but the implementation lives in a git worktree (the spec-start split project-path model).

**Token budget rationale:** verification usually runs at the END of a spec session, when the main context is at its largest — every extra iteration re-pays that whole context. One critique-and-fix pass catches the bulk of gaps; the multi-iteration loop is reserved for `--thorough`.

---

## Workflow

Dialog script. Deterministic verification phases — run lifecycle, checks, triage, classification, persistence, confidence, convergence, and run-summary — live in `mm_verify({phase: ...})`.

**Run identity is mandatory.** Generate one collision-resistant `verification_run_id` for this invocation (spec slug + UTC timestamp + random suffix). As soon as the spec is resolved, before any other verify phase, call:

```
mm_verify({ phase: "start_run", project_path, verification_run_id,
            workflow: "verify-spec", spec_slug, base_sha: null, head_sha: null })
```

Include `verification_run_id`, `workflow: "verify-spec"`, `spec_slug`, `iteration`, and `agent_role` on every later `mm_verify` call. Once resolved, also include `base_sha` and `head_sha`. These fields attribute result usage to this run; omitting them makes cost unmeasured rather than guessing from a global time window.

### 0. Resolve the spec

If `[spec-name]` was passed, use `.mm/specs/{spec-name}/`. Otherwise read `.mm/session/last-context.md` for the active spec. Call `mm_get({entity: "spec", project_path, spec_folder: <spec-name>})` — on error, list available specs and ask. Extract from `spec.md`: Goal, Requirements, User Stories, Out of Scope, Technical Details. Each becomes a verification target. **Requirements under `## Requirements` (legacy: `## Specific Requirements`) carry a stable id (`R1`, `R2`, …) — key every target to that id and carry it through the scorecard, `summary.json`, and any findings, so the verdict joins to task citations (`(R1)`) by a stable key instead of an ephemeral row number.**

**The id list and the coverage join are parsed, not judged.** Call `mm_verify({phase: "parse_requirements", project_path, spec_folder})` — it extracts the requirement ids/texts (all id formats in circulation, both section headers), reads the canonical task source, and returns `covered_ids` / `uncovered_ids` / `unknown_cited_ids` / `duplicate_ids` / `r0_task_count`. Use ITS id list as the authoritative requirement set (the spec prose is still what you hand the verifier for critique). If it reports `fallback_used: true`, the section has no ids — it assigned `R1…Rn` in document order; note the spec needs id backfill. If it reports `section: null`, error per "No extractable requirements".

**Resolve `code_path`.** `code_path` defaults to `project_path` — the common case where the spec's `.mm/` and its implementation live in the same checkout. When `--code-path <path>` is passed (the split-checkout case: `.mm/` in the main checkout, implementation in a git worktree), validate it BEFORE verifying anything:

- The path must exist.
- `git -C <code_path> rev-parse --path-format=absolute --git-common-dir` must resolve to the same `.git` as `project_path`'s — i.e. `code_path` is a worktree or checkout of the *same repository*, not an unrelated tree. (`--path-format=absolute` is required: without it git answers a relative `.git` from the main checkout but an absolute path from a worktree, so a *valid* worktree fails the string comparison.)

On mismatch or missing path, STOP with: `Cannot verify — --code-path {path} does not exist or is not a worktree of this repository. Verifying the wrong tree is worse than not verifying; pass the correct worktree path or omit --code-path to verify {project_path}.`

Everything else — spec resolution, `mm_get`/`mm_verify` calls, and all verification outputs (`verification/summary.json`, `verification/reflection-verification.md`) — stays on `project_path`. Only code inspection (step 1) moves to `code_path`.

**Resolve the changeset (diff range).** In `code_path`, determine the base/head SHAs that scope this spec's actual work — step 1 anchors evidence to this range. Try in order, stop at the first that cleanly resolves, and never guess:

- **(a) Merge-base with the default branch.** If HEAD is not on the repo's default branch, resolve the default branch robustly — `git symbolic-ref refs/remotes/origin/HEAD`, falling back to `main` then `master` if that's unset — then `base = git merge-base <default> HEAD`, `head = HEAD`.
- **(b) Slug-grep fallback.** Else (HEAD is on the default branch), run `git log --grep "<spec-slug>" --oneline` in `code_path`. Use this range ONLY if the hits form a single, unambiguous, contiguous run of recent commits (no gaps, no unrelated commits interleaved): `base = <oldest hit>^`, `head = HEAD`. If the grep is empty, scattered, or ambiguous, do not guess — fall through to (c).
- **(c) No changeset.** Record `diff: null` (for `summary.json` in step 4) and a one-line reason (e.g. "on default branch, no spec-slug commits found") carried into the report. Proceed with today's reflection-only behavior — step 1's anchoring and reverse-coverage demands do not apply.

Record the resolved `base`/`head` SHAs for step 1 when (a) or (b) resolves; leave them unset on (c).

Call `mm_verify({phase: "prepare_evidence", project_path, spec_folder, code_path, base_sha, head_sha, ...run_identity})`. It returns an immutable `evidence_bundle_id`, changed-file inventory, and changed-line count keyed by the range plus the current spec/checks/plan manifests. Reuse its inventory instead of re-running diff discovery. `reused: true` means an identical prior run already paid that deterministic work; any range or manifest change produces a new id automatically.

### 0.6 Classify risk (deterministic — decides whether step 1b runs)

Skip this step entirely when `--adversarial` or `--thorough` is already set (the answer is
already yes). Otherwise call the classifier — it is a pure function, no LLM:

```
mm_verify({ phase: "classify_risk", touched_paths, total_changed_lines,
            touched_requirement_ids, critical_requirement_ids })
```

- `touched_paths` / `total_changed_lines` — from `prepare_evidence`'s changed-file inventory
  and line count. When step 0 resolved no changeset (case (c)), pass the empty list and 0 —
  there is no diff surface to score; only the post-floor signals below can escalate.
- `touched_requirement_ids` — the requirement ids cited by tasks whose files appear in the
  diff (from `parse_requirements` + the task list); when that join is unclear, pass ALL the
  spec's requirement ids (over-inclusion can only escalate, never hide risk).
- `critical_requirement_ids` — the spec's optional `critical_requirements:` frontmatter list
  (e.g. `[R2, R5]`); empty when absent.

Record `{tier, escalate, reasons}`. If `escalate: true`, step 1b WILL run — announce
`Risk: {tier} — adversarial pass scheduled ({reasons})`.

**Post-floor re-check (R5 auto-escalation).** After step 1's critique lands, if the pre-pass
did not already escalate, call `classify_risk` once more with the same inputs plus:

- `floor_confidence` — `low` when the critique table contains any REGRESSION or ≥2 MISS;
  `medium` when exactly 1 MISS or >1 PARTIAL; `high` otherwise.
- `floor_flagged_high_risk` — `true` when any finding's evidence or `failure_mode` names a
  high-risk surface (auth, RLS/policies, migrations, payments/webhooks, secrets, CI).

`escalate: true` from either call is the ONLY non-flag route into step 1b. Both calls'
outputs are deterministic — same diff, same answer, reproducible run-to-run.

Announce: `Verifying {spec-name} · {count} requirements · iteration 1/{max}`.

### 0.7 Run executable checks before model review

Call `mm_verify({phase: "run_checks", project_path, spec_folder, code_path, ...run_identity})` now, before spawning a verifier. Preserve the results for every later iteration.

- Passed check → authoritative PASS. The verifier need not re-prove it unless reverse coverage or blast-radius review exposes a contradiction.
- Failed check → authoritative MISS and focused review target.
- Skipped check → model review fallback; it stays visibly `skipped` and never silently becomes `none` or pass. `env_skipped_ids` marks skips that were the environment's fault (runner ENOENT/timeout), not the manifest's.
- **`all_skipped_env: true` → the executable-proof layer was unavailable this run.** Announce it immediately (`⚠ checks environment defect: {n}/{n} declared checks could not start`), continue the model review, but the run CANNOT certify (see step 2) — fix the environment (or the check manifest's runner) and re-verify.
- Every declared check must appear in the final summary. If recorded outcomes do not equal the declared count, return `gaps-remain` because evidence was lost.

### 1. CRITIQUE — delegate to the implementation-verifier subagent

**Do not trace requirements in the main session.** Invoke the **implementation-verifier** with the verbatim requirements, deterministic check results, spec folder, `code_path`, resolved diff range, and changed-file list. It is read-only: it does not update tasks, roadmaps, or reports and does not rerun the whole suite. Tell it to skip re-proving check-passed requirements unless reverse coverage or blast-radius evidence contradicts the check.

- **Trace to code.** Use file/function/component names from the spec. Read code, don't just check existence.
- **Score** PASS · PARTIAL · MISS · REGRESSION, with file:line evidence.
- **Anchor evidence to the changeset (only when a range was resolved).** PASS/PARTIAL evidence must cite a file/hunk/commit inside `{base}..{head}`. Code that satisfies the requirement but pre-dates the range is still a legitimate PASS — label it `pass (pre-existing)` so the report distinguishes "this spec built it" from "it was already there." When the range is `none — reflection-only`, skip this — trace and score exactly as before.
- **Scope check.** Flag out-of-scope implementations, over-engineering, missing required edge cases.
- **Reverse coverage (only when a range was resolved).** Map every file changed in `{base}..{head}` to the requirement(s)/task(s) it serves. Any changed file mapping to none is scope drift — list it explicitly, even if the Scope check above didn't flag it. Skip entirely when the range is `none — reflection-only`. **When `.mm/specs/{spec}/plan.md` exists** (format: `.claude/schemas/plan-format.md`), pass it to the subagent and let it short-circuit the mapping mechanically: the post-amendment promised file set (task sections ∪ `## Amendments`) vs the diff's file set is set arithmetic — promised∩changed files inherit their task's requirement mapping; changed-but-never-promised files are scope drift with high confidence (they escaped both planning and the amendment protocol). No plan.md → judgment-based mapping as above; the two features are independently optional.
- **Run targeted tests only where deterministic checks did not already provide evidence.**
- Return the critique table (`# · Requirement · Status · Citation · Evidence · Notes`) as its final message — and, when a range was resolved, the reverse-coverage table (`File · Requirement(s)/Task(s) · Unmapped?`) as a second deliverable. **`Citation`** is the `file:line` or hunk inside `{base}..{head}` that backs a PASS/PARTIAL; a PASS with no citation inside the range is scored `pass (pre-existing)` rather than a bare PASS — the citation is what later lets `evaluate` tell "this spec built it" from "a model asserted it."

Collect the subagent's critique. Carry the table forward as a `scorecard` array (`[{ id, status, citation?, note? }]`, one row per requirement) — this is what step 4 hands to the `evaluate` phase; it is not just report prose. The deterministic pipeline (classify → persist → triage → confidence → summary) runs in **step 1c**, after the optional adversarial pass, so it sees every finding at once (the subagent has no mm tools — the bookkeeping calls stay in the main session).

Under `--fix`, emit each PARTIAL/MISS/REGRESSION as a `ReviewFinding` per `review-output-contract.md` with `confidence` (high if MISS+obvious fix, medium if PARTIAL, low otherwise), `fixable`, and `diff_suggestion` when fixable.

From the subagent's table, build the iteration record: the critique table plus a summary line (`PASS n · PARTIAL n · MISS n · REGRESSION n`), scope violations, and test results.

### 1b. CRITIQUE — adversarial oracle (independent check)

Run this pass when `--adversarial` or `--thorough` is set, OR when step 0.6's
deterministic classifier returned `escalate: true` (pre-pass or post-floor re-check). Skip it
otherwise — the default run, **including the completion gate**, stays a single cheap
diff-anchored verifier pass unless a flag or the classifier says the change warrants the
panel. (Changed 2026-08-03, R5: the gate previously always ran the bank; routing is now
deterministic. Skipping the bank caps confidence at LOW/MEDIUM — accepted: promotion keys on
the verdict, not the bucket.)

The implementation-verifier reads the same spec prose the code's author did, so it is a *correlated* oracle — it tends to agree with the implementation's own blind spots. The adversarial pass adds an oracle that is trying to *break* the code, not confirm it. Launch the **adversarial-verifier** subagent once per prompt in the bank — `violation_test`, `production_input`, `breaking_assumption` — each with the spec folder path. Each returns exactly one of: a single `Finding` (JSON, `id:""`, `tier:null`, `spec_section_ref` set to the `R<n>` it violates when applicable), or its null token (`NO_VIOLATION_FOUND` / `NO_INPUT_FOUND` / `NO_ASSUMPTION_FOUND`) with a one-line justification.

- Tally `adversarial_null_count` (null tokens) and `adversarial_malformed` (unparseable replies).
- Fold any returned findings into the same `Finding[]` as the verifier's, so they classify, persist, and gate identically.
- `adversarial_null_count ≥ 2` on a converged, T1/T2-clean run is the only way confidence reaches HIGH. Low-risk completion gates may skip the bank and remain LOW/MEDIUM by design.
- Carry every prompt's outcome forward as an `adversarial` array — `[{ prompt: violation_test|production_input|breaking_assumption, outcome: "finding"|"null", spec_section_ref?, justification?, finding_id? }]` (evaluate also accepts a raw `null` / the Finding object for `outcome` and normalises them; pass `changed_files` from `prepare_evidence` so citations are checked against the range) — including the null-token rows with their one-line justification. This full array (not just the tally) is what step 4 hands to `evaluate`; a null outcome still needs its justification recorded, not just counted.

### 1c. Deterministic bookkeeping — feed the substrate

Run the deterministic phases over the combined findings from steps 1 and 1b. **Their output is not decorative — step 2 reads it.**

**Reconcile the executable acceptance checks already run in step 0.7.** Checks are the objective, generator-independent signal:

- `passed_ids` → set that `R<n>`'s scorecard status to PASS with evidence `check ✓ {command}`. A passing check **overrides a weaker verifier score** (e.g. verifier said PARTIAL but the check that defines "done" passes → PASS).
- `failed_ids` → set that `R<n>`'s scorecard status to MISS, AND emit a `defect` finding for it in the build below (`spec_section_ref` = the id, `failure_mode` from the check output). A failing check is a hard gate, not a judgment call.
- `skipped_ids` (unknown runner / malformed / runner not installed) and requirements with no check → fall back to the verifier's score for that `R<n>`, and note each skipped check in the report — env-fault skips (`env_skipped_ids`) noted as such. A skipped check NEVER silently passes.

Then, in order:

1. **Build the `Finding[]`.** One canonical finding per MISS/PARTIAL/REGRESSION, per adversarial finding, and **per failed check** (from run_checks above), plus one per spec-gap (behavior the code exhibits that the spec doesn't cover):
   - `kind`: `defect` for a requirement miss/regression/adversarial break; `spec_gap` for uncovered behavior.
   - `spec_section_ref`: the requirement id (`"R3"`) the finding relates to — **required for requirement-tied defects** (the T1 classifier keys spec-contradictions on it; leaving it null silently downgrades a real contradiction to T2/T3).
   - `code_location`: `{file, line_range:[start,end]}` when known, else null.
   - `failure_mode`: one concrete sentence — this string drives T2 (correctness) vs T3 (robustness) classification.
   - `reproduction`: carry it through whenever the critique produced one — the classifier floors any defect with a concrete reproduction at T3, so a reproduced adversarial catch that matches no keyword pattern persists to the backlog instead of dropping to advisory T4.
   - `reproduction` + `evidence` from the critique. Leave `id: ""` and `tier: null`; the classifier fills them.
2. **Classify** — `mm_verify({phase: "classify_findings", findings})` → each finding gets a `tier` (T1–T4) and a `cluster_id`. Keep the tallies `t1_count..t4_count`.
3. **Persist** — `mm_verify({phase: "persist_findings", project_path, spec_folder, findings: <classified>, run_label: "run-<iteration>"})`. Writes T3 defects to `findings-backlog.md` and spec-gaps to `spec-gaps.md`, merging by cluster so human triage edits survive re-runs. T1/T2 don't persist (they block the gate this run); T4 is advisory.
4. **Read triage state** — `mm_verify({phase: "check_triage", project_path, spec_folder})` → `open_backlog_count` and the open entries, for the summary and the completion gate.
5. **Confidence** — `mm_verify({phase: "compute_confidence", runs_completed, consecutive_stable, decision, t1_count, t2_count, t3_count, t4_count, adversarial_null_count, adversarial_malformed})`. `decision` is `continue`/`converged`/`did_not_converge` from the convergence step (a single non-iterative pass is `continue` with `runs_completed: 1` → capped at LOW by design; HIGH needs the iterative + adversarial path).
6. **Write the run summary** — `mm_verify({phase: "write_summary", project_path, spec_folder, runs_completed, decision, consecutive_stable, tier_counts: {t1,t2,t3,t4}, spec_gap_count, adversarial_null_count, adversarial_malformed, confidence: <compute_confidence result>, open_backlog_count, open_spec_gaps_count, ...run_identity})` → `verify-summary.json`. Every count is required (pass `0`, never omit) — `spec_gap_count` is the number of spec-gap findings THIS run built in 1c.1; `open_spec_gaps_count` is what `check_triage` reports as still open.

Carry `t1_count`, `t2_count`, the confidence bucket, and `open_backlog_count` into step 2 — they now participate in the verdict.

### 2. EVALUATE

Standards met when ALL true:

- **Verifier verdict:** zero MISS · zero REGRESSION · tests pass · PARTIAL ≤ 1 (zero under `--strict`).
- **Deterministic tiers:** zero open T1 or T2 findings (`t1_count == 0 && t2_count == 0`) from step 1c. A T1 (spec-contradiction) or T2 (correctness) finding the classifier surfaced blocks the gate **even if the verifier scored that requirement PASS** — the tiered finding wins, because it's the check independent of the grader. (T3 does NOT fail standards — it's record-only, persisted to `findings-backlog.md` for triage at completion. T4 is advisory.)
- **Requirement coverage (the intent join):** every `R<n>` under `## Requirements` both (a) appears in the scorecard with a non-MISS status and (b) is cited by at least one task (`(R<n>)` in a `## Tasks` title). Clause (b) comes straight from step 0's `parse_requirements` output — `uncovered_ids` non-empty fails standards (list those ids); also surface `unknown_cited_ids` (tasks citing ids no requirement defines — typo or stale citation) and `duplicate_ids` in the report. Clause (a) you check against the scorecard. `(R0)` tasks are scaffolding and satisfy no requirement. This is what makes the requirement→task→verdict join *enforceable* rather than conventional — and parsed, so it's identical run-to-run.
- **Executable checks:** every requirement that declares a check in `checks.json` has a *passing* check. (A failing check already surfaced as a gating defect via step 1c, so this is usually redundant with the tier clause — but state it, because a proven requirement is the strongest evidence the gate has. A manifest-fault `skipped` check does not fail standards; it just drops that requirement back to verifier scoring and is surfaced in the report.) Two env-fault exceptions fail standards outright (#676 — the layer exists to be fail-closed): `all_skipped_env: true` (the entire executable-proof layer was unavailable — an environment defect, not a judgment downgrade), and any id in `env_skipped_ids` that is also in `critical_requirement_ids` (a critical requirement's declared proof must run, not be excused by the machine).
- **Critical claims need a check, not a judgment.** Beside `all_skipped_env`: any id in `critical_requirement_ids` whose check is `none` or `skipped` derives `insufficient_evidence` and fails standards, full stop — a critical requirement's proof cannot rest on a verifier judgment alone. This is the `evaluate` phase's own rule (spec 2026-08-27-verify-evaluate-phase R1); it's listed here for context, but the orchestrator does not apply it by hand — it is enforced in step 4 when `evaluate` derives the claims.
- **Confidence:** the bucket from step 1c is not `unstable`. An `unstable` result (adversarial replies malformed, or the loop did not converge) means the verdict itself is unreliable — do not certify on it.

If met → step 4. If `iteration ≥ max_iterations` → step 4 with remaining issues. Otherwise → step 3.

**Unmapped-file rule (only when step 0 resolved a diff range).** Unmapped files from the reverse-coverage table don't fail these standards outright, but they do gate the verdict computed in step 4: they cap it at `verified-with-caveats` (never plain `verified`), and under `--strict` any unmapped file forces `gaps-remain` instead. This is separate from, and doesn't change, the MISS/REGRESSION/test/PARTIAL rule above. When step 0 landed on "no changeset," there's no reverse-coverage table, so this rule doesn't apply — the verdict comes from the rule above alone.

### 3. REVISE (only with `--fix`)

For each MISS/PARTIAL ordered by severity:

- Analyze: what code, which files, new feature vs. edge case vs. wiring.
- Implement minimally; reuse existing patterns. Apply fixes to code under `code_path` — never the main checkout, even if the session's own cwd is the main checkout.
- Quick build + targeted test run after each fix, run in `code_path`.
- Log: `Revision {iter}.{n} · req {text} · gap {what} · fix {what} · files {list}`.

After all fixes, call `mm_verify({phase: "convergence_step", ...})`, increment iteration, return to step 1.

### 4. Final output

**The verdict is `evaluate`'s to compute — the orchestrator does not.** Step 2's rule (verified /
verified-with-caveats / gaps-remain, the unmapped-file cap, the critical-check line) is what
`evaluate` applies in code over the same inputs; this session assembles those inputs and hands them
over, it does not pre-decide the status.

**Decomposition hindsight (when `predicted:` exists in spec.md's frontmatter).** Once step 1's
critique has landed — never after the evaluate call below, and **BEFORE calling `evaluate`**
(`promote` refuses a summary older than spec.md's last edit, so touching spec.md after the summary
is written trips the staleness guard) — write two fields into spec.md's frontmatter: `hindsight:`
(one line — what the prediction got wrong or right, which `preconditions:` semantics bit) and
`cost:` (one line — the retro's token/time totals when available, else the elapsed line). Never
edit `predicted:`.

**Record the hindsight (R5a, spec `2026-08-27-recorded-for-outcome`).** Right after writing
`hindsight:`/`cost:` and still BEFORE calling `evaluate` below, append the hindsight sentence as
a `[finding] for="spec"` recorded line:

```
mm_record({
  phase: "append", project_path, spec_folder,
  lines: [{
    kind: "finding",
    text: "<the hindsight sentence, verbatim>",
    for: "spec",
    outcome: "contradicts" | "supports",  // contradicts when any precondition is broken this run, or the verdict this pass will land on is gaps-remain; supports otherwise
    provenance: {
      session_id: "<MM session id if known, else 'cli'>",
      agent: "<the orchestrating model id>",
      model: "<the orchestrating model id>",
      timestamp: "<ISO now>",
      anchor: "mm-verify://<verification_run_id>",
    },
  }],
})
```

This write is append-only and idempotent-by-convention only — it is the orchestrator's job not
to call it twice in one verification run (one hindsight sentence, one line). Right after it,
rebuild the decisions projection so the board picks up any decision this run just recorded:
`mm_index({ project_path, target: "decisions" })` (spec `2026-08-27-decisions-projection` R2).
`evaluate` (below)
reads `## Recorded` for spec-level findings and per-claim defeaters/decisions; the run file lists
this line under `recorded`.

Step 1c already wrote the deterministic artifacts (`verify-summary.json`, and `findings-backlog.md` / `spec-gaps.md` when there were T3/spec-gap findings). Step 4 calls `evaluate`, which writes the two verdict artifacts, then writes the human-readable report below.

Call:

```
mm_verify({
  phase: "evaluate",
  project_path, spec_folder,
  verification_run_id, base_sha, head_sha, verifier_model,
  scorecard,        // the [{ id, status, citation?, note? }] array from step 1
  checks,            // run_checks output from step 0.7
  findings,          // classified Finding[] from step 1c.2
  adversarial,       // the [{ prompt, outcome, spec_section_ref?, justification? }] array from step 1b, incl. null tokens
  confidence,        // compute_confidence result from step 1c.5
  open_backlog,      // check_triage entries from step 1c.4
  diff,              // the resolved { base, head, files_changed, files_mapped, unmapped } from step 1's reverse coverage, or null
  strict,            // whether --strict was passed
  iterations,        // the iteration count this run reached
  mode: "report-only" | "auto-fix",
  risk_tier, risk_reasons,  // from step 0.6's classify_risk
  now,               // optional — pins "now" for hypothesis/objective derivation (NS-1 use only)
})
```

`evaluate` is pure over these inputs. It writes `verification/runs/<verification_run_id>.json` — the full evidence file, never overwritten (a run id collision is a refusal, not a silent clobber) — and projects `verification/summary.json` from it in the existing schema plus `derived: true`, `run_id`, `verified_by`, `spec_epistemic`, and per-requirement `epistemic`/`citation`/`defeaters`, so `promote`, the Rust reader, and the board stay compatible without change. It returns `{ written, run_path, summary_path, verdict, standards_met, reasons, claims }`. This session does not hand-write `summary.json` — the "exact schema, no extra fields" block that used to live here is `evaluate`'s job now, not the orchestrator's.

Then the human-readable report `.mm/specs/{spec}/verification/reflection-verification.md` — still hand-written prose, reading the verdict back from `evaluate`'s return value:

```markdown
# Reflection Verification: {Spec Title}

**Spec:** `{spec-name}` · **Date:** {date} · **Status:** Verified | Verified-with-caveats | Gaps-remain
**Iterations:** {n} · **Mode:** {report-only | auto-fix}

## Requirements Scorecard (final)

| ID  | Requirement | Status | Epistemic | Evidence |
| --- | ----------- | ------ | --------- | -------- |

(`ID` column = the spec's stable requirement id — `R1`, `R2`, … — not a fresh row index. `Epistemic`
is read back from `evaluate`'s `claims` — `supported` / `partially_supported` / `insufficient_evidence`
/ `contradicted` / `unresolved` — it is derived, not asserted by this report.)

Result: {pass}/{total} verified

## Revision History

### Iteration N — {gaps found / fixes applied}

## Test Results — Total / Passing / Failing

## Remaining Issues

- {requirement} — {why unresolved}

## Scope Check — {none | violations listed}

## Diff Coverage — {omit when step 0 resolved no changeset}

Range: `{base}..{head}` · {mapped}/{total} changed files mapped

- Unmapped: {file} — caveat, capped verdict at verified-with-caveats (or gaps-remain under --strict)
```

Display:

```
Verification: {spec-name}
{pass}/{total} requirements · {status} · iterations {n} · fixes {n}
run: {verification_run_id} · verdict derived
Report: .mm/specs/{spec}/verification/reflection-verification.md
```

If everything passes and spec is 100%, prepend the verification note to the report and confirm all tasks in `spec.md`'s `## Tasks` are `[x]`.

**Verification-gated-done promotion (2026-07-04; enforced in code 2026-08-03):** call

```
mm_verify({ phase: "promote", project_path, spec_folder })
```

**Do NOT edit `status:` or `status_history` by hand.** This step used to be a written instruction —
"set `status: done` and append a `status_history` entry" — which made the most common route into
`done` the one path that bypassed the gate the spec exists to enforce. Prompt discipline is not
enforcement (R9, `2026-08-01-verification-state-machine`).

The tool applies the rule and reports what it did. It refuses, without erroring, when:

- there is no readable `verification/summary.json` — no verdict to promote on;
- the verdict is `gaps-remain` — and it explicitly does **not** demote an existing `status: done`,
  because a later failing run never takes `done` away;
- the verdict is older than the spec's last edit — a passing summary is evidence about the content
  it read, not a permanent credential (R2).

Report its `reason` verbatim in the run output. A refusal is a result, not a failure to work around. `promote` now reads `run_id` off `summary.json` (written by `evaluate` above) and records `run: "<id>"` on the `status_history` line it appends — the promotion is traceable back to the specific run file that certified it.

Finally, always close the run lifecycle, including on `gaps-remain`:

```
mm_verify({ phase: "finish_run", project_path, verification_run_id,
            workflow: "verify-spec", spec_slug, base_sha, head_sha,
            status: <evaluate's verdict, or "gaps-remain" on an aborted/pre-evaluate exit>,
            measurement_complete: false,
            measurement_reason: "primary verifier used child execution; inclusion is not conservation-verified" })
```

Verification currently delegates to a child verifier, so `false` is the safe default and the dashboard labels the figure partial. Set `measurement_complete: true` only on a capture path whose parent/child totals have passed a conservation test (no missing usage and no double count). Never claim completeness by assumption.

---

## Error handling

After `start_run` succeeds, every exit path must call `finish_run`. Use `status: "gaps-remain"` and `measurement_complete: false` with the blocking reason for aborted/build-failed/max-iteration exits.

- **Spec not found** → list specs, ask user.
- **No `spec.md`** → error: "Cannot verify — no spec.md".
- **No extractable requirements** → error: "spec.md has no extractable requirements".
- **Build fails during fix** → stop revising, report what was completed.
- **Max iterations with gaps** → report remaining, suggest manual review.
- **Test suite unavailable** → skip tests step, note in report.

## Integration

Run after `/mm:complete` marks a spec done, before a PR, or any time you suspect requirements were missed. Triggered by `/mm:spec-start` step 5 once all tasks are `[x]`.
