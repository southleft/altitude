# Slate — round-trip fidelity report and action plan

> **Status: all five phases implemented 2026-09-23.** This document is the original
> diagnosis and is deliberately left as written — the numbers below are the *before*.
> See **`RESULTS.md`** for what changed (90.2% → 99.9%) and **`ROUND-TRIP.md`** for the
> contract that now governs the bridge.

**Date:** 2026-09-22
**Fork base:** `open-pencil/open-pencil` @ `8131401ea` (MIT)
**Measured against:** `Altitude Design System.fig` — 12.5 MB, 98,645 nodes
**Decision on record:** Option C — dual-typed nodes plus a conformance gate

---

## 1. Executive summary

The fork is cloned, the toolchain works, and the design↔code bridge has been measured
against your real design system rather than a synthetic fixture.

The headline: **the bridge preserves geometry and loses meaning.** Of the nodes that
reach it, 90.2% of individual property *values* survive — but every node collapses to a
generic `FRAME`, every component loses its identity, and **all 17,196 token bindings are
destroyed, without exception.**

The good news is that these are not 67 separate defects. They share one cause, in one
type definition, and therefore one fix. The work is real but it is *concentrated*.

A secondary finding worth as much as the primary one: a source-level scan said the bridge
covers `fills` in both directions. The live run shows `fills` surviving on **0 of 8,933
nodes**. Static analysis cannot see this class of failure. Every fidelity claim from here
on should come from a run against a real file.

---

## 2. What is in place

| | |
|---|---|
| `D:\slate` | Full clone, `origin` renamed to `upstream`, no GitHub fork pushed |
| Toolchain | Bun 1.4.2 (matches the repo pin), Node 22.22.2, Rust 1.94 |
| Dependencies | `bun install` clean — 2,002 packages |
| Packages | `bun run build:packages` clean — required, since `@open-pencil/core` is a *peer* dep of `dom-css` and its export map points at `dist/` |
| `.slate/fixture.fig` | Your file, gitignored — the design system never lands in git |

**Tooling written (all re-runnable):**

- `scripts/conformance/gap-report.mjs` → `.slate/CONFORMANCE.md` — source-derived
  inventory of which properties the bridge references. `--check` fails on a stale
  report, for CI.
- `scripts/conformance/roundtrip.mjs` → `.slate/roundtrip.json` — the live measurement.
  Routes `.fig → SceneGraph → DesignDocument → SceneGraph` and diffs node by node.
- `scripts/conformance/why-dropped.mjs` — classifies *why* a node never reached the
  bridge, separating deliberate skips from defects.

---

## 3. Findings

### 3.1 Reach — not the disaster it first looks like

Of 98,645 nodes, only **12,484 (12.7%) reach the bridge at all.** The raw number reads
like catastrophe. It is not.

```
  76319   77.4%  ancestor-internal
  12484   12.7%  REACHABLE
   4399    4.5%  self-internal
   3999    4.1%  ancestor-hidden
   1444    1.5%  self-hidden
```

The bridge has exactly one refusal condition — `!node.visible || node.internalOnly`
([from-scene-graph.ts:247](../packages/dom-css/src/from-scene-graph.ts)) — and the
classifier returned **Unexplained: 0**. Every dropped node is a hidden or internal layer,
and skipping those is correct.

Traversal is validated: 12,484 reachable, 12,483 paired.

> **This was nearly misreported as an 87% failure.** It is the second finding in this
> session that reversed on verification. Treat any dramatic number as unverified until a
> classifier accounts for it.

### 3.2 Node type — total collapse

Every type becomes `FRAME`:

```
 2439  INSTANCE       -> FRAME      463  COMPONENT     -> FRAME
 2216  TEXT           -> FRAME       54  CANVAS        -> FRAME
 2175  ROUNDED_RECT   -> FRAME       47  ELLIPSE       -> FRAME
 1685  VECTOR         -> FRAME       40  COMPONENT_SET -> FRAME
```

`type` survives at 27%, and that 27% is only the nodes already frames. Nothing is
preserved; the survivors are coincidences.

### 3.3 Tokens — total loss

**13,988 nodes carry 17,196 bindings. 0 survive.** Variable collections: 5 in, 0 out.

A colour bound to a token exports as a frozen literal and returns as a frozen literal.
For a design system this is the gap that matters most — it is the entire reason the
round trip exists.

### 3.4 Property survival, worst first

```
   lost / present  rate   property
  12429 /  12429     0%   componentId
   9126 /  12483    27%   type
   8933 /   8933     0%   fills
   8406 /  12483    33%   x
   7928 /   7928     0%   boundVariables
   7026 /  12483    44%   y
   6168 /   6168     0%   fillGeometry
   2216 /   2216     0%   lineHeight
   2216 /  12483    82%   text
   2094 /   2094     0%   vectorNetwork
   1592 /   1592     0%   strokes
   1504 /   1504     0%   textStyleId
```

Three groups:

1. **Should work, doesn't** — `fills`, `strokes`, `lineHeight`, `x`/`y`. Referenced in
   both directions, still lost. Paint structure flattens to a CSS colour string and
   cannot reconstitute.
2. **Nowhere to put it** — `componentId`, `boundVariables`, `type`, `textStyleId`.
3. **Correctly impossible** — `vectorNetwork`, `fillGeometry`, `strokeGeometry`. These
   should stay at 0% and be handled by an SVG escape hatch, not a CSS mapping.

### 3.5 The 90.2% is a flattering number

It counts only paired nodes and only non-empty values. Composed with a 12.7% reach rate
and total type collapse, true end-to-end fidelity is far lower. **Do not quote 90.2%
without both qualifiers.**

---

## 4. Root cause

One definition explains groups (2) and (3) above —
[dom-css/src/types.ts:12](../packages/dom-css/src/types.ts):

```ts
export interface DesignElement {
  type: 'element'
  tagName: string
  attrs: Record<string, string>
  children: DesignNode[]
  inlineStyle?: DesignStyleDeclaration
  computedStyle?: DesignStyleDeclaration
  sourceSceneNodeId?: string
  sourceSceneNode?: SceneNode
}
```

There is **nowhere to put what a node is.** No slot for node type, component identity, or
token binding. Anything that isn't CSS has no carrier, so it falls on the floor. Node
type, `componentId` and `boundVariables` all die for this one reason.

`sourceSceneNode` looks like an escape hatch but is not: it is a live object reference
that cannot survive serialisation to HTML, which is the point of the exercise.

**The landing place already exists.** `attrs` is a real string map and already carries
`data-open-pencil-node-id` intact across the full round trip. Design facts encoded as
`data-*` attributes would survive into HTML *and* parse back — and would make the
exported HTML legible to a human or an AI: this div is a Button instance bound to
`--al-color-primary`, stated in the markup.

That is Option C, concretely. It closes tokens, component identity and node type
together.

---

## 5. Action plan

### Phase 1 — carry the design fact (the unlock)

1. Extend `DesignElement` with a serialisable design-fact record.
2. Emit it as `data-*` attributes in `from-scene-graph.ts`: `data-node-type`,
   `data-component-id`, `data-bound-vars`.
3. Read it back in `to-scene-graph.ts`, preferring the design fact over CSS inference
   when both are present.
4. Re-run `roundtrip.mjs`. Expected: `type`, `componentId`, `boundVariables` move from
   ~0% toward ~100%.

**This is the whole thesis. Nothing else should start before it works.**

### Phase 2 — token bindings as CSS custom properties

With Phase 1 carrying the binding, map bindings to `var(--token-name)` in the emitted
CSS so exported code is *idiomatic* and not merely reversible. Resolve through the
existing `resolveColorVariable` / `resolveNumberVariable`. This is the phase your
Altitude token pipeline actually consumes.

### Phase 3 — fix what should already work

`fills`, `strokes`, `lineHeight`, `x`/`y`. Each needs a structure-preserving encoding
rather than a flattened CSS string. Gradients, multiple fills and image fills all need a
representation that survives. Phase 1's design-fact carrier may do most of this for free
— **re-measure before writing new code here.**

### Phase 4 — SVG escape hatch

`vectorNetwork`, `fillGeometry`, `strokeGeometry`, boolean operations. Emit real SVG
rather than a lossy box. Record it as a *deliberate, permanent* degradation in
`CONFORMANCE.md` so it stops looking like unfinished work.

### Phase 5 — gate it

Wire `roundtrip.mjs` into CI with a fidelity floor per property group. Regressions then
fail a build instead of being discovered months later. This is your VRT playbook applied
to file fidelity.

### Deferred, deliberately

- **Multiplayer/sharing.** Today: Yjs + Trystero WebRTC P2P + y-indexeddb. No server
  means no persistence once everyone leaves, no async collaboration, no permissions, no
  share links. A relay tier (Cloudflare Durable Objects + R2 fits your existing stack) is
  a small addition to Yjs — but it is orthogonal to fidelity and should wait.
- **ZSeven-W agent-team orchestration.** Theirs is Rust; this is a port, not a copy.
  Real cost, no fidelity benefit. Revisit after Phase 2.
- **Renaming off "Slate."** The GitHub org and bare npm name are taken, and
  `ianstormtaylor/slate` (31.7k★) is a rich-text editor framework — a genuine collision.
  Costs nothing now, costs more after a public push.

---

## 6. Open questions

1. ~~**What are the `internalOnly` subtree roots?**~~ **RESOLVED — see §6.1.**
2. **Is the model round trip the right measurement?** This run deliberately skipped HTML
   serialisation to isolate the model. A second pass through real HTML text will add
   parsing losses on top.
3. **Does `.fig` *export* work?** Only import was measured. Writing back to `.fig` is
   untested.

### 6.1 Resolved — the component library IS reachable, with a named exception list

`bun scripts/conformance/reachable-library.mjs .slate/fixture.fig`

**A single internal canvas explains almost everything.** One `CANVAS` named
`"Internal Only Canvas"` holds **81,931 nodes** — 83% of the file and 95% of all skipped
nodes. The remaining refused roots are ordinary hidden layers in working files (`Actions`
frames, `Link-Blue` instances). Nothing sinister.

**The 40 reachable component sets are unmistakably Altitude:**

> Checkbox (26 variants), Chip (40), Combobox, Dialog, Divider, Drawer, Empty State,
> Field Note, File Upload, Heading, Input, Input Stepper, Link, List Item, Menu, Menu
> Item, Pagination, Popover, Progress, Radio, Range, Select, Tab, Table, Tabs, Text
> Block, Textarea, Toggle, Toggle Button, Tooltip …

So the favourable reading holds: **the bridge sees the real design system**, not a
fragment. Phase 1 can be validated against genuine components.

**But the exception list is real.** 1,531 distinct set names exist *only* behind the
refusal boundary. Most is explainable — the entire icon library (`paperplanetilt`,
`checkcircle`, `youtubelogo` …), `(reference)` duplicate copies, `archive /` prefixed
items, and components `CLAUDE.md` records as deliberately removed (`button group`,
`chip group`, `toggle button group`).

**Five are not explainable and need eyes:**

| Only-internal in Figma | Live in `libs/al-web-components/components/` |
|---|---|
| `accordion` | ✅ |
| `alert` | ✅ |
| `avatar` | ✅ |
| `banner` | ✅ |
| `skeleton` | ✅ |

All five ship in the code. None has a reachable component set in this `.fig`. Altitude
has 69 component directories against 40 reachable sets, so the gap may be wider — though
not all 69 are component sets in Figma (`accordion-panel` is a sub-component, and
`.altitude/contracts/COVERAGE.md` governs what is representable at all).

This is a **Figma file-organisation question, not a bridge defect** — the bridge is
correct to skip `internalOnly`. But the consequence is real: those components cannot
round-trip until they sit on a visible page. Worth checking in the Figma file before
Phase 1 validation, so the test set isn't quietly missing components you care about.

---

## 7. Reproducing

```bash
cd /d/slate
bun install
bun run build:packages          # required — dom-css peer-deps on core's dist/
bun scripts/conformance/roundtrip.mjs .slate/fixture.fig --json .slate/roundtrip.json
bun scripts/conformance/why-dropped.mjs .slate/fixture.fig
node scripts/conformance/gap-report.mjs
```

Each parse of the 98k-node fixture takes roughly two minutes.

---

## 8. Judgement

The architecture is sound and the fork is the right base. `packages/dom-css` is a real
bidirectional bridge, not a stub, and the scene graph is a faithful Figma model —
variables, collections, modes, component sets, instance overrides all present.

What is missing is a carrier for meaning across the CSS boundary. That is a genuinely
small change at the centre of a large system, and everything in Phase 1 flows from it.

The risk is not that the work is hard. It is that fidelity claims get made from source
reading instead of measurement. Two claims reversed under verification in a single
session — the 87% "failure" and the padding "loss." **Measure, then claim.**
