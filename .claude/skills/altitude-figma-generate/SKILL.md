---
name: altitude-figma-generate
description: "Generate a component's Figma page (lean variant set + documented prop sheet) FROM THE CODE via the contract pipeline — proven at scale in the 2026-08-26 sweep (35 components generated in one session, zero failures; 17 components ship a figma.gen.json — see .altitude/contracts/COVERAGE.md). Triggers: 'generate <component> in Figma', 'create the Figma set from code', 'regenerate a component page', 'add the prop sheet', 'walk through the next component', 'fix the generated set for X'. Encodes the per-component recipe, every figma.gen.json curation key, the three-layer fact model (contract vs curation vs generator), and ~15 traps that each cost real debugging. Read this BEFORE running generate-figma.mjs on a new component."
---

# altitude-figma-generate

Generating a component's Figma page from `libs/al-web-components` code — the lean,
property-mode variant set plus the documented prop sheet (doc header + purple
border-collapse table) — via `scripts/contracts/generate-figma.mjs`.

Sibling skills: `altitude-figma-sync` (hand-repairing the library, token audits — its
traps 1/3/27/32 apply here too); `altitude-component-authoring` (creating the CODE
component this pipeline reads).

**Can this component be generated at all? Check `.altitude/contracts/COVERAGE.md`
FIRST** — the per-component table of real sets, anatomy readiness, composition, and
which components are BLOCKED on measured anatomy (snapshot 2026-08-26: 35 generated
in one sweep, 15 composites, 17 blocked). If the component is listed as blocked, see
Prerequisites below before anything else.

## Prerequisites — measured anatomy, or no full generation

A component with no entry in `spec-light.json` (the measurement pass's output) has a
contract without anatomy/tokens/states, and cannot be fully generated. The chain:

```bash
node scripts/figma-atoms/measure-components.mjs        # harness + Chromium → spec-light.json
node scripts/contracts/emit-contracts.mjs --refresh    # re-derive contracts from the measurements
```

`COVERAGE.md` names exactly which components are blocked on this (al-card, al-select,
al-dialog, al-popover, al-stepper, …). Do not hand-fake anatomy to work around it
(trap 14).

## The three-layer fact model (what lives where)

1. **Contract** (`.altitude/contracts/<project>/<tag>.contract.json`, re-derived by
   `emit-contracts.mjs --refresh`, guarded by `--check-drift`): DERIVED FACTS ONLY —
   props/slots/states, `composition` (nested al-* from source), anatomy with per-node
   `component` / `text` / `box` (measured copy + geometry), `anatomy.cases` (every
   measured case's full tree), conditionalBindings (SCSS variant/state deltas),
   stateOverrides (measured per-path state diffs).
2. **`libs/al-web-components/components/<name>/figma.gen.json`** (optional, lives WITH
   the component): CURATION — judgment calls the facts can't decide. Every key below.
3. **Generator** (`scripts/contracts/figma/*.mjs`): RULES for interpreting facts —
   never per-component data. If you're editing generator code to fix ONE component,
   stop: it's either a missing generic rule or missing curation.

## Generator layout (modularized 2026-08-26)

`scripts/contracts/generate-figma.mjs` is a thin CLI; the generator's parts live in
`scripts/contracts/figma/` — `derive-ops.mjs` (parity core), `derive-sheet-plan.mjs`
(+ `sheet-style.mjs`, pure presentation), `conventions.mjs` (library-wide rules incl.
Phosphor resolution and the T29 wrong-library incident), `plugin-snippets.mjs`,
`build-set-code.mjs`, `build-sheet-code.mjs`. Per-component judgment calls come from
the OPTIONAL `figma.gen.json` (layer 2 above), merged over defaults in
`scripts/contracts/figma/component-config.mjs`. The enum axis is contract-driven
(`bindings.figma.kind: "VARIANT"` + `property`), not a hard-coded prop named
`variant`.

## Per-component recipe (the walkthrough loop)

```bash
# 0. Shim up (restart it if in doubt — see trap 1). Default port 9401; every
#    live-Figma CLI takes --port <n> (canonical; --shim <n> is a legacy alias,
#    both work — scripts/lib/figma-shim.mjs, consolidated 2026-08-27):
node scripts/figma-atoms/mcp-shim.mjs        # background; Figma Desktop on the real file

# 1. INSPECT the contract before generating — surface curation needs:
#    props (enum? booleans?), states vs stateOverrides/conditionalBindings (which
#    states carry real deltas), anatomy.cases dimensions, composition, text/box.
node scripts/contracts/generate-figma.mjs --component al-X --ops-only
#    Read the ops: axes (case dims auto-mapped?), variants count vs the real set,
#    degradations (every honest gap is listed there).

# 2. CURATE figma.gen.json if needed (keys below), then:
node scripts/contracts/emit-contracts.mjs --refresh      # if anatomyCase changed
node scripts/contracts/emit-contracts.mjs --check-drift  # must stay green

# 3. GENERATE onto the component's own page — lean set FIRST, sheet SECOND (order
#    is load-bearing: the sheet instantiates the set; a lean re-run REQUIRES a
#    sheet re-run after it or the sheet shows ghosts of the deleted set):
node scripts/contracts/generate-figma.mjs --component al-X --page "🛠 X"
node scripts/contracts/generate-figma.mjs --component al-X --page "🛠 X" --sheet

# 4. VERIFY: determinism + export a PNG for eyeballing:
node scripts/contracts/generate-figma.mjs --component al-X --check-determinism
node scripts/figma-atoms/export-png.mjs <sheetFrameId> out.png --scale 1.5
```

Read `missingVars` in every run's output — the generator degrades honestly and
reports every miss; an empty array is the goal, and `nested-set-not-found:al-layout`
is expected noise (arrangement primitive, no set of its own, by design).

## Owner conventions (decided during the walkthrough — do not re-litigate)

- **Never touch hand-built sets.** Generated artifacts are `"<Name> — Generated"` and
  `"<Name> — Prop Sheet"`; clearing is name-scoped to exactly those. The owner deletes
  hand-built sets herself.
- **One visible artifact per page**: the prop sheet, positioned where the masters
  frame is; the masters frame is HIDDEN (`visible=false`) by the sheet pass. Masters
  stay functional (instances render from hidden masters); toggle in layers to edit.
- **Sheet Grid has NO padding** of its own; breathing room = the container's padding.
- **Text weight is the node's fact**: `font-weight` token binding wins, walk text
  defaults to Regular; `label.fontStyle` config is for the non-walk pilot recipe only.
- States fan out ONLY when a fact backs them (SCSS delta or measured stateOverride) —
  Button honestly has no Active (its CSS is `&:hover:not(:active,…)` with no `:active`
  rule); Badge has no states at all.

## Axis vs property vs omitted (T23 / T31 / T27)

**Property mode is the default.** An enum prop is always a VARIANT axis; a slot or
layout boolean is a single shared BOOLEAN component property — VERIFIED live against
the real Button set (node `4271:9562`): its `Is Full Width`/`Slot Before`/`Slot After`
have always been plain BOOLEAN properties (25 variants, State × Variant only), never
axes.

**Fan-out is opt-in curation** (T23, spec 2026-08-25-contract-backed-figma-parity-
and-generation): `bindings.figma.axis: true` on a prop / `figmaAxis: true` on a
`before`/`after` slot (in the contract; schema in `contract.schema.json`) fans that
boolean out as its own True/False VARIANT axis, cartesian with every other axis.
Curate it ONLY for a component whose real set demonstrably fans it out. History:
T22/T23 curated al-button into axis mode (200→100-variant pilot) reasoning from a
Propstar screenshot that turned out to show a DOCUMENTATION artifact, not the real
set's variant structure — T31 corrected this and removed the curation. The machinery
stays (`--sheet` reuses it internally) — see `.altitude/contracts/README.md` § Fan-out
convention for the full history.

**Omit is the inverse curation** (T27): `bindings.figma.omit: true` (props) /
`figmaOmit: true` (slots) means the generator builds NOTHING for it — no axis, no
property, no instance. al-button's `fullWidth` is curated this way in both projects'
contracts (owner: "I don't need that in figma"). The contract diff (`pnpm run
contracts:diff` → `scripts/contracts/diff-contracts.mjs`; the pure library is
`libs/altitude-mcp/src/lib/contract-diff.mjs`) treats an omitted-and-absent prop/slot
as a named `intentional-omission` skip, never a disagreement — but canvas still
exposing it is flagged `present-despite-omission`.

## The prop sheet (`--sheet`) — what it builds

A Propstar-style fan-out grid, plugin-free (an agent cannot launch a Figma plugin;
Propstar remains an optional interactive alternative). `--sheet` creates/replaces a
`"<Name> — Prop Sheet"` frame: an instance of the file's own "Documentation Header"
master on top (title/description/link contract-derived; the link is a dummy
placeholder until per-component docs publish), then a genuine nested-auto-layout
TABLE of real INSTANCES of the lean set, one per State × Variant × boolean-property
combination (100 for al-button), each switched via `setProperties`. Internally it
reuses the T23 cartesian derivation (`buildOps(contract, { forceAllBooleanAxes:
true })`) re-grouped for rendering — repurposed, not duplicated. Layout rules
(T31/T32, owner-reviewed):

- Borders are `border-collapse`-simple: the outer grid frame draws one full four-side
  border; every ROW draws only its own bottom edge (none on the absolute last row);
  every CELL draws only its own right edge (none on a row's last cell);
  `itemSpacing: 0` so adjacent single-edge strokes read as one line. A Variant-group
  boundary is that group's own last row's bottom edge at double weight — never a
  second frame.
- Row labels are humanized ("Icon before", "Icons before + after", "Default"), never
  a raw `Prop=Value` dump.
- Batched: one setup call + one call per Variant row group (6 for al-button) to stay
  under the Desktop Bridge's ~30s per-call ceiling. Idempotent — replaces the prior
  sheet frame by name.

Full grouping/layout/batching rationale: `.altitude/contracts/README.md`
§ Documentation sheet (`--sheet`, T31).

## Icon source is the Phosphor library, not "🛠 Icons" (T28)

Slot-icon instances resolve from the Phosphor Figma library —
`findPhosphorComponentByName` in `conventions.mjs` (which also records the T29
wrong-library incident) — never a lookup against the `🛠 Icons` page (that page is
the HAND-BUILT sets' convention, and stays live as the DS "Icon" wrapper host and
the bootstrap-scan target). The plugin API has no team-library enumeration, so
resolution is a live scan for an existing REMOTE instance with a matching name
(trap 8: a new glyph needs a human to bootstrap one instance first); a miss degrades
to "no icon instance," logged, never a silent fallback to the old page. See
`.altitude/contracts/README.md` § Phosphor icon source for the full mechanism and
its confirmed environment limits.

## figma.gen.json — every key (all optional; cite sources in `$comment`)

| Key | What / example |
|---|---|
| `anatomyCase` | Which measured case seeds base anatomy. Alphabetical-first is the default and picks badly (Badge sampled the DOT; Checkbox sampled Indeterminate+hidden). Pick the code-default case: `"Checked=Off,Label=shown"`. Needs `--refresh`. |
| `caseAxes` | Case-dimension → prop pairing the auto-mapper can't name-match (auto = dim vs prop minus is/has prefix: Current↔isCurrent ✓, Shape↔type ✗). `[{dimension:"Shape", prop:"type", property:"Shape", valueMap:{default:"Default", squared:"Squared"}}]`. Badge dot: `[{dimension:"Shape", prop:"isDot", property:"Type", valueMap:{label:"Default", dot:"Dot"}}]`. |
| `textContent` | class → literal the template renders when measurement lacks it (rare now — `anatomy.text` carries measured copy). Breadcrumbs' `/` predates text capture. |
| `glyphs` | CSS-mask-drawn marks copied VERBATIM from the component's own scss data-URIs. `[{class, when:{Checked:"On"}, svg, color, boxColor}]` — `boxColor` mirrors the `::before` layering (visible square = ::before color, mark = underlying bg). See checkbox/figma.gen.json for the worked pair (✓ + −). |
| `nestedIconGlyphs` | `{"al-icon":"x"}` — which Phosphor glyph a nested al-icon instance swaps to (chip's ALIconClose import → 'x'). Resolution needs a bootstrap instance in-file (trap 8). |
| `label` | `{fontStyle, fontSize}` for the non-walk (icon–label–icon) recipe. Button: Bold. |
| `fullWidthProp` | Name of the boolean layout prop rendered as "natural hug width plus `fullWidthExtraPx`" (default `"fullWidth"`). Set it when a component's full-width prop has a different name. Moot for a prop curated `figma.omit` (al-button). |
| `iconSizeVar` / `fullWidthExtraPx` / `enumProp` / `sheet` | Pilot-era knobs — see component-config.mjs header for each. |

## Hard-won traps (every one was actually hit)

1. **The shim dies silently** when the figma-console MCP server reconnects — runs then
   print "Cannot reach the figma-console shim" (or a batch silently no-ops if you
   grep'd for success lines). Probe `curl -s -X POST localhost:9401/call -d
   '{"name":"figma_get_status","arguments":{}}'` before batches; restart freely.
2. **Lean re-run after the sheet exists**: it no longer deletes the sheet, but the
   sheet's instances now point at the DELETED set's ghosts — always re-run `--sheet`
   after a lean regen.
3. **Backticks inside `String.raw` plugin-code templates** (even in comments)
   terminate the template — a SyntaxError pointing at an innocent identifier. Use
   quotes in comments inside `build-*-code.mjs`.
4. **Browser shorthand splitting**: a measured case may carry `border-top-color` and
   no `border-color` (Checkbox's unchecked box was invisible). The generator falls
   back to `border-top-*`; remember it when reading contracts.
5. **sr-only pattern**: a ~1×1 measured box clipping full-size content (hidden
   labels). The walk skips any ≤2px-box subtree — that's why Hidden rows have no label.
6. **`figma.createNodeFromSvg` wrapper carries its own fill** — recoloring without
   `sv.fills = []` first buries the mark under a solid square.
7. **Property wiring must not cross instance boundaries or literals**: findOwnNode
   skips nested-instance interiors, and text nodes named `Literal: …` are never wired
   to the Text property (wiring one replaces its characters with the default).
8. **Phosphor glyphs resolve ONLY from existing in-file instances** (no team-library
   enumeration; REST needs a token; import-by-key hangs ~30s). A new glyph needs a
   human to bootstrap ONE instance on 🛠 Icons — then the scan finds it in ms.
9. **Variant color inheritance**: case trees are measured on ONE variant; a node whose
   color merely equals the case root's follows the ROW's variant delta (Chip's danger
   label). A genuinely different own color is kept.
10. **`background` vs `background-color`**: SCSS deltas use the shorthand; ops
    normalizes to `background-color` — without it every variant renders the default
    fill (the original "Badge is completely off").
11. **Measured 0×0 box = invisible in this case** (resting ripple) — skipped, not a bug.
12. **Doc header collapses below ~1220px width** (fixed 1440 master) — width is
    clamped; don't "fix" narrow-table headers by editing the master.
13. **Text Block ↔ "Text Passage"**: the manifest says Text Block, the live set/page
    say Text Passage — resolve the rename before generating that one.
14. **Icon-only forms need a measured case** — Button (Icon)/hideText has none, so it
    has no generated counterpart yet; add a measurement case, don't hand-fake it.
15. **Case-axis "State" dims with a leading space** (`', State=Disabled'` in Checkbox's
    matrix) are harness quirks — they map to no prop and stay un-fanned; Error/Disabled
    attribute cases are future case-axes, not interaction states.

## Verification gates (all must stay green after contract-affecting changes)

```bash
node scripts/contracts/emit-contracts.mjs --check            # schema, both projects w/ --project southleft
node scripts/contracts/emit-contracts.mjs --check-determinism
node scripts/contracts/emit-contracts.mjs --check-drift
node scripts/contracts/generate-figma.mjs --component al-X --check-determinism [--sheet]
```
