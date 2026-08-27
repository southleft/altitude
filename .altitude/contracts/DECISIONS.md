# Contract system — decision log

This file is the contract system's **decision log**: the T-numbered narrative
history, incident records, superseded readings, and reverted-decision sagas
behind the current mechanics. `README.md` (same directory) carries only
current facts; when a README fact needs its "why" or its "what we tried
first", the record lives here, preserved essentially verbatim from the time
it was written. Entries are ordered by task number, not by importance. All
task numbers refer to spec `2026-08-25-contract-backed-figma-parity-and-
generation` unless another spec is named.

## T10 — contracts became editable source (`--adopt`)

Contracts began life as a **generated artifact**: `scripts/contracts/
emit-contracts.mjs` was a pure emitter — it derived every field from what the
repo's other pipelines already produce and regenerated every contract on
every run. As of the T10 adoption pass, every contract carries
`"status": "source"` and `"version": "1.0.0"`: hand edits to a contract file
are the reviewable unit of change (a **contract PR**), and the emitter no
longer regenerates them on every run. The derivation is still exactly how a
contract gets its FIRST draft (`--seed`) and how it is checked for staleness
afterward (`--check-drift`).

The adoption itself was a one-off mode:

```bash
node scripts/contracts/emit-contracts.mjs --adopt   # ONE-OFF: the T10 adoption pass itself (derived -> source, 0.1.0 -> 1.0.0); idempotent, not a day-to-day command
```

This is also why the `status` enum deviates from upstream
`ds-contracts-poc`'s `draft | stable | deprecated`: Altitude adds
`"derived"` — machine-generated, not yet hand-reviewed (`--seed` output
before adoption) — and `"source"` — ADOPTED editable source: every contract
in this repo carries this status today, having been flipped from `"derived"`
in one deterministic pass (`--adopt`, version bumped 0.1.0 → 1.0.0 alongside
it). `draft`/`stable`/`deprecated` remain reserved for a further maturity
ladder on top of `"source"`.

Alongside T10, bare `node scripts/contracts/emit-contracts.mjs` (no mode
flag) was changed to print a short usage note and exit 1 rather than
silently overwriting hand-edited contracts.

## T11 — contract state recorded at sync-stamp time

As of T11, `pnpm run parity:synced <tag>` also records the contract's own
state at the moment of stamping — `lastSync.contractHash` (sha256 of the
contract file) and `lastSync.contractVersion` (its `version` field) — in the
parity manifest, so a later edit to the contract that nobody re-stamped
shows up as `contractDrifted: true` on that component's parity report entry
(`libs/altitude-mcp/src/lib/parity.mjs`).

## T12 — the generation pilot and its original scope

T12 closed the loop the other direction: a contract can drive the
**generation** of a Figma component set, not just describe one that already
exists. The pilot was al-button, altitude only, and the ops-determinism CI
leg (`contracts:ops-determinism`) was pilot-scoped for the same reason — no
Figma connection needed, since it checks the ops DERIVATION, not a live
build. Since the 2026-08-26 modularization the same derivation
(`scripts/contracts/figma/derive-ops.mjs`) runs for every contract
(`--component <tag> --ops-only` verified across the full roster), so
widening this check is a script-loop away if ever needed.

The T12-era focus implementation built a separate `Focus Outline`
`RECTANGLE` child, absolutely positioned 4px outside the component's own
bounds — see T30 below for the correction that deleted it.

## T18 — `conditionalBindings` (`--add-conditional-bindings`)

T18 closed the biggest instance of the "one measured anatomy case" limit —
per-Variant background/text/border color and the Hover/Disabled state deltas
now come from `conditionalBindings` (recovered straight from the component's
`.scss` — BEM modifier classes and nested pseudo-class/attribute state
rules, parsed with `postcss-scss`), not from the single measured case.
Before T18, every Variant/State cell of a generated set rendered
identically.

The migration that merged the new field into every existing on-disk
contract was a one-off mode:

```bash
node scripts/contracts/emit-contracts.mjs --add-conditional-bindings  # ONE-OFF: the T18 migration itself (merges the new conditionalBindings field into every on-disk contract, status/version untouched); idempotent, not a day-to-day command
```

It skipped (loudly) any contract whose OTHER fields already drifted from
derivation, rather than clobber it.

## T19 — slot placeholder instances (original convention)

A `before`/`after` slot whose contract entry carries
`slots[].figmaPlaceholder` gets a real icon INSTANCE built in the right
leading/trailing position, wired to Slot Before/After (BOOLEAN `visible`)
and Icon Before/After (INSTANCE_SWAP `mainComponent`), and recolored
**recursively** to that row's own resolved content-color token (the same
paint the label text uses — confirmed against the real set: icon fill and
label fill are always the identical bound variable, every Variant/State
row), per the Icon Recoloring reference. The naming convention was updated
at T25 and the instance vehicle changed at T28/T29 — see below.

## T22/T23 — the axis-mode pilot (reverted at T31)

T22/T23 curated al-button's `fullWidth`/`before`/`after` into **axis mode**
— each boolean fanned out as its own True/False VARIANT axis, a
separately-built component per combination, cartesian with every other axis
— as a deliberate PILOT of the fan-out convention, reasoning from a Propstar
documentation-sheet screenshot the owner had shared. That screenshot showed
every property combination as a separate labeled INSTANCE in a reference
grid — a Propstar-generated **documentation artifact**, not the real
component set's own variant structure. This grew the Contract Pilot
regeneration from 25 to 200 variants (State × Variant × Slot Before × Slot
After × Is Full Width) — later 100 once `fullWidth` was marked `omit` (T27).

**Why axes, not properties, for slots — the T22 reasoning.** A shared
BOOLEAN property's visibility is a single runtime toggle across every
variant — a static focus ring built at generation time (`ring.resize(
comp.width + 8, ...)`) can only ever be correct for ONE render of that
toggle, usually the built default (icons hidden). Fan out the slot as an
axis instead and every combination is its own real component, built with
its OWN true geometry (icons shown or hidden, full width or not) BEFORE the
ring is sized — so the ring is correct for every combination, not just the
default one. T30's focus-as-frame-stroke fix (a real Figma stroke follows
the frame's own true bounds automatically) made this no longer necessary
for al-button — a stroke on a property-mode component is correct for
whichever combination of booleans that SAME component currently has
toggled, with nothing to pre-bake — which is what let T31 revert al-button
to property mode at all.

**Deliberate discrepancy — verify before trusting "matches the real set."**
(Historical, T22/T23; resolved T31.) al-button's contract briefly curated
all three (`fullWidth`, `before`, `after`) into axis mode, growing the
Contract Pilot regeneration from 25 to 200 variants — later 100 once
`fullWidth` was marked `omit` (T27). This was verified, live, against the
REAL Button set (node `4271:9562`, `y83n4o9LOGs74oAoguFcGS`) at T22/T23
time to NOT match: the real set has always had 25 variants, with
`Slot Before`/`Slot After` as BOOLEAN component properties, not axes. T31
closed this gap by removing the curation rather than converting the real
set — re-verify live (`figma_get_status` + read
`componentPropertyDefinitions` off node `4271:9562`) before asserting
either set's shape in a future task; this paragraph will go stale the
moment someone curates a NEW component into axis mode for a confirmed-real
reason.

**T31 — the revert.** T31 corrected the T22/T23 reading after re-confirming
live against the REAL Button set: `componentPropertyDefinitions` there has
always been the LEAN 25 variants (State × Variant only) with
`Slot Before`/`Slot After` as plain BOOLEAN properties — exactly what
T22/T23's own "Deliberate discrepancy" warning above already said, before
this task acted on it. al-button's contract
(`.altitude/contracts/altitude/al-button.contract.json`) has had its
`figmaAxis: true` curation removed from both slots as of T31; the Contract
Pilot regeneration is 25 variants again, matching the real set's own shape.
Every fan-out combination the Propstar screenshot wanted to see is instead
available via `--sheet` (T31 — the documentation-sheet mode, see README).

**The fan-out machinery itself was NOT removed** — the schema fields, the
`booleanAxisDefs`/cartesian derivation in `buildOps()`, and the axis-mode
mechanics remain fully live, for two reasons: (1) a FUTURE component's real
Figma set might genuinely fan a boolean out as its own axis, in which case
curating `figmaAxis`/`axis: true` for THAT component is the correct,
deliberate call this field exists for; (2) `--sheet` mode reuses this exact
machinery internally (`buildOps(contract, { forceAllBooleanAxes: true })`)
to derive its own documentation-grid cartesian product, rather than
re-implementing the fan-out a second way. "Repurposed," not deleted.

## T25 — `figmaPlaceholder` naming migration (Figma-side name → Phosphor catalog name)

Every real Figma component set's `Icon Before`/`Icon After` INSTANCE_SWAP
property has a `defaultValue` node id; resolving that id live gives the
DEFAULT icon INSTANCE's own name, which is what gets recorded as
`figmaPlaceholder`. Before T25, that name was whatever the Figma-side icon
library called it — the "🛠 Icons" page's own components (al-button's real
set: "done-circle" before, "send" after). The owner has since added a
Phosphor library to Figma, and Phosphor
(`libs/al-web-components/components/icon/catalog.ts` + `phosphor/*.ts`) is
the icon source going forward on BOTH sides — so as of T25, a discovered
name is resolved BY HAND to its nearest Phosphor catalog entry before being
written into the contract (al-button: "done-circle" -> "check-circle",
"send" -> "paper-plane") — the contract always stores the CODE-side
(Phosphor) name now, never the old Figma-side one.
`apps/docs/src/lib/contracts.mjs`'s playground default reads
`figmaPlaceholder` directly as a catalog name for exactly this reason (its
old done-circle/send -> check-circle/paper-plane translation table is gone —
the contract already speaks Phosphor). Note the "🛠 Icons" page itself is no
longer the icon SOURCE, but the page remains live and load-bearing (it
hosts the DS "Icon" wrapper and is a Phosphor scan target — see T28/T29).

**Sweep coverage (T25 session record).** Live-verified against the real
Altitude Figma file (`y83n4o9LOGs74oAoguFcGS`): al-banner, al-menu-item,
al-empty-state, al-input, al-range, and al-textarea's real sets have **no**
`Icon Before`/`Icon After` INSTANCE_SWAP property at all — confirmed by
reading each set's `componentPropertyDefinitions` live, not assumed — so
none gets a `figmaPlaceholder`. al-alert, al-toast, al-stat,
al-stepper-item, and al-calendar have no Figma mapping in the manifest at
all (`figma: null`), so there is no real set to check. Southleft's
`al-button`/`al-card`/`al-input`/`al-stat` (a different Figma file,
`rdhBS9t89V42E7EfiPjmSa`) were **not** swept that session — that file was
not the one open in Figma Desktop — and were left exactly as they were
rather than guessed.

T25 also added `--refresh` to `emit-contracts.mjs` (re-derive every tracked
contract in place, curation carried forward) — still the daily driver, see
README.

## T27 — Figma-expression opt-out (`omit`/`figmaOmit`)

T27 added the curation that lets a prop or slot real in CODE be curated OUT
of the generated Figma surface entirely — reserving the right to say "I
don't need that in Figma" (the owner's own words, about al-button's
`fullWidth`). al-button's pilot regenerated at 100 variants (5 State × 5
Variant × 2 Slot Before × 2 Slot After) once `fullWidth` was marked
omitted — down from T23's 200, with no `Is Full Width` axis anywhere on the
set. (T31: al-button's `before`/`after` slots have since had their OWN
`figmaAxis: true` curation removed too, dropping the Contract Pilot
regeneration to the lean, real-set-matching 25 variants. `fullWidth` stays
`omit: true` either way; omission and axis-mode curation are independent
fields.)

**"Is Full Width" has no measured pixel fact.** Contracts carry no pixel
geometry at all (see README "Deviations") and no real Figma set exposes
this as an axis to inspect — a component that DID curate this into axis
mode would render it as the variant's own natural hug width plus a fixed
margin (`fullWidthExtraPx` in the component's `figma.gen.json`, default in
`scripts/contracts/figma/component-config.mjs`), a documented judgment
call, not an observed target width.

## T28 — Phosphor icon source: bootstrap discovery and hard-won pitfalls

Slot placeholder instances are instantiated from the **Phosphor** Figma
library — never the legacy local "🛠 Icons" components, which
`generate-figma.mjs` no longer looks up at all as an icon source (the
owner: "let's not use the icon component that was in the figma bc that's
the old icons... let's use the Phosphor library I added").

### Bootstrap convention (the discovery)

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
with a remote "CheckCircle" instance.

### Naming, CONFIRMED LIVE

Phosphor components are named in **PascalCase with no separators**
("ApproximateEquals", "CheckCircle") — NOT the kebab-case catalog names a
contract's `figmaPlaceholder` stores (the T25 decision: the contract always
speaks the CODE-side/catalog name). A Phosphor icon may be cached locally
as a full **COMPONENT_SET** with "Format" (Outline/Stroke) × "Weight"
(Thin/Light/Regular/Bold/Fill/Duotone) variants (the owner's bootstrap,
"ApproximateEquals" — all 12 variants cached the moment any ONE was placed)
OR as a single **flat component** with no variant grouping at all (the
al-alert prototype's "CheckCircle" — one Vector child, no parent set).

### The pitfalls, full narrative (all CONFIRMED live, in order of discovery)

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
   other way around (reversed from the original design).
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

**Recoloring, once fixed per pitfall 4, was CONFIRMED working on Phosphor's
flat vector fills** — the icon's Vector fill and the row's label text fill
read back as the identical bound Figma variable across every tested variant
(Primary/Danger/Bare), exactly matching the T19 convention's original
guarantee for the old icon source.

**As of the T28 pilot regeneration:** `check-circle` resolved (100
variants, `Icon Before` present); `paper-plane` did not — no remote
instance anywhere in the document matched "paper-plane"/"PaperPlane"/
"PaperPlaneTilt" or similar, checked live. (Resolved at T29 once the owner
placed real Phosphor instances — see below.)

## T29 — slot icons instantiate the DS Icon wrapper; the wrong-library incident

T28 instantiated the resolved Phosphor glyph directly as the slot icon's
TOP-LEVEL instance. The owner corrected this: her file has a hand-built DS
"Icon" wrapper component — a lone `COMPONENT` named exactly `"Icon"` (id
`3509:4324`, sitting on the "🛠 Icons" page, **not itself a
`COMPONENT_SET`** — it has no `componentPropertyDefinitions` of its own,
`variantProperties: null`) whose one child is an INSTANCE of a Phosphor
glyph. A slot icon must be an INSTANCE OF THAT WRAPPER with the Phosphor
glyph swapped into its nested child — never a raw top-level Phosphor
library instance, mirroring code using `<al-icon>` rather than an inline
SVG.

**Mechanism (live-confirmed, not the property-based swap originally
assumed).** Because the wrapper is a plain `COMPONENT`, not a
`COMPONENT_SET`, it exposes **no INSTANCE_SWAP property of its own** for
the inner glyph (`addComponentProperty` is a `COMPONENT_SET`-only API —
SKILL.md §3). The glyph is therefore swapped directly on the wrapper's
nested child instance — `nested.swapComponent(resolvedPhosphorComponent)` —
never through a component property. `findIconWrapperComponent()` resolves
the wrapper BY NAME (never a node id) the same way
`findPhosphorComponentByName` resolves a glyph, scanning
`PHOSPHOR_PRIORITY_PAGE_NAMES`; a `COMPONENT_SET` hit (if the wrapper is
ever converted to one) resolves to its own `defaultVariant`. The Icon
Before/After INSTANCE_SWAP property wired on the generated BUTTON set
targets the WRAPPER's own id as its `mainComponent` default (mirroring the
real Button set's own `preferredValues` shape — a one-entry
`[{ type: 'COMPONENT', key }]` array — though this environment's
`addComponentProperty` silently does not accept a 4th `preferredValues`
argument; the fallback 3-arg call is used and the gap is reported as
`instance-swap-preferred-values-unsupported`).

**WRONG-LIBRARY INCIDENT — name-matching a remote component is not proof of
library membership.** The first working version of this fix resolved
"check-circle" to a REMOTE component literally named "CheckCircle" found on
the "🛝 Playground" page (key `8362189ea7dca44f1ef7aa55495ec46f1f0f91f6`)
and shipped it. The owner identified it as belonging to a **different,
unrelated library** ("CBDS UI kit demo") that happens to also ship a
component named "CheckCircle" — this file has at least two libraries with
overlapping icon names, and matching by name alone is not sufficient proof
of provenance. The one PROVABLE, structural signal found live: every
genuinely Phosphor-cached icon in this file (confirmed for
"ApproximateEquals", the icon the owner's Icon wrapper happened to nest at
bootstrap time, and later for "CheckCircle"/"PaperPlaneTilt" once she
placed real Phosphor instances) is cached as a full `COMPONENT_SET` with
`Format` (exactly `Outline`/`Stroke`) × `Weight` (a subset of `Thin`/
`Light`/`Regular`/`Bold`/`Fill`/`Duotone`) variants; the CBDS collision has
**no parent set at all** (`main.parent` reads back `null` — a flat,
ungrouped remote reference). `isVerifiedPhosphorIconSet()` enforces exactly
this shape and REFUSES a name match with no verified parent set, no
exceptions — including through the `PHOSPHOR_KEY_BY_NAME` hand-typed-key
fallback (a hand-typed key gets no exemption; verified the same way a scan
hit is). `PHOSPHOR_KEY_BY_NAME`'s "check-circle" entry (the wrong CBDS key)
was **removed**, not deprioritized. **What library metadata the plugin API
actually exposed for a remote `mainComponent`**, for future reference:
`.key` (always present, globally unique per component, but shared library
membership is NOT derivable from the key string itself — no common prefix
or pattern), `.remote` (boolean only — which library is not exposed),
`.parent` (the most useful signal in practice: `null` for a flat/ungrouped
remote reference vs. a real local `COMPONENT_SET` mirror for one cached
alongside its full variant family), `.description` /
`.documentationLinks` (present but empty or unhelpful for both the trusted
and untrusted candidates in this file — not a reliable signal here). No
plugin API surface in this environment names the actual library a remote
component came from.

**Name aliasing, hand-curated, exact only.** The owner's own placed
"paper-plane" demo instance is named Phosphor's **"PaperPlaneTilt"**, not a
bare "PaperPlane" — a real, more specific Phosphor icon name, confirmed via
her own bootstrap instance on the "🛠 Icons" page. `PHOSPHOR_NAME_ALIASES`
maps the catalog-normalized name to the set of Figma-side names accepted —
`paperplane: ['paperplane', 'paperplanetilt']` today — an EXACT alias
table, never a substring/fuzzy match (a looser rule is exactly the shape
that let the CBDS collision through).

**Recolor must skip the top-level fill at EVERY instance boundary, not just
the outermost one.** `recolorIconChildren` recurses one level further as of
T29: a child that is itself an `INSTANCE` (the wrapper's nested Phosphor
glyph) is recursed into via `recolorIconChildren` again — skip-this-root,
recolor-below — rather than `recolorIconTree`
(recolor-everything-including-this-root). T28 pitfall 4 (recoloring a
Phosphor instance's own root fill destroys negative-space contrast) is true
at the nested boundary exactly as it was at the outer one.

**Sizing — a CONFIRMED plugin API restriction, not a bug.** The wrapper's
own width/height binds to `ICON_SIZE_FIGMA_VAR` (`theme/icon/md`, 20px)
exactly as before. The wrapper does **not** cascade a resize to its nested
child (both are `FIXED`-sizing, not `HUG`/`FILL`), so the nested glyph
instance's own width/height needs the same bind — but a nested
instance-within-an-instance's geometry is **not independently writable**
through this plugin API: `setBoundVariable('width'/'height', …)`,
`resize()`, and `resizeWithoutConstraints()` all return without throwing
yet leave the node's actual width/height unchanged (reproduced even on the
wrapper master's own untouched default child, before any swap — not a swap
side-effect). The attempt is kept (harmless; correct if a future Figma API
version lifts the restriction) and the honest outcome is reported as
`icon-wrapper-nested-size-not-bindable:Icon Before`/`After` rather than
assumed to have succeeded. Net visual effect: the glyph renders at its
wrapper master's own built-in 16px inside a 20px wrapper box, anchored
top-left — a minor size mismatch, not a clipping/overflow/wrong-glyph
defect.

**Verified live, T29 pilot regeneration:** both "check-circle" and
"paper-plane" resolved to real, provenance-verified Phosphor glyphs
("CheckCircle" key `bd79fe7bbc033e7bf60ea3f632190b5566f3b6a1`,
"PaperPlaneTilt" key `b71d29dce505ba26c45d9d7221acbe9c900739bf` — both
placed by the owner herself, both verified `COMPONENT_SET` Format×Weight
shape) — 100 variants, Icon Before AND Icon After both present. Every one
of the 100 slot icon instances' top-level `mainComponent` was `3509:4324`
(the Icon wrapper) — zero raw-Phosphor-library or CBDS top-level instances,
confirmed by walking every built "Icon Before"/"Icon After" layer and
reading `getMainComponentAsync()`.

## T30 — focus ring: variable seeded, and focus-as-frame-stroke correction

The generated pilot's Focus-state ring geometry (position, stroke weight,
layer order) was correct from T12 onward, but rendered invisible:
`theme/color/focus-ring` did not exist as a Figma variable, so
`boundSolid()` resolved no paint and the ring's `strokes` array stayed
empty (`[]`) — confirmed live by inspecting a Focus-row ring node directly
(`visible: true`, correct geometry, `strokes: []` — the ONLY defect was the
missing variable, not geometry/order).

**Focus renders as a stroke on the component FRAME itself, not an
absolutely-positioned shape (owner correction, mid-session, folded into
T30's acceptance).** The T12-era implementation built a separate
`Focus Outline` `RECTANGLE` child, absolutely positioned 4px outside the
component's own bounds — the owner: "that's the wrong way to do a focus...
it should be a stroke on the main component instead of being an abs
positioned shape." CONFIRMED against the real Button set (node
`4271:9562`): Primary+Focus AND Tertiary+Focus both carry the IDENTICAL
single frame-level stroke (`strokeWeight: 2`, `strokeAlign: 'OUTSIDE'`) —
no dual/concentric ring, no combining with a variant's own border. The
generator now sets `comp.strokes`/`strokeAlign`/`strokeWeight` directly on
the variant's own component frame for `state === 'Focus'` (the code lives
in `scripts/contracts/figma/build-set-code.mjs`), which — since a Figma
frame has exactly one `strokes` array — UNCONDITIONALLY REPLACES whatever
border-color stroke that variant's own row applied earlier in the same
function (Tertiary carries its own 1px INSIDE gray border at Default; Focus
overwrites it with the 2px OUTSIDE focus color, matching the real set
exactly). Bound to the T30-seeded `theme/color/focus-ring` variable, not
the real set's own (differently-scoped, "Tier 2 | Brand")
`border/primary-default` — the contract's own token binding has always
named `theme/color/focus-ring` here; T30 is what made that name finally
resolvable. The T12-era `Focus Outline` rectangle, and the T22
ring-geometry width/height tracking math it required (a static shape has to
be measured and resized to match the variant's true bounds after
icons/full-width are baked in), were **deleted entirely, not superseded** —
a frame stroke follows the frame's own true bounds automatically, on every
row (slots-on, full-width, anything), so there is nothing left to track.

**The variable seed itself.** The code token
(`libs/al-web-components/styles/tokens-dtcg/tier-3/theme/{light,dark}/
colors.json`, `focus-ring`) is itself an ALIAS —
`"$value": "{theme.color.border.primary-default}"`, identical in both
modes — not a literal color. The Figma-side seed mirrors this exactly
rather than resolving to a literal RGB: `theme/color/focus-ring` was
created in the "Tier 2 | Theme" collection (the same collection
`THEME_MODE_COLLECTION_NAME` already targets) as a `COLOR` variable whose
Dark AND Light mode values are both a `VARIABLE_ALIAS` to the existing
`theme/color/border/primary-default` variable — so it stays correct
automatically if that token's own resolution ever changes, exactly like the
code alias does. Idempotent by construction (verify-before-create on the
variable, verify-before-set on each mode's value — a second run is a no-op,
confirmed live) and additive-only: no existing variable or collection was
modified, nothing was deleted. Regenerating the pilot after the seed picked
up the new variable automatically (`boundSolid()` looks it up by name) —
the `theme/color/focus-ring` entry disappeared from `missingVars`, and a
Focus-row ring's `strokes` read back a real bound `SOLID` paint.

## T32 — the prop sheet's border-collapse correction and doc-header discovery

**A real table, CSS `border-collapse`-simple (corrected mid-task after
owner review of a zoomed screenshot).** The sheet grid is nested
auto-layout frames — never a `figma.createVector()` line and never a
manually-positioned x/y (an earlier same-task cut tried exactly that; it
was superseded before shipping). A FIRST T32 cut gave every cell its own
4-side "collapsed borders" stroke (right+bottom always, plus left/top for
edge cells) — the owner's own zoomed screenshot showed this rendering as
separate floating dashed boxes with doubled/offset edges, not one grid. The
corrected rule, verbatim: **"only stroke on main container, rows - bottom
(except for last), columns - right (except for last)."** Exactly three
stroke sources now exist anywhere in the sheet (see README "Documentation
sheet" for the current rule). An earlier cut also used a
`layoutMode: 'NONE'` canvas, which had no auto-layout `padding*` property
to bind at all — the shipped version is genuine auto-layout throughout,
with real bindable padding. Zoomed proof crop:
`.mm/specs/2026-08-25-contract-backed-figma-parity-and-generation/
verification/screenshots/t32-prop-sheet-borders-detail.png`.

**Documentation-header discovery.** The "Documentation Header" master (a
single COMPONENT, `componentPropertyDefinitions: {}`) has exactly ONE other
placement in the whole file (the master itself, used directly as the file's
own "Documentation" landing page banner) — there was no established
"component doc header" reuse convention to mirror, so this was new
territory, not a copied pattern; see `SHEET_DOC_HEADER_MASTER_NAME`'s own
comment in `scripts/contracts/figma/sheet-style.mjs` for the full
discovery. The header's "View full documentation" link is a DUMMY
placeholder — `https://altitude.pages.dev/docs/components/<tag-minus-al->/`
— the docs site's own future per-component routing shape, wired before docs
are published per-component; revisit once they are (T20's own generated
`.altitude/contracts/docs/<project>/<tag>.md` is a candidate source for
that eventual page).

## 2026-08-26 — modularization of `generate-figma.mjs`

`generate-figma.mjs` began as a single file holding the whole generator; as
of 2026-08-26 it is a thin CLI/orchestrator and the generator lives in
`scripts/contracts/figma/` (see README "Module layout" for the current
map). Older prose that attributes `buildSheetPlan()`, the sheet width
constants, the focus-stroke code, the Phosphor resolution functions, or
`recolorIconChildren` to `generate-figma.mjs` itself predates this split.

## 2026-08-27 — `--adopt` and `--add-conditional-bindings` removed

The two one-off migration modes documented above (T10's `--adopt`, T18's
`--add-conditional-bindings`) served exactly one migration each, were
idempotent, and have long since run to completion on every contract in the
repo. They are being REMOVED from `emit-contracts.mjs` as part of the
parity-system audit remediation spec — the modes' historical record is this
file, not the README.
