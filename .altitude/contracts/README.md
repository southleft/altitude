# Component contracts

A **contract** is a per-component, per-project JSON document that captures the
canvas-expressible API surface of one `al-*` component: its props (with legal
values and per-surface bindings), events, slots, interaction states, anatomy
(structure + token bindings, with per-state deltas where measured), a11y
facts, and the code/Figma bindings that let a tool jump straight to either
side. It upgrades Figma parity from digest-level ("something in this
component changed") to property-level ("this specific prop's legal values
changed").

Contracts are **generated artifacts**, not hand-authored. They are emitted
from what the repo already produces:

| Contract field | Source |
| --- | --- |
| `props`, `events`, `slots`, `semantics.element` fallback, `a11y.cssParts` | the CEM (`custom-elements.json`) — same reader as `libs/altitude-mcp/src/lib/cem.mjs` |
| `props[].bindings.figma`, `bindings.figma` (component-level) | the project's parity manifest (`.altitude/figma-sync/**/parity-manifest.json`) |
| `anatomy`, `states`, `semantics.element` | `scripts/figma-atoms/measure-components.mjs` output (`spec-light.json`), when present on disk |
| token references inside `anatomy` / `tokens` | `scripts/figma-atoms/token-map.mjs` (`CSS_TO_TOKEN`) |

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
  README.md                   # this file
  altitude/
    al-button.contract.json
    al-card.contract.json
    ...
  southleft/
    al-button.contract.json
    ...
```

One subdirectory per `.altitude/ds-projects.json` project id. A tag that is
shared between projects (e.g. `al-button`) gets **one contract per project**
— deliberately: the two projects can observe different Figma bindings for the
same component (mapped in Altitude's file, unmapped in Southleft's), and
Southleft's `brandLibrary` supersedes some tags (`al-card`, `al-header`,
`al-footer`) with a different CEM entry entirely, so the contract content can
legitimately differ.

## Emitting contracts

```bash
pnpm run contracts:emit           # altitude (the registry default)
pnpm run contracts:emit:sl        # == contracts:emit --project southleft
node scripts/contracts/emit-contracts.mjs --project <id>   # any registered project
node scripts/contracts/emit-contracts.mjs --check          # also ajv-validates every emitted contract against the schema
```

The emitter is deterministic: stable key order, 2-space indent, a trailing
newline, and no timestamps — running it twice with no source changes produces
byte-identical files. It reads `--project <id>` / `DS_PROJECT` the same way
every other parity CLI does (`libs/altitude-mcp/src/lib/ds-project.mjs`),
defaulting to the registry's default project (`altitude`).

**Scope: parity-tracked components only.** The emitter iterates the active
project's parity manifest (`paths.parityManifest`) — that is the definition
of "tracked" this spec uses, T4's reconciliation checks against exactly this
list. A manifest entry with `excluded: true` (e.g. `al-icon`, `al-theme`,
`al-theme-switcher` — see `.altitude/ds-projects.json` `excluded`) is skipped
with a logged line; it is never silently dropped.

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
| `status` enum `draft \| stable \| deprecated` | adds `"derived"` | Every contract emitted at this phase is machine-generated and unreviewed — `"derived"` says that plainly. Phase D (flip to editable, per the project source note) is expected to promote reviewed contracts to `draft`/`stable`. |

### What's next (explicitly out of scope here)

- Contract-level validation wired into CI (this phase ships the schema +
  emitter + a `--check` validation pass you can run by hand).
- Per-part (not just root) state overrides.
- A "code" adapter that reads the contract back and asserts the live
  component still matches it (upstream's `provenance.awaitingCodeAdoption`
  models drift in that direction; nothing here does yet).
