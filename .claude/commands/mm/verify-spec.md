# Verify Spec — Reflection-Based Verification

Validate a completed spec against its requirements using a **Generate → Critique → Revise** loop (default 1 iteration; `--thorough` for 3).

## Usage

```
/mm:verify-spec [spec-name] [--fix] [--thorough] [--adversarial] [--max-iterations N] [--strict] [--code-path <path>]
```

- `[spec-name]` — folder name in `.mm/specs/`. If omitted, resolve from session context.
- `--fix` — auto-fix gaps (default: report only).
- `--thorough` — up to 3 revision cycles (default: 1); implies `--adversarial`. Use for release-critical specs.
- `--adversarial` — run the independent adversarial oracle (3-prompt bank) in addition to the verifier. Auto-enabled when verify runs as the completion gate (invoked from `/mm:complete`) and under `--thorough`. Necessary for HIGH confidence but not sufficient — HIGH also requires the iterative path (`decision: converged` with `consecutive_stable >= 2`), so a single-pass run caps at LOW regardless of nulls (see step 1c.5). A bare mid-spec check skips the oracle to stay cheap.
- `--max-iterations N` — explicit override of the cycle budget.
- `--strict` — zero PARTIAL allowed.
- `--code-path <path>` — absolute path to the checkout/worktree holding the CODE under verification. Defaults to the project root. Pass when the spec's `.mm/` lives in the main checkout but the implementation lives in a git worktree (the spec-start split project-path model).

**Token budget rationale:** verification usually runs at the END of a spec session, when the main context is at its largest — every extra iteration re-pays that whole context. One critique-and-fix pass catches the bulk of gaps; the multi-iteration loop is reserved for `--thorough`.

---

## Workflow

Dialog script. Deterministic verification phases — triage, classification, persistence, confidence, convergence, run-summary, and executable acceptance checks — live in `mm_verify({phase: ...})`. The model builds the findings and drives the loop; the phases own all the bookkeeping (tiering, cluster identity, the backlog/spec-gap files, and `verify-summary.json`) so it is reproducible run-to-run. Prose below is what the model decides and reports. `mm_verify`'s phases are pure logic / `.mm`-only reads and path-independent (audited 2026-07-08), so `code_path` is a doc-and-subagent concern only — no `mm_verify` parameter carries it.

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

Announce: `Verifying {spec-name} · {count} requirements · iteration 1/{max}`.

### 1. CRITIQUE — delegate to the implementation-verifier subagent

**Do not trace requirements in the main session.** By this step the main context is the most expensive in the pipeline; a fresh subagent re-reading the spec and diff is both cheaper and a more honest check (it never grades its own work). Invoke the **implementation-verifier** subagent with: the spec's requirements list (verbatim), the spec folder path, `code_path` (from step 0), the resolved diff range (`{base}..{head}`, or `none — reflection-only` when step 0 landed on case (c)), and the list of files touched by spec commits (`git log --oneline` + `git diff --stat`, run in `code_path`). Instruct it to run `git log`/`git diff`, read source files, and run static checks (svelte-check etc.) **in `code_path`, not the session cwd** — the split-checkout case means the session's own cwd may be the unchanged main checkout. For each requirement:

- **Trace to code.** Use file/function/component names from the spec. Read code, don't just check existence.
- **Score** PASS · PARTIAL · MISS · REGRESSION, with file:line evidence.
- **Anchor evidence to the changeset (only when a range was resolved).** PASS/PARTIAL evidence must cite a file/hunk/commit inside `{base}..{head}`. Code that satisfies the requirement but pre-dates the range is still a legitimate PASS — label it `pass (pre-existing)` so the report distinguishes "this spec built it" from "it was already there." When the range is `none — reflection-only`, skip this — trace and score exactly as before.
- **Scope check.** Flag out-of-scope implementations, over-engineering, missing required edge cases.
- **Reverse coverage (only when a range was resolved).** Map every file changed in `{base}..{head}` to the requirement(s)/task(s) it serves. Any changed file mapping to none is scope drift — list it explicitly, even if the Scope check above didn't flag it. Skip entirely when the range is `none — reflection-only`. **When `.mm/specs/{spec}/plan.md` exists** (format: `.claude/schemas/plan-format.md`), pass it to the subagent and let it short-circuit the mapping mechanically: the post-amendment promised file set (task sections ∪ `## Amendments`) vs the diff's file set is set arithmetic — promised∩changed files inherit their task's requirement mapping; changed-but-never-promised files are scope drift with high confidence (they escaped both planning and the amendment protocol). No plan.md → judgment-based mapping as above; the two features are independently optional.
- **Run tests.** Same detection logic as `/mm:complete`.
- Return the critique table (`# · Requirement · Status · Evidence · Notes`) as its final message — and, when a range was resolved, the reverse-coverage table (`File · Requirement(s)/Task(s) · Unmapped?`) as a second deliverable.

Collect the subagent's critique. The deterministic pipeline (classify → persist → triage → confidence → summary) runs in **step 1c**, after the optional adversarial pass, so it sees every finding at once (the subagent has no mm tools — the bookkeeping calls stay in the main session).

Under `--fix`, emit each PARTIAL/MISS/REGRESSION as a `ReviewFinding` per `review-output-contract.md` with `confidence` (high if MISS+obvious fix, medium if PARTIAL, low otherwise), `fixable`, and `diff_suggestion` when fixable.

From the subagent's table, build the iteration record: the critique table plus a summary line (`PASS n · PARTIAL n · MISS n · REGRESSION n`), scope violations, and test results.

### 1b. CRITIQUE — adversarial oracle (independent check)

Run this pass when `--adversarial`, `--thorough`, or `--iterative` is set, OR when `/mm:verify-spec` was invoked as the completion gate (from `/mm:complete`). Skip it otherwise — a mid-spec check stays a single cheap verifier pass.

The implementation-verifier reads the same spec prose the code's author did, so it is a *correlated* oracle — it tends to agree with the implementation's own blind spots. The adversarial pass adds an oracle that is trying to *break* the code, not confirm it. Launch the **adversarial-verifier** subagent once per prompt in the bank — `violation_test`, `production_input`, `breaking_assumption` — each with the spec folder path. Each returns exactly one of: a single `Finding` (JSON, `id:""`, `tier:null`, `spec_section_ref` set to the `R<n>` it violates when applicable), or its null token (`NO_VIOLATION_FOUND` / `NO_INPUT_FOUND` / `NO_ASSUMPTION_FOUND`) with a one-line justification.

- Tally `adversarial_null_count` (null tokens) and `adversarial_malformed` (unparseable replies).
- Fold any returned findings into the same `Finding[]` as the verifier's, so they classify, persist, and gate identically.
- `adversarial_null_count ≥ 2` on a converged, T1/T2-clean run is the ONLY way confidence reaches HIGH — a run with no independent oracle is capped below that by construction. This is why the completion gate always runs the bank.

### 1c. Deterministic bookkeeping — feed the substrate

Run the deterministic phases over the combined findings from steps 1 and 1b. **Their output is not decorative — step 2 reads it.**

**First, run the executable acceptance checks.** `mm_verify({phase: "run_checks", project_path, spec_folder, code_path})` reads `checks.json` (if present; format `.claude/schemas/checks-format.md`) and runs each requirement's test target against `code_path`. Checks are the objective, generator-independent signal — a requirement with a check is proven, not judged — so reconcile them against the step-1 scorecard as authoritative:

- `passed_ids` → set that `R<n>`'s scorecard status to PASS with evidence `check ✓ {command}`. A passing check **overrides a weaker verifier score** (e.g. verifier said PARTIAL but the check that defines "done" passes → PASS).
- `failed_ids` → set that `R<n>`'s scorecard status to MISS, AND emit a `defect` finding for it in the build below (`spec_section_ref` = the id, `failure_mode` from the check output). A failing check is a hard gate, not a judgment call.
- `skipped_ids` (unknown runner / malformed / runner not installed) and requirements with no check → fall back to the verifier's score for that `R<n>`, and note each skipped check in the report. A skipped check NEVER silently passes.

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
6. **Write the run summary** — `mm_verify({phase: "write_summary", project_path, spec_folder, run_timestamp, runs_completed, decision, consecutive_stable, tier_counts, spec_gap_count, adversarial_null_count, adversarial_malformed, confidence, open_backlog_count, open_spec_gaps_count})` → `verify-summary.json`, which the desktop reads for the spec's verify panel.

Carry `t1_count`, `t2_count`, the confidence bucket, and `open_backlog_count` into step 2 — they now participate in the verdict.

### 2. EVALUATE

Standards met when ALL true:

- **Verifier verdict:** zero MISS · zero REGRESSION · tests pass · PARTIAL ≤ 1 (zero under `--strict`).
- **Deterministic tiers:** zero open T1 or T2 findings (`t1_count == 0 && t2_count == 0`) from step 1c. A T1 (spec-contradiction) or T2 (correctness) finding the classifier surfaced blocks the gate **even if the verifier scored that requirement PASS** — the tiered finding wins, because it's the check independent of the grader. (T3 does NOT fail standards — it's record-only, persisted to `findings-backlog.md` for triage at completion. T4 is advisory.)
- **Requirement coverage (the intent join):** every `R<n>` under `## Requirements` both (a) appears in the scorecard with a non-MISS status and (b) is cited by at least one task (`(R<n>)` in a `## Tasks` title). Clause (b) comes straight from step 0's `parse_requirements` output — `uncovered_ids` non-empty fails standards (list those ids); also surface `unknown_cited_ids` (tasks citing ids no requirement defines — typo or stale citation) and `duplicate_ids` in the report. Clause (a) you check against the scorecard. `(R0)` tasks are scaffolding and satisfy no requirement. This is what makes the requirement→task→verdict join *enforceable* rather than conventional — and parsed, so it's identical run-to-run.
- **Executable checks:** every requirement that declares a check in `checks.json` has a *passing* check. (A failing check already surfaced as a gating defect via step 1c, so this is usually redundant with the tier clause — but state it, because a proven requirement is the strongest evidence the gate has. A `skipped` check does not fail standards; it just drops that requirement back to verifier scoring and is surfaced in the report.)
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

Determine `status` per the rule in step 2: `verified` when standards are met and (no diff range was resolved, or the range resolved with zero unmapped files); `verified-with-caveats` when standards are met but the reverse-coverage table has unmapped files (each named as a caveat) — under `--strict` this case is `gaps-remain` instead; `gaps-remain` otherwise.

Step 1c already wrote the deterministic artifacts (`verify-summary.json`, and `findings-backlog.md` / `spec-gaps.md` when there were T3/spec-gap findings). Step 4 writes the two reflection files below.

Write TWO files. First the machine-readable summary the app surfaces in the spec detail view — `.mm/specs/{spec}/verification/summary.json` (exact schema; the app parses this, so no extra fields beyond what's shown below, no comments, no trailing commas):

```json
{
  "status": "verified" | "verified-with-caveats" | "gaps-remain",
  "passed": 0,
  "total": 0,
  "iterations": 1,
  "mode": "report-only" | "auto-fix",
  "verified_at": "<ISO-8601 timestamp>",
  "requirements": [{ "id": "<stable requirement id, e.g. R3>", "requirement": "<short requirement text>", "status": "pass" | "partial" | "miss" | "regression" | "pass-pre-existing", "check": "pass" | "fail" | "skipped" | "none" }],
  "diff": null | {
    "base": "<sha>",
    "head": "<sha>",
    "files_changed": 0,
    "files_mapped": 0,
    "unmapped": ["<path>"]
  }
}
```

`diff` is `null` when step 0 resolved no changeset (case (c)); otherwise it carries the resolved `base`/`head` SHAs and the reverse-coverage tally from step 1. `pass-pre-existing` (the "PASS but pre-dates the changeset" case from step 1) counts as a pass for `passed`/verdict purposes, same as `pass`.

Then the human-readable report `.mm/specs/{spec}/verification/reflection-verification.md`:

```markdown
# Reflection Verification: {Spec Title}

**Spec:** `{spec-name}` · **Date:** {date} · **Status:** Verified | Verified-with-caveats | Gaps-remain
**Iterations:** {n} · **Mode:** {report-only | auto-fix}

## Requirements Scorecard (final)

| ID  | Requirement | Status | Evidence |
| --- | ----------- | ------ | -------- |

(`ID` column = the spec's stable requirement id — `R1`, `R2`, … — not a fresh row index.)

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
Report: .mm/specs/{spec}/verification/reflection-verification.md
```

If everything passes and spec is 100%, prepend the verification note to the report and confirm all tasks in `spec.md`'s `## Tasks` are `[x]`.

**Verification-gated-done promotion (2026-07-04):** if `status` is `verified` or `verified-with-caveats` (caveats count as a pass) and the spec's current `status:` in `spec.md` frontmatter is not already `done`, promote it: set `status: done` and append a `status_history` entry with note `Verified — promoted to done`. This is the ONLY automatic path into `done` — all-tasks-complete alone is `in-review`, never `done`. If `status` is `gaps-remain`, do NOT touch an existing `status: done` (never demote); just leave the summary for the app to surface.

---

## Error handling

- **Spec not found** → list specs, ask user.
- **No `spec.md`** → error: "Cannot verify — no spec.md".
- **No extractable requirements** → error: "spec.md has no extractable requirements".
- **Build fails during fix** → stop revising, report what was completed.
- **Max iterations with gaps** → report remaining, suggest manual review.
- **Test suite unavailable** → skip tests step, note in report.

## Integration

Run after `/mm:complete` marks a spec done, before a PR, or any time you suspect requirements were missed. Triggered by `/mm:spec-start` step 5 once all tasks are `[x]`.
