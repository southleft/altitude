---
name: altitude-figma-generate
description: "Generate a component's Figma page (one frame: a doc header above the lean variant set) FROM THE CODE via the contract pipeline — proven at scale in the 2026-08-26 sweep (35 components generated in one session, zero failures; 17 components ship a figma.gen.json — see .altitude/contracts/COVERAGE.md). Triggers: 'generate <component> in Figma', 'create the Figma set from code', 'regenerate a component page', 'walk through the next component', 'fix the generated set for X'. Encodes the per-component recipe, every figma.gen.json curation key, the three-layer fact model (contract vs curation vs generator), and ~15 traps that each cost real debugging. Read this BEFORE running generate-figma.mjs on a new component."
---

# altitude-figma-generate

**Binding first:** `.altitude/FIGMA-CLEANLINESS.md` — the owner's Figma rules
(component reuse, hug preservation, organism widths/breakpoints, naming, the
mandatory screenshot loop). Every generation and edit answers to it.

Generating a component's Figma page from `libs/al-web-components` code — ONE frame: the
doc header above the lean, property-mode variant set — via
`scripts/contracts/generate-figma.mjs`.

Sibling skills: `altitude-figma-sync` (hand-repairing the library, token audits — its
traps 1/3/27/32 apply here too); `altitude-component-authoring` (creating the CODE
component this pipeline reads); **`altitude-figma-repair`** (patch ONE wrong fact in an
existing set in place).

**Do not generate to fix one wrong binding.** Generation deletes and rebuilds the set,
minting a new component-set node id — every pinned id (parity manifest, contract
`bindings.figma.nodeId`, nested instances in other components' sets) goes stale, and any
variants the owner expanded by hand with Propstar are lost. If the set's STRUCTURE is right
and a colour / axis name / token binding / variant label is wrong, use
`altitude-figma-repair` instead.

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
`scripts/contracts/figma/` — `derive-ops.mjs` (parity core), `conventions.mjs`
(library-wide rules incl. Phosphor resolution and the T29 wrong-library incident),
`doc-header-style.mjs` (pure presentation for the header above the set),
`measured-boxes.mjs`, `plugin-snippets.mjs`, `build-set-code.mjs`, and
`check-parse.mjs` (run it after touching any generator file — the `String.raw`
backtick trap has bitten three times). The `derive-sheet-plan.mjs` /
`sheet-style.mjs` / `build-sheet-code.mjs` trio went with the prop sheet
(retired 2026-08-29). Per-component judgment calls come from
the OPTIONAL `figma.gen.json` (layer 2 above), merged over defaults in
`scripts/contracts/figma/component-config.mjs`. The enum axis is contract-driven
(`bindings.figma.kind: "VARIANT"` + `property`), not a hard-coded prop named
`variant`.

## CSS → Figma Auto Layout (the translation the generator performs)

Auto layout is the single largest source of "the set looks nothing like the app".
This is the whole mapping. Anything not in this table does not reach Figma at all.

| Figma property | Source | Notes |
| --- | --- | --- |
| `layoutMode` | **derived** from `anatomy[].layout.display` via `layoutAxisFor()` in `build-set-code.mjs` | See the display→axis rule below. NOT from `direction` alone. |
| `layoutWrap` | **derived** from `layout.wrap` (+ always for `display: grid`) | Figma honours it on HORIZONTAL frames only; the emitters gate on the resolved axis. |
| `itemSpacing` | **derived** — `bindNum` to the `column-gap`/`gap` token | Bound to a Figma variable, not a literal. |
| `paddingTop/Bottom/Left/Right` | **derived** — bound to the `padding-*`/`padding` tokens | A `calc()` multiple of a token is silently dropped (Figma variables can't do arithmetic) — sync skill trap 22. |
| `counterAxisAlignItems` | **derived** from `layout.align`, flex nodes only | Lossy 3-value map: `stretch` and `baseline` both collapse to `MIN`. Costs nothing today (3 and 1 nodes respectively across the whole set). |
| `primaryAxisAlignItems` | **derived** from `layout.justify`, flex nodes only | Lossy 4-value map: `space-around`/`space-evenly` collapse to `MIN`. Zero occurrences today. |
| `primaryAxisSizingMode` / `counterAxisSizingMode` | **hardcoded `'AUTO'`** everywhere | Hug on both axes. See "hug vs fill" below — this is a known limitation, not a decision you should replicate by hand. |
| `layoutSizingHorizontal` / `layoutSizingVertical` | **hardcoded `'FIXED'`**, nested instances only | Stops instances stretching. `'FILL'` is never set on component anatomy. |
| `counterAxisAlignContent`, `clipsContent`, `layoutAlign`, `layoutGrow`, absolute positioning | **unmapped** | No contract fact backs them. Don't hand-add them to a generated set; it will be wiped on the next run. |

### The display→axis rule (trap 24, generalised — fixed 2026-08-27)

`layout.direction` is `flex-direction`, and **`getComputedStyle` returns its initial
value `'row'` on every non-flex element.** 432 of the 433 non-flex anatomy nodes in
the contract set therefore carry a meaningless `direction: 'row'`. Reading it without
gating on `display` is what laid al-tabs' tablist and its panel side by side (557x40
against a real 291x79) — recorded as trap 24 in `altitude-figma-sync`.

That trap was fixed on the variant ROOT only. The same bug was live on every
composite's inner frames until 2026-08-27: **327 nodes across 53 of 103 components**
were emitting HORIZONTAL for block-level containers. `layoutAxisFor()` now maps:

- `flex` / `inline-flex` → `direction === 'column' ? VERTICAL : HORIZONTAL` (the only
  case where `direction` may be read)
- `block`, `flow-root`, `list-item`, `table`, `table-*-group`, `table-cell`,
  `table-caption`, **and anything unrecognised** → `VERTICAL` (block boxes stack down)
- `inline`, `inline-block`, `table-row` → `HORIZONTAL`
- `grid` → `HORIZONTAL` + `layoutWrap: 'WRAP'`

**Never map a non-flex node to `layoutMode: 'NONE'`** to "keep its measured geometry."
It has none. Nothing in `buildAnatomyChildren` assigns x/y to a walked child, and
`resize()` is never called on a component, so a NONE node keeps `createFrame`/
`createComponent`'s untouched 100x100 default while its content spills outside its own
bounds. An axis is always the right answer; hug sizing is what gives it a real size.

This applies to the variant ROOT as well — measured live on al-table (root
`display: block`) before the fix:

```
COMPONENT "State=Default, …"   layoutMode NONE   100x100
  └─ FRAME "al-c-table__scroll"   x0 y0   243x100      <- 143px outside the component
```

and that run reported `maxVariantWidth/Height: 100` — the number the presentation frame
lays itself out against. After: `VERTICAL`, `AUTO/AUTO`, 243x100,
no overflow on any of the 12 components, `maxVariant` 301x162.

`primaryAxisSizingMode`/`counterAxisSizingMode` and the padding/gap binds therefore run
for EVERY root, not just flex ones. Only `counterAxisAlignItems`/`primaryAxisAlignItems`
stay flex-gated, because `align`/`justify` are flexbox properties that carry meaningless
initial values (`normal`) on a non-flex box.

### Hug vs fill — SOLVED as measured facts + a cascade (2026-08-28)

Hug (`'AUTO'` both axes) is still the DEFAULT, but the generator now emits
`layoutSizing* = 'FILL'` wherever a measured fact backs it (commit 82579fe + spec
2026-08-28-layout-fill-and-grow-facts). The rules, all in `buildAnatomyChildren`:

- **`grow`** (measured `flex-grow`, nulled at 0) → FILL along the PARENT's main axis.
- **Cross-axis stretch cascade**: a child fills a VERTICAL parent's width when the
  effective alignment stretches (parent `align`, overridden by the child's own
  measured **`alignSelf`**, nulled at `auto`/`normal`) AND the child is block-level
  (or the parent is real flex — flex items are blockified; an inline-flex chip in a
  block parent keeps hugging) AND the parent's width is DEFINITE (`FIXED`/`FILL` —
  fill-inside-hug is circular). HORIZONTAL **flex** rows do the same for height.
- **Roots** get FIXED width from measured geometry, which is what the cascade fills
  against; full-bleed organisms pin it with `rootWidth: true` in `figma.gen.json`.
- **Nested INSTANCES** follow the same grow/stretch rules (previously always natural
  size), and a text-bearing instance that still overflows its measured box gets the
  REWRAP treatment: fonts loaded, inner TEXT `textAutoResize='HEIGHT'` + FILL, then
  the instance resized to its measured `box.w`. Verified on the Southleft hero —
  the Display Lg headline renders 1160x220 wrapped, byte-matching the browser
  measurement. (Instance inner TEXT nodes ARE writable once fonts are loaded —
  unlike nested-instance geometry.)

**Known remaining gap: grids.** `display:grid` maps to HORIZONTAL+WRAP, which has no
track widths, so the fill cascade CANNOT propagate through a grid container (e.g.
`al-c-layout--constrained`, `--grid`). Children below a grid hug until a
track-mapping fact exists (spec T10). When a generated set still looks lopsided:
check for a grid in the chain first, then whether the root has definite width, then
whether the fact (`grow`/`alignSelf`) was measured — fix as rule or curation, never
by hand-editing the canvas.

To add another layout fact, follow the five-file path `wrap` and `alignSelf` took:
`contract.schema.json` → `measure-lib.js` → `emit-contracts.mjs` (derive-ops passes
`layout` through verbatim) → both emitters in `build-set-code.mjs`.

### How `al-layout` pairs with auto layout

`<al-layout>` is the library's single arrangement primitive and **has no Figma set of
its own, by design** (`COVERAGE.md:19`). `nested-set-not-found:al-layout` in a run's
`missingVars` is expected noise — but "expected" means *do not go build a set for it*,
NOT *ignore the arrangement*. An `al-layout` in a composite's anatomy degrades to a
coarse auto-layout frame, and that frame is where the component's real arrangement
lives, so it must translate correctly:

- Its host is `:host { display: contents }`, which generates **no box**. The measured
  anatomy therefore records the inner `div.al-c-layout`, not the host — that inner div
  is the node whose `display`/`gap`/`padding` facts you are reading.
- The default flow variant is `display: flex; flex-direction: column; align-items:
  stretch; gap: var(--al-theme-space)` → VERTICAL, MIN counter-align (stretch collapses),
  `itemSpacing` bound to the space token.
- `variant="grid"` / `"bento"` are `display: grid` → HORIZONTAL + WRAP.
- `variant="constrained"` is a three-track grid whose outer tracks are fluid GUTTERS,
  not padding. Auto layout has no equivalent; expect it to degrade.
- Its `wrap` prop is now a real contract fact and reaches Figma as `layoutWrap`.

Known gap: `al-layout`'s own contract pins `anatomyCase: "Variant=bento,Direction=column"`,
so the recorded root is the GRID variant and the default flow behaviour is captured
nowhere. Re-measure from the default case before trusting its contract.

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

# 3. GENERATE onto the component's own page — ONE run, ONE frame (doc header
#    above the real COMPONENT_SET). There is no second pass:
node scripts/contracts/generate-figma.mjs --component al-X --page "🛠 X"

# 4. VERIFY: determinism + export a PNG for eyeballing:
node scripts/contracts/generate-figma.mjs --component al-X --check-determinism
node scripts/figma-atoms/export-png.mjs <frameId> out.png --scale 1.5
```

**Steps 3 and 4 are now ENFORCED, not advisory (2026-08-31).** They used to be
prose an agent could skip, and one did:

- **A degraded run now EXITS NON-ZERO.** Any `missingVars` entry other than the
  documented `nested-set-not-found:al-layout` fails the run. `--allow-degraded`
  accepts it deliberately. Previously a degraded run printed its misses and
  exited 0 — which is exactly how a session shipped al-input-stepper with
  `phosphor-component-not-found:minus/plus`, read green as success, and reported
  the set as "needs two icons" when it in fact rendered with its two nested
  buttons overlapping into illegible text.
- **Every run exports a verification PNG** to `<sync>/generated-shots/<tag>.png`
  and prints the path. The screenshot is now a byproduct of generating, not a
  discipline to remember.

**LOOK AT THE PNG. A structure dump is not a screenshot.** The stepper regression
above was invisible in the node tree — the tree was fully populated and correctly
nested; only the render showed the overlap. Reading `missingVars` and dumping the
anatomy are both necessary and neither is sufficient.

Read `missingVars` in every run's output — the generator degrades honestly and
reports every miss; an empty array is the goal, and `nested-set-not-found:al-layout`
is expected noise (arrangement primitive, no set of its own, by design — but see
"How `al-layout` pairs with auto layout" below: expected means don't build a set for
it, NOT ignore its arrangement).

## Owner conventions (decided during the walkthrough — do not re-litigate)

- **Never touch hand-built sets.** The generated artifact is `"<Name> — Generated"`;
  clearing is name-scoped to exactly that. The owner deletes hand-built sets herself.
- **One frame per component page**: the doc header above the real COMPONENT_SET, which
  stays visible. (Until 2026-08-29 the visible artifact was a prop sheet and the set was
  hidden behind it; the sheet was retired by owner direction and the set is the page now.)
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
set's variant structure — T31 corrected this and removed the curation. See
`.altitude/contracts/README.md` § Fan-out convention for the full history.

**Omit is the inverse curation** (T27): `bindings.figma.omit: true` (props) /
`figmaOmit: true` (slots) means the generator builds NOTHING for it — no axis, no
property, no instance. al-button's `fullWidth` is curated this way in both projects'
contracts (owner: "I don't need that in figma"). The contract diff (`pnpm run
contracts:diff` → `scripts/contracts/diff-contracts.mjs`; the pure library is
`libs/altitude-mcp/src/lib/contract-diff.mjs`) treats an omitted-and-absent prop/slot
as a named `intentional-omission` skip, never a disagreement — but canvas still
exposing it is flagged `present-despite-omission`.

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
| `iconSizeVar` / `fullWidthExtraPx` / `enumProp` | Pilot-era knobs — see component-config.mjs header for each. (A `sheet` key was retired 2026-08-29 with the prop sheet; `component-config.mjs` warns and ignores it. Delete it if you find one.) |

## Hard-won traps (every one was actually hit)

1. **The shim dies silently** when the figma-console MCP server reconnects — runs then
   print "Cannot reach the figma-console shim" (or a batch silently no-ops if you
   grep'd for success lines). Probe `curl -s -X POST localhost:9401/call -d
   '{"name":"figma_get_status","arguments":{}}'` before batches; restart freely.
2. **A re-run mints a new set node id.** Anything pointing at the old one — a pinned
   `bindings.figma.nodeId`, a nested instance in another component's set, variants the
   owner expanded by hand with Propstar — is orphaned. `pnpm run parity:refresh` after
   every regeneration, and prefer `altitude-figma-repair` when only one fact is wrong.
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
   **Update 2026-08-31 — LOCALIZED SET.** The owner localized Phosphor into the
   file: ~1500 plain local COMPONENTs under one GROUP named
   `Phosphor Icons — Local` (`PHOSPHOR_LOCAL_GROUP_NAME` in `conventions.mjs`).
   Those are not remote instances, so the original scan could not see them, and
   they carry no Format × Weight axes, so `isVerifiedPhosphorIconSet()` cannot
   vouch for them either — the GROUP NAME is the positive, allowlist-shaped guard
   instead. `findPhosphorComponentByName` now falls back to a flat pass over that
   group's direct children. Bootstrapping single instances is no longer needed for
   any glyph the localized set contains.
   Also worth knowing: an INSTANCE_SWAP's `preferredValues` names ONE glyph's
   component set (its variants are Format × Weight), NOT a catalogue — it is not
   a route to enumerating available glyphs.
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
node scripts/contracts/generate-figma.mjs --component al-X --check-determinism
```
