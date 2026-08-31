---
name: project_phase1_token_pipeline
description: Token pipeline shape (single Style Dictionary v5 pipeline post-T6.2) and the non-obvious workarounds
metadata:
  type: project
---

**Superseded 2026-07-28.** Phase 1 stood up a *parallel* SD v3 + v5 pipeline
(commit 6fce213). T6.2 deleted the v3 config, and the `verify-token-gate-strategy`
spec retired the leftover parity gate. There is now exactly **one** token
pipeline. Brand tokens land in one config, not two. Decision record:
`.mm/notes/token-gate-strategy-v3-vestigial-07-28-2026.md`.

Key files: `libs/al-web-components/styles/tokens-config.v5.mjs` (the sole
config; its `themes`/`brands` arrays decide what is emitted);
`scripts/convert-tokens-to-dtcg.js` (legacy → DTCG converter, runs on every
build); `scripts/copy-tokens-to-legacy-dist.js` (mirrors `dist-v5/` → `dist/`,
wiping first); `scripts/test-tokens-contract.js` (name / file / count / value /
dangling-ref checks vs `.altitude/baselines/tokens/snapshot.json` — **4534
occurrences / 989 names** across 15 files as of 2026-07-28);
`scripts/capture-token-baseline.js`; `scripts/ingest-tokens-from-studio.js`;
`.altitude/TOKENS.md` (docs, incl. the rebaselining procedure).

Gone: `styles/tokens-config.js` (T6.2), `scripts/check-tokens-parity.js` and
`build:tokens:parallel` (2026-07-28). `build:tokens:v5` survives only as an
alias of `build:tokens`.

Non-obvious workarounds: (1) Custom transform groups `css-v3-shape`/
`scss-v3-shape` strip v5's DTCG shorthand transforms
(`typography/css/shorthand`, `shadow/css/shorthand`) that would otherwise
coerce composite tokens before the custom format runs. (2) Formats renamed
`scss/variables` → `al-scss-vars`, `json/flat` → `al-json-flat` to dodge v5
built-in collisions. (3) `variables.scss` + `tokens.json` are emitted from the
dark-theme build only. (4) `usesReferences`/`getReferences` come from
`style-dictionary/utils` and need `{ usesDtcg: true }`. (5) The git-tracked
`styles/core/variables.scss` is `@use`d by `main.scss` but is NOT a build
output — the contract test's SOURCE SYNC check guards it. (6) The contract
test's VALUES check is keyed by `<file>::<name>`; name-keying re-elects the
alphabetically-first brand as the owner of every `--al-theme-*` value and
reports phantom drift. Keep it file-keyed.

How to apply: the authoritative signal is
`pnpm --filter al-web-components build:tokens` followed by `test:tokens`, plus
the CI `baselines-tokens` sha256 job (`.github/workflows/v2-checks.yml:161-189`).
Do NOT propose reviving a v3 pipeline or hand-editing `tokens-dtcg/` (gitignored,
generated). Any token/brand/theme addition requires rebaselining
`snapshot.json` in the same PR — see `.altitude/TOKENS.md` § "Rebaselining
after a token change". Related: [[project_altitude_v2_plan]].
