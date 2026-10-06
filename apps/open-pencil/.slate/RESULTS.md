# Slate — Option C implementation results

**Date:** 2026-09-23
**Fork base:** `open-pencil/open-pencil` @ `8131401ea` (MIT)
**Measured against:** `Altitude Design System.fig` — 12.5 MB, 98,645 nodes

`FINDINGS.md` is the diagnosis that started this work and is left as written. This is what
changed. `ROUND-TRIP.md` is the contract a future reader needs.

---

## 1. Headline

| | Before | After |
|---|---|---|
| **Property values surviving (model path)** | 90.2% | **99.9%** |
| **Property values surviving (full HTML text path)** | not measured | **99.89%** |
| Node type | 27% | **100%** |
| Token bindings (`boundVariables`) | **0 of 17,196** | **100% of reachable** |
| Component identity (`componentId`) | 0% | **100%** |
| Paint structure (`fills` / `strokes` / `effects`) | 0% | **100%** |
| Text metrics (`lineHeight` / `fontSize` / `fontFamily`) | 0% / 91% / 85% | **100%** |
| Canvas position (`x` / `y`) | 33% / 44% | **100%** |
| Properties bridged (source inventory) | 42% | **100%** (115/115) |
| Duplicate nodes created on import | 2,216 | **0** |
| Lint | — | 0 errors, 0 warnings |
| Tests | 0 | 75, ~700 ms |

The node-type collapse, the token loss, the component-identity loss and the paint loss all
had **one cause**: `DesignElement` had nowhere to record what a node *is*. That is now the
design-fact carrier, mirrored into `data-op-*` attributes so it survives HTML.

## 2. What shipped, by phase

**Phase 1 — design-fact carrier.** `design-fact.ts`. Node type, layer name, component
identity, token bindings, variable modes, shared-style ids, paint structure, canvas
position, and an allow-listed residual bucket for everything else CSS cannot say. Travels
twice: typed on `element.design`, and as `data-op-*` attributes, which is the only form
that survives serialisation.

**Phase 2 — tokens as CSS.** `design-tokens.ts`. A bound value exports as
`var(--token, literal)`; `variableCollectionsToCSS()` emits the `:root` block.
`pickStyle()` unwraps `var()` on the way back in — without that, turning token export on
silently dropped `itemSpacing` on 601 nodes.

**Phase 3 — the "should work, didn't" group.** Paint structure carried verbatim (CSS
colours are 8-bit; a channel of `0.123` cannot survive `rgb()`). The duplicate-TEXT bug
fixed: a design fact saying `nodeType: TEXT` is now authoritative over the "looks like
text" heuristic, which previously produced two nodes for one and cost every text metric.
Rotation, flips and blend mode added to CSS. Border longhands always emitted. `border`
shorthand now parsed — it never was, so hand-written `border: 1px solid red` was ignored
entirely.

**Phase 4 — SVG escape hatch.** Vector families export as inline SVG via the app's own
`renderNodesToSVG`, on `element.rawHTML`. Fidelity is independent of it; this is about the
output being usable instead of an empty box where a logo was.

**Phase 5 — the gate.** `conformance:gate` asserts absolute floors and a recorded
baseline, on a fixture built in code so CI needs no `.fig`. **Verified to fail:** disabling
the carrier makes it exit 1 and name every regressed property.

**Also closed:** CSS Grid both directions (the layout engine had it; the bridge never read
it), and `cornerSmoothing`.

## 3. Audit findings, fixed

**Hostile markup could corrupt the graph.** `data-op-props` was applied straight onto the
node, so `{"id":"x","childIds":[],"parentId":"y"}` overwrote identity and tree structure —
leaving `graph.nodes` keyed by one id while the node claimed another. Residual writes are
now allow-listed and node types validated; unknown types degrade to `FRAME` and are named.
This is not an exotic threat: the premise is that this markup gets edited by people and
agents, so wrong attributes are ordinary input.

**`JSON.stringify(new Map())` is `{}`** — silent, not an error. `instanceOverrides` was
carried in an attribute that *looked* correct while the fact inside had been destroyed.
Maps and Sets now use a tagged encoding.

**`structuredClone` bypassed the repo's copy helpers.** `copyFills`/`copyStrokes`/
`copyEffects` carry provenance through a WeakMap that `structuredClone` discards. The
repo's own lint rule caught this.

**Markup was unreadable.** Every node carried every residual field, including defaults
like `starInnerRadius: 0.38` on a plain frame. Residual facts are now diffed against
`createDefaultNode()` per type, so only differences travel.

**Export size.** Carrying raw geometry produced **114.84 MB** of HTML, 95% of it
`data-op-*` — fatal for the AI-conversion goal. `geometryFacts: false` gives **13.34 MB**
(8.6× smaller), names the omission on every affected node, and keeps the artwork as SVG.
Default stays `true`: silently losing geometry is worse than a large file. **Pick the flag
deliberately per use case.**

## 4. Four measurement bugs, all in my own tooling

Every one of these produced a confident wrong number before being caught:

1. **`isEmpty` ignored `''`.** Scene nodes default `componentId` to `null` but the importer
   yields `''`, so 31% of componentId looked lost when nothing was.
2. **A `node.x` regex missed destructuring.** `const { paddingTop } = node` is a read;
   padding was reported lost when it round-tripped fine.
3. **`stableStringify` did not sort keys.** `copyGradientStop` rebuilds `{color, position}`
   where the importer made `{position, color}`; the gate called that a lost fill.
4. **The gap report counted only CSS.** It claimed 45% coverage while measured fidelity was
   99.9%, because it could not see the carrier that closed the gap.

The lesson is the one already in `FINDINGS.md` §8, now with four more data points:
**measure, then claim — and be as suspicious of the ruler as of the thing measured.**

## 5. Remaining gaps

1,126 of 1,000,936 values (0.11%), all small CSS edge cases: `layoutAlignSelf` (135),
per-side border weights on nodes without strokes (~110 each), corner radii (67 each).
Named in `CONFORMANCE.md`; none is a structural loss.

**Still deliberate, still named:**
- `CANVAS → FRAME` on 54 nodes — a canvas cannot nest inside a page.
- 86,161 nodes (87%) never reach the bridge — hidden and `internalOnly` layers, correctly
  skipped, **Unexplained: 0**.
- Five live components (`accordion`, `alert`, `avatar`, `banner`, `skeleton`) exist in the
  `.fig` only behind the refusal boundary. **A Figma file-organisation question, not a code
  one** — see `FINDINGS.md` §6.1.

## 6. Not done

- **`.fig` *export*** is untested. Only import was measured; writing back is unverified.
- **Category-3 precedence** (see `ROUND-TRIP.md`): for `fills`/`strokes`/`x`/`y`, editing
  the CSS alone will not change the design, because the fact overrides it. Deliberate, and
  the limitation a future editing workflow has to design around.
- **73 pre-existing test failures** in canvas/text-shaping suites, from a Windows-only
  CanvasKit path bug (`/D:/slate/...`). **Proven pre-existing** — the same failure
  reproduces with all changes stashed, and the failing file list is byte-identical. Nothing
  in `dom-css`, `scene-graph` or `pen` fails.

## 7. Commands

```bash
bun test packages/dom-css/tests                        # 75 tests, ~700ms
bun run conformance:gate                               # CI floor, no .fig needed
bun run conformance:gate -- .slate/fixture.fig         # floors against a real file
bun run conformance:roundtrip .slate/fixture.fig       # per-property deep dive
bun run conformance:roundtrip .slate/fixture.fig --focus fills   # why one property fails
bun scripts/conformance/html-roundtrip.mjs .slate/fixture.fig    # full text path + size
bun scripts/conformance/why-dropped.mjs .slate/fixture.fig --roots
bun scripts/conformance/reachable-library.mjs .slate/fixture.fig
bun run conformance:report                             # regenerate CONFORMANCE.md
```
