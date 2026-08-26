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
and Variant axes, PLUS one more VARIANT axis per curated boolean (T23, see
"Fan-out convention" below) OR a BOOLEAN component property for an
un-curated one, the Text/Icon Before/Icon After component properties the
contract's props/slots warrant (the icon ones only when a slot names a
`figmaPlaceholder` — see "Slot placeholder instances (T19)" below), and
token-bound fills/strokes/spacing from the contract's anatomy — nothing
fabricated beyond what the contract states.

```bash
node scripts/figma-atoms/mcp-shim.mjs                          # keep running (Figma Desktop open, Bridge plugin running)
node scripts/contracts/generate-figma.mjs --component al-button              # build/rebuild
node scripts/contracts/generate-figma.mjs --component al-button --ops-only   # ops artifact only, no Figma call
node scripts/contracts/generate-figma.mjs --component al-button --check-determinism  # same contract, ops derived twice in memory, byte-compared
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

**Slot placeholder instances (T19; naming convention updated T25).** A
`before`/`after` slot whose contract entry carries `slots[].figmaPlaceholder`
gets a real icon INSTANCE built in the right leading/trailing position, wired
to Slot Before/After (BOOLEAN `visible`) and Icon Before/After (INSTANCE_SWAP
`mainComponent`), and recolored **recursively** to that row's own resolved
content-color token (the same paint the label text uses — confirmed against
the real set: icon fill and label fill are always the identical bound
variable, every Variant/State row), per the Icon Recoloring reference. A slot
with no `figmaPlaceholder` still degrades to the boolean-only behavior from
T12/T18 (no INSTANCE_SWAP property, no icon instance) — a documented gap, not
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
is separate, queued follow-up work for `generate-figma.mjs` — not yet done as
of this note. The placeholder remains resolved **by name**, never a node id,
in the contract or the ops artifact either way, since icon libraries re-mint
ids on republish.

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

## Fan-out convention (T22/T23)

A curated boolean **fans out as its own True/False VARIANT axis** — a
separately-built component per combination, cartesian with every other axis
— instead of staying a single shared BOOLEAN component property (T12/T18/T19
behavior, still the default for anything not curated). Curation is a new
schema-additive field, hand-set per contract, never derived:

- `props[].bindings.figma.axis: true` (alongside `kind: "VARIANT"` and
  `options: ["False", "True"]`) — a layout boolean like `fullWidth`.
- `slots[].figmaAxis: true` — a `before`/`after` slot.

**Why axes, not properties, for slots.** A shared BOOLEAN property's
visibility is a single runtime toggle across every variant — a static focus
ring built at generation time (`ring.resize(comp.width + 8, ...)`) can only
ever be correct for ONE render of that toggle, usually the built default
(icons hidden). Fan out the slot as an axis instead and every combination is
its own real component, built with its OWN true geometry (icons shown or
hidden, full width or not) BEFORE the ring is sized — so the ring is correct
for every combination, not just the default one (T22).

**Generalized default, for any component, not just button:** an `enum` prop
is always an axis (unchanged, pre-dates this curation field entirely — see
the `variant` prop's own binding). A `before`/`after` slot or a
layout-affecting boolean is a component property **unless** curated
`figmaAxis`/`axis: true`. An unknown/behavior-only boolean (e.g. `hideText`)
stays a property regardless — there is nothing to "fan out" visually for it.

**Icon Before/After stay component properties either way.** The real Button
set (see below) keeps them that way even where it DOES fan out other things,
and generate-figma.mjs mirrors that: the icon INSTANCE_SWAP property is wired
post-`combineAsVariants` exactly as T19 built it; only the icon's per-variant
VISIBILITY moves from a runtime property reference to a static per-variant
bake when its slot is curated as an axis.

**"Is Full Width" has no measured pixel fact.** Contracts carry no pixel
geometry at all (see "Deviations" below) and no real Figma set exposes this
as an axis to inspect — the generator renders it as the variant's own natural
hug width plus a fixed margin (`FULL_WIDTH_EXTRA_PX` in generate-figma.mjs),
a documented judgment call, not an observed target width.

**Deliberate discrepancy — verify before trusting "matches the real set."**
al-button's contract (`.altitude/contracts/altitude/al-button.contract.json`)
curates all three (`fullWidth`, `before`, `after`) into axis mode, growing
the Contract Pilot regeneration from 25 to 200 variants (State × Variant ×
Slot Before × Slot After × Is Full Width). This was VERIFIED, live, against
the REAL Button set (node `4271:9562`, `y83n4o9LOGs74oAoguFcGS`) at T22/T23
time: the real set still has 25 variants — `Is Full Width`, `Slot Before`,
`Slot After` are BOOLEAN component properties there, not VARIANT axes. The
pilot's fan-out is a deliberate proposal/pilot of the convention, not a
description of what the real set currently does — a human decision is still
open on whether to convert the real hand-built set to match. Re-verify live
(`figma_get_status` + read `componentPropertyDefinitions` off node
`4271:9562`) before asserting either set's shape in a future task; this
paragraph will go stale the moment someone converts the real set.

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
