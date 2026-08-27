---
name: altitude-figma-generate
description: "Generate a component's Figma page (lean variant set + documented prop sheet) FROM THE CODE via the contract pipeline — the walkthrough workflow proven on Badge/Breadcrumbs Item/Button/Checkbox/Chip (2026-08-26). Triggers: 'generate <component> in Figma', 'create the Figma set from code', 'regenerate a component page', 'add the prop sheet', 'walk through the next component', 'fix the generated set for X'. Encodes the per-component recipe, every figma.gen.json curation key, the three-layer fact model (contract vs curation vs generator), and ~15 traps that each cost real debugging. Read this BEFORE running generate-figma.mjs on a new component."
---

# altitude-figma-generate

Generating a component's Figma page from `libs/al-web-components` code — the lean,
property-mode variant set plus the documented prop sheet (doc header + purple
border-collapse table) — via `scripts/contracts/generate-figma.mjs`.

Sibling skills: `altitude-figma-sync` (hand-repairing the library, token audits — its
traps 1/3/27/32 apply here too); `altitude-component-authoring` (creating the CODE
component this pipeline reads).

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

## Per-component recipe (the walkthrough loop)

```bash
# 0. Shim up (restart it if in doubt — see trap 1):
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

## figma.gen.json — every key (all optional; cite sources in `$comment`)

| Key | What / example |
|---|---|
| `anatomyCase` | Which measured case seeds base anatomy. Alphabetical-first is the default and picks badly (Badge sampled the DOT; Checkbox sampled Indeterminate+hidden). Pick the code-default case: `"Checked=Off,Label=shown"`. Needs `--refresh`. |
| `caseAxes` | Case-dimension → prop pairing the auto-mapper can't name-match (auto = dim vs prop minus is/has prefix: Current↔isCurrent ✓, Shape↔type ✗). `[{dimension:"Shape", prop:"type", property:"Shape", valueMap:{default:"Default", squared:"Squared"}}]`. Badge dot: `[{dimension:"Shape", prop:"isDot", property:"Type", valueMap:{label:"Default", dot:"Dot"}}]`. |
| `textContent` | class → literal the template renders when measurement lacks it (rare now — `anatomy.text` carries measured copy). Breadcrumbs' `/` predates text capture. |
| `glyphs` | CSS-mask-drawn marks copied VERBATIM from the component's own scss data-URIs. `[{class, when:{Checked:"On"}, svg, color, boxColor}]` — `boxColor` mirrors the `::before` layering (visible square = ::before color, mark = underlying bg). See checkbox/figma.gen.json for the worked pair (✓ + −). |
| `nestedIconGlyphs` | `{"al-icon":"x"}` — which Phosphor glyph a nested al-icon instance swaps to (chip's ALIconClose import → 'x'). Resolution needs a bootstrap instance in-file (trap 8). |
| `label` | `{fontStyle, fontSize}` for the non-walk (icon–label–icon) recipe. Button: Bold. |
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
