# Slate × Altitude — alignment audit

**Date:** 2026-10-06
**Slate:** `D:\slate`, OpenPencil fork @ `8131401ea` plus uncommitted Option C work
**Altitude:** `D:\southleft\altitude` @ `38f2527a`
**Brief:** a scriptable canvas that matches Altitude at the code and capability level.
Altitude code is the source of truth, every build updates the canvas, and evals check that
the canvas has not drifted.

---

## 1. Verdict

The fork is the right base. The work so far is solid, but it points in the opposite
direction from the brief.

Everything in `FINDINGS.md` / `RESULTS.md` measures **`.fig` → HTML → `.fig`**: a
design-tool file making a round trip through code. That is valuable. It still treats a
Figma file as the origin. The brief, and Altitude's own rule (FIGMA-SYNC.md: *"Code is
upstream of Figma… Nothing imports Figma back"*), needs the reverse:

```
 Altitude build ──► CEM + contracts + DTCG tokens ──► Slate library revision ──► canvas
       ▲                                                                       │
       └──────────── canvas-contract ◄── diffContracts() ◄──────────────────────┘
                                         (CI gate, headless)
```

Most of that loop already exists, split between the two repos. Altitude already produces
everything a canvas needs and already has a canvas-neutral differ. Slate already has a
linked-library model with revisions and update review. **What's missing is the adapter
between them, plus three capabilities in Slate:** importing live shadow DOM, carrying a
code identity on components, and exporting instances as `<al-*>` tags.

There's a strategic payoff. Altitude's `contracts:diff` gate is marked *"can never be a CI
gate"*, because Figma canvas dumps are laptop observations. A Slate canvas generated
headlessly from code in CI removes that limitation. **That's the pitch: code↔canvas parity
as a blocking CI gate, entirely open source.** Figma can't offer that.

---

## 2. What each side already has

### Altitude provides the source of truth (ready to consume)

| Asset | Path | Use in Slate |
|---|---|---|
| Custom Elements Manifest (104 tags, literal-union attribute types, slots, parts, events) | `libs/al-web-components/custom-elements.json` | Component API surface. CI fails if it drifts from source. |
| Contracts (102 altitude + 25 southleft) | `.altitude/contracts/<project>/<tag>.contract.json` | Tag ↔ set name, axes (Figma label ↔ code value), root anatomy layout, per-variant/state token bindings carrying both `--al-*` and slash-path names, slot placeholders, omit/axis curation. **This is the canvas library spec.** |
| Canvas-contract schema + pure differ | `.altitude/contracts/canvas-contract.schema.json`, `libs/altitude-mcp/src/lib/contract-diff.mjs` (`diffContracts`) | Slate emits canvas contracts; the differ is reused unchanged. Already has an eval set of 122 mutated pairs (`evals:drift-cases`). |
| DTCG tokens (tiers 1–3, brand × mode) | `libs/al-web-components/styles/tokens-dtcg/**`, built `styles/dist-v5/tokens.json` | Variable collections + modes. |
| CSS var ↔ variable-name map | `scripts/figma-atoms/token-map.mjs`, `scripts/build-figma-payload.mjs` | Collection layout and naming that already matches the Figma convention. |
| Variant fan-out plan | `scripts/figma-atoms/plan.mjs` (`atom(tag, figmaName, axes)`) | Which variant combinations to build. |
| Render + measure harness | `scripts/figma-atoms/harness.mjs`, `measure-components.mjs` → `spec-{light,dark}.json` | Shadow-DOM tree with `computed`, `authored` and the **token behind each value**: "do not infer tokens from colours". |
| Deterministic ops builder | `scripts/contracts/figma/derive-ops.mjs` `buildOps()` | The model for a contract → scene-graph builder. Only `build-set-code.mjs` is Figma-specific. |
| Gate plumbing | `.altitude/gates.json` (`needs` vocabulary), `component-check.mjs --evidence`, `ds-projects.json` | Add a `slate` canvas target and a `canvas-parity` claim using the existing mechanisms. |
| MCP | `libs/altitude-mcp` (`altitude_get_component`, `altitude_get_tokens`, `altitude_resolve_token`, …) | A Slate agent should call this for code facts, not re-derive them. |

### Slate provides the canvas (stronger than `.slate/` notes suggest)

| Capability | Where | State |
|---|---|---|
| Figma-grade component model: variant/text/boolean/instance-swap props, refs, structured overrides | `packages/scene-graph/src/types.ts:535–600`, `instance-overrides.ts` | Works |
| **Linked libraries with revisions, diff, update review, materialize**; memory / IndexedDB / object storage / filesystem catalogs; `open-pencil libraries publish` | `packages/core/src/library/`, `src/app/libraries/catalog/`, `packages/cli/src/library/` | Works. This is how "each build updates the canvas" should land. |
| Variables: collections, modes, aliases, per-node mode | `scene-graph/src/variables.ts` | Works; no scopes, no `$extensions`, no composite types |
| ~110 agent tools, MCP (stdio/HTTP), CLI `eval` with the Figma Plugin API, design-JSX `Component`/`ComponentSet`/`Instance` | `packages/core/src/tools/**`, `packages/mcp`, `packages/cli` | Works |
| Design-fact carrier (`data-op-*`), tokens as `var(--x, literal)`, SVG escape hatch, fidelity gate | `packages/dom-css/src/design-fact.ts`, `design-tokens.ts` (uncommitted) | Works, with the bugs listed in §4 |
| Visual oracles, 35 canvas snapshot specs, in-page dom-css harness | `tools/visual-oracles`, `tests/e2e/canvas/`, `tests/helpers/dom-css-browser.ts` | Works; can be retargeted to compare Altitude and canvas renders |

---

## 3. Gaps, ranked by how much they block the brief

1. **No Altitude → Slate library builder.** Nothing turns CEM + contracts + tokens into
   component sets. *This is the core missing piece.* Contracts already describe axes,
   anatomy layout and token bindings per variant/state. A `buildOps()`-style deterministic
   builder emitting scene-graph ops (or design-JSX) then `libraries publish` is the
   shortest path, and needs no browser.
2. **No DTCG import.** Nothing in Slate reads `$value`. Needed: a DTCG → collections
   importer (brand × mode → modes), naming that inverts `cssVarName` so
   `--al-theme-space-xs` ↔ `theme/space/xs`, and composite tokens (shadow, typography)
   mapped to shared styles. Altitude's other four theme axes (density, contrast, shape,
   motion) are hand-written host rules, not tokens, so a decision is needed (§6).
3. **No code identity on components.** A component cannot record `tagName`, attribute ↔
   property, slot ↔ child, events, or parts. Without it, codegen and parity are guesswork.
   Add an optional `codeBinding` on component/component-set nodes, carried in library
   revisions and in the design-fact carrier.
4. **Codegen loses instance identity.** JSX export turns `INSTANCE` into `Frame`/`div`
   (`io/formats/jsx/export.ts:34–53`). HTML export marks `data-op-component-id` but still
   emits `<div>` (`from-scene-graph.ts:343`). With item 3 in place, an instance should
   export as `<al-button size="md" is-pill>…</al-button>` with slot content. That makes
   canvas output something `altitude-validate` can check.
5. **No canvas-contract emitter.** Slate needs `extract-canvas`: scene graph →
   `canvas-contract.schema.json`, so `diffContracts()` runs against it. This is the eval
   layer the brief asks for, and it reuses Altitude's answer key.
6. **No shadow-DOM / live-DOM capture.** `browserHTMLToSceneGraph` walks `childNodes` only,
   re-renders into an iframe with no Altitude definitions loaded, and never reads `--al-*`
   names. It is needed for the *measured* lane (visual parity, catching cases where a
   contract says one thing and the CSS renders another), not for the first library build.
   The better source is Altitude's `measure-components.mjs` spec JSON, which already
   resolves token provenance in shadow DOM. Import that instead of re-walking the DOM.
7. **Agent tools for tokens are thin.** `create_collection` takes a name only, and there are
   no mode or alias tools. An agent cannot build or repair the token layer without `eval`.
8. **Generic HTML paste doesn't use dom-css.** `pasteFromHTML` only understands OpenPencil
   and Figma clipboard formats. Low priority.

---

## 4. Uncommitted work — defects and hygiene

Measured on 2026-10-06: dom-css tests **77/77 pass**, `conformance:gate` **passes (98.91%,
synthetic)**, `conformance:report:check` up to date, `tsgo` clean, lint 0 errors / 3
warnings. **`check:arch` fails with 10 errors**, so the full `bun run check` would fail.

### Bugs

| # | Defect | Evidence |
|---|---|---|
| B1 | **Editing a selection's HTML in the Code panel replaces the whole document.** The draft now follows the selection, but `previewDOMCode` → `store.replaceGraph(graph)` with a graph built from that snippet alone. Undo recovers it; committing loses everything else. | `src/app/code/dom-preview.ts:32,53` |
| B2 | Variables recovered from markup are all `type: 'COLOR'` with empty values, including ones bound to spacing. That path runs on every Code panel round trip, because `sourceGraph` doesn't survive serialisation. | `packages/dom-css/src/to-scene-graph.ts:218` |
| B3 | Rotation is lost on real browser import. Only `rotate(Ndeg)` is parsed, but `getComputedStyle` returns `matrix(...)` and computed beats inline. The test passes only because it fakes `rotate(12deg)`. | `apply-css.ts:316`, `design-fact.test.ts:582` |
| B4 | Fills, strokes, effects and residual values from markup are `JSON.parse` + `as` cast, not validated. Only residual field *names* are allow-listed. `[{"type":"SOLID"}]` enters the graph. Since agents edit this markup, use Valibot. | `design-fact.ts` |
| B5 | `lastImportDegradations()` / `lastOmittedGeometry()` are module-level globals. Two concurrent imports overwrite each other's reports. Return them from the call instead. | `to-scene-graph.ts`, `design-fact.ts` |
| B6 | AppMenu hides menus by comparing translated labels to `'Text'`/`'Arrange'`, so the filter fails in other locales. The native Tauri menu still shows both. | `src/components/shell/AppMenu.vue` |

### Convention violations (AGENTS.md / `check:arch`)

- `scripts/conformance/*.mjs` is real tooling in an area meant for shims → move to
  `tools/conformance/{src,tests}` in TypeScript, using `resolveWorkspaceRoot` (8 arch errors).
- `gap-report.mjs` scans source text, against the "test contracts, not source text" rule.
  The live round trip already measures the same thing better.
- The gate baseline lives in untracked `.slate/`, and package source links to
  `.slate/ROUND-TRIP.md`. Track the baseline under `tools/conformance/`; put the contract
  doc under `packages/docs/development/`. The gate is not in `ci.yml`.
- `VariablesPanel.vue` reuses property-panel internals (arch error). `VariablesSection.vue:74`
  uses native `title` instead of `Tip` (arch error). `VariablesDialog` in `DesignPanel.vue`
  can no longer be opened.
- `DesignFact.fills/strokes/effects` are typed `unknown[]`; use scene-graph `Fill`/`Stroke`/`Effect`.
- i18n: `pinnedToEdit` / `selectionTooLarge` are missing from all 8 locale files; `{count}`
  is filled via `.replace`; `'Untitled collection'` is hard-coded.
- `design-fact.test.ts` is 851 lines; split by fact family. The resolved-options block is
  duplicated in `from-scene-graph.ts`.
- No `Unreleased` changelog entry, although `includeDesignFacts: true` by default changes
  `open-pencil export --format HTML` output.
- Out-of-scope changes mixed in: menu removal, Windows `shell: true` spawn fix.
- `public/altitude-ds.fig` (12.5 MB) sits in `public/`, gitignored but **served by the dev
  server and copied into any build**. Move it next to `.slate/fixture.fig`.

### Upstream-merge strategy

Upstream landed ~633 commits in 60 days. To keep rebases cheap, keep fork logic in new
modules (dom-css carrier, a new `altitude` adapter package), keep upstream defaults
unchanged (make `includeDesignFacts` opt-in or a Slate preset), and keep the app-shell edits
minimal and separate.

---

## 5. Recommended roadmap

Each phase is gated by measurement, as in FINDINGS §8.

**Phase 0 — make the current work landable (small).** Fix B1–B6, move the tooling to
`tools/conformance`, get `bun run check` green, add the gate to CI, and commit on a branch.
Decide the default for `includeDesignFacts`.

**Phase 1 — tokens in (DTCG → variables).** Importer in a new `packages/altitude` (or
`tools/altitude`), reading `tokens-dtcg/**` with brand × mode → modes. Round-trip gate:
`variableCollectionsToCSS(import(dtcg))` must equal Altitude's built
`css/brand/tokens-*.css` byte-for-byte, minus ordering. A clean, CI-able parity proof on
day one.

**Phase 2 — components in (contracts → library revision).** Add `codeBinding` to the
component model. Build a deterministic contract → component-set builder on the
`buildOps()` model, with tokens bound as variables and not literals. Publish with
`open-pencil libraries publish`. Run it in Altitude CI as a build step so **every Altitude
build produces a Slate library revision**, and documents get Slate's existing update review.

**Phase 3 — the eval layer.** Slate `extract-canvas` → canvas contract → Altitude's
`diffContracts()`. Register as an Altitude gate (`needs: [slate]`, `tier: build`,
**blocking**), plus a `component-check` evidence claim `canvas-parity`. Visual lane:
render each `plan.mjs` case in Slate (headless CanvasKit) and compare it with the
story-fixture/harness PNG using `tools/visual-oracles`.

**Phase 4 — canvas → code.** Instances export as `<al-*>` / `@southleft/al-react` with
attributes and slots from `codeBinding`, validated by `altitude-validate`. This replaces
Altitude's in-progress `generate-code.mjs` Figma lane with an open, testable one.

**Phase 5 — agentic surface.** Token and mode tools in Core; a Slate agent prompt that calls
`altitude-mcp` for facts; guardrails so an agent edit to a library component is flagged
as drift (code is upstream), never silently saved as truth. Altitude judgement J1 states
this failure directly.

**Phase 6 — measured lane (optional).** Import `measure-components.mjs` spec JSON (shadow
DOM with token provenance) to catch cases where the contract and the rendered CSS
disagree.

**Deferred, as before:** multiplayer relay, `.fig` export validation (only matters if Figma
remains a target), rename.

### What "near 100% parity" should mean

Report three numbers per component, never one blended figure:

1. **API parity** — CEM attributes/slots ↔ component properties (`diffContracts`, exact).
2. **Token parity** — every contract binding is bound to the same variable on the canvas
   (exact, per variant × state).
3. **Visual parity** — pixel diff per `plan.mjs` case against the code render (threshold,
   like Altitude's VRT `maxDiffPixelRatio 0.01`).

API and token parity can reach 100% by construction. Visual parity is where real canvas vs
browser differences (text shaping, AA) show up. Name those as degradations, as
`ROUND-TRIP.md` does.

---

## 6. Decisions needed

1. **Where does the adapter live?** Recommendation: the Altitude → Slate builder and the
   canvas-contract emitter live in **Slate** (`packages/altitude` or `tools/altitude`).
   Altitude consumes it as a CI step and keeps owning contracts, schema and differ.
2. **Is Figma still a target?** If Slate replaces it, drop `.fig` export work and the
   figma-console lane gradually. If both stay, `ds-projects.json` needs a non-Figma canvas
   schema.
3. **Theme axes beyond brand × mode** (density, contrast, shape, motion): model them as
   extra variable collections, or leave them out of the canvas?
4. **`api-vocabulary` debt** (`al-button` `variant` → `emphasis`, etc.): build the canvas
   library on today's API and let parity flag renames, or wait? Recommendation: build now.
   The gate catches the rename.
5. **Five Altitude components exist only on Figma's internal canvas** (accordion, alert,
   avatar, banner, skeleton). Under the code-first plan this resolves itself: the
   contracts generate them.
