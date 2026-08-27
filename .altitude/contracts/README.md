# Component contracts

A **contract** is a per-component, per-project JSON document that captures the
canvas-expressible API surface of one `al-*` component: its props (with legal
values and per-surface bindings), events, slots, interaction states, anatomy
(structure + token bindings, with per-state deltas where measured), a11y
facts, and the code/Figma bindings that let a tool jump straight to either
side. It upgrades Figma parity from digest-level ("something in this
component changed") to property-level ("this specific prop's legal values
changed").

**Contracts are editable source, not a generated artifact.** As of the T10
adoption pass (spec 2026-08-25-contract-backed-figma-parity-and-generation),
every contract carries `"status": "source"` and `"version": "1.0.0"`: hand
edits to a contract file are the reviewable unit of change (a **contract
PR** — see "The contract-PR flow", below), and `scripts/contracts/
emit-contracts.mjs` no longer regenerates them on every run. It was, at
first, a pure emitter — it derived every field below from what the repo's
other pipelines already produce, and that derivation is still exactly how a
contract gets its FIRST draft (`--seed`, for a component that has none yet)
and how it is checked for staleness afterward (`--check-drift`, contract ↔
code):

| Contract field | Source |
| --- | --- |
| `props`, `events`, `slots`, `semantics.element` fallback, `a11y.cssParts` | the CEM (`custom-elements.json`) — same reader as `libs/altitude-mcp/src/lib/cem.mjs` |
| `props[].bindings.figma`, `bindings.figma` (component-level) | the project's parity manifest (`.altitude/figma-sync/**/parity-manifest.json`) |
| `anatomy`, `states`, `semantics.element` | `scripts/figma-atoms/measure-components.mjs` output (`spec-light.json`), when present on disk |
| token references inside `anatomy` / `tokens` | `scripts/figma-atoms/token-map.mjs` (`CSS_TO_TOKEN`) |
| `conditionalBindings` (T18) | the component's own `.scss` — BEM modifier classes (`.al-c-<tag>--<suffix>`) and nested pseudo-class/attribute state rules, parsed with `postcss-scss`; omitted entirely for a component whose `.scss` has neither. Unlike `anatomy`, this is derived from source that IS available in CI, so it participates fully in `--check-drift` / `--check-determinism`, never excluded the way anatomy is when `spec-light.json` is unavailable. |

`status` and `version` are the two fields that are **curation metadata, not a
derived fact** — they say who owns the content now, not what the code/Figma
manifest currently produce — and `--check-drift` excludes both from its
comparison for exactly that reason.

Adapted from [`southleft/ds-contracts-poc`](https://github.com/southleft/ds-contracts-poc)'s
`contracts/contract.schema.json` — see **Deviations**, below, for exactly what
was kept, dropped, or reshaped and why.

**Contracts REFERENCE tokens, they never define them.** Every token-bearing
field holds a `--al-*` custom-property name (or, for schema/definitions
purposes, a token path) — never a resolved color/space/etc. value. The token
pipeline (`libs/al-web-components/styles/tokens/`) remains the only source of
truth for what a token *is*; a contract only says *which* token a part of the
component is bound to. Code stays hand-authored — contracts describe it, they
do not generate it (yet — see "What's next").

## Layout

```
.altitude/contracts/
  contract.schema.json        # the schema every contract below is validated against
  canvas-contract.schema.json # the schema CANVAS contracts (below) validate against — see "Canvas contracts"
  README.md                   # this file
  altitude/
    al-button.contract.json
    al-card.contract.json
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
<tag>.canvas.json` — gitignored, like every other artifact under
`figma-sync/` (a canvas dump is an OBSERVATION, not durable sync state; the
parity manifest remains the only tracked file in that tree). A canvas
contract validates against **`canvas-contract.schema.json`**, not
`contract.schema.json` — the two are deliberately different schemas, not the
same one with optional fields, because what a canvas read can honestly know
(variant axes, component properties, bound Figma variable *names*, text-style
names, states expressed as a variant axis, a shallow named-layer anatomy)
differs from what the code side knows (attribute names, `--al-*` token
names, ARIA attributes, CSS parts). Every canvas contract carries a
`degradations` array naming each contract.schema.json fact it could not
express, rather than omitting it silently — the convention this borrows from
`ds-contracts-poc`'s provenance/degradation fields.

`extractedAt` is deliberately not in the contract body, so the same inputs
produce a byte-identical file every run; the run timestamp and a per-set
digest live in one sidecar per project,
`canvas-contracts/canvas-extraction-meta.json`.

One subdirectory per `.altitude/ds-projects.json` project id. A tag that is
shared between projects (e.g. `al-button`) gets **one contract per project**
— deliberately: the two projects can observe different Figma bindings for the
same component (mapped in Altitude's file, unmapped in Southleft's), and
Southleft's `brandLibrary` supersedes some tags (`al-card`, `al-header`,
`al-footer`) with a different CEM entry entirely, so the contract content can
legitimately differ.

## Editing a contract (the contract-PR flow)

Since T10, a contract file is edited the same way any other tracked source is
edited — no separate tool required:

1. Open `.altitude/contracts/<project>/<tag>.contract.json` and change the
   field(s) that need to change (a prop's legal `values`, a corrected
   `description`, a token binding, `states`, …). Keep the file's existing key
   order and 2-space indent so the diff stays reviewable — the emitter's
   formatting convention, not a requirement enforced by tooling.
2. Bump `version` (semver) for anything a consumer would call a breaking or
   notable change to the contract's own content. `status` stays `"source"`
   (or advances to `"draft"` / `"stable"` / `"deprecated"` per the maturity
   ladder in `contract.schema.json`) — it does not revert to `"derived"`.
3. Open a PR. The diff IS the review: a reviewer reads exactly which
   props/events/slots/anatomy/bindings changed, same as reviewing a code
   diff — nothing to regenerate, nothing to reconcile before the PR is
   readable.
4. Reconcile the two things the contract now asserts:
   - **Code**: `pnpm run contracts:check` (`--check-drift`) re-derives every
     tracked component from the CEM/manifest/token-map/measure-components
     output and diffs it against the on-disk contract (`status`/`version`
     excluded — see above). A field it flags means the contract now
     disagrees with what the component's code actually does; either change
     the code to match the newly-edited contract, or the edit was wrong.
   - **Figma canvas**: `pnpm run contracts:diff -- --component <tag>`
     (`scripts/contracts/diff-contracts.mjs`, over a live-extracted canvas
     dump from `contracts:canvas`) does the equivalent check against the
     Figma side — see "Canvas contracts", above.
5. Once code and Figma both agree with the contract, stamp the sync:
   `pnpm run parity:synced <tag>` (or `parity:synced:sl`). As of T11 this
   also records the contract's own state at the moment of stamping —
   `lastSync.contractHash` (sha256 of the contract file) and
   `lastSync.contractVersion` (its `version` field) — in the parity
   manifest, so a later edit to the contract that nobody re-stamped shows up
   as `contractDrifted: true` on that component's parity report entry
   (`libs/altitude-mcp/src/lib/parity.mjs`). See `.altitude/PARITY.md`.

## Seeding a contract for a NEW component

A component with no contract file yet (a component just scaffolded, or one
newly added to a project's parity manifest) gets its first draft from the
same derivation the old always-overwriting emitter used to run on every
call — now opt-in and scoped to components that don't already have one:

```bash
pnpm run contracts:seed              # altitude — writes a contract for every tracked tag with none yet
pnpm run contracts:seed:sl           # == contracts:seed --project southleft
node scripts/contracts/emit-contracts.mjs --seed --project <id>
node scripts/contracts/emit-contracts.mjs --seed --force   # re-derive and OVERWRITE an existing contract — discards any hand edits; use deliberately, not by habit
```

The derivation itself is unchanged and still deterministic: stable key
order, 2-space indent, a trailing newline, and no timestamps — seeding twice
with no source changes and `--force` produces byte-identical output. `--seed`
reads `--project <id>` / `DS_PROJECT` the same way every other parity CLI
does (`libs/altitude-mcp/src/lib/ds-project.mjs`), defaulting to the
registry's default project (`altitude`).

**Scope: parity-tracked components only.** `--seed` iterates the active
project's parity manifest (`paths.parityManifest`) — that is the definition
of "tracked" this spec uses, T4's reconciliation checks against exactly this
list. A manifest entry with `excluded: true` (e.g. `al-icon`, `al-theme`,
`al-theme-switcher` — see `.altitude/ds-projects.json` `excluded`) is skipped
with a logged line; it is never silently dropped.

## Checking a contract against its sources (drift)

`node scripts/contracts/emit-contracts.mjs` with **no mode flag** now prints
a short usage note and exits 1 rather than silently overwriting hand-edited
contracts — pick one of:

```bash
pnpm run contracts:check                                        # --check-drift, altitude
node scripts/contracts/emit-contracts.mjs --check-drift --project southleft
node scripts/contracts/emit-contracts.mjs --check                # ajv-validate the on-disk contracts against contract.schema.json, read-only
node scripts/contracts/emit-contracts.mjs --adopt                 # ONE-OFF: the T10 adoption pass itself (derived -> source, 0.1.0 -> 1.0.0); idempotent, not a day-to-day command
node scripts/contracts/emit-contracts.mjs --add-conditional-bindings  # ONE-OFF: the T18 migration itself (merges the new conditionalBindings field into every on-disk contract, status/version untouched); idempotent, not a day-to-day command
```

`--check-drift` re-derives every tracked component in memory from its
sources and diffs it, field by field, against the on-disk contract —
excluding `status`/`version` (curation metadata, see above) — and exits 1 if
anything disagrees, printing exactly which fields drifted per component. A
missing contract file (a tracked component nobody has run `--seed` for yet)
is reported the same way. This is the CODE side of drift; the CANVAS side —
contract vs. a live Figma extraction — is `contracts:diff`
(`scripts/contracts/diff-contracts.mjs`), documented under "Canvas
contracts", above.

## CI gate

T15 (spec 2026-08-25-contract-backed-figma-parity-and-generation) wires the
code side of R7 — "the code side is validated against contracts" — into CI as
`pnpm run gate:contracts`, three legs, run for **both** projects
(`altitude` and `southleft`):

1. **Schema validation** (`contracts:validate[:sl]`, `--check`) — every
   on-disk contract must satisfy `contract.schema.json`. An illegal contract
   is refused **by name**: the offending file's path and the exact failing
   rule (e.g. `/status: must be equal to one of the allowed values`), not a
   bare exit code.
2. **Drift** (`contracts:check[:sl]`, `--check-drift`) — the CEM-derived API
   (props/events/slots/a11y/bindings, from `custom-elements.json` + the
   parity manifest + `token-map.mjs`) is re-derived and diffed against the
   on-disk contract on every run; `status`/`version` (curation metadata) are
   always excluded, and the anatomy-dependent fields (`anatomy`,
   `anatomySource`, `anatomyCase`, `tokens`, `states`, `semantics`) are
   additionally excluded **only** when this environment has no measured spec
   (`spec-light.json` — see "Anatomy availability is best-effort" below); a
   CI runner never has one, so it checks CEM-derived facts only, exactly the
   part of R7 this leg names.
3. **Determinism** (`contracts:check-determinism[:sl]`, `--check-determinism`)
   — every tracked contract is derived TWICE in memory, in the same process,
   from the same sources, and the two serializations are byte-compared. This
   proves the emitter itself is deterministic (same contract inputs -> same
   output) independent of git or the on-disk file — R7's "deterministic
   regeneration (same contract -> byte-identical ops/spec output)" leg.
   Scoped to **contract derivation**.
4. **Ops determinism** (`contracts:ops-determinism`, T12) — the "ops" half of
   the same R7 claim: `generate-figma.mjs`'s `buildOps()` derives the
   al-button contract's Figma ops artifact TWICE in memory and byte-compares
   the two serializations. Pilot-scoped (al-button, altitude only) — no Figma
   connection needed, since this checks the ops DERIVATION, not a live build;
   generalising to the full roster is follow-up once more than one component
   has been driven through `generate-figma.mjs`. See "Generating Figma sets
   from contracts (pilot)", below.

Any of the four failing fails the build. See `package.json`'s `gate:contracts`
script for the exact command chain, and `.github/workflows/v2-checks.yml`
(`repo-hygiene` job) for where it runs — after both the base and Southleft-
brand CEMs are built, since `--check-drift` needs both.

## Generating Figma sets from contracts (pilot)

T12 (this spec) closes the loop the other direction: a contract can drive the
**generation** of a Figma component set, not just describe one that already
exists. `scripts/contracts/generate-figma.mjs` reads a contract
(`.altitude/contracts/<project>/<tag>.contract.json`), derives a deterministic
intermediate **ops** artifact (`buildOps()` — stable key order, no timestamps,
same contract in -> byte-identical bytes out), and executes it over
`scripts/figma-atoms/mcp-shim.mjs` to build a real component set: the State
and Variant axes, PLUS a BOOLEAN component property per layout/slot boolean
— **property mode, the library's own default as of T31** (see "Fan-out
convention" below) — or, only when a contract hand-curates it, one more
VARIANT axis per curated boolean instead, OR NOTHING AT ALL for one curated
`omit`/`figmaOmit: true` (T27, see "Figma-expression opt-out" below), the
Text/Icon Before/Icon After component properties the contract's props/slots
warrant (the icon ones only when a slot names a `figmaPlaceholder`, resolved
against the Phosphor Figma library as of T28 and instantiated inside the
owner's DS "Icon" wrapper component as of T29 — see "Slot placeholder
instances (T19)", "Phosphor icon source (T28)", and "Slot icons instantiate
the DS Icon wrapper (T29)" below), and token-bound fills/strokes/spacing from
the contract's anatomy — nothing fabricated beyond what the contract states.
A `--sheet` flag (T31, see "Documentation sheet" below) builds a separate,
plugin-free Propstar-equivalent documentation grid of every property
combination next to the (lean, property-mode) set, without folding that
fan-out into the set's own variants.

**Module layout (2026-08-26 modularization).** `generate-figma.mjs` is now a
thin CLI/orchestrator; the generator lives in `scripts/contracts/figma/`:
`derive-ops.mjs` (the parity core — `buildOps()`, conditional-binding
resolution, enum-axis selection), `derive-sheet-plan.mjs` (`buildSheetPlan()`
+ label humanizers + border-collapse rules), `conventions.mjs` (library-wide
conventions: State order, canonical boolean-axis order, theme collection,
site background, Phosphor resolution rules incl. the T29 wrong-library
incident record), `sheet-style.mjs` (pure presentation: separator purple,
dash pattern, cell pitch defaults, doc-header wiring), `plugin-snippets.mjs`
(the single copy of the plugin-side guard/variable/text-style/cell-frame
helpers both emitters compose), `build-set-code.mjs` and
`build-sheet-code.mjs` (the two figma_execute code emitters).

**Per-component config (`figma.gen.json`).** Component-specific generation
judgment calls — icon size variable, full-width margin, label typography,
sheet cell pitch, an explicit enum-prop pick — live WITH the component in
`libs/al-web-components/components/<name>/figma.gen.json` (optional; defaults
documented in `scripts/contracts/figma/component-config.mjs`; al-button ships
the worked exemplar). Facts stay in the contract; judgment calls live next to
the component. The enum ("Variant") axis itself is contract-driven and no
longer assumes a prop literally named `variant`: any prop whose
`bindings.figma.kind` is `VARIANT` fans out under its own `property` name
(al-range's `behavior` -> a "Behavior" axis, al-input's `label` -> "Label").

```bash
node scripts/figma-atoms/mcp-shim.mjs                          # keep running (Figma Desktop open, Bridge plugin running)
node scripts/contracts/generate-figma.mjs --component al-button              # build/rebuild the lean, property-mode set
node scripts/contracts/generate-figma.mjs --component al-button --ops-only   # ops artifact only, no Figma call
node scripts/contracts/generate-figma.mjs --component al-button --check-determinism  # same contract, ops derived twice in memory, byte-compared
node scripts/contracts/generate-figma.mjs --component al-button --sheet      # T31: plugin-free documentation sheet, next to the set above
```

**Scratch-page policy.** Every generated set lands on a dedicated page —
`--page` (default `"Contract Pilot"`) — never on the tag's real, tracked page.
The page is created if absent, or REUSED with only its own children cleared
on a re-run (idempotent); no other page is ever read-write touched, and a
decoy-file guard runs before anything mutates. This is deliberate and
permanent, not a pilot-only training wheel: **promoting a generated set to
replace a tag's real Figma mapping — retargeting the parity manifest's
`figma.nodeId`/`figma.name`, deleting the old set — is an operator decision
made outside this script**, after a human has reviewed the generated set
(this is exactly why the pilot is verified against a copy of the code
contract via `extract-canvas.mjs --node-id <pilot set id>` +
`diff-contracts.mjs --canvas-file <pilot dump>` — see both scripts' `--node-id`
/ `--canvas-file` flags — rather than by overwriting the tag's tracked
canvas dump or manifest entry).

Ops artifacts land at `.altitude/figma-sync/<project's figma-sync
dir>/generated-ops/<tag>.ops.json` — gitignored, same zone as every other
figma-sync artifact (a build INPUT derived entirely from the tracked
contract, not durable state).

**Known, honest limits of a contract-driven build**, all named in the ops
artifact's own `degradations` array: `anatomy` still captures exactly ONE
measured case (see `anatomyCase`), so any root-level fact anatomy alone
carries (border-radius, gap, padding, icon size) is shared across every
Variant/State cell. T18 closed the biggest instance of this — per-Variant
background/text/border color and the Hover/Disabled state deltas now come
from `conditionalBindings` (recovered straight from the component's `.scss`,
see the table above), not from the single measured case — but a component
with NO `conditionalBindings` (no BEM modifiers, no nested state rules in its
`.scss`) still renders every cell identically, same as before T18. `active`
has no SCSS source in `al-button` at all (no `&:active` rule — the `:not()`
in the hover selector is an exclusion, not a state of its own), so its row
renders as Default until a component's `.scss` actually defines one. Anatomy
also carries no literal text content (`contract.schema.json`'s anatomyNode
has no `text` field), so the Text property's default is a placeholder.

**Slot placeholder instances (T19; naming convention updated T25; instance
vehicle changed T29 — see "Slot icons instantiate the DS Icon wrapper (T29)"
below for the current mechanism).** A `before`/`after` slot whose contract
entry carries `slots[].figmaPlaceholder` gets a real icon INSTANCE built in
the right leading/trailing position, wired to Slot Before/After (BOOLEAN
`visible`) and Icon Before/After (INSTANCE_SWAP `mainComponent`), and
recolored **recursively** to that row's own resolved content-color token (the
same paint the label text uses — confirmed against the real set: icon fill
and label fill are always the identical bound variable, every Variant/State
row), per the Icon Recoloring reference. A slot with no `figmaPlaceholder`
still degrades to the boolean-only behavior from T12/T18 (no INSTANCE_SWAP
property, no icon instance) — a documented gap, not
a guess.

**`figmaPlaceholder` names a Phosphor catalog entry, not a Figma-side name
(T25).** Every real Figma component set's `Icon Before`/`Icon After`
INSTANCE_SWAP property has a `defaultValue` node id; resolving that id live
gives the DEFAULT icon INSTANCE's own name, which is what gets recorded here.
Before T25, that name was whatever the Figma-side icon library called it — the
now-retired "🛠 Icons" page (al-button's real set: "done-circle" before, "send"
after). The owner has since added a Phosphor library to Figma, and Phosphor
(`libs/al-web-components/components/icon/catalog.ts` + `phosphor/*.ts`) is the
icon source going forward on BOTH sides — so as of T25, a discovered name is
resolved BY HAND to its nearest Phosphor catalog entry before being written
into the contract (al-button: "done-circle" -> "check-circle", "send" ->
"paper-plane") — the contract always stores the CODE-side (Phosphor) name now,
never the old Figma-side one. `apps/docs/src/lib/contracts.mjs`'s playground
default reads `figmaPlaceholder` directly as a catalog name for exactly this
reason (its old done-circle/send -> check-circle/paper-plane translation table
is gone — the contract already speaks Phosphor). Resolving a Phosphor name
back to a live instance in the Figma-side Phosphor library at generation time
is implemented as of T28 — see "Phosphor icon source (T28)" below for the
resolution mechanism and its honest, environment-dependent limits. The
placeholder remains resolved **by name**, never a node id, in the contract or
the ops artifact either way, since icon libraries re-mint ids on republish.

**Sweep coverage (T25).** Live-verified against the real Altitude Figma file
(`y83n4o9LOGs74oAoguFcGS`): al-banner, al-menu-item, al-empty-state, al-input,
al-range, and al-textarea's real sets have **no** `Icon Before`/`Icon After`
INSTANCE_SWAP property at all — confirmed by reading each set's
`componentPropertyDefinitions` live, not assumed — so none gets a
`figmaPlaceholder`. al-alert, al-toast, al-stat, al-stepper-item, and
al-calendar have no Figma mapping in the manifest at all (`figma: null`),
so there is no real set to check. Southleft's `al-button`/`al-card`/`al-input`/
`al-stat` (a different Figma file, `rdhBS9t89V42E7EfiPjmSa`) were **not**
swept this session — that file was not the one open in Figma Desktop — and
are left exactly as they were rather than guessed.

## Fan-out convention (T22/T23; reverted to property mode T31)

A curated boolean **can fan out as its own True/False VARIANT axis** — a
separately-built component per combination, cartesian with every other axis
— instead of staying a single shared BOOLEAN component property. Curation is
a schema-additive field, hand-set per contract, never derived:

- `props[].bindings.figma.axis: true` (alongside `kind: "VARIANT"` and
  `options: ["False", "True"]`) — a layout boolean like `fullWidth`.
- `slots[].figmaAxis: true` — a `before`/`after` slot.

**Property mode — booleans as shared BOOLEAN component properties, never an
axis — is the library's own default, and (T31) al-button's contract no
longer curates anything otherwise.** T22/T23 curated al-button's `fullWidth`/
`before`/`after` into axis mode as a deliberate PILOT of the fan-out
convention, reasoning from a Propstar documentation-sheet screenshot the
owner had shared. That screenshot showed every property combination as a
separate labeled INSTANCE in a reference grid — a Propstar-generated
**documentation artifact**, not the real component set's own variant
structure. T31 corrected this reading after re-confirming live against the
REAL Button set (node `4271:9562`, `y83n4o9LOGs74oAoguFcGS`):
`componentPropertyDefinitions` there has always been the LEAN 25 variants
(State × Variant only) with `Slot Before`/`Slot After` as plain BOOLEAN
properties — exactly what T22/T23's own "Deliberate discrepancy" warning
below already said, before this task acted on it. al-button's contract
(`.altitude/contracts/altitude/al-button.contract.json`) has had its
`figmaAxis: true` curation removed from both slots as of T31; the Contract
Pilot regeneration is 25 variants again, matching the real set's own shape.
Every fan-out combination this task's Propstar screenshot wanted to see is
now available a different way — see "Documentation sheet (`--sheet`, T31)"
below.

**The fan-out machinery itself is NOT removed** — the schema fields, the
`booleanAxisDefs`/cartesian derivation in `scripts/contracts/figma/derive-ops.mjs`'s `buildOps()`,
and this whole section's mechanics remain fully live, for two reasons: (1) a
FUTURE component's real Figma set might genuinely fan a boolean out as its
own axis, in which case curating `figmaAxis`/`axis: true` for THAT component
is the correct, deliberate call this field exists for; (2) `--sheet` mode
(T31) reuses this exact machinery internally (`buildOps(contract, {
forceAllBooleanAxes: true })`) to derive its own documentation-grid cartesian
product, rather than re-implementing the fan-out a second way. "Repurposed,"
not deleted.

**Why axes, not properties, for slots — when curated.** A shared BOOLEAN
property's visibility is a single runtime toggle across every variant — a
static focus ring built at generation time (`ring.resize(comp.width + 8,
...)`) can only ever be correct for ONE render of that toggle, usually the
built default (icons hidden). Fan out the slot as an axis instead and every
combination is its own real component, built with its OWN true geometry
(icons shown or hidden, full width or not) BEFORE the ring is sized — so the
ring is correct for every combination, not just the default one (T22). T30's
focus-as-frame-stroke fix (a real Figma stroke follows the frame's own true
bounds automatically) made this no longer necessary for al-button — a stroke
on a property-mode component is correct for whichever combination of
booleans that SAME component currently has toggled, with nothing to
pre-bake — which is what let T31 revert al-button to property mode at all.

**Generalized default, for any component:** an `enum` prop is always an axis
(unchanged, pre-dates this curation field entirely — see the `variant`
prop's own binding). A `before`/`after` slot or a layout-affecting boolean is
a component property **unless** curated `figmaAxis`/`axis: true` — curate it
only for a component whose REAL (or confirmed-intended) Figma set
demonstrably fans that boolean out as its own axis, never as a default. An
unknown/behavior-only boolean (e.g. `hideText`) stays a property regardless —
there is nothing to "fan out" visually for it.

**Icon Before/After stay component properties either way.** The real Button
set keeps them that way even for a component that DOES curate other things
into axis mode, and generate-figma.mjs mirrors that: the icon INSTANCE_SWAP
property is wired post-`combineAsVariants` exactly as T19 built it; only the
icon's per-variant VISIBILITY would move from a runtime property reference to
a static per-variant bake if its slot were ever curated as an axis.

**"Is Full Width" has no measured pixel fact.** Contracts carry no pixel
geometry at all (see "Deviations" below) and no real Figma set exposes this
as an axis to inspect — a component that DID curate this into axis mode would
render it as the variant's own natural hug width plus a fixed margin
(`fullWidthExtraPx` in the component's `figma.gen.json`, default in `scripts/contracts/figma/component-config.mjs`), a documented judgment call,
not an observed target width. al-button's own `fullWidth` is curated
`omit: true` instead (see "Figma-expression opt-out" below) — not built at
all, axis or property.

## Documentation sheet (`--sheet`, T31; humanized labels, a real bordered
table, and a doc-page header, T32)

A plugin-free equivalent of the Propstar documentation-grid screenshot that
originally motivated T22/T23's (since-reverted) axis-mode curation —
available to anyone who can run `generate-figma.mjs`, no Figma plugin
install required (Propstar or otherwise), which matters because an agent
cannot launch a Figma plugin and a colleague may not have Propstar installed
at all.

```bash
node scripts/contracts/generate-figma.mjs --component al-button              # 1. build/rebuild the lean, property-mode set first
node scripts/contracts/generate-figma.mjs --component al-button --sheet      # 2. THEN build/replace its documentation sheet
node scripts/contracts/generate-figma.mjs --component al-button --sheet --ops-only          # sheet PLAN artifact only, no Figma call
node scripts/contracts/generate-figma.mjs --component al-button --sheet --check-determinism # same contract, sheet plan derived twice in memory, byte-compared
```

**What it builds.** A frame named `"<Component> — Prop Sheet"` — its OWN
top-level frame on `--page`, positioned next to (never inside or on top of)
the set's own `"<Component> — Generated"` presentation frame — containing an
instance of the file's own "Documentation Header" master (T32, see below) at
the top, then a genuine nested-auto-layout TABLE of real INSTANCES of the
already-built (property-mode) set below it, one instance per State × Variant
× every other BOOLEAN component property combination (al-button: 5 × 5 × 2 ×
2 = 100), each switched into its own combination via the Figma plugin API's
`setProperties` against the TARGET set's real property definitions — never a
freshly-built component, never a runtime-shared toggle. Idempotent:
re-running REPLACES the prior sheet frame by name, never appends a second
stale copy alongside it, and never touches the target set (read-only lookup
by name) or the target's own presentation frame.

**A real table, CSS `border-collapse`-simple (T32; corrected mid-task after
owner review of a zoomed screenshot).** The grid is nested auto-layout
frames — one VERTICAL "Sheet Grid" containing a header row and one frame per
Variant group (a banner row + one row per boolean combo), each row a
HORIZONTAL frame of FIXED-width cell frames (one per State column, or the
row-label column) — never a `figma.createVector()` line and never a
manually-positioned x/y (an earlier same-task cut tried exactly that; it was
superseded before shipping). A FIRST T32 cut gave every cell its own 4-side
"collapsed borders" stroke (right+bottom always, plus left/top for edge
cells) — the owner's own zoomed screenshot showed this rendering as separate
floating dashed boxes with doubled/offset edges, not one grid. The corrected
rule, verbatim: **"only stroke on main container, rows - bottom (except for
last), columns - right (except for last)."** Exactly three stroke sources
now exist anywhere in the sheet: the outer "Sheet Grid" frame draws a full
four-side border once (`sheetGrid.strokeTopWeight` etc., set directly in
`buildSheetSetupPluginCode`); every ROW (header, banner, or data — the rule
does not distinguish them) draws ONLY its own bottom edge, none on its
absolute LAST row (the container's own bottom edge closes that one instead —
drawing both would double it); every CELL draws ONLY its own right edge,
none on the row's last cell (same reasoning, horizontal axis). A
Variant-group boundary is simply that group's own last row's bottom weight
upgraded to `SHEET_SEPARATOR_GROUP_WEIGHT` (2px vs the ordinary 1px) — one
line, heavier, never a second frame or a banner-side stroke. `itemSpacing: 0`
on every row AND every group/grid-level frame is what makes these
single-edge strokes read as ONE continuous line rather than a gap-then-a-line
— see `rowBottomWeight()`/`cellRightWeight()` in `scripts/contracts/figma/derive-sheet-plan.mjs` for the
exact pure-function rule, and `.mm/specs/2026-08-25-contract-backed-figma-
parity-and-generation/verification/screenshots/t32-prop-sheet-borders-detail.png`
for a zoomed crop proving no gaps/doubles. Every cell also gets real
bindable padding (`SHEET_CELL_PADDING_FIGMA_VAR`, `theme/space/sm`) and the
grid itself gets its own (`SHEET_GRID_PADDING_FIGMA_VAR`, `theme/space/lg`,
one step in from the outer container's `theme/space/xl`) — both real
auto-layout `padding*` bindings now that every frame involved is genuine
auto-layout, not the `layoutMode: 'NONE'` canvas an earlier cut used (which
had no such property to bind at all).

**Requires the set to already exist.** `--sheet` never creates the lean set
or the page it lives on — run `generate-figma.mjs` WITHOUT `--sheet` first
(or point it at a real, hand-built set of the same name already on
`--page`). It also means regenerating the base set (a plain, non-`--sheet`
run) clears the WHOLE page, including a previously-built sheet frame — same
"reused with only its own children cleared" page policy the base builder has
always had (see "Scratch-page policy" above) — so re-run `--sheet` again
after any base regeneration if the sheet should still be there.

**Grouping (a documented judgment call — see `buildSheetPlan()`'s own
comment in `generate-figma.mjs`).** COLUMNS = State, matching the live set's
own primary grid axis. ROW GROUPS, outermost to innermost = Variant, then
every other boolean axis in the SAME `BOOLEAN_AXIS_CANONICAL_ORDER` the
(possible, if curated) axis-mode fan-out above already uses (Slot Before,
Slot After, Is Full Width) — one banner cell per Variant value, one label
cell per combination of the remaining booleans. This is "a clean
deterministic grouping," not an attempted pixel-for-pixel replica of the
owner's Propstar reference screenshot, which was a reference image, not
machine-readable input to this generator.

**Labels are humanized, never a raw property dump (T32).** A column header
or banner reads the bare axis VALUE — `"Hover"`, `"Primary"` — never
`"State=Hover"`/`"Variant=Primary"`. A row label describes only what is ON:
`"Default"` when every boolean in that row is off; a slot boolean reads
`"Icon before"`/`"Icon after"` (or `"Content before"`/`"Content after"` for a
slot with no `figmaPlaceholder` — see `slotNounFor()`), multiple ON sides
sharing the same noun collapse and pluralize (`"Icons before + after"`),
different nouns join as separate singular terms (`"Icon before + Content
after"`); a non-slot boolean (a future component's, e.g. a curated `Is Full
Width` axis) reads `"With full width"`. See `humanizeAxisValue()`/
`humanizeBooleanCombo()` in `scripts/contracts/figma/derive-sheet-plan.mjs` — pure string derivation
from the contract, covered by the same `--check-determinism` proof as
everything else in this plan.

**Documentation-page header (T32).** The sheet's own container frame opens
with an INSTANCE of the file's "Documentation Header" component (a single
COMPONENT, `componentPropertyDefinitions: {}` — no exposed properties, so its
text is overridden by editing child TEXT nodes directly, not
`setProperties`), resolved BY NAME on the file's own "Documentation" page
(never by node id — the same by-name convention `findIconWrapperComponent`
already uses for another file-local master). This component has exactly ONE
other placement in the whole file (the master itself, used directly as the
file's own "Documentation" landing page banner) — there is no established
"component doc header" reuse convention to mirror, so this is new territory,
not a copied pattern; see `SHEET_DOC_HEADER_MASTER_NAME`'s own comment in
`scripts/contracts/figma/sheet-style.mjs` for the full discovery. Content, all contract-derived
and deterministic: the master's "Heading" text becomes the component's own
display name (`contract.name`, e.g. "Button"); "Sub Heading" is left
UNTOUCHED ("Altitude Design System" — the task named a title and a
description only); "Description" becomes the contract's own `description`
field (trimmed/capped, `SHEET_DOC_HEADER_DESCRIPTION_MAX`) with a trailing
HYPERLINKED "View full documentation" run (`TextNode.setRangeHyperlink` on
just that trailing range — the master has no separate link element to
reuse). **The link is a DUMMY placeholder** —
`https://altitude.pages.dev/docs/components/<tag-minus-al->/` (e.g.
`.../docs/components/button/`) — the docs site's own future per-component
routing shape, wired now because docs are not published per-component yet;
revisit once they are (T20's own generated `.altitude/contracts/docs/
<project>/<tag>.md` is a candidate source for that eventual page).

**Repurposes the T23 fan-out machinery, does not duplicate it.**
`buildSheetPlan()` calls `buildOps(contract, { forceAllBooleanAxes: true })`
— the SAME `booleanAxisDefs`/cartesian derivation the (deprecated-by-default)
axis mode above uses, just forced on for every non-omitted boolean
regardless of the contract's own curation — to get the full cartesian
`variants` list, then only RE-GROUPS that list for rendering as sheet
instances. It builds nothing itself and does not re-derive the cartesian
product a second way.

**Batched across multiple `figma_execute` calls, by design.** The Desktop
Bridge enforces a hard ~30s execution ceiling per call (see T28's own
comments on this file). Rather than one call creating all ~100 instances,
`--sheet` issues one SETUP call (creates/replaces the sheet frame, builds the
doc header instance, and builds the table's header row) followed by one call
PER Variant row group (al-button: 5 calls, building that group's banner +
rows + 20 instances each) — 6 total calls for the pilot, each appending its
own group frame to the shared "Sheet Grid" auto-layout frame the setup call
created. Every cell uses a FIXED width (`SHEET_ROW_LABEL_WIDTH_PX`/
`SHEET_CELL_WIDTH_PX` in `generate-figma.mjs`) rather than measuring an
instance's true rendered size — the live set's own "measure worst-case width
after building" dance (see T21/T28's comments) is exactly the kind of extra
per-call work a ~100-instance batch cannot afford under this ceiling.

**Ops artifact.** `.altitude/figma-sync/<project's figma-sync
dir>/generated-ops/<tag>.sheet.ops.json` — same gitignored zone, same
"deterministic build INPUT, no ids" rules as the lean set's own
`<tag>.ops.json` (`buildSheetPlan()` is a pure function; `--check-determinism`
proves it the same way).

**Relationship to Propstar.** Propstar (the interactive Figma plugin) remains
a perfectly valid OPTIONAL way to build the same kind of reference sheet by
hand, live, inside Figma — nothing here removes it or discourages using it.
`--sheet` is the CANONICAL, automatable, plugin-free equivalent: no install,
runs from any shell with the Desktop Bridge connected, reproducible from the
contract alone.

**Deliberate discrepancy — verify before trusting "matches the real set."**
(Historical, T22/T23; resolved T31.) al-button's contract briefly curated all
three (`fullWidth`, `before`, `after`) into axis mode, growing the Contract
Pilot regeneration from 25 to 200 variants (State × Variant × Slot Before ×
Slot After × Is Full Width) — later 100 once `fullWidth` was marked `omit`
(T27). This was verified, live, against the REAL Button set (node
`4271:9562`, `y83n4o9LOGs74oAoguFcGS`) at T22/T23 time to NOT match: the real
set has always had 25 variants, with `Slot Before`/`Slot After` as BOOLEAN
component properties, not axes. T31 closed this gap by removing the
curation rather than converting the real set — re-verify live
(`figma_get_status` + read `componentPropertyDefinitions` off node
`4271:9562`) before asserting either set's shape in a future task; this
paragraph will go stale the moment someone curates a NEW component into axis
mode for a confirmed-real reason.

## Figma-expression opt-out (T27)

A prop or slot that is real in CODE can still be curated OUT of the
generated Figma surface entirely — reserving the right to say "I don't need
that in Figma" (the owner's own words, about al-button's `fullWidth`).
Schema-additive, hand-curated only, no derivation source (same principle as
`figmaPlaceholder`/`figmaAxis`/`axis` above):

- `props[].bindings.figma.omit: true` — e.g. al-button's `fullWidth` (both
  projects). When set, that is typically the ONLY key on the `figma` object
  — there is nothing else to record about a Figma binding a prop
  deliberately has none of.
- `slots[].figmaOmit: true` — a `before`/`after` slot.

**Generator effect** (`generate-figma.mjs`): an omitted prop/slot produces
**nothing** — no VARIANT axis, no BOOLEAN component property, no icon
instance, no Icon Before/After INSTANCE_SWAP property for an omitted slot.
al-button's pilot regenerated at 100 variants (5 State × 5 Variant × 2 Slot
Before × 2 Slot After) once `fullWidth` was marked omitted — down from T23's
200, with no `Is Full Width` axis anywhere on the set. (T31: al-button's
`before`/`after` slots have since had their OWN `figmaAxis: true` curation
removed too, dropping the Contract Pilot regeneration to the lean, real-set-
matching 25 variants — see "Fan-out convention" above. `fullWidth` stays
`omit: true` either way; omission and axis-mode curation are independent
fields.)

**Differ effect** (`contract-diff.mjs`): an omitted prop/slot absent from
canvas — the DESIRED state — is a named `skipped` entry
(`reason: "intentional-omission"`), never a `missing-in-canvas`/
`slot-unpaired` disagreement. Canvas STILL exposing a property that pairs to
an omitted prop/slot's name IS a real disagreement (`kind:
"present-despite-omission"`) — the curation says it should not be there.
Both branches are self-test-covered (`scripts/contracts/diff-contracts.mjs
--self-test`, cases (e) and (f)).

**`--check-drift`/`--refresh` treat these fields like `status`/`version`** —
hand-curated, carried forward from disk, never flagged as drift against a
fresh derivation (`carryForwardPropAxisCuration`/`carryForwardSlotExtensions`
in `emit-contracts.mjs` — the same functions the axis curation already used,
extended rather than duplicated).

**Generalized default for other components:** nothing is omitted unless
curated — an un-curated prop/slot behaves exactly as it did before T27.

## Phosphor icon source (T28)

Slot placeholder instances (see "Slot placeholder instances (T19)" above) are
instantiated from the **Phosphor** Figma library — never the legacy local
"🛠 Icons" page, which `generate-figma.mjs` no longer looks up at all (the
owner: "let's not use the icon component that was in the figma bc that's the
old icons... let's use the Phosphor library I added").

### Bootstrap convention (reproducible)

The Figma plugin API has **no team-library component enumeration** —
exhaustive introspection of `figma.teamLibrary` in this environment found
exactly two methods, `getAvailableLibraryVariableCollectionsAsync` and
`getVariablesInLibraryCollectionAsync`, both VARIABLES-only, nothing for
components. This bridge's REST-backed tools (`figma_search_components`,
`figma_get_library_components`, name-based `figma_instantiate_component`)
are unusable without a `FIGMA_ACCESS_TOKEN` (`figma_diagnose`: "No Figma
access token detected") — they hang for the full execution ceiling rather
than resolving, in this environment.

The one resolution path that DOES work with no REST call at all: place a
real INSTANCE of the needed Phosphor icon **anywhere in the file** (a
`.mainComponent` reference is already fully resolved locally, live, once an
instance exists — no import needed). The owner's own bootstrap did exactly
this — a component named "Icon" on the "🛠 Icons" page (node `3509:4324`)
wraps a placed Phosphor instance internally. A second, independently useful
example was found already sitting in the file: an existing al-alert
"🛝 Playground" prototype's `type=success` states override their icon slot
with a remote "CheckCircle" instance. **To bootstrap a new icon**: place one
instance of it (drag from the Assets panel, or swap an existing
INSTANCE_SWAP slot to it) on either the "🛠 Icons" or "🛝 Playground" page —
`generate-figma.mjs` scans exactly those two pages (see below) and will pick
it up on the next run.

### Naming, CONFIRMED LIVE

Phosphor components are named in **PascalCase with no separators**
("ApproximateEquals", "CheckCircle") — NOT the kebab-case catalog names
(`libs/al-web-components/components/icon/catalog.ts` style, "check-circle")
a contract's `figmaPlaceholder` stores (the T25 decision: the contract always
speaks the CODE-side/catalog name). Matching is NORMALIZED (lowercase,
non-alphanumeric stripped) on both sides — "check-circle" and "CheckCircle"
both normalize to "checkcircle" — never an exact string compare.

A Phosphor icon may be cached locally as a full **COMPONENT_SET** with
"Format" (Outline/Stroke) × "Weight" (Thin/Light/Regular/Bold/Fill/Duotone)
variants (the owner's bootstrap, "ApproximateEquals" — all 12 variants
cached the moment any ONE was placed) OR as a single **flat component** with
no variant grouping at all (the al-alert prototype's "CheckCircle" — one
Vector child, no parent set). `generate-figma.mjs` handles both: when the
match is a COMPONENT_SET, it selects a `Weight=Regular` variant (tie-broken
toward `Format=Stroke`) per the task's "prefer the regular weight"
instruction; a flat component is used as-is.

### Resolution mechanism (`findPhosphorComponentByName`)

In this order — **the scan runs FIRST, the key registry is a fallback LAST**
(reversed from the original design; see the pitfall below):

1. A bounded-depth scan across `PHOSPHOR_PRIORITY_PAGE_NAMES` (`"🛠 Icons"`,
   `"🛝 Playground"` today — the two pages a Phosphor instance has ever
   actually been found on) for an existing instance whose main component is
   REMOTE (`.remote === true`) and name-matches (normalized). A hard
   node-visit budget (`PHOSPHOR_SCAN_NODE_BUDGET`) bounds worst-case time.
2. `PHOSPHOR_KEY_BY_NAME` — a hand-maintained `name -> published component
   key` registry, tried only if the scan above found nothing.

**Resolution failure degrades cleanly, per name** — logged in the ops
result's `missingVars` (e.g. `phosphor-component-not-found:paper-plane`),
never a silent fallback to the old icons page: no icon instance is built for
that side, and no Icon Before/After INSTANCE_SWAP property is added either —
the Slot Before/After axis or property is unaffected either way. As of the
T28 pilot regeneration: `check-circle` resolves (100 variants, `Icon Before`
present); `paper-plane` does not — no remote instance anywhere in the
document matches "paper-plane"/"PaperPlane"/"PaperPlaneTilt" or similar,
checked live.

### Three hard-won pitfalls (all CONFIRMED live, in this order of discovery)

1. **The Desktop Bridge enforces a hard ~30s execution ceiling per
   `figma_execute` call, independent of the `timeout` this script
   requests** — raising it as high as 280000 made no difference; the error
   is always exactly "Execution timed out after 30000ms". Two things blew
   this budget once icon resolution started succeeding: an UNBOUNDED
   page-by-page scan (`page.loadAsync()` on ~56 pages the icon was never
   going to be on, called unconditionally before any per-node budget check
   could matter) — fixed by scoping to the two known-relevant pages only;
   and `figma.importComponentByKeyAsync(key)`, which hung for the FULL
   ceiling on its own even for an already-known-good key — apparently a
   network-backed call, unreliable in this environment, which is why the
   scan is tried first and the key registry is now the fallback, not the
   other way around.
2. **Icon templates must be created AFTER the target page is current, not
   before.** Creating one shared template instance per icon (to `.clone()`
   per variant, avoiding repeated `createInstance()` against a remote
   component) before switching to the "Contract Pilot" page left the
   templates rooted on whichever page was active when the script started;
   once that source page was unloaded again (`documentAccess: dynamic-page`
   — see the "Hard-won traps" section of `altitude-figma-sync`'s SKILL.md),
   `.clone()` failed with "the node ... does not exist".
3. **`.clone()` of a Phosphor instance silently corrupts its rendered
   geometry** — the cloned vector's `.vectorPaths` reads back a
   normal-looking path string, but it renders as a solid filled block, not
   the icon's real shape. Root cause not fully diagnosed (an
   instance-override materialization quirk under this bridge, most likely).
   Verified fix: use `createInstance()` per occurrence instead — but only
   for a row that actually SHOWS the icon (axis-mode: roughly half of the
   fanned-out rows), not all 100, which keeps total call volume low enough
   to stay under pitfall 1's ceiling.
4. **Recoloring the icon INSTANCE's own top-level fill, not just its
   descendants, is fine for the old local icon convention but wrong for
   Phosphor.** The old "🛠 Icons" components' instance root had an empty
   `fills` array, so `recolorIconTree`'s root-level fill/stroke rewrite was
   a harmless no-op there. A Phosphor "CheckCircle"-style icon's instance
   root carries a real, non-empty fill of its own alongside the inner
   Vector's; overwriting BOTH to the same paint destroys the negative-space
   contrast a checkmark-in-circle glyph depends on (the "hole" becomes
   indistinguishable from its own backing), rendering as one uniform block.
   Fixed by `recolorIconChildren` — recolors every DESCENDANT, never the
   instance's own top-level paint.

**Recoloring, once fixed per pitfall 4 above, is CONFIRMED working on
Phosphor's flat vector fills** — the icon's Vector fill and the row's label
text fill read back as the identical bound Figma variable across every
tested variant (Primary/Danger/Bare), exactly matching the T19 convention's
original guarantee for the old icon source.

## Slot icons instantiate the DS Icon wrapper (T29)

T28 instantiated the resolved Phosphor glyph directly as the slot icon's TOP-
LEVEL instance. The owner corrected this: her file has a hand-built DS "Icon"
wrapper component — a lone `COMPONENT` named exactly `"Icon"` (id `3509:4324`,
sitting on the "🛠 Icons" page, **not itself a `COMPONENT_SET`** — it has no
`componentPropertyDefinitions` of its own, `variantProperties: null`) whose
one child is an INSTANCE of a Phosphor glyph. A slot icon must be an INSTANCE
OF THAT WRAPPER with the Phosphor glyph swapped into its nested child — never
a raw top-level Phosphor library instance, mirroring code using `<al-icon>`
rather than an inline SVG.

**Mechanism (live-confirmed, not the property-based swap originally
assumed).** Because the wrapper is a plain `COMPONENT`, not a `COMPONENT_SET`,
it exposes **no INSTANCE_SWAP property of its own** for the inner glyph
(`addComponentProperty` is a `COMPONENT_SET`-only API — SKILL.md §3). The
glyph is therefore swapped directly on the wrapper's nested child instance —
`nested.swapComponent(resolvedPhosphorComponent)` — never through a component
property. `generate-figma.mjs`'s `findIconWrapperComponent()` resolves the
wrapper BY NAME (never a node id) the same way `findPhosphorComponentByName`
resolves a glyph, scanning `PHOSPHOR_PRIORITY_PAGE_NAMES`; a `COMPONENT_SET`
hit (if the wrapper is ever converted to one) resolves to its own
`defaultVariant`. The Icon Before/After INSTANCE_SWAP property wired on the
generated BUTTON set targets the WRAPPER's own id as its `mainComponent`
default (mirroring the real Button set's own `preferredValues` shape — a
one-entry `[{ type: 'COMPONENT', key }]` array — though this environment's
`addComponentProperty` silently does not accept a 4th `preferredValues`
argument; the fallback 3-arg call is used and the gap is reported as
`instance-swap-preferred-values-unsupported`).

**WRONG-LIBRARY INCIDENT — name-matching a remote component is not proof of
library membership.** The first working version of this fix resolved
"check-circle" to a REMOTE component literally named "CheckCircle" found on
the "🛝 Playground" page (key `8362189ea7dca44f1ef7aa55495ec46f1f0f91f6`) and
shipped it. The owner identified it as belonging to a **different, unrelated
library** ("CBDS UI kit demo") that happens to also ship a component named
"CheckCircle" — this file has at least two libraries with overlapping icon
names, and matching by name alone is not sufficient proof of provenance. The
one PROVABLE, structural signal found live: every genuinely Phosphor-cached
icon in this file (confirmed for "ApproximateEquals", the icon the owner's
Icon wrapper happened to nest at bootstrap time, and later for "CheckCircle"/
"PaperPlaneTilt" once she placed real Phosphor instances) is cached as a full
`COMPONENT_SET` with `Format` (exactly `Outline`/`Stroke`) × `Weight` (a
subset of `Thin`/`Light`/`Regular`/`Bold`/`Fill`/`Duotone`) variants; the CBDS
collision has **no parent set at all** (`main.parent` reads back `null` — a
flat, ungrouped remote reference). `isVerifiedPhosphorIconSet()` enforces
exactly this shape and REFUSES a name match with no verified parent set, no
exceptions — including through the `PHOSPHOR_KEY_BY_NAME` hand-typed-key
fallback (a hand-typed key gets no exemption; verified the same way a scan
hit is). `PHOSPHOR_KEY_BY_NAME`'s "check-circle" entry (the wrong CBDS key)
is **removed**, not deprioritized. **What library metadata the plugin API
actually exposed for a remote `mainComponent`**, for future reference: `.key`
(always present, globally unique per component, but shared library
membership is NOT derivable from the key string itself — no common prefix or
pattern), `.remote` (boolean only — which library is not exposed), `.parent`
(the most useful signal in practice: `null` for a flat/ungrouped remote
reference vs. a real local `COMPONENT_SET` mirror for one cached alongside
its full variant family), `.description` / `.documentationLinks` (present
but empty or unhelpful for both the trusted and untrusted candidates in this
file — not a reliable signal here). No plugin API surface in this environment
names the actual library a remote component came from.

**Name aliasing, hand-curated, exact only.** The owner's own placed
"paper-plane" demo instance is named Phosphor's **"PaperPlaneTilt"**, not a
bare "PaperPlane" — a real, more specific Phosphor icon name, confirmed via
her own bootstrap instance on the "🛠 Icons" page. `PHOSPHOR_NAME_ALIASES`
maps the catalog-normalized name to the set of Figma-side names accepted —
`paperplane: ['paperplane', 'paperplanetilt']` today — an EXACT alias table,
never a substring/fuzzy match (a looser rule is exactly the shape that let
the CBDS collision through).

**Recolor must skip the top-level fill at EVERY instance boundary, not just
the outermost one.** `recolorIconChildren` recurses one level further now: a
child that is itself an `INSTANCE` (the wrapper's nested Phosphor glyph) is
recursed into via `recolorIconChildren` again — skip-this-root, recolor-below
— rather than `recolorIconTree` (recolor-everything-including-this-root).
Pitfall 4 above (recoloring a Phosphor instance's own root fill destroys
negative-space contrast) is true at the nested boundary exactly as it was at
the outer one.

**Sizing — a CONFIRMED plugin API restriction, not a bug.** The wrapper's own
width/height binds to `ICON_SIZE_FIGMA_VAR` (`theme/icon/md`, 20px) exactly
as before. The wrapper does **not** cascade a resize to its nested child (both
are `FIXED`-sizing, not `HUG`/`FILL`), so the nested glyph instance's own
width/height needs the same bind — but a nested instance-within-an-instance's
geometry is **not independently writable** through this plugin API:
`setBoundVariable('width'/'height', …)`, `resize()`, and
`resizeWithoutConstraints()` all return without throwing yet leave the node's
actual width/height unchanged (reproduced even on the wrapper master's own
untouched default child, before any swap — not a swap side-effect). The
attempt is kept (harmless; correct if a future Figma API version lifts the
restriction) and the honest outcome is reported as
`icon-wrapper-nested-size-not-bindable:Icon Before`/`After` rather than
assumed to have succeeded. Net visual effect: the glyph renders at its
wrapper master's own built-in 16px inside a 20px wrapper box, anchored
top-left — a minor size mismatch, not a clipping/overflow/wrong-glyph defect.

**Verified live, T29 pilot regeneration:** both "check-circle" and
"paper-plane" now resolve to real, provenance-verified Phosphor glyphs
("CheckCircle" key `bd79fe7bbc033e7bf60ea3f632190b5566f3b6a1`, "PaperPlaneTilt"
key `b71d29dce505ba26c45d9d7221acbe9c900739bf` — both placed by the owner
herself, both verified `COMPONENT_SET` Format×Weight shape) — 100 variants,
Icon Before AND Icon After both present. Every one of the 100 slot icon
instances' top-level `mainComponent` is `3509:4324` (the Icon wrapper) —
zero raw-Phosphor-library or CBDS top-level instances, confirmed by walking
every built "Icon Before"/"Icon After" layer and reading `getMainComponentAsync()`.

## Focus ring color variable seeded (T30)

The generated pilot's Focus-state ring geometry (position, stroke weight,
layer order — see the Focus ring code in `generate-figma.mjs`) was correct
from T12 onward, but rendered invisible: `theme/color/focus-ring` did not
exist as a Figma variable, so `boundSolid()` resolved no paint and the ring's
`strokes` array stayed empty (`[]`) — confirmed live by inspecting a
Focus-row ring node directly (`visible: true`, correct geometry, `strokes: []`
— the ONLY defect was the missing variable, not geometry/order).

**Focus renders as a stroke on the component FRAME itself, not an
absolutely-positioned shape (owner correction, mid-session, folded into
T30's acceptance).** The T12-era implementation built a separate
`Focus Outline` `RECTANGLE` child, absolutely positioned 4px outside the
component's own bounds — the owner: "that's the wrong way to do a focus...
it should be a stroke on the main component instead of being an abs
positioned shape." CONFIRMED against the real Button set (node
`4271:9562`): Primary+Focus AND Tertiary+Focus both carry the IDENTICAL
single frame-level stroke (`strokeWeight: 2`, `strokeAlign: 'OUTSIDE'`) — no
dual/concentric ring, no combining with a variant's own border.
`generate-figma.mjs` now sets `comp.strokes`/`strokeAlign`/`strokeWeight`
directly on the variant's own component frame for `state === 'Focus'`,
which — since a Figma frame has exactly one `strokes` array — UNCONDITIONALLY
REPLACES whatever border-color stroke that variant's own row applied earlier
in the same function (Tertiary carries its own 1px INSIDE gray border at
Default; Focus overwrites it with the 2px OUTSIDE focus color, matching the
real set exactly). Bound to the T30-seeded `theme/color/focus-ring` variable
below, not the real set's own (differently-scoped, "Tier 2 | Brand")
`border/primary-default` — the contract's own token binding has always named
`theme/color/focus-ring` here; T30 is what makes that name finally
resolvable. The T12-era `Focus Outline` rectangle, and the T22 ring-geometry
width/height tracking math it required (a static shape has to be measured and
resized to match the variant's true bounds after icons/full-width are baked
in), are **deleted entirely, not superseded** — a frame stroke follows the
frame's own true bounds automatically, on every row (slots-on, full-width,
anything), so there is nothing left to track.

The code token (`libs/al-web-components/styles/tokens-dtcg/tier-3/theme/
{light,dark}/colors.json`, `focus-ring`) is itself an ALIAS —
`"$value": "{theme.color.border.primary-default}"`, identical in both modes —
not a literal color. The Figma-side seed mirrors this exactly rather than
resolving to a literal RGB: `theme/color/focus-ring` was created in the
"Tier 2 | Theme" collection (the same collection `THEME_MODE_COLLECTION_NAME`
in `generate-figma.mjs` already targets) as a `COLOR` variable whose Dark AND
Light mode values are both a `VARIABLE_ALIAS` to the existing
`theme/color/border/primary-default` variable — so it stays correct
automatically if that token's own resolution ever changes, exactly like the
code alias does. Idempotent by construction (verify-before-create on the
variable, verify-before-set on each mode's value — a second run is a
no-op, confirmed live) and additive-only: no existing variable or collection
was modified, nothing was deleted. Regenerating the pilot after the seed
picks up the new variable automatically (`boundSolid()` looks it up by name)
— the `theme/color/focus-ring` entry disappeared from `missingVars`, and a
Focus-row ring's `strokes` now reads back a real bound `SOLID` paint.

## Anatomy availability is best-effort

`scripts/figma-atoms/measure-components.mjs` writes `spec-light.json` /
`spec-dark.json` under each project's (gitignored) `figma-sync` directory. If
that file doesn't exist — a fresh clone, or before the measurement pipeline
has run for a given project — the emitter does **not** fabricate anatomy. It
emits `"anatomy": null` and `"anatomySource": "unavailable"`, and continues.
Even when the file exists, not every measured tag lines up with a manifest
tag one-to-one (e.g. `al-button--icon` is a separate measured "tag" for the
icon-only case, distinct from `al-button`) — those simply contribute nothing
extra; the base tag's own measured entries still drive its contract.

## Generated per-component reference docs (T20)

T20 (spec 2026-08-25-contract-backed-figma-parity-and-generation) adds one
more artifact on top of every contract: a GENERATED, human-readable Markdown
twin at `.altitude/contracts/docs/<project>/<tag>.md` — built by
`scripts/contracts/build-component-docs.mjs` from the tag's contract PLUS
that project's parity manifest (never the reverse; the contract and manifest
remain the facts of record, this file only re-shapes them for reading).
Each doc spells out the structure/variants/slots/token-binding story a
design tool — or an agent driving the Figma MCP — needs before touching a
component's Figma set: description, semantics, the full props table
(including any Figma `VARIANT`-bound axis and its unmapped option labels),
states, slots (with the `figmaPlaceholder` icon-instance convention, T19,
when a slot names one), events, a11y facts, the measured anatomy's root
token bindings and state overrides, the SCSS-derived `conditionalBindings`
(T18) rendered as one table per variant/state, the code bindings, and —
read live from the parity manifest, not the contract's own possibly-stale
embedded copy — the Figma component set's name and pinned node id, or, for
a set mapped by name only (`nodeId: null` — see "Molecules must be resolved
BY NAME" in `altitude-figma-sync`'s `SKILL.md` and `.altitude/PARITY.md`),
the by-name resolution rule instead of a node id that would go stale.

```bash
pnpm run contracts:docs                              # write, altitude
pnpm run contracts:docs:sl                           # write, southleft
node scripts/contracts/build-component-docs.mjs --component al-button   # one tag
pnpm run check:contract-docs[:sl]                    # drift gate — CI, part of gate:contracts
```

**GENERATED — never hand-edit a file under `.altitude/contracts/docs/`.**
Every doc opens with an HTML comment saying so and naming the regen command.
`check:contract-docs` re-derives every doc in memory and byte-compares it
against what's on disk — including ORPHAN detection, a doc file left behind
by a component that is no longer tracked or no longer has a contract — and
fails naming exactly which file(s) drifted, the same discipline `check:llms`
applies to `llms.txt`. Scope matches `contracts:seed`/`--check-drift`
exactly: every parity-tracked, non-`excluded` tag that already has a
contract on disk; a tracked tag with no contract yet is skipped with a
logged line, never silently dropped.

**Served over the MCP.** `altitude_get_component({ tag, project })` carries
the doc's content as `referenceDoc` (plus the raw `contract` itself)
whenever both exist for the resolved project — omitted entirely, never an
error, for a tag with no contract (an `excluded` component, or one not yet
seeded). `altitude-component-authoring`'s checklist (§8) runs
`contracts:docs` right after seeding a new contract; `altitude-figma-sync`
reads the doc before building or repairing a set.

## Deviations from `ds-contracts-poc`

The upstream schema is a small generative-layout DSL (rows/columns/areas,
`repeat`, `meter`, `shape`, `icon` parts, `figmaRepresentation`/native vs.
component previews, `provenance` with sha256 canonical revisions, etc.) built
for a system that can *render* a component from its contract. Altitude's
contracts are **descriptive, not generative**: they document what the
existing hand-authored components and the existing pipeline (CEM +
token-map + measure-components + parity manifest) already know, and nothing
gets rendered from them at this phase. Every field below was dropped,
renamed, or narrowed for that reason — not by oversight.

| Upstream field | Altitude contract | Why |
| --- | --- | --- |
| `props[].type` as `boolean \| text \| number \| {enum} \| {arrayOf}` | `type: "boolean" \| "string" \| "number" \| "enum"` + `rawType` (original CEM TS text) + `values` | CEM types are free-text TypeScript, not a closed literal-object shape; normalizing to a flat enum plus preserving the raw text loses nothing and matches what `libs/altitude-mcp/src/lib/parity.mjs`'s `codeContract()` already does (`unionValues()`). No `arrayOf` — no Altitude component's public prop is a structured array-of-records in the CEM today. |
| `props[].bindings.figma.values` (code-value -> Figma-label object map) | `props[].bindings.figma.options` (raw Figma option labels, unmapped) | Pairing code values to Figma labels 1:1 by position is exactly what `parity.mjs diffFigmaContract()` calls out as fragile (labels differ on purpose — see its own comment on Button's "Primary" vs. code's default). Emitting an unpaired list is honest; emitting a guessed pairing would silently mint wrong facts. |
| `events[].bindings.code.prop` (`onEventName`), `trigger`, `toggles` | `events[].name` only (+ `description`) | Altitude's event contract (`this.dispatch({eventName, detail})`, see `AGENTS.md`) has no React-style `onX` prop naming and no declared trigger/toggle DSL to read from the CEM. |
| `semantics.roleByProp` / `elementByProp`, `figmaRepresentation`, `figmaStatePreviews`, `anchors` (top-level), `modes` | dropped | Design-tool render-mode metadata; nothing in CEM/measure-components/parity-manifest expresses it. |
| `anatomy.*.layout.{rows,columns,areas,gap,placement,flow}`, `shape`, `repeat`, `meter`, `icon`, `animation`, `content`/`textByProp`, `component` (nested-component refs), `overridable`, `visibleWhen`, `attrs` | dropped; `anatomy.root` keeps only `tag`, `cls`, a coarse `layout` (`display`/`direction`/`align`/`justify`, no pixel geometry), `tokens`, `children` | These are the generative-rendering primitives; Altitude's anatomy is a **read** of what `measure-components.mjs` observed (Playwright DOM measurement), not a spec a renderer consumes. Pixel geometry (`x`,`y`,`w`,`h`) is deliberately excluded even though `measure-components.mjs` captures it — geometry is not a token binding and would make every contract diff on every layout tweak. |
| `anatomy.*.states` / `stylesWhen` / `declaredStates` (per-part, arbitrary CSS declarations) | top-level `anatomy.stateOverrides`, **root node only**, restricted to token deltas | Diffing every measured part across all 4 non-default states for every component is a lot of surface for a first pass; root-level token deltas (background/color/etc. changing on hover/focus/active/disabled) are the highest-signal case and match what the parity engine already treats as the interesting axis. Extending to per-part deltas is straightforward follow-up once this shape is validated against real usage. |
| `provenance` (`canonicalRevision`, `sha256`, `awaitingCodeAdoption`) | dropped | No canonical-revision hashing scheme exists in this pipeline yet; `contractDigest()` in `parity.mjs` already plays a related role for drift detection and isn't duplicated here. |
| `documentationLinks` | dropped | No per-component documentation-link registry exists to read from. |
| `a11y.{focusVisible,minHitArea,contrast}` | `a11y.{ariaAttributes,cssParts}` | The upstream fields are accessibility *requirements* a design system asserts; nothing in CEM/measure-components states them per component. What CEM *does* state: which attributes carry ARIA semantics (name matches `/aria/i`) and which `::part()` targets exist — both kept as canvas-expressible facts. |
| `bindings.figma.anchors.componentSetKey`, `representation`, `statePreviews` | `bindings.figma.{fileKey,componentSetName,nodeId,url}` | Altitude's parity manifest records a Figma **name** + **node id** per component (`figma.name`/`figma.nodeId`), not a component-set key; `url` is the existing `figmaNodeUrlFor()` deep link, reused rather than reinvented. |
| `bindings.code.anchors.{importPath,export}` | `bindings.code.{importPath,tagName,workspace}` | Altitude components are custom elements, not named JS exports consumed by import — `tagName` (the actual usage surface) and `workspace` (which npm package, base vs. brand layer) are the facts that matter here; `importPath` is still included, built from the CEM's own `modulePath`. |
| `status` enum `draft \| stable \| deprecated` | adds `"derived"` and `"source"` | `"derived"` — machine-generated, not yet hand-reviewed (`--seed` output before adoption). `"source"` — ADOPTED editable source (T10): every contract in this repo carries this status today, having been flipped from `"derived"` in one deterministic pass (`--adopt`, version bumped 0.1.0 → 1.0.0 alongside it). `draft`/`stable`/`deprecated` remain reserved for a further maturity ladder on top of `"source"`. |

### What's next (explicitly out of scope here)

- ~~Contract-level validation wired into CI~~ — DONE, see "CI gate" above (T15).
- Per-part (not just root) state overrides.
- A "code" adapter that reads the contract back and asserts the live
  component still matches it — **this is now `--check-drift`** (T10), so
  this line item is DONE for the code side; the Figma-canvas side remains
  `contracts:diff` against a live extraction, not continuous.
