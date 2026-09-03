# Workflows — where to start

One page, routing only. Find your task below, follow the commands in order,
and open the linked doc for the depth a table row can't carry. Every gate
named here is a real `pnpm run` script — verify against `package.json` if a
name looks stale, since this doc drifts the moment a script is renamed.

**`.mm/` project tracking (specs, tasks, notes) is out of scope of this map.**
This is about the code and its build/test/publish pipeline, not how work is
planned. See `CLAUDE.md` / `.claude/CLAUDE.md` for that.

## Two first-class entry points before you touch anything

- **The `altitude` MCP server** (`libs/altitude-mcp/`, 8 tools —
  `server.registerTool` in `libs/altitude-mcp/src/server.mjs`). Registered
  stdio in `.mcp.json` for any agent session; also runs streamable-HTTP on
  **:6017** when you `pnpm --filter @southleft/al-web-components start`
  (`POST /mcp`, `GET /parity.json`, `GET /healthz`) — that command runs the MCP
  server alone (`start:mcp`) since Storybook was retired 2026-08-25; it no
  longer starts a Storybook alongside it. Use it instead of grepping for
  component/token facts: `altitude_list_components`, `altitude_get_tokens`,
  `altitude_get_component`, `altitude_validate`, `altitude_search_icons`,
  `altitude_check_parity`, `altitude_list_ds_projects`.
- **Skills** (`.claude/skills/`) — `altitude-figma-sync/SKILL.md` (read before
  any Figma write — ~10 hard-won traps) and `standards.md` (repo coding
  conventions). Read the skill before improvising a Figma workflow by hand.

---

## Add or change a base component (`@southleft/al-web-components`)

| Step | Command |
|---|---|
| Scaffold | `pnpm --filter @southleft/al-web-components plop` |
| Build the library | `pnpm --filter @southleft/al-web-components build` |
| Regenerate the CEM (part of the library build above — no separate step) | — |
| Unit tests | `pnpm run test:unit` (browser-mode Vitest; run `pnpm run build` first if testing the React wrapper, since it resolves the library through `dist/`) |
| Accessibility (story fixture) | `pnpm run a11y:report:fixture` — builds the story fixture then runs axe against it (`libs/al-web-components/story-fixture`; Storybook was retired 2026-08-25) |
| Visual regression | `pnpm run build:fixtures && pnpm test:vrt` — needs `libs/al-web-components/story-fixture/dist/index.json` built first (`build:story-fixture`, part of `build:fixtures`); Playwright serves the fixture itself on `:5178` via `webServer` (see `playwright.config.ts`). **9 of 67 baselines are text-heavy and rasterise differently on Windows vs. the Linux CI runner** (alert, banner, breadcrumbs, heading, pagination, tab-panel, tabs, testimonial, text-block) — a Windows run reporting those 9 as failing is the platform difference, not a regression; CI is authoritative (see `tests/components.vrt.spec.ts` header) |
| Lint | `pnpm run lint`, `pnpm run lint:styles` |
| Docs coverage | `pnpm run gate:docs`, `pnpm run gate:guidance` (after `pnpm --filter al-app-docs build`) |
| Migration ledger | Add the component to `.altitude/migration.json` — **all-or-nothing per PR**: if you emit any component file you must emit the whole `migration.json` entry too |

Gates that will catch you in CI (`.github/workflows/v2-checks.yml`):
`check:jsdoc` (after `build:custom-elements.json`), `check:exports`, `lint`,
`gate:coverage` (after `test:unit:coverage`), `check:sl-scope`, `test:brands`,
`gate:token-usage`, `check:audit`, `gate:self-test`, `test:vrt`,
`test:scoped-theming`, `check:migration-gate`, `check:publishable`, plus a
build/build:fixtures/build:all matrix.

Depth: AGENTS.md § "New component" deliverable checklist (~:221) is the full
per-file table (`bundle.ts`, story format, migration.json, focus-ring
convention, etc.) — this row is the command sequence, that section is the
"did I forget a file" list. See also "Arrangement vs. semantics" in AGENTS.md
before adding any new `orientation`/`gap`/`*-group` prop — `<al-layout>` owns
arrangement.

`node scripts/component-check.mjs <al-tag>` (or `--all`) is a single
mechanical pass over this same checklist — landing alongside this doc as part
of the same spec that added it; not yet aliased in `package.json` as of this
writing, run it directly with `node`.

---

## Change tokens (base tier-1 / tier-2)

| Step | Command |
|---|---|
| Edit | `libs/al-web-components/styles/tokens-dtcg/**.json` — the only token source (tracked, hand-authored DTCG). Give every new token an `$extensions["org.altitude.token"].cssType`, or it gets no `cssProperties` allow-list |
| Build | `pnpm --filter @southleft/al-web-components build:tokens` |
| Contract test | `pnpm --filter @southleft/al-web-components test:tokens` (or `node scripts/test-tokens-contract.js`) |
| Rebaseline (only if the change is intentional) | `node scripts/capture-token-baseline.js` |
| Usage gate | `pnpm run gate:token-usage` — fails on a **phantom** token (read via `var()`, never emitted); dead tokens (emitted, unread) are a report only |

Depth: `.altitude/TOKENS.md` (pipeline stages, DTCG conformance, rebaselining
procedure, the frozen `core/variables.scss`).

## Change brand tokens (tier-2 `brand/<brand>/`)

| Step | Command |
|---|---|
| Edit | `libs/al-web-components/styles/tokens-dtcg/tier-2/brand/<brand>/*.json` — references only, never literals; typography goes through `typography-primitives.json` (tier-1 exception), never `theme.space.{sm,md,lg}` |
| Build + verify | `pnpm --filter @southleft/al-web-components build:tokens && pnpm run test:brands` |
| Rendered proof | `pnpm run brands:compare` (regenerates `.altitude/visual-compare/brands.dark.png`) |

Depth: `.altitude/BRANDS.md` (the reachability map, the brand contract's 7
rules, the two shipped brands' marker table).

## Add a NEW brand (`<al-theme brand="yourbrand">`)

Different from the row above: that one edits an existing brand's values, this
one makes a new `brand` value exist. **There is no scaffold** — it is a hand
edit in ~7 places, and skipping any one of them fails a gate or (worse) makes
the brand a silent no-op.

**Full ordered checklist: [`.altitude/BRANDS.md`](./BRANDS.md) § 9 "Adding a new
brand — the quick start".** Shape of it:

| Step | Where |
|---|---|
| Author the token set | `styles/tokens-dtcg/tier-2/brand/<brand>/*.json` — DTCG, references only, every token carrying a `cssType` (§9.1); `mode/<theme>/colors.json` for values that must flip with `mode` (§9.2). No registration step — the directory is globbed. |
| The one config edit | `styles/tokens-config.v5.mjs:589-602` — the hardcoded `brands` array, one entry per brand × mode (§9.3) |
| Build + sanity check | `build:tokens`, then confirm `dist-v5/scss/host/tokens-brand-<brand>*.scss` exists — **a missing partial means an empty delta, i.e. the brand does nothing** (§9.4). `theme.scss` needs no edit. |
| Widen the surface | `theme.ts` union → regenerate CEM/schema; `theme-switcher.ts`; `theme-presets.ts` (`PresetBundle` + a new PRESETS array); MCP `z.enum`; a harness HTML (§9.5) — 7 sites, no longer 8: the React story site went with Storybook, retired 2026-08-25 |
| Widen the harness brand lists | `harness/scoped.js`, `build-brand-compare.mjs`, `check-scoped-theming.mjs` (§9.6) |
| Verify | `test:brands`, `brands:compare`, `test:scoped-theming`, `gate:token-usage`, **`node scripts/capture-token-baseline.js`** (G8, same PR) (§9.7) |
| Optional | A `.altitude/ds-projects.json` entry — only for Figma parity + a scoped docs site. A brand does **not** require one (§9.8) |

`altitude_generate_theme` (MCP) is **not** a brand generator — it is an
in-memory OKLCH solver that writes no files. See `.altitude/AI-THEME.md`.

---

## Work on the Southleft brand layer (`@southleft/sl-web-components`)

Different rules from a base component: same-tag override by define-order,
a generated CEM that is **not** part of the package's `build`, and its own
guidance/a11y coverage path. Full doc: **`.altitude/BRAND-LAYER.md`**. Short
version:

```bash
pnpm --filter @southleft/sl-web-components build                        # runtime + types
pnpm --filter @southleft/sl-web-components build:custom-elements.json    # SEPARATE — regenerate by hand after any JSDoc/API change
pnpm --filter al-app-docs build && pnpm run a11y:report:docs             # this package has no Storybook of its own
pnpm run gate:docs && pnpm run gate:guidance && pnpm run gate:token-usage && pnpm run check:sl-scope && pnpm run test:brands
```

`pnpm run check:brand-conformance` checks that a brand override (`al-header`,
`al-footer`) still covers the base component's current
slot/attribute/part/cssproperty surface, and reports base components the
project's scope has never considered. Runs warning-only in the CI
`repo-hygiene` job until the real al-header/al-footer gaps it found are fixed
(tracked as an `.mm` issue), then becomes a hard failure.

---

## Code → Figma sync (push token/component changes to the design file)

1. Read `.claude/skills/altitude-figma-sync/SKILL.md` first — traps that cost
   an hour each if skipped.
2. Confirm the target file with `figma_get_status` (canonical vs. decoy —
   the skill names both file keys).
3. Open the Desktop Bridge plugin in that file (Figma Desktop → Plugins →
   Development → Figma Desktop Bridge → Run) — writes need it.
4. Variables: `node scripts/figma-atoms/bridge-io.mjs --port 9229` (keep
   running) → `node scripts/audit-figma-vs-code.mjs` → `node scripts/figma-var-fixes.mjs` → apply via `figma_execute`.
5. Components: see `.altitude/FIGMA-SYNC.md` § "The sync loop" for the
   measure → build ops → repair pipeline.

Depth: `.altitude/FIGMA-SYNC.md` (prerequisites, fidelity rules, "a brand is
a recipe not an axis"), `.altitude/PARITY.md` (the manifest model this
feeds).

## Figma → code (pull live Figma state into the parity manifest)

```bash
node scripts/figma-atoms/mcp-shim.mjs         # spawns figma-console-mcp, HTTP shim on :9401 — keep running
# (Figma Desktop open on the project's file, Desktop Bridge plugin running)
pnpm run parity:refresh                       # or parity:refresh:sl for southleft
pnpm run parity:projects                      # what's what afterward
```

`pnpm run parity:freshness` reports whether the Figma side has ever actually
been refreshed (a manifest with `figmaLastRefreshed: null` looks identical to
"zero drift," which is misleading). It runs as a warning-only step in the CI
`repo-hygiene` job; `--max-age-days N` turns it into a gate once a refresh
cadence exists.

Depth: `.altitude/PARITY.md` (the snapshot manifest model, the reconciliation
loop, the `aiPrompt` reconciliation string `altitude_check_parity` / `GET
/parity.json` hand an agent — Storybook, the surface that used to drive this,
was retired 2026-08-25).

---

## Docs site work (`apps/docs`)

| Step | Command |
|---|---|
| Build | `pnpm --filter al-app-docs build` |
| Coverage gate | `pnpm run gate:docs` (= `check:sl-scope` + `al-app-docs check:coverage`) |
| Guidance gate | `pnpm run gate:guidance` (after a docs build) — 8 required sections per component: purpose, when-to-use, when-not-to-use, dos, donts, accessibility, content, sources |
| Panel gate | `pnpm run gate:docs-panels` (after a build — proves rendered panels leak no Figma keys/node ids and match the parity/a11y engines) |
| Generalises gate | `pnpm run gate:docs-generalises` (throwaway third project proves a new client brand costs a registry entry, not code) |

**All four gates run in CI** — the `build-all` job in
`.github/workflows/v2-checks.yml` runs them after `pnpm run build:all`
(they need the built docs HTML). Run them locally after a docs build to
catch failures before pushing.

Depth: `apps/docs/src/lib/registry.mjs` header comment (the generation model
and its rules), `.altitude/DS-PROJECTS.md` (the multi-project registry docs
reads), `.altitude/BRAND-LAYER.md` (brand-layer-specific docs steps).

---

## Release (changesets)

```bash
pnpm exec changeset          # write a changeset for your change
pnpm run check:changesets    # CI gate — every PR that touches a publishable package needs one
pnpm run release             # build + changeset publish (CI-driven via .github/workflows/release.yml)
```

`pnpm run check:publishable` (needs a prior `pnpm run build`) verifies the
package actually ships what its `exports` map promises.

---

## Accessibility reports

| Report | Command | Reads / feeds |
|---|---|---|
| Story-fixture axe (base + main lib) | `pnpm run a11y:report:fixture` → `.altitude/a11y/report.json` | Builds `libs/al-web-components/story-fixture` then runs axe-core against that **static** build — never a dev server (measurement hazard, see script header). `a11y:report` alone runs axe without building; its `--storybook` flag keeps its name for compatibility and takes any directory serving the `index.json` + `iframe.html?id=` contract. Storybook was retired 2026-08-25. |
| Docs-site axe (brand layer, anything with no stories) | `pnpm --filter al-app-docs build && pnpm run a11y:report:docs` → `.altitude/a11y/report-docs.json` | axe against the built docs site; default story only |
| Manual/screen-reader passes | Hand-edit `.altitude/a11y/manual-tests.json` | Read by `apps/docs/src/lib/a11y.mjs`; empty entries render "not recorded," never fabricate a pass |

---

## Scripts index

Every file in `scripts/` (and its subdirectories), grouped by the workflow it
serves. One-liners only — read the file's own header comment for the
non-obvious part. Verified against `package.json` scripts and
`.github/workflows/*.yml` as of this writing; re-check before trusting an
"ORPHAN" label on a script you're about to delete, since this list rots the
same way any other doc does.

### Tokens

- `lib/dtcg-token.mjs` — the one place that resolves a DTCG leaf's two types: `dtcgType()` (coarse `$type`) vs `authoredType()` (`$extensions["org.altitude.token"].cssType`). Read it before writing anything that walks `tokens-dtcg/`.
- `test-tokens-contract.js` — name/file/count/value/dangling-ref checks vs `.altitude/baselines/tokens/snapshot.json`. `test:tokens`.
- `capture-token-baseline.js` — rewrites the token snapshot baseline. `baselines:tokens`.
- `generate-token-metadata.mjs` — writes the `$extensions` blocks (usage rules, `cssProperties`, lifecycle, uuid) into `tokens-dtcg/**.json`. `generate:token-metadata`. Idempotent.
- `check-token-metadata.mjs` — drift gate for those blocks (uuid presence/uniqueness/stability, resolvable `replacement` paths). `check:token-metadata`.
- `codemod-deprecated-tokens.mjs` — rewrites `var()` call sites of deprecated tokens to their `replacement`. Dry run by default. `codemod:deprecated-tokens`.
- `emit-token-types.js` — emits TypeScript types for tokens (part of `build:tokens`).
- `copy-tokens-to-legacy-dist.js` — byte-copies `dist-v5/` to the legacy `dist/` import path (part of `build:tokens`).
- `check-token-usage.mjs` — phantom-vs-dead token report; `--fail-on-phantom` is `gate:token-usage`.
- `check-css-layers.js` — cascade-layer specificity gate (G3).

### Components / build

- `check-cem-coverage.js` — custom-elements-manifest completeness (distinct from `gate:coverage`, which is V8 code coverage).
- `check-exports-map.js` — `check:exports`, package `exports` map correctness.
- `check-react-wrapper-contract.js` — `@southleft/al-react` wrapper conformance.
- `check-register-altitude.js` — the three registration modes (stable/versioned/manual) stay consistent.
- `check-bundle-budget.js`, `check-bundle-completeness.js` — `gate:bundle-budget`-style bundle-size and completeness checks.
- `capture-bundle-baseline.js` — `baselines:bundle`.
- `check-migration-gate.js` — `.altitude/migration.json` gate (G2). `gate:migration`.
- `check-baselines-gate.js` — legacy-stack baseline gate. `gate:baselines`.
- `check-css-layers.js` — see Tokens above (cross-listed; it's a component-surface gate too).
- `codemod-scoped.js` — scoped-theming codemod against `.altitude/golden-snapshots/`.
- `check-scoped-theming.mjs` — `test:scoped-theming`, multi-brand-in-one-document proof.
- `check-brand-distinctiveness.js` — `test:brands`.
- `build-brand-compare.mjs` — `brands:compare`, rendered brand-pair proof PNG.
- `check-preset-parity.mjs` — `test:preset-parity`.
- `check-publishable.mjs` — `check:publishable`.
- `check-changesets-config.js` — `check:changesets`.
- `check-jsdoc-dialect.js` — `check:jsdoc`.
- `check-styles-changed.mjs` — `gate:styles-new`, stylelint on changed lines only.
- `generate-component-schemas.js`, `generate-schema-index.js` — component JSON-schema generation.
- `validate-contracts.js`, `test-controllers.js` — contract/controller test harnesses.
- `copy-assets-to-dist.js` — non-JS asset copy (webpack CopyPlugin replacement).
- `check-audit.mjs` — `check:audit`, `pnpm audit` against `.altitude/audit-allowlist.json`.
- `check-coverage-ratchet.mjs` — `gate:coverage` / `coverage:ratchet`, one-way V8 coverage floor.
- `check-a11y.js` — a11y check helper (see also `build-a11y-report.mjs` below).
- `component-check.mjs` — the "add/change a component" checklist as one mechanical pass. See "Add or change a base component" above.
- `check-brand-conformance.mjs` — brand-layer override vs. base-component surface drift. See "Work on the Southleft brand layer" above.

### Docs / guidance / a11y

- `check-guidance.mjs` — `gate:guidance`.
- `check-sl-scope.mjs` — `check:sl-scope`.
- `check-ds-projects.mjs` — `check:ds-projects`, `.altitude/ds-projects.json` schema/consistency.
- `build-a11y-report.mjs` — `a11y:report` / `a11y:report:fixture` (axe against the story fixture; it was a Storybook build until 2026-08-25, which is why the flag is still `--storybook`).
- `build-a11y-docs-report.mjs` — `a11y:report:docs` (docs-site axe).
- `build-axe-baseline.mjs` — turns a `test-storybook` log into a one-off axe baseline table (predates `build-a11y-report.mjs`; see ORPHANS).
- `build-root-llms.mjs` — generates root `llms.txt` from CEM + ai-readiness digests + axe report + ds-project registry + MCP tool roster. `llms:build` / `check:llms`.
- `check-llms-content-type.mjs` — `check:llms-content-type`, deployed-artifact content-type check (run against a live URL, not local).
- `check-mcp-docs.mjs` — hand-written MCP tool-roster docs (AGENTS.md, MCP README, southleft.com tools page, `.claude/skills/`) vs. what the server actually registers. Alias `check:mcp-docs`.

### Figma / parity

- `audit-figma-vs-code.mjs`, `figma-var-fixes.mjs` — variable audit/fix loop (§ "Code → Figma sync").
- `build-figma-payload.mjs` — generates the Altitude → Figma variable payload (`.altitude/figma-sync/altitude-figma-payload.json`), consumed by `figma-atoms/build-spec.mjs`. **Manually invoked** — no `pnpm run` alias, no CI — run by hand (`node scripts/build-figma-payload.mjs`) when the payload needs refreshing after a token change; NOT an orphan despite having no alias (see FIGMA-SYNC.md § "What maps to what").
- `check-figma-drift.mjs` — token-level Figma↔code drift (v1: values, brand/mode buckets, renames); alias `pnpm run parity:tokens-drift`.
- `check-parity-freshness.mjs` — is the Figma side of parity actually being refreshed. See "Figma → code" above; alias `parity:freshness` (warning-only CI step in repo-hygiene).
- `figma-atoms/` — the write-channel toolkit: `bridge-io.mjs` (Desktop Bridge I/O), `mcp-shim.mjs` (HTTP shim on :9401), `measure-components.mjs` / `measure-lib.js` (DOM measurement), `build-component-ops.mjs` (ops generation), `build-molecules.mjs`, `build-page.mjs`, `build-spec.mjs`, `check-parity.mjs` (project-aware since 2026-08-27), `delete-page.mjs`, `export-png.mjs`, `fig.mjs`, `harness.mjs`, `instance-map.mjs` / `instance-map.southleft.mjs` (registry `paths.instanceMap` targets), `link-text-styles.mjs`, `plan.mjs`, `project-scope.mjs`, `reorder-pages.mjs`, `sync-instance-map.mjs`, `tiers.mjs`, `token-map.mjs`, `repairs/` (historical one-off fix scripts — `badge.js` is cited as the boundVariables read-pattern reference by `scripts/contracts/__fixtures__/canvas-sample.json`). `push-variables.mjs` lives in `figma-southleft/`, not here. Every shim-talking script takes `--port` (canonical; `--shim` kept as a legacy alias) via `scripts/lib/figma-shim.mjs`. See `scripts/figma-atoms/README.md` and the skill for which of these are live vs. historical.
- `figma-parity/` — `list-projects.mjs` (`parity:projects`), `seed-manifest.mjs` (`parity:seed`), `mark-synced.mjs` (`parity:synced` — GATED since T1: refuses to stamp without a fresh passing `check-parity.mjs` receipt; `--human-verified "<reason>"` overrides and records itself in `lastSync.verifiedBy`), `refresh-figma-digests.mjs` (`parity:refresh`), `check-pinned-nodes.mjs` (`parity:pins` — are the manifest's pinned node ids still live, or ghosts that still resolve; `--repin` fixes the unambiguous ones).
- **`contracts/`** — the contract pipeline (spec 2026-08-25-contract-backed-figma-parity-and-generation; see `.altitude/contracts/README.md` for the full model):
  `emit-contracts.mjs` (`contracts:seed` / `contracts:check` = `--check-drift` / `contracts:validate` = `--check` / `contracts:check-determinism`, plus un-aliased `--refresh`),
  `extract-canvas.mjs` (`contracts:canvas`), `diff-contracts.mjs` (`contracts:diff`),
  `build-component-docs.mjs` (`contracts:docs` / `check:contract-docs`),
  `generate-figma.mjs` (contract → Figma set/prop-sheet generation; `contracts:ops-determinism` runs its al-button ops leg), with the generator's modules under `contracts/figma/` and shared helpers in `scripts/lib/{argv,figma-shim}.mjs`. CI gate: `gate:contracts` (five legs, both projects).
- `lib/` — shared script helpers: `argv.mjs` (`argOf`/`hasFlag`/`positionals`), `figma-shim.mjs` (shim transport + decoy guard + port flag), `dtcg-token.mjs`, `token-metadata-rules.mjs`.

### Visual regression / behavioural verification

- `verify-motion-axis.mjs` — behavioural checks for `<al-theme motion>` and the Tier 3 runtime (see ORPHANS).
- `visual-compare.mjs` — production Storybook vs. this-branch fixture, 5 pilot components (T2.x era; see ORPHANS).
- `visual-compare-storybook.mjs` — Storybook 10 (local) vs. Storybook 7 (prod) acceptance comparison (T2.4 era; see ORPHANS).
- `visual-parity-sweep.mjs` — one representative story per component title, local SB10 vs. prod SB7 (see ORPHANS).
- `test:vrt` (Playwright, not a `scripts/` file) is the live VRT suite — see `.altitude/baselines/README.md`.

### ai-readiness

- `ai-readiness/run-probe.mjs`, `run-judge.mjs`, `build-cem-digest.mjs`, `build-tokens-digest.mjs`, `lib.mjs` — regenerate `.altitude/ai-readiness/{cem,tokens}-digest.json`, the ground truth an agent verifies tag/attribute/token claims against. Regenerated by `pnpm --filter @southleft/al-web-components build`.

### Tests

- `__tests__/component-check.test.mjs` — test for `component-check.mjs`.
- `__tests__/gate-self-test.sh` — `gate:self-test`, meta-test over the gate scripts themselves.

### ORPHANS — no alias, no CI, no doc reference

Verified by grep against `package.json`, `.github/workflows/*.yml`, and every
`.altitude/*.md` / skill doc — none of the below appear anywhere except their
own file and (for two of them) one sibling script that itself is unreferenced.
Candidates for deletion or adoption, not for silent reliance:

- `build-axe-baseline.mjs` — superseded in function by `build-a11y-report.mjs`, which structures results per-component instead of grepping a jest log.
- `verify-motion-axis.mjs` — motion-axis behavioural verification; no `pnpm run` wraps it.
- `visual-compare.mjs`, `visual-compare-storybook.mjs`, `visual-parity-sweep.mjs` — T2.x-era Storybook-migration comparison scripts; the migration they verified is long done.
- ~~`figma-atoms/build-button-ops.mjs`~~, ~~`figma-atoms/pack.mjs`~~,
  ~~`figma-southleft/verify-fingerprint.mjs`~~ — **deleted 2026-08-27**
  (spec parity-system-audit-remediation, R7) after re-verifying zero references;
  `build-component-ops.mjs` is the live successor of the first.

`check-brand-conformance.mjs` and `component-check.mjs` are **not** on this
list even though they currently have no `package.json` alias: they are
referenced above at their relevant workflow step, not here.
(`check-mcp-docs.mjs` and `check-parity-freshness.mjs`, once in the same
boat, now have aliases — `check:mcp-docs`, `parity:freshness`.)
