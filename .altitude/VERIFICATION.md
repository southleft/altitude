# Verification — evidence bundles and derived verdicts

`scripts/component-check.mjs` has two modes beyond the checklist gate.
`--evidence` gathers readings; `--verdict` derives a conclusion from them.
Nothing in between asserts a result.

## An evidence bundle

`node scripts/component-check.mjs al-button --evidence` writes
`.altitude/verification/al-button/<run-id>.json`. Run ids sort chronologically.
**A run file is never overwritten** — a collision is a refusal (exit 3). The directory is gitignored: a bundle is a per-machine
reading, not a tracked artifact.

Each bundle carries a `source` fingerprint (every `.ts`/`.scss` under the
component directory, by SHA-256 and mtime) plus one row per claim — each also with `detail` and `fix`:

| field | holds |
|---|---|
| `claim` | the key (`bundle`, `cem`, `a11y`, `built`, `figma-parity`, …) |
| `severity` | `blocker` or `warning` |
| `requires` | `offline`, `build`, `measurement`, `figma` |
| `status` | `pass`, `fail`, `unobserved` |
| `citation` | `{ command, reads }` — the command run, and the repo-relative file:line it read |
| `evidence` | the measured value (`violations 0, clean true`) |

## `unobserved` is not a pass

A check that could not run produced no evidence either way. Calling it a pass
lies; dropping it is worse, because the bundle then looks complete. It is the
repo's existing word for this (`scripts/ai-readiness/lib/grader.mjs`) and never
counts toward `pass`.

Staleness resolves by what the artifact is. A **derived** artifact older than
its source is wrong, so it `fail`s — a stale CEM or `dist/` module misinforms.
An **observation** older than its subject describes something else, so it is
`unobserved` — an axe run or Figma receipt from before the change is not
evidence about the component as it stands.

## The verdict is computed

`... --verdict` reads the newest bundle and applies one pure rule:

| condition | verdict | exit |
|---|---|---|
| any blocker `fail` | `gaps-remain` | 1 |
| else any blocker `unobserved` | `insufficient-evidence` | 1 |
| else any warning `fail`/`unobserved` (`--strict`: `gaps-remain`) | `verified-with-caveats` | 0 |
| else | `verified` | 0 |

It prints every input row and the reasons — never a bare pass/fail.

**It refuses** (exit 3, no verdict) when there is no bundle, when the sources
now hash differently than recorded, or when a source file was modified after
the bundle was written. A verdict is evidence about the content it read, not a
credential. Re-run `--evidence`.

Tested by `scripts/__tests__/component-evidence.test.mjs`.
