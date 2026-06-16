# Altitude → Next-Gen: Upgrade & Architecture Plan

> **Status:** **✅ COMPLETE** — all phases P0–P6 landed on `feature/v2` (PR open against `main`). **Owner:** Brad / SouthLeft. **Date:** 2026-06-15 → **Completed:** 2026-06-16.
> **Method:** validated by a 3-AI red-team (Claude + Gemini + Codex), 2 converging rounds.
> **How to use this doc:** every task has an ID (e.g. `T2.2`). The body below is preserved as the **historical specification** the v2 work was executed against. Acceptance criteria stated here have been satisfied unless explicitly carried into a follow-up; see `CHANGELOG.md` `[Unreleased]` for the rollup of what landed and `AGENTS.md` for the current authoring contract.

---

## 0. Goal

Evolve Altitude (do **not** rebuild it) into a **next-generation, AI-friendly, multi-theme, SSR-capable** design system on a **modernized toolchain**, keeping the ~65 existing Lit 3 components and migrating them incrementally and verifiably.

Target end-state:
- **Tokens:** DTCG (`$value`/`$type`) source → Style Dictionary v5 → CSS custom properties + JSON + TS types. Axes: `brand`, `mode` (light/dark), `density`, `contrast`, `motion`.
- **Theming:** scoped `<al-theme brand mode density contrast>` host setting vars on `:host` (not global `:root`); CSS `@layer al.reset, al.base, al.theme, al.component, al.override`. Multiple brands coexist per subtree. Legacy global `<style>` swap removed at the end.
- **Registry:** explicit modes `stable` (default; plain tags `al-button`), `versioned` (suffixed `al-button-1-2-3` for micro-frontends / multi-version), `manual`; factory `registerAltitude({ mode, suffix })`.
- **Headless:** behavior controllers extracted *only* beneath complex components (combobox, menu, dialog, tabs, tooltip, date picker, table, form validation). Atoms stay styled.
- **AI layer:** custom-elements-manifest (CEM) → per-component JSON schemas + `AGENTS.md` + `llms.txt` + contract validator + deterministic generators (MCP server later). Reuses the agent-first contract/validator pattern already proven in the Figma POC.
- **SSR:** Declarative Shadow DOM + Lit SSR; server-render + hydrate.
- **Toolchain:** Vite build, Storybook 10 + Storybook Test (Vitest), ESLint 9 flat, TS latest, Yarn 4 (or pnpm), React 19, published + licensed + semver + changelog.

---

## 1. Guardrails (non-negotiable — enforced by CI)

- **G1 — Evolve, not rebuild.** Keep the ~65 components; replace subsystems beneath them.
- **G2 — Migration state machine.** Every component has a state in `migration.json`: `legacy → dual → scoped-complete`. **No new feature work may land on a `legacy` component** (CI-enforced). `dual` carries an expiry version.
- **G3 — Pilot gate.** Prove every new pattern end-to-end on the **5 pilot components** — `button`, `input`, `combobox` (or `select`), `dialog`, `theme-switcher` — before scaling to all 65.
- **G4 — Codemod-or-rebuild.** If an automated codemod cannot bridge a component, that slice earns a clean rewrite — surfaced in the PR, never silent.
- **G5 — Green gate between phases.** install + typecheck + lint + unit/interaction tests + VRT (within tolerance) + Storybook build all green before the next phase.
- **G6 — Contracts are generated, never hand-written.** Humans author TS types + JSDoc + a handwritten example + rationale; CI compiles those into CEM, schemas, `llms.txt`, `AGENTS.md`. The validator checks **public API + token refs + a11y invariants**, not implementation style.
- **G7 — Never change build tooling and language semantics in the same step** (see decorator decision, §4).
- **G8 — Baselines before changes.** No dependency/build change lands before the legacy-stack baseline (VRT + token snapshot + bundle size) is captured.

---

## 2. Dependency upgrade matrix (aggressive: latest majors)

| Package | Current | Target | Risk | Owning task |
|---|---|---|---|---|
| lit | 3.1.2 | **3.3.3** | low | T2.3 |
| style-dictionary | 3.9.2 | **5.x** (DTCG 2025.10) | **HIGH** — ESM + async config rewrite | T1.1 |
| web-component-analyzer (`wca`) | 2.0.0 | **@custom-elements-manifest/analyzer** | med — tool swap | T3.1 |
| storybook + addons | 7.6.x | **10.4.x** | **HIGH** — multi-major, webpack→Vite builder, Storybook Test/Vitest | T2.4 |
| builder | webpack 5 + babel + tsc | **Vite** (+ tsc for `.d.ts`) | **HIGH** | T2.1, T2.2 |
| react / react-dom | 18.2.0 | **19.x** | **HIGH** — better native CE interop; ref/prop changes | T4.7 (target pinned T0) |
| @lit/react | 1.0.4 | latest (verify R19) | med | T4.7 |
| @types/react(-dom) | 18.x | 19.x | med | T4.7 |
| eslint | 8.56 | **9.x** (flat config) | med | T2.3 |
| @typescript-eslint | 6.20 | 8.x | med | T2.3 |
| typescript | 5.3.3 | latest 5.x | low | T2.3 |
| date-fns | 3.2.0 | **4.x** | med — date components | T2.3 |
| package manager | yarn 1.22.21 (**EOL**) | yarn 4 / pnpm | med — infra | T2.3 |
| sass / sass-loader | 1.70 / 14.x | latest; sass-loader dropped under Vite | low | T2.1 |
| babel stack | 7.23.x | removed for build (keep decorator *semantics* unchanged) | med | T2.2 |
| node | per `.nvmrc` | LTS (22/24) | low | T2.3 |

**Decorator note:** the Babel decorator *plugins* are removed from the **build**, but decorator **semantics stay the same** — `experimentalDecorators: true` + `useDefineForClassFields: false` are preserved (§4). Adopting standard decorators is a separate, later, spike-gated task (T7.1).

---

## 3. Phases & tasks

Each task: **Goal · Changes · Acceptance (objectively verifiable) · Depends on**.

### Phase 0 — Baselines & controls *(legacy stack — change nothing yet)*

- **T0.1 — Legacy baselines.**
  Goal: a safety net to detect every later regression.
  Changes: stand up VRT (Chromatic or Playwright screenshots) + interaction + a11y baselines for the 5 pilot components on the *current* Storybook/webpack stack; snapshot token output (counts, names, values, alias resolution); record bundle-size baseline.
  Acceptance: `baselines/` committed; CI job re-runs baselines and reports diffs; token snapshot has N entries recorded; bundle-size JSON committed.
  Depends on: —

- **T0.2 — Migration manifest + CI gate (the spine).**
  Goal: single source of truth for migration state, read by CI + generators + validator (G2/G6).
  Changes: define `migration.json` schema (see §6); seed all components as `legacy`; add a CI check that fails a PR adding non-migration changes to a `legacy` component.
  Acceptance: `migration.json` validates against its JSON Schema in CI; a deliberately-bad PR (feature change to a `legacy` component) fails CI; a migration-only PR passes.
  Depends on: —

- **T0.3 — Consumer fixture harness.**
  Goal: make consumer apps the *acceptance tests* for later phases.
  Changes: scaffold minimal fixtures — Lit app, React app, MFE/`versioned` app, SSR app (placeholder) — each importing the pilot components.
  Acceptance: all four fixtures build green against the current library; each wired into CI.
  Depends on: —

- **T0.4 — Release & repo hygiene baseline.**
  Goal: fix the publishing/versioning gaps early (cheap, unblocks everything).
  Changes: add `LICENSE`, real `CHANGELOG` via **changesets**, semver policy, `CONTRIBUTING.md`; configure publish (registry or scoped) with a dry-run.
  Acceptance: `changeset` workflow runs in CI; `npm publish --dry-run` succeeds for both libs; license present.
  Depends on: —

- **T0.5 — Pin targets.** Record React 19, SD v5, Storybook 10, Yarn 4 as committed targets so wrapper/codegen work is designed for the end-state (executed later).
  Acceptance: targets documented in this file's matrix; no code change.

**Gate P0:** baselines captured · `migration.json` gate live · fixtures build green · changesets wired.

### Phase 1 — Token engine *(parallel pipeline, low blast radius)*

- **T1.1 — Parallel SD v5 pipeline.**
  Goal: DTCG source + Style Dictionary v5, emitting **byte-comparable** legacy `--al-*` names alongside new DTCG/JSON/TS outputs, running *next to* the v3 pipeline (not replacing it yet).
  Changes: convert tier-1/2/3 tokens to DTCG (`$value`/`$type`), keep Tokens Studio compatibility; rewrite `tokens-config.js` to ESM + async SD v5 (port the custom `tokens`, `scss/variables`, `json/flat` formatters and the box-shadow/typography/space helpers to v5's async API); freeze current public token names as aliases.
  Acceptance: `pnpm build:tokens:v5` emits CSS whose `--al-*` variable set is **byte-identical** to the v3 output (snapshot diff = empty) **plus** DTCG + TS-types artifacts; alias map committed.
  Depends on: T0.1.

- **T1.2 — Token-contract tests.**
  Goal: lock token stability.
  Changes: tests asserting name stability, counts, values, alias resolution, and zero invalid/dangling refs.
  Acceptance: `pnpm test:tokens` passes; mutating a token name without an alias fails the suite.
  Depends on: T1.1.

- **T1.3 — Figma / Tokens-Studio ingestion + round-trip.**
  Goal: define how DTCG JSON enters the repo and stays in sync.
  Changes: document + script the ingest (export → validate → commit), ownership, and round-trip rules.
  Acceptance: `pnpm tokens:ingest` validates an export and writes DTCG files; invalid export is rejected with a clear error.
  Depends on: T1.1.

**Gate P1:** v5 pipeline byte-matches legacy var names · token-contract tests green · ingestion documented.

### Phase 2 — Build & tooling foundation *(pilot-gated; the risky infra swap)*

- **T2.1 — Vite + SCSS spike (one component).**
  Goal: de-risk the highest landmine before committing — Altitude components do `import styles from './x.scss'` + `unsafeCSS(styles.toString())`; Vite handles raw CSS differently (`?inline`).
  Changes: prove, on one component, that SCSS compiles to a constructable stylesheet that lands in the shadow root identically to the P0 baseline; choose the canonical style-import strategy.
  Acceptance: a test asserts the component's shadow root contains the expected CSS rules; VRT of that component matches the P0 baseline within tolerance.
  Depends on: T0.1.

- **T2.2 — Builder migration webpack → Vite (libs).**
  Goal: replace webpack+babel build with Vite; keep `tsc` for `.d.ts`. **Keep `experimentalDecorators: true` + `useDefineForClassFields: false`** — do not touch decorator semantics (G7).
  Changes: Vite lib config for `al-web-components` and `al-react`; remove babel decorator plugin chain from the build only; apply the chosen style strategy across components (codemod if needed).
  Acceptance: `pnpm build` exits 0; an API-extractor/AST diff shows **zero public export removals** vs the P0 dist; `publint` reports 0 errors; pilot stories render.
  Depends on: T2.1.

- **T2.3 — Dependency majors.**
  Goal: aggressive modernization, one PR per major with rollback.
  Changes: Yarn 1→4 (or pnpm) + Node LTS; Lit 3.3.3; TS latest; ESLint 9 flat + ts-eslint 8; date-fns 4; sass latest.
  Acceptance: each upgrade lands as its own green PR (typecheck + lint + build + pilot stories); `pnpm install` clean; lint passes repo-wide under flat config.
  Depends on: T2.2.

- **T2.4 — Storybook 7 → 10 (Vite builder) + test harness.**
  Goal: modern Storybook + fill the missing-tests gap.
  Changes: migrate to Storybook 10 with the Vite builder; port addons (a11y, status); enable Storybook Test (Vitest) for interaction + a11y + visual.
  Acceptance: both Storybooks boot; `pnpm test-storybook` runs in CI; ≥5 components have interaction tests; a11y checks run.
  Depends on: T2.2, T2.3.

**Gate P2:** new stack green on the pilot component · export parity proven · Storybook + tests in CI · VRT within tolerance vs P0.

### Phase 3 — Metadata & AI-contract foundation

- **T3.1 — CEM analyzer.** Replace `wca` with `@custom-elements-manifest/analyzer`; emit CEM from TS + JSDoc.
  Acceptance: `custom-elements.json` has entries for **100%** of manifest-listed components, each with tag, class, module, attrs, props, events, slots, CSS parts, CSS vars; CI fails if coverage < 100%.
  Depends on: T2.2.
- **T3.2 — Component JSON schemas.** Generate per-component schemas (props/attrs/slots/events/CSS parts/CSS vars/states/invalid combos) from CEM + `migration.json`.
  Acceptance: one schema per component; schemas validate the existing Storybook examples.
  Depends on: T3.1.
- **T3.3 — `AGENTS.md` + `llms.txt`.** Usage rules, import paths, theming model, a11y invariants, registry modes; compressed nav for context windows. Model on the Figma-POC contract pattern.
  Acceptance: both committed; `AGENTS.md` links each component to its schema.
  Depends on: T3.2.
- **T3.4 — Contract validator.** Validates generated/example code against schemas + token refs + a11y invariants; runs in CI.
  Acceptance: validator fails on a deliberately-invalid fixture and passes on a valid one.
  Depends on: T3.2.
- **T3.5 — Deterministic generators.** Extend plop to scaffold component + story + docs + tests + token aliases + schema from one spec.
  Acceptance: `pnpm plop component X` yields a component that builds, passes the validator, and has a generated schema.
  Depends on: T3.1, T3.4.

**Gate P3:** CEM 100% · validator green in CI · generator output is schema-valid.

### Phase 4 — Scoped theming (KEYSTONE) + registry + React 19 *(pilot 5 only)*

- **T4.1 — Cascade layers.** Introduce `@layer al.reset, al.base, al.theme, al.component, al.override`.
  Acceptance: lint rule `lint:css-layers` — each component stylesheet has exactly one `@layer al.component`; global theme CSS only in `al.reset|al.base|al.theme`; no selector exceeds `0,3,0` except a documented allowlist.
  Depends on: T2.2.
- **T4.2 — `<al-theme>` scoped host.** `brand mode density contrast` attributes; resolves semantic tokens and sets vars on `:host`.
  Acceptance: a Playwright test renders adjacent `<al-theme brand="a">` and `<al-theme brand="b">` and asserts they compute **distinct** `--al-*` values, **and** `:root` contains **0** injected `--al-*` variables.
  Depends on: T1.1, T4.1.
- **T4.3 — Refactor `ALElement`.** Remove `getGlobalStyles()` regex-stripping; adopt explicit constructable stylesheets; tokens inherit from the nearest `<al-theme>`.
  Acceptance: no regex-strip code path remains (grep = 0); pilot components themed purely via the host.
  Depends on: T4.2.
- **T4.4 — Density / contrast / motion axes.**
  Acceptance: `density="compact"` measurably changes pilot component box metrics in a test; `prefers-reduced-motion` respected.
  Depends on: T1.1, T4.2.
- **T4.5 — Theme-switcher rebuild.** Data-driven brand list (no hardcoded if/else or static per-brand imports); writes to `<al-theme>`, mirrors the legacy global `<style>` during `dual`.
  Acceptance: adding a brand requires **no** component/switcher code edit (config only); switching updates the scoped host.
  Depends on: T4.2.
- **T4.6 — Registry modes.** `stable|versioned|manual` + `registerAltitude({ mode, suffix })`; default `stable`.
  Acceptance: `stable` registers `al-button`; `versioned` registers a suffixed tag; dev-mode emits collision diagnostics; the MFE fixture (T0.3) renders **two** Altitude versions side-by-side in `versioned` mode.
  Depends on: T2.2.
- **T4.7 — React 19 + wrapper upgrade.** Execute the React 18→19 jump and `@lit/react` wrapper update *here* (target pinned in T0.5), now that CEM (T3.1) and the React fixture (T0.3) exist.
  Acceptance: wrapper contract tests pass for boolean attributes, object props, custom events, refs, and form participation; React fixture green on React 19.
  Depends on: T3.1, T0.3.
- **T4.8 — Migrate the 5 pilot components to `scoped-complete`.** Via codemod (dry-run + golden snapshot).
  Acceptance: `npx @al/codemod scoped <component>` output matches a golden snapshot; the 5 components read scoped tokens with legacy fallback; `migration.json` updated to `scoped-complete`; VRT within tolerance.
  Depends on: T4.2, T4.3, T3.5.

**Gate P4 (PILOT GATE):** all 5 pilot components `scoped-complete`, themed via host, React-19-wrapped, contract-valid, VRT-clean, fixtures green. **No scale-out before this passes.**

### Phase 5 — Selective headless + SSR

- **T5.1 — Headless behavior controllers.** Extract reactive controllers for complex components (combobox, menu, dialog, tabs, tooltip, date picker, table, form validation); styled components consume them. Atoms untouched.
  Acceptance: behavior is unit-tested independently of styling; ≥3 complex components refactored; atoms show no diff.
  Depends on: Gate P4.
- **T5.2 — SSR (DSD + Lit SSR).** Add Declarative Shadow DOM + Lit SSR; define a browser/DSD fallback matrix.
  Acceptance: the SSR fixture (T0.3) server-renders + hydrates the pilot components with no FOUC; fallback matrix documented + tested.
  Depends on: T4.3, T4.6.
- **T5.3 — RTL / i18n / form-associated coverage.**
  Acceptance: form components participate via `ElementInternals`; RTL VRT story passes; i18n smoke test passes.
  Depends on: T5.1.

**Gate P5:** SSR fixture hydrates clean · headless behavior tests green · form-associated + RTL covered.

### Phase 6 — Scale-out & release

- **T6.1 — Scale migration.** Apply codemods to the remaining ~60 components to `scoped-complete`; enforce golden snapshots.
  Acceptance: `migration.json` shows **0** components in `legacy` or `dual`; VRT diffs within tolerance.
  Depends on: Gate P4.
- **T6.2 — Remove legacy paths.** Delete the global `:root` swap, the old SD v3 pipeline, and `wca`.
  Acceptance: grep for the legacy injection + v3 config = 0; build green.
  Depends on: T6.1.
- **T6.3 — Enforce gates.** Turn a11y CI gate and bundle-size budgets from "baseline" to "enforced" (per package + registry mode).
  Acceptance: PR exceeding the bundle budget or introducing an a11y violation fails CI.
  Depends on: T6.1.
- **T6.4 — Publish v2.** Changesets + provenance; ship the migration guide; deprecate legacy aliases per the compat budget.
  Acceptance: v2 published; migration guide live; all four consumer fixtures pass against the published packages.
  Depends on: T6.2, T6.3.

**Gate P6:** zero legacy components · v2 published · all fixtures green against published packages.

---

## 4. Key decisions (resolved in the red-team)

- **Decorators — keep experimental now (unanimous).** Migrate the *builder* to Vite while preserving `experimentalDecorators: true` + `useDefineForClassFields: false`. Adopting standard/native decorators is a **separate later task (T7.1)**, gated by a 5-component spike. Rationale: changing build tooling and language semantics together produces un-bisectable failures (G7).
- **React 19 — target early, execute mid (moderator resolution).** Pin React 19 as the target in P0 so wrappers/codegen are designed once for the end-state (Gemini's point), but perform the actual wrapper migration in T4.7 once CEM + the React fixture exist so regressions are measurable (Codex's point).
- **Sequencing — baseline-first, pilot-gated (unanimous).** The original "Phase 0 big-bang" was rejected as a violation of the pilot-gate guardrail.
- **Token migration — parallel byte-comparable pipeline (unanimous).** The v5/DTCG pipeline runs alongside v3 and must emit identical `--al-*` names so `dual`-state components are unaffected; this is what prevents theming split-brain.

### Backlog (post-v2)
- **T7.1 — Standard decorators** (spike-gated). **T7.2 — MCP server** over the token/component graph (only once contracts are stable + used internally). **T7.3 — generated non-React wrappers** (Angular/Vue/Svelte) from CEM.

---

## 5. Residual risks & mitigations

| Risk | Mitigation |
|---|---|
| **Split-brain half-migration** (the #1 risk) | `migration.json` state machine + CI gate (G2) + pilot gate (G3); no scale-out before Gate P4. |
| **Vite SCSS → shadow-DOM parity** breaks across 50+ components | T2.1 spike must prove constructable-stylesheet parity vs the P0 baseline before T2.2. |
| **SD v5 async rewrite** silently changes token output | T1.1 byte-comparability snapshot + T1.2 token-contract tests. |
| **Lit decorator / class-field** behavior shift | Decouple (T7.1 later); lock `tsconfig` flags; runtime tests for reflected attrs, defaults, controllers, events. |
| **React 19 + @lit/react** wrapper regressions | T4.7 wrapper contract tests + React fixture as acceptance. |
| **Token alias drift** during `dual` state | Alias map frozen in T1.1; token-contract tests fail on drift. |
| **SSR/DSD variance** by browser/framework | T5.2 fallback matrix + SSR fixture; no SSR claim without fixture proof. |

---

## 6. `migration.json` schema (sketch)

```jsonc
{
  "$schema": "./migration.schema.json",
  "compatBudget": { "deprecateAliasesBy": "2.0.0" },
  "components": {
    "button":  { "state": "scoped-complete", "react19": true,  "headless": false, "ssr": true  },
    "combobox":{ "state": "dual",            "react19": true,  "headless": true,  "ssr": false, "expiry": "1.9.0" },
    "tabs":    { "state": "legacy",          "react19": false, "headless": false, "ssr": false }
  }
}
```
CI reads this to (a) reject feature work on `legacy` components, (b) drive the generators, (c) scope the contract validator, (d) report migration progress.

---

## 7. Quick-start order

`T0.1 → T0.2 → T0.3 → T0.4` → **Gate P0** → `T1.1 → T1.2 → T1.3` → **Gate P1** → `T2.1 → T2.2 → T2.3 → T2.4` → **Gate P2** → `T3.1 → T3.2 → T3.3 → T3.4 → T3.5` → **Gate P3** → `T4.1 → T4.2 → T4.3 → T4.4 → T4.5 → T4.6 → T4.7 → T4.8` → **Gate P4 (PILOT)** → `T5.1 → T5.2 → T5.3` → **Gate P5** → `T6.1 → T6.2 → T6.3 → T6.4` → **Gate P6**.
