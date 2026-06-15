# Token pipeline — v3 + v5 parallel (Phase 1)

## Overview

We currently run **two pipelines side-by-side**:

| Pipeline | Source | Builder | Output dir | Purpose |
|---|---|---|---|---|
| v3 (legacy) | `libs/al-web-components/styles/tokens/**.json` (legacy `value`/`type`) | Style Dictionary 3.9.2 (CommonJS, sync) | `libs/al-web-components/styles/dist/` | Powers the shipped library and the legacy global `<style>` injection |
| v5 (new) | `libs/al-web-components/styles/tokens-dtcg/**.json` (DTCG `$value`/`$type`) | Style Dictionary 5.4.4 (ESM, async) | `libs/al-web-components/styles/dist-v5/` | The byte-comparable parallel pipeline that T1.1 builds and gates land on |

The DTCG source is **machine-generated** from the legacy tokens by
`scripts/convert-tokens-to-dtcg.js`. We do not hand-edit `tokens-dtcg/`.
That keeps the legacy tokens as the single editable source until T6.2 deletes
the v3 pipeline; the conversion is reproducible, idempotent, and runs on
every v5 build.

## Commands

```bash
# Workspace-relative (most common):
yarn workspace al-web-components build:tokens            # v3 only
yarn workspace al-web-components build:tokens:v5         # v5 only (regenerates DTCG → emits dist-v5/)
yarn workspace al-web-components build:tokens:parallel   # v3 + v5 + parity gate
yarn workspace al-web-components test:tokens             # contract tests vs .altitude/baselines/tokens/

# Top-level:
node scripts/convert-tokens-to-dtcg.js                   # legacy JSON → DTCG JSON
node scripts/check-tokens-parity.js                      # byte-diff v3 vs v5 (after both build)
node scripts/test-tokens-contract.js                     # name stability + value stability vs baseline
node scripts/ingest-tokens-from-studio.js                # T1.3 — ingest Figma/Tokens-Studio export
```

## Acceptance hit by Phase 1

- **T1.1**: `build:tokens:v5` emits CSS whose `--al-*` set is **byte-identical**
  to v3 (`scripts/check-tokens-parity.js` reports `PASS — 14 files byte-identical`).
- **T1.2**: `test:tokens` enforces name stability, count parity, value parity,
  and zero dangling references against the baseline at
  `.altitude/baselines/tokens/snapshot.json`.
- **T1.3**: `tokens:ingest` validates a Tokens-Studio DTCG export and writes
  it into `tokens-dtcg/ingested/`; invalid exports are rejected with the
  pointing path of the offending node.

## How the v5 pipeline preserves byte-identity

This is non-obvious and worth documenting so a future agent doesn't unwind it
trying to "modernize":

1. **Source format**: DTCG (`$value`/`$type`). The conversion is mechanical;
   tree shape is preserved so `{color.neutral.light.800}` aliases still
   resolve.
2. **Custom transform groups (`css-v3-shape`, `scss-v3-shape`)**: SD v5's
   built-in `css` and `scss` groups inject DTCG shorthand transforms
   (`typography/css/shorthand`, `shadow/css/shorthand`, `fontFamily/css`, etc.)
   that coerce composite tokens to CSS strings *before* our format runs. v3
   had no such transforms, so our custom helpers (`formatTypographyValue`,
   `formatBoxShadowValue`) need the raw value objects. The custom groups
   strip the shorthands.
3. **Format names**: `tokens`, `al-scss-vars`, `al-json-flat`. We renamed
   `scss/variables` → `al-scss-vars` and `json/flat` → `al-json-flat` because
   v5 doesn't allow overriding built-ins of the same name.
4. **Reference helpers**: `dictionary.usesReferences(…)` and
   `dictionary.getReferences(…)` were removed in v5; they live in
   `style-dictionary/utils` now and need `{ usesDtcg: true }` passed
   explicitly.
5. **Build order**: variables.scss and tokens.json are emitted from the
   **dark** theme build (matching v3 behavior, where light → dark with the
   same destination overwrites the disk).

## Roadmap inside Phase 1

- ✅ T1.1 — Parallel pipeline (this commit).
- ✅ T1.2 — Contract tests + baseline gating.
- ✅ T1.3 — Ingest script + this README documents the round-trip.

## Phase 6 follow-up

T6.2 removes the v3 pipeline; at that point:

- `libs/al-web-components/styles/tokens/` is deleted.
- `libs/al-web-components/styles/tokens-config.js` is deleted.
- `tokens-dtcg/` becomes editable (no longer auto-generated).
- `scripts/convert-tokens-to-dtcg.js` is deleted.
- `scripts/check-tokens-parity.js` is deleted.
- `test:tokens` continues to gate against the (then-final) baseline.

That removal is governed by Gate P6's "zero legacy components" + manual sign-off
on the byte-comparability history — don't pre-empt it inside Phase 1.
