# `checks.json` — executable acceptance checks

`checks.json` lives at the root of a spec folder (`.mm/specs/<slug>/checks.json`)
and maps requirement ids (`R<n>`) to an **executable check** that proves the
requirement. It is how a requirement's verdict status becomes _proven_ (a test
runner reported pass/fail) instead of _judged_ (an LLM read the prose).

It is **optional and partial**: author a check only for requirements a test can
prove. Requirements with no check fall back to the verifier's normal scoring —
qualitative requirements ("the empty state reads clearly") legitimately have none.

## Format

```json
{
  "spec": "2026-07-17-example-slug",
  "generated": "2026-07-17T12:00:00Z",
  "checks": {
    "R1": {
      "kind": "test",
      "runner": "vitest",
      "target": "verify-persist-findings",
      "cwd": "mcp-servers/monday-morning",
      "description": "Persist→triage round trip"
    },
    "R3": { "kind": "test", "runner": "cargo", "target": "classifier::" }
  }
}
```

- **`checks`** — object keyed by the exact requirement id from `## Requirements`, or by `H<n>` / `OBJ` (see "Hypotheses and objective" below). Any other key shape is rejected per-check (that entry is skipped, the manifest's other entries still run).
- **`kind`** — `"test"` (the only kind today).
- **`runner`** — one of `npm | vitest | cargo | pytest | go`. Determines the argv:
  - `npm` → `npm test -- <target>` · `vitest` → `npx vitest run <target>`
  - `cargo` → `cargo test <target>` · `pytest` → `pytest -k <target>`
  - `go` → `go test -run <target> ./...`
- **`target`** — the filter/pattern (a test name, file, or `-k` expression). Must
  not start with `-` and must contain no control characters. It is passed as a
  **discrete argv element** — never through a shell — so shell metacharacters are
  inert. This is the security boundary: a check is a filter into the project's
  own test runner, never an arbitrary command (specs are shareable via the cloud
  lane, so a check must not be able to run arbitrary code on a teammate's machine).
- **`cwd`** — optional subdirectory (relative to the code checkout) to run in, for
  monorepos. Must be relative, no `..`.
- **`description`** — optional human note for the report.

## How it's consumed

`/mm:verify-spec` calls `mm_verify({phase: "run_checks", project_path, spec_folder, code_path})`:

- A **passing** check is authoritative PASS evidence for its `R<n>` — it overrides
  a weaker verifier score.
- A **failing** check becomes a `defect` finding with `spec_section_ref` set to the
  id, which flows through the normal classify → tier → gate machinery (a failed
  correctness check → T2 → blocks the verdict).
- A check that **can't run** (unknown runner, malformed target, runner not
  installed) is _skipped_ — that requirement falls back to verifier scoring and the
  skip is surfaced in the report. A skipped check never silently passes.

## Hypotheses and objective

A spec's optional `hypotheses:` / `objective:` frontmatter (spec
`2026-08-27-verify-evaluate-phase` R4) can also be proven executably: key a
check `H<n>` (matching a `hypotheses[].id`) or `OBJ` (the spec's single
`objective`) with the same `kind`/`runner`/`target`/`cwd` contract as an
`R<n>` check. `run_checks` accepts these keys the same way it accepts `R<n>`
— they land in `passed_ids` / `failed_ids` / `skipped_ids` with no special
casing — and `evaluate` reads the pass/fail to derive that hypothesis's or
the objective's epistemic status alongside the requirement claims.

## Authoring

`tasks-list-creator` writes `checks.json` in the same exploration pass that
produces the task list and `plan.md`: it already writes the per-task tests, so it
knows the target that proves each requirement. Author a check whenever a
requirement is provable by a specific test; leave qualitative requirements out.
