---
name: project_phase1_token_pipeline
description: Phase 1 (T1.1/T1.2/T1.3) parallel SD v3+v5 token pipeline shape and the non-obvious workarounds
metadata:
  type: project
---

Phase 1 of Altitude v2 stands up a parallel Style Dictionary v5 pipeline next to the legacy v3 pipeline. Landed in commit 6fce213 on `feature/v2`.

Key files: `libs/al-web-components/styles/tokens-config.v5.mjs` (v5 entry); `scripts/convert-tokens-to-dtcg.js` (legacy → DTCG converter); `scripts/check-tokens-parity.js` (byte-diff gate, 14 files); `scripts/test-tokens-contract.js` (name/value/count/dangling-ref check vs `.altitude/baselines/tokens/snapshot.json`, currently 4196 occurrences / 651 names); `scripts/ingest-tokens-from-studio.js` (T1.3); `.altitude/TOKENS.md` (docs).

Non-obvious workarounds: (1) v5 is installed as `style-dictionary`, v3 is npm-aliased as `style-dictionary-3` so both coexist. (2) Custom transform groups `css-v3-shape`/`scss-v3-shape` strip v5's DTCG shorthand transforms (`typography/css/shorthand`, `shadow/css/shorthand`) that would otherwise coerce composite tokens before the custom format runs. (3) Formats renamed `scss/variables` → `al-scss-vars`, `json/flat` → `al-json-flat` to dodge v5 built-in collisions. (4) `variables.scss` + `tokens.json` are emitted from the dark-theme build only (matches v3's light→dark overwrite order). (5) `usesReferences`/`getReferences` come from `style-dictionary/utils` and need `{ usesDtcg: true }`. (6) SD v5 engines field demands Node 22; runtime works on Node 20 with `--ignore-engines` install.

Why: v5/DTCG must run alongside v3 and emit byte-comparable `--al-*` names so `dual`-state components aren't disturbed (the "no theming split-brain" rule in §4 of the plan). Source flips to DTCG editable only at T6.2.

How to apply: When asked about Phase 1 status, the parity + contract gates are the authoritative signal — run `yarn workspace al-web-components build:tokens:parallel` and `test:tokens`. Do NOT propose collapsing v3 (T1.1 mandates parallel) or hand-editing `tokens-dtcg/` (it's gitignored, generated). Related: [[project_altitude_v2_plan]].
