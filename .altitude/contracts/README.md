# Component contracts

A **contract** is a per-component, per-project JSON document that captures
the canvas-expressible API surface of one `al-*` component: its props (with
legal values and per-surface bindings), events, slots, interaction states,
anatomy (structure + token bindings, with per-state deltas where measured),
a11y facts, and the code/Figma bindings that let a tool jump straight to
either side. It upgrades Figma parity from digest-level ("something in this
component changed") to property-level ("this specific prop's legal values
changed").

**Contracts are editable source, not a generated artifact.** Every contract
carries `"status": "source"`: hand edits are the reviewable unit of change
(a **contract PR**, below). `scripts/contracts/emit-contracts.mjs` derives
a contract's content from what the repo's other pipelines already produce —
that derivation is how a contract gets its FIRST draft (`--seed`), how it
is re-derived in place after a source change (`--refresh`), and how it is
checked for staleness (`--check-drift`, contract ↔ code):

| Contract field | Source |
| --- | --- |
| `props`, `events`, `slots`, `semantics.element` fallback, `a11y.cssParts` | the CEM (`custom-elements.json`) — same reader as `libs/altitude-mcp/src/lib/cem.mjs` |
| `props[].bindings.figma`, `bindings.figma` (component-level) | the project's parity manifest (`.altitude/figma-sync/**/parity-manifest.json`) |
| `anatomy`, `states`, `semantics.element` | `scripts/figma-atoms/measure-components.mjs` output (`spec-light.json`), when present on disk |
| token references inside `anatomy` / `tokens` | `scripts/figma-atoms/token-map.mjs` (`CSS_TO_TOKEN`) |
| `conditionalBindings` | the component's own `.scss` — BEM modifier classes (`.al-c-<tag>--<suffix>`) and nested pseudo-class/attribute state rules, parsed with `postcss-scss`; omitted for a component whose `.scss` has neither. Derived from source that IS available in CI, so it participates fully in `--check-drift` / `--check-determinism`, never excluded the way anatomy is when `spec-light.json` is unavailable. |
| `composition` | the component's own source — the al-* tags its template renders + sibling imports |

`status` and `version` are **curation metadata, not a derived fact**, and
`--check-drift` excludes both from its comparison for exactly that reason.
The Figma-curation fields (`figmaPlaceholder`, `figmaAxis`/`axis`,
`figmaOmit`/`omit`) are likewise hand-curated and carried forward, never
derived — see "Fan-out convention" and "Figma-expression opt-out" below.

Adapted from [`southleft/ds-contracts-poc`](https://github.com/southleft/ds-contracts-poc)'s
`contracts/contract.schema.json` — see **Deviations**, below.

**Contracts REFERENCE tokens, they never define them.** Every token-bearing
field holds a `--al-*` custom-property name (or a token path) — never a
resolved value. The token pipeline
(`libs/al-web-components/styles/tokens-dtcg/`) remains the only source of
truth for what a token *is*; a contract only says *which* token a part is
bound to. Code stays hand-authored — contracts describe it, they do not
generate it (yet — see "What's next").

## Layout

```
.altitude/contracts/
  contract.schema.json        # the schema every contract below is validated against
  canvas-contract.schema.json # the schema CANVAS contracts validate against
  README.md                   # this file — current facts only
  DECISIONS.md                # decision history and incident records
  COVERAGE.md                 # coverage snapshot: which components generate cleanly, and blockers
  docs/                       # GENERATED per-component reference docs — never hand-edit (see below)
  altitude/
    al-button.contract.json
    ...
  southleft/
    al-button.contract.json
    ...
```

## Canvas contracts

The CODE-side contracts above are one leg of a three-way comparison
(contract ↔ code ↔ Figma canvas). The CANVAS leg is extracted live from
Figma, over `scripts/figma-atoms/mcp-shim.mjs`, by
`scripts/contracts/extract-canvas.mjs`:

```bash
pnpm run contracts:canvas                                    # altitude, every mapped set
pnpm run contracts:canvas:sl                                 # southleft
node scripts/contracts/extract-canvas.mjs --component al-button   # one set — the cheap reconciliation-loop path
node scripts/contracts/extract-canvas.mjs --from-fixture scripts/contracts/__fixtures__/canvas-sample.json  # offline
```

Output lands at `.altitude/figma-sync/<project-subdir>/canvas-contracts/
<tag>.canvas.json` — gitignored (a canvas dump is an OBSERVATION, not
durable sync state; the parity manifest remains the only tracked file in
that tree). A canvas contract validates against
**`canvas-contract.schema.json`**, not `contract.schema.json` —
deliberately different schemas, because what a canvas read can honestly
know (variant axes, component properties, bound Figma variable *names*,
text-style names, states as a variant axis, shallow named-layer anatomy)
differs from what the code side knows (attribute names, `--al-*` token
names, ARIA attributes, CSS parts). Every canvas contract carries a
`degradations` array naming each contract.schema.json fact it could not
express. `extractedAt` is deliberately not in the body, so the same inputs
produce a byte-identical file; the run timestamp and per-set digests live
in one sidecar per project, `canvas-contracts/canvas-extraction-meta.json`.
One subdirectory per `.altitude/ds-projects.json` project id; a shared tag
(e.g. `al-button`) gets **one contract per project** — the two projects can
observe different Figma bindings, and Southleft's `brandLibrary` supersedes
some tags (`al-card`, `al-header`, `al-footer`) with a different CEM entry
entirely, so the content can legitimately differ.

## Editing a contract (the contract-PR flow)

1. Open `.altitude/contracts/<project>/<tag>.contract.json` and change the
   field(s) that need to change. Keep the existing key order and 2-space
   indent so the diff stays reviewable (the emitter's convention, not
   tool-enforced).
2. Bump `version` (semver) for anything notable. `status` stays `"source"`
   (or advances per the maturity ladder in `contract.schema.json`) — it
   does not revert to `"derived"`.
3. Open a PR. The diff IS the review.
4. Reconcile what the contract now asserts:
   - **Code**: `pnpm run contracts:check` (`--check-drift`) — a flagged
     field means the contract disagrees with what the code actually does;
     either change the code to match, or the edit was wrong.
   - **Figma canvas**: `pnpm run contracts:diff -- --component <tag>`
     (`scripts/contracts/diff-contracts.mjs`, over a live-extracted dump
     from `contracts:canvas`).
5. Once both agree, stamp the sync: `pnpm run parity:synced <tag>` (or
   `parity:synced:sl`). This also records `lastSync.contractHash` (sha256
   of the file) and `lastSync.contractVersion` in the parity manifest, so a
   later un-restamped contract edit shows as `contractDrifted: true` on the
   parity report (`libs/altitude-mcp/src/lib/parity.mjs`). See
   `.altitude/PARITY.md`.

## Seeding a contract for a NEW component

```bash
pnpm run contracts:seed              # altitude — writes a contract for every tracked tag with none yet
pnpm run contracts:seed:sl           # == contracts:seed --project southleft
node scripts/contracts/emit-contracts.mjs --seed --project <id>
node scripts/contracts/emit-contracts.mjs --seed --force   # OVERWRITE an existing contract — discards hand edits; use deliberately
```

The derivation is deterministic: stable key order, 2-space indent, trailing
newline, no timestamps — seeding twice with no source changes and `--force`
produces byte-identical output. `--seed` reads `--project <id>` /
`DS_PROJECT` like every parity CLI
(`libs/altitude-mcp/src/lib/ds-project.mjs`), defaulting to `altitude`.

**Scope: parity-tracked components only** — `--seed` iterates the active
project's parity manifest. A manifest entry with `excluded: true` (e.g.
`al-icon`, `al-theme`, `al-theme-switcher`) is skipped with a logged line,
never silently dropped.

## Checking and refreshing a contract against its sources

`emit-contracts.mjs` with **no mode flag** prints a usage note and exits 1
rather than silently overwriting hand-edited contracts — pick one of:

```bash
pnpm run contracts:check                                        # --check-drift, altitude
node scripts/contracts/emit-contracts.mjs --check-drift --project southleft
node scripts/contracts/emit-contracts.mjs --check                # ajv-validate against contract.schema.json, read-only
node scripts/contracts/emit-contracts.mjs --check-determinism    # derive every tracked contract twice in memory, byte-compare
node scripts/contracts/emit-contracts.mjs --refresh              # re-derive in place — the daily driver after a measurement pass
```

`--check-drift` re-derives every tracked component in memory and diffs it,
field by field, against the on-disk contract — excluding `status`/`version`
— and exits 1 if anything disagrees, naming which fields drifted per
component. A missing contract file for a tracked component is reported the
same way. This is the CODE side of drift; the CANVAS side is
`contracts:diff`.

`--refresh` re-derives every tracked contract and OVERWRITES its derived
fields in place. `status`/`version`, `slots[].figmaPlaceholder`,
`slots[].figmaAxis`, `slots[].figmaOmit`, and axis-or-omit-curated
`props[].bindings.figma` are carried forward unchanged (the same
`carryForwardPropAxisCuration`/`carryForwardSlotExtensions` helpers
`--check-drift` diffs against); every other field becomes exactly what
re-derivation produces. Anatomy-dependent fields
(`anatomy`/`anatomySource`/`anatomyCase`/`tokens`/`states`/`semantics`) are
left AS-IS when this environment has no measured `spec-light.json` — same
exclusion `--check-drift` applies — so a contract seeded on a machine WITH
measured data never has it clobbered by a `--refresh` run on one without.

## CI gate

`pnpm run gate:contracts` — **five legs**, run for **both** projects
(`altitude` and `southleft`) where applicable:

1. **Schema validation** (`contracts:validate[:sl]`, `--check`) — every
   on-disk contract must satisfy `contract.schema.json`; an illegal
   contract is refused **by name** (path + exact failing rule).
2. **Drift** (`contracts:check[:sl]`, `--check-drift`) — the CEM-derived
   API re-derived and diffed against the on-disk contract;
   `status`/`version` always excluded, anatomy-dependent fields excluded
   only when the environment has no `spec-light.json` — a CI runner never
   has one, so it checks CEM-derived facts only.
3. **Contract determinism** (`contracts:check-determinism[:sl]`) — every
   tracked contract derived TWICE in memory, byte-compared: same inputs
   must produce byte-identical output, independent of git or disk.
4. **Ops determinism** (`contracts:ops-determinism`) — the "ops" half of
   the same claim: the al-button contract's Figma ops artifact
   (`scripts/contracts/figma/derive-ops.mjs`'s `buildOps()`) derived TWICE
   in memory and byte-compared. Pilot-scoped (al-button, altitude only; no
   Figma connection needed — this checks the DERIVATION, not a live
   build); the same derivation runs for every contract, so widening it is
   a script-loop away.
5. **Generated-docs drift** (`check:contract-docs[:sl]`) — the generated
   per-component reference docs (below) re-derived in memory and
   byte-compared against disk, orphans included.

Any of the five failing fails the build. See `package.json`'s
`gate:contracts` script (and its `//gate:contracts` comment) for the exact
nine-command chain, and `.github/workflows/v2-checks.yml` (`repo-hygiene`
job) for where it runs — after both the base and Southleft-brand CEMs are
built, since `--check-drift` needs both.

## Generating Figma sets from contracts

A contract can drive the **generation** of a Figma component set.
`scripts/contracts/generate-figma.mjs` reads a contract, derives a
deterministic intermediate **ops** artifact (`buildOps()` — stable key
order, no timestamps, same contract in -> byte-identical bytes out), and
executes it over `scripts/figma-atoms/mcp-shim.mjs` to build a real set:
the State and enum ("Variant") axes, a BOOLEAN component property per
layout/slot boolean (**property mode, the library's default** — see
"Fan-out convention"), the Text/Icon Before/Icon After component properties
the contract's props/slots warrant (icon ones only when a slot names a
`figmaPlaceholder`), and token-bound fills/strokes/spacing from the
contract's anatomy — nothing fabricated beyond what the contract states.

```bash
node scripts/figma-atoms/mcp-shim.mjs                          # keep running (Figma Desktop open, Bridge plugin running)
node scripts/contracts/generate-figma.mjs --component al-button              # build/rebuild the lean, property-mode set
node scripts/contracts/generate-figma.mjs --component al-button --ops-only   # ops artifact only, no Figma call
node scripts/contracts/generate-figma.mjs --component al-button --check-determinism  # ops derived twice, byte-compared
```

A component page is **one frame**: the doc header, generated above the real
COMPONENT_SET by the ordinary run. There is no second pass.

**Module layout (2026-08-26 modularization).** `generate-figma.mjs` is a
thin CLI/orchestrator; the generator lives in `scripts/contracts/figma/`:
`derive-ops.mjs` (the parity core — `buildOps()`, conditional-binding
resolution, enum-axis selection), `conventions.mjs`
(library-wide conventions: State order, canonical boolean-axis order, theme
collection, site background, the Phosphor page/key/alias registries and the
icon-wrapper name), `doc-header-style.mjs` (pure presentation for the header
above the set), `measured-boxes.mjs`, `plugin-snippets.mjs` (the single copy
of the plugin-side helpers), `build-set-code.mjs` (the `figma_execute` code
emitter — it hosts the plugin-side Phosphor/wrapper resolution and recoloring
functions), and `check-parse.mjs` (the `String.raw` backtick lint; run it after
touching any file here).

**Composition & nested components.** Every contract carries a derived
`composition` section, and measured anatomy annotates nodes with
`component: "al-<name>"` where a node's class list bears another
component's `al-c-<name>` BEM block (measured anatomy flattens shadow DOM;
nesting is recoverable from block classes). A COMPOSITE component's
variants are built by walking the anatomy — annotated nodes become
INSTANCES of that component's own set (resolved BY NAME: its "🛠 " page
first, then the scratch page; the DS "Icon" lone component via the wrapper
path; outermost annotation wins, the subtree is never rebuilt), everything
else becomes a coarse auto-layout frame. Unresolved tags (al-layout by
design; unmapped components) degrade to frames and are reported per miss.
**Coverage snapshot + blockers: `.altitude/contracts/COVERAGE.md`.**

**Per-component config (`figma.gen.json`).** Generation judgment calls —
icon size variable, full-width margin, label typography,
an explicit enum-prop pick — live WITH the component in
`libs/al-web-components/components/<name>/figma.gen.json` (optional;
defaults in `scripts/contracts/figma/component-config.mjs`; al-button is
the worked exemplar). Facts stay in the contract; judgment calls live next
to the component. The enum axis is contract-driven, not a prop literally
named `variant`: any prop whose `bindings.figma.kind` is `VARIANT` fans out
under its own `property` name (al-range's `behavior` -> "Behavior",
al-input's `label` -> "Label").

**Scratch-page policy.** Every generated set lands on a dedicated page —
`--page` (default `"Contract Pilot"`) — never on the tag's real, tracked
page. The page is created if absent, or REUSED with only its own children
cleared on re-run (idempotent; clearing is NAME-SCOPED per component so
sibling generated sets survive a sweep); no other page is read-write
touched, and a decoy-file guard runs before anything mutates. Deliberate
and permanent: **promoting a generated set to replace a tag's real Figma
mapping — retargeting the manifest's `figma.nodeId`/`figma.name`, deleting
the old set — is an operator decision made outside this script**, after
human review (verify via `extract-canvas.mjs --node-id <pilot set id>` +
`diff-contracts.mjs --canvas-file <pilot dump>`).

Ops artifacts land at `.altitude/figma-sync/<project's figma-sync dir>/
generated-ops/<tag>.ops.json` — gitignored (a build INPUT derived entirely
from the tracked contract, not durable state).

**Known, honest limits**, all named in the ops artifact's `degradations`
array: `anatomy` captures exactly ONE measured case (`anatomyCase`), so
root-level facts it alone carries (border-radius, gap, padding, icon size)
are shared across every cell. Per-Variant colors and Hover/Disabled deltas
come from `conditionalBindings`; a component with none renders every cell
identically. `active` has no SCSS source in `al-button` (no `&:active`
rule), so its row renders as Default until a component's `.scss` defines
one. Anatomy carries no literal text content, so the Text property's
default is a placeholder.

### Slot placeholder instances

A `before`/`after` slot whose contract entry carries
`slots[].figmaPlaceholder` gets a real icon INSTANCE built in the right
leading/trailing position, wired to Slot Before/After (BOOLEAN `visible`)
and Icon Before/After (INSTANCE_SWAP `mainComponent`), and recolored
**recursively** to that row's resolved content-color token (icon fill and
label fill are always the identical bound variable, every Variant/State
row). A slot with no `figmaPlaceholder` degrades to boolean-only behavior —
a documented gap, not a guess.

**`figmaPlaceholder` names a Phosphor catalog entry, not a Figma-side
name.** Phosphor (`libs/al-web-components/components/icon/catalog.ts` +
`phosphor/*.ts`) is the icon source on BOTH sides — the contract always
stores the CODE-side catalog name, e.g. `check-circle`.
`apps/docs/src/lib/contracts.mjs`'s playground default reads it directly as
a catalog name. The placeholder is resolved **by name**, never a node id,
since icon libraries re-mint ids on republish. (The "🛠 Icons" page is NO
LONGER the icon SOURCE — Phosphor is — but the page itself remains live and
load-bearing: it hosts the DS "Icon" wrapper and is a Phosphor scan
target, below.)

### Phosphor icon resolution

Phosphor components are named in **PascalCase with no separators**
("CheckCircle") — not the kebab-case catalog names contracts store.
Matching is NORMALIZED (lowercase, non-alphanumeric stripped) on both
sides, never an exact string compare. `PHOSPHOR_NAME_ALIASES`
(`scripts/contracts/figma/conventions.mjs`) maps a catalog-normalized name
to the accepted Figma-side names — `paperplane: ['paperplane',
'paperplanetilt']` today — an EXACT alias table, never substring/fuzzy.

`findPhosphorComponentByName` (plugin-side, emitted by
`scripts/contracts/figma/build-set-code.mjs`) resolves in this order — scan
FIRST, key registry a fallback LAST:

1. A bounded-depth scan across `PHOSPHOR_PRIORITY_PAGE_NAMES` (`"🛠
   Icons"`, `"🛝 Playground"` — the two pages a Phosphor instance has ever
   actually been found on; constants in `conventions.mjs`) for an existing
   instance whose main component is REMOTE and name-matches; a hard
   node-visit budget (`PHOSPHOR_SCAN_NODE_BUDGET`) bounds worst-case time.
2. `PHOSPHOR_KEY_BY_NAME` — a hand-maintained `name -> published component
   key` registry (`conventions.mjs`), tried only if the scan found nothing.

**Provenance is verified structurally, never by name alone** (the file has
at least two libraries with overlapping icon names — the T29 wrong-library
incident, `DECISIONS.md`). Every genuinely Phosphor-cached icon is a full
`COMPONENT_SET` with `Format` (`Outline`/`Stroke`) × `Weight` variants;
`isVerifiedPhosphorIconSet()` REFUSES a name match with no verified parent
set, no exceptions — including through the hand-typed-key fallback. A
`COMPONENT_SET` match selects `Weight=Regular` (tie-broken toward
`Format=Stroke`); a flat component is used as-is.

**To bootstrap a new icon**: place one instance of it (drag from Assets,
or swap an existing INSTANCE_SWAP slot to it) on the "🛠 Icons" or
"🛝 Playground" page — the plugin API has no team-library component
enumeration and the bridge's REST-backed tools are unusable without a
`FIGMA_ACCESS_TOKEN`; a placed instance's `.mainComponent` is already fully
resolved locally, no import needed.

**Resolution failure degrades cleanly, per name** — logged in the ops
result's `missingVars` (e.g. `phosphor-component-not-found:paper-plane`),
never a silent fallback: no icon instance, no INSTANCE_SWAP property for
that side; the Slot Before/After property is unaffected.

**Four hard-won pitfalls — live traps, not history** (all confirmed;
narrative in `DECISIONS.md` § T28):

1. The Desktop Bridge enforces a hard ~30s execution ceiling per
   `figma_execute` call, independent of the requested `timeout`. Unbounded
   page scans and `figma.importComponentByKeyAsync()` (which can hang for
   the full ceiling even on a known-good key) both blow it — hence the
   two-page scan-first design.
2. Icon templates must be created AFTER the target page is current — under
   `documentAccess: dynamic-page`, nodes rooted on a page that gets
   unloaded fail later `.clone()` calls with "the node ... does not
   exist".
3. `.clone()` of a Phosphor instance silently corrupts its rendered
   geometry (renders as a solid filled block). Use `createInstance()` per
   occurrence, and only for rows that actually show the icon.
4. Never recolor a Phosphor instance's own top-level fill — it destroys
   the negative-space contrast a glyph depends on. `recolorIconChildren`
   (`build-set-code.mjs`) recolors every DESCENDANT, never the instance's
   own root paint — applying the same skip-this-root rule at EVERY nested
   instance boundary (the wrapper's inner glyph included).

### Slot icons instantiate the DS Icon wrapper

A slot icon is an INSTANCE of the owner's hand-built DS "Icon" wrapper — a
lone `COMPONENT` named exactly `"Icon"` (id `3509:4324`, on the "🛠 Icons"
page; **not** a `COMPONENT_SET`, no `componentPropertyDefinitions` of its
own) — with the resolved Phosphor glyph swapped into its nested child,
never a raw top-level Phosphor instance (mirroring code using `<al-icon>`
rather than an inline SVG). Because the wrapper is a plain `COMPONENT`,
the glyph is swapped directly on the nested child
(`nested.swapComponent(...)`), never through a component property.
`findIconWrapperComponent()` (plugin-side, in `build-set-code.mjs`; the
wrapper name is `ICON_WRAPPER_COMPONENT_NAME` in `conventions.mjs`)
resolves the wrapper BY NAME, scanning `PHOSPHOR_PRIORITY_PAGE_NAMES`; a
`COMPONENT_SET` hit resolves to its `defaultVariant`. The generated set's
Icon Before/After INSTANCE_SWAP property targets the WRAPPER's own id as
its `mainComponent` default; this environment's `addComponentProperty`
silently rejects a 4th `preferredValues` argument, so the 3-arg call is
used and the gap is reported as
`instance-swap-preferred-values-unsupported`.

**Sizing — a confirmed plugin API restriction, not a bug.** The wrapper's
own width/height binds to `ICON_SIZE_FIGMA_VAR` (`theme/icon/md`, 20px),
but a nested instance-within-an-instance's geometry is not independently
writable: `setBoundVariable`, `resize()`, and `resizeWithoutConstraints()`
all return without throwing yet change nothing. The attempt is kept
(harmless; correct if a future API lifts the restriction) and reported as
`icon-wrapper-nested-size-not-bindable:Icon Before`/`After`. Net effect:
the glyph renders at its master's built-in 16px inside a 20px wrapper box —
a minor size mismatch, not a clipping/wrong-glyph defect.

### Focus state

Focus renders as a stroke on the component FRAME itself, never an
absolutely-positioned shape — confirmed against the real Button set (node
`4271:9562`): a single frame-level stroke (`strokeWeight: 2`,
`strokeAlign: 'OUTSIDE'`), no dual/concentric ring. The generator
(`scripts/contracts/figma/build-set-code.mjs`) sets
`comp.strokes`/`strokeAlign`/`strokeWeight` directly on the variant's own
frame for `state === 'Focus'` — a frame has exactly one `strokes` array, so
this UNCONDITIONALLY REPLACES whatever border stroke the variant applied
earlier (Tertiary's 1px INSIDE gray border becomes the 2px OUTSIDE focus
color, matching the real set). The stroke binds to the
`theme/color/focus-ring` Figma variable — seeded (T30) in the
"Tier 2 | Theme" collection as a `VARIABLE_ALIAS` to
`theme/color/border/primary-default` in both modes, mirroring the code
token's own alias. A frame stroke follows the frame's own true bounds
automatically, on every row, so there is no ring geometry to track.

## The snippet lane — Figma from a REAL PAGE SECTION

The generation above builds LIBRARY components from contracts. The **snippet
lane** builds a Figma page from what a visitor actually sees — a live route's
real section, real copy, page CSS included — via a pseudo-contract that reuses
this exact pipeline (`buildAnatomyNode` → `buildOps` → `buildPluginCode`):

```bash
node scripts/contracts/generate-snippet.mjs --section hero --project southleft \
  --measure --verify --base http://localhost:4188/southleft
```

`--measure` captures the route (`scripts/figma-atoms/measure-page.mjs`,
sections = `[data-section-id]`); the build lands on the "Site Sections" scratch
page; `--verify` runs `scripts/contracts/verify-figma.mjs` — a per-node
bounding-box diff against the measured ground truth plus an auto-exported image
pair — and gates on it. Page-lane literal facts (used font sizes/families,
colors, paddings, recovered margins, native grid textures, colored text runs)
exist only on pseudo-contracts, so every component-lane ops artifact stays
byte-identical. Full recipe, fact model, and the eleven traps:
**`.claude/skills/altitude-figma-snippet/SKILL.md`** (read it BEFORE touching
`generate-snippet.mjs`, `measure-page.mjs`, or the page-lane branches of
`build-set-code.mjs`). After ANY edit to `scripts/contracts/figma/*.mjs`, run
`node scripts/contracts/figma/check-parse.mjs` (backtick-in-template lint).

## Fan-out convention

**Property mode — booleans as shared BOOLEAN component properties, never an
axis — is the library's default.** An `enum` prop is always an axis. A
`before`/`after` slot or layout-affecting boolean is a component property
**unless** curated otherwise; a behavior-only boolean (e.g. `hideText`)
stays a property regardless — there is nothing to fan out visually.

A curated boolean **can fan out as its own True/False VARIANT axis** — a
separately-built component per combination, cartesian with every other
axis. Curation is schema-additive, hand-set per contract, never derived:

- `props[].bindings.figma.axis: true` (alongside `kind: "VARIANT"` and
  `options: ["False", "True"]`) — a layout boolean like `fullWidth`.
- `slots[].figmaAxis: true` — a `before`/`after` slot.

Curate it only for a component whose REAL (or confirmed-intended) Figma set
demonstrably fans that boolean out as its own axis, never as a default. No
contract currently curates axis mode (al-button briefly did, as a pilot —
the T22/T23 → T31 revert story is in `DECISIONS.md`). The machinery stays
live: the schema fields and the `booleanAxisDefs`/cartesian derivation in
`scripts/contracts/figma/derive-ops.mjs`'s `buildOps()`. (Its second consumer,
the prop sheet's `forceAllBooleanAxes` fan-out, was retired 2026-08-29 — see
below.)

**Icon Before/After stay component properties either way** — the real
Button set keeps them so even alongside axis-mode curation, and the
generator mirrors that: the icon INSTANCE_SWAP property is wired
post-`combineAsVariants`; only the icon's per-variant VISIBILITY would move
to a static per-variant bake if its slot were curated as an axis.

**"Is Full Width" has no measured pixel fact.** Contracts carry no pixel
geometry (see "Deviations") — a component curating this into axis mode
renders the variant's natural hug width plus a fixed margin
(`fullWidthExtraPx` in `figma.gen.json`, default in
`scripts/contracts/figma/component-config.mjs`), a documented judgment
call. al-button's own `fullWidth` is curated `omit: true` instead — not
built at all, axis or property.

## Figma-expression opt-out

A prop or slot that is real in CODE can be curated OUT of the generated
Figma surface entirely. Schema-additive, hand-curated only, no derivation
source:

- `props[].bindings.figma.omit: true` — e.g. al-button's `fullWidth` (both
  projects); typically the ONLY key on the `figma` object when set.
- `slots[].figmaOmit: true` — a `before`/`after` slot.

**Generator effect** (`generate-figma.mjs`): an omitted prop/slot produces
**nothing** — no VARIANT axis, no BOOLEAN property, no icon instance, no
INSTANCE_SWAP property. Omission and axis-mode curation are independent
fields.

**Differ effect** (`scripts/contracts/diff-contracts.mjs` — the
`contracts:diff` CLI, built on the pure library
`libs/altitude-mcp/src/lib/contract-diff.mjs`): an omitted prop/slot
absent from canvas — the DESIRED state — is a named `skipped` entry
(`reason: "intentional-omission"`), never a disagreement. Canvas STILL
exposing a property that pairs to an omitted name IS a real disagreement
(`kind: "present-despite-omission"`). Both branches are self-test-covered
(`diff-contracts.mjs --self-test`, cases (e) and (f)).

**`--check-drift`/`--refresh` treat these fields like `status`/`version`**
— hand-curated, carried forward from disk, never flagged as drift. Nothing
is omitted unless curated.

## Documentation sheet (`--sheet`) — RETIRED 2026-08-29

The prop sheet — a Propstar-style variant break-out grid with dashed
separators, built next to the set — was removed by owner direction on
2026-08-29. A component page is now ONE frame: the doc header above the real
COMPONENT_SET, generated by the ordinary run. The variant break-out grid is not
generated at all; expand variants by hand with the Propstar plugin when a page
wants them.

Nothing replaced it. `--sheet` is refused loudly rather than ignored (exit 2),
so an old command line fails visibly instead of quietly generating something
else; `scripts/contracts/generate-figma.mjs` carries the retirement message and
the reasoning, and is the single record of it. `derive-sheet-plan.mjs`,
`sheet-style.mjs`, `build-sheet-code.mjs` and `rebuild-sheet-from-set.mjs` were
deleted with it, and a `sheet` key in a `figma.gen.json` is warned about and
ignored by `component-config.mjs`.

## Anatomy availability is best-effort

`scripts/figma-atoms/measure-components.mjs` writes `spec-light.json` /
`spec-dark.json` under each project's (gitignored) `figma-sync` directory.
If that file doesn't exist — a fresh clone, or before the measurement
pipeline has run — the emitter does **not** fabricate anatomy: it emits
`"anatomy": null` and `"anatomySource": "unavailable"` and continues. Even
when the file exists, not every measured tag lines up with a manifest tag
one-to-one (e.g. `al-button--icon` is a separate measured "tag" for the
icon-only case) — those contribute nothing extra; the base tag's own
measured entries still drive its contract.

## Generated per-component reference docs

Every contract has a GENERATED, human-readable Markdown twin at
`.altitude/contracts/docs/<project>/<tag>.md` — built by
`scripts/contracts/build-component-docs.mjs` from the tag's contract PLUS
that project's parity manifest (never the reverse; contract and manifest
remain the facts of record). Each doc spells out what a design tool — or
an agent driving the Figma MCP — needs before touching a component's Figma
set: description, semantics, the full props table (including any
`VARIANT`-bound axis and its unmapped option labels), states, slots (with
the `figmaPlaceholder` convention), events, a11y facts, the measured
anatomy's root token bindings and state overrides, `conditionalBindings`
as one table per variant/state, the code bindings, and — read live from
the parity manifest, not the contract's possibly-stale embedded copy — the
Figma set's name and pinned node id, or, for a set mapped by name only
(`nodeId: null` — see "Molecules must be resolved BY NAME" in
`altitude-figma-sync`'s `SKILL.md` and `.altitude/PARITY.md`), the by-name
resolution rule instead.

```bash
pnpm run contracts:docs                              # write, altitude
pnpm run contracts:docs:sl                           # write, southleft
node scripts/contracts/build-component-docs.mjs --component al-button   # one tag
pnpm run check:contract-docs[:sl]                    # drift gate — CI, leg 5 of gate:contracts
```

**GENERATED — never hand-edit a file under `.altitude/contracts/docs/`.**
Every doc opens with an HTML comment saying so and naming the regen
command. `check:contract-docs` re-derives every doc in memory and
byte-compares it against disk — including ORPHAN detection — and fails
naming exactly which file(s) drifted, the same discipline `check:llms`
applies to `llms.txt`. Scope matches `contracts:seed`/`--check-drift`:
every parity-tracked, non-`excluded` tag with a contract on disk; a
tracked tag with no contract yet is skipped with a logged line.

**Served over the MCP.** `altitude_get_component({ tag, project })`
carries the doc as `referenceDoc` (plus the raw `contract`) whenever both
exist — omitted entirely, never an error, for a tag with no contract.
`altitude-component-authoring`'s checklist (§8) runs `contracts:docs`
right after seeding a new contract; `altitude-figma-sync` reads the doc
before building or repairing a set.

## Deviations from `ds-contracts-poc`

The upstream schema is a small generative-layout DSL built for a system
that can *render* a component from its contract. Altitude's contracts are
**descriptive, not generative**: they document what the existing
hand-authored components and pipeline (CEM + token-map +
measure-components + parity manifest) already know. Every field below was
dropped, renamed, or narrowed for that reason — not by oversight.

| Upstream field | Altitude contract | Why |
| --- | --- | --- |
| `props[].type` as `boolean \| text \| number \| {enum} \| {arrayOf}` | `type: "boolean" \| "string" \| "number" \| "enum"` + `rawType` (original CEM TS text) + `values` | CEM types are free-text TypeScript, not a closed literal-object shape; normalizing to a flat enum plus preserving the raw text loses nothing and matches what `libs/altitude-mcp/src/lib/parity.mjs`'s `codeContract()` already does (`unionValues()`). No `arrayOf` — no Altitude component's public prop is a structured array-of-records in the CEM today. |
| `props[].bindings.figma.values` (code-value -> Figma-label object map) | `props[].bindings.figma.options` (raw Figma option labels, unmapped) | Pairing code values to Figma labels 1:1 by position is exactly what `parity.mjs diffFigmaContract()` calls out as fragile (labels differ on purpose). Emitting an unpaired list is honest; a guessed pairing would silently mint wrong facts. |
| `events[].bindings.code.prop` (`onEventName`), `trigger`, `toggles` | `events[].name` only (+ `description`) | Altitude's event contract (`this.dispatch({eventName, detail})`, see `AGENTS.md`) has no React-style `onX` prop naming and no declared trigger/toggle DSL to read from the CEM. |
| `semantics.roleByProp` / `elementByProp`, `figmaRepresentation`, `figmaStatePreviews`, `anchors` (top-level), `modes` | dropped | Design-tool render-mode metadata; nothing in CEM/measure-components/parity-manifest expresses it. |
| `anatomy.*.layout.{rows,columns,areas,gap,placement,flow}`, `shape`, `repeat`, `meter`, `icon`, `animation`, `content`/`textByProp`, `overridable`, `visibleWhen`, `attrs` | dropped; `anatomy.root` keeps only `tag`, `cls`, a coarse `layout` (`display`/`direction`/`align`/`justify`, no pixel geometry), `tokens`, `children`, and the nested-component annotation `component` | Generative-rendering primitives; Altitude's anatomy is a **read** of what `measure-components.mjs` observed, not a spec a renderer consumes. Pixel geometry (`x`,`y`,`w`,`h`) is deliberately excluded even though measured — geometry is not a token binding and would make every contract diff on every layout tweak. |
| `anatomy.*.states` / `stylesWhen` / `declaredStates` (per-part, arbitrary CSS declarations) | top-level `anatomy.stateOverrides`, **root node only**, restricted to token deltas | Root-level token deltas are the highest-signal case and match what the parity engine already treats as the interesting axis. Extending to per-part deltas is straightforward follow-up. |
| `provenance` (`canonicalRevision`, `sha256`, `awaitingCodeAdoption`) | dropped | No canonical-revision hashing scheme exists in this pipeline yet; `contractDigest()` in `parity.mjs` already plays a related role and isn't duplicated here. |
| `documentationLinks` | dropped | No per-component documentation-link registry exists to read from. |
| `a11y.{focusVisible,minHitArea,contrast}` | `a11y.{ariaAttributes,cssParts}` | The upstream fields are accessibility *requirements* a design system asserts; nothing in CEM/measure-components states them per component. What CEM *does* state: which attributes carry ARIA semantics (name matches `/aria/i`) and which `::part()` targets exist — both kept. |
| `bindings.figma.anchors.componentSetKey`, `representation`, `statePreviews` | `bindings.figma.{fileKey,componentSetName,nodeId,url}` | Altitude's parity manifest records a Figma **name** + **node id** per component, not a component-set key; `url` is the existing `figmaNodeUrlFor()` deep link, reused. |
| `bindings.code.anchors.{importPath,export}` | `bindings.code.{importPath,tagName,workspace}` | Altitude components are custom elements, not named JS exports — `tagName` and `workspace` (which npm package, base vs. brand layer) are the facts that matter; `importPath` is still included, built from the CEM's `modulePath`. |
| `status` enum `draft \| stable \| deprecated` | adds `"derived"` and `"source"` | `"derived"` — machine-generated, not yet hand-reviewed. `"source"` — adopted editable source: every contract in this repo carries it today (the adoption story: `DECISIONS.md` § T10). `draft`/`stable`/`deprecated` remain reserved for a further maturity ladder. |

### What's next (explicitly out of scope here)

- ~~Contract-level validation wired into CI~~ — DONE, see "CI gate".
- Per-part (not just root) state overrides.
- A "code" adapter that asserts the live component still matches the
  contract — **this is `--check-drift`**, DONE for the code side; the
  Figma-canvas side remains `contracts:diff` against a live extraction,
  not continuous.

---

Decision history and incident records: `DECISIONS.md` (same directory) —
the T-numbered narrative behind every mechanism above, including the
T22/T23 axis-mode pilot and its T31 revert, the T25 naming migration, the
T28 Phosphor bootstrap discovery, the T29 wrong-library incident, the T30
focus-ring saga, and the T32 border-collapse correction.
