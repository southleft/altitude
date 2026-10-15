# Heavy-load performance — baseline and plan

**Measured 2026-10-06** on the Altitude design-system `.fig` (98,411 nodes populated; the
"Internal Only Canvas" holds 81,931 of them, including 18,681 components and 52,962
vectors). Production build, headless Chromium on a hardware GPU (RTX 3080 Ti), plus Bun
headless timings and CPU profiles. Unmarked numbers are measured; anything *inferred* comes
from reading code.

## Round 3 (recovery off user edits and the main thread; time-sliced first recording) — measured 2026-10-09

Same machine and method; `scratchpad/perf-g/bench-r.ts` (`MODE=switch|pan`). "Before" is
`perf/large-docs` (round 2) merged on `main`; "after" is `perf/recovery-snapshot`. Two runs
each; runs vary ±20 %, so ranges are shown.

| Metric (Altitude `.fig`, internal canvas) | Before | After |
|---|---|---|
| Switch + fit → settled | 23.7–32.6 s | **14.8–21.5 s** |
| Longest main-thread task during the switch | 8.5–10.6 s | **1.6–2.0 s** (population + layout) |
| All long tasks during the switch | 21–28 s | 4.1–6.5 s |
| Pan (40 wheel steps) right after the switch: worst frame / p95 | 13,048 ms / 7.5 ms¹ | **1,793 ms / 21 ms** |
| Recovery snapshot after the switch with no edit | yes (whole document, main thread) | **none**; document stays clean |
| Snapshot after an edit: longest main-thread task | 7.3–10.6 s | **≤ 60 ms** (later edits: none ≥ 50 ms)² |
| JS heap after the run | 2.1–2.2 GB | 1.04–1.07 GB |

¹ Before, the wheel events queue behind the 8–13 s recording task (p95 is low because only
the frames after it count). ² First snapshot of a session sends the whole document to the
worker in 8 ms slices (≈5 s of sliced main-thread work); later ones send only changed nodes.
The 13.5 MB IndexedDB write itself cost 0.8 s (`Uint8Array.from`); it is now a `slice()`.

What changed:

- **Recovery follows user edits.** Population, the instance sync it triggers, and layout run
  as derived mutations (`SceneGraph.withDerivedMutations`, `withLayoutMutations`); the change
  tracker ignores them, recovery follows its content revision, and autosave skips clean
  documents. A switch to the internal canvas emitted 6,233 created / 34,019 updated /
  677 deleted node events, all derived now (`perf-r/events.ts`).
- **Snapshot in a worker mirror** (`createFigExportMirror`). The worker keeps a copy of the
  document; graph events mark dirty nodes, which are sent as compact nodes in slices, with the
  lazy source once and the fonts text export needs; the last small batch and the export
  request go in one synchronous step. The worker encodes with `encodeFigFile` (renderer-free
  split of `exportFigFile`). Engine test: same decoded `.fig` as the main-thread export.
- **First-time picture recording in slices.** Missing pictures are recorded and drawn into an
  overscanned raster within 10 ms per frame, visible children first in paint order (exact in
  the viewport once drawn), then nearest first; the raster is presented meanwhile, restarts
  when the viewport leaves it, and is seeded from the page's previous backing after an edit.
  When complete it becomes an inexact backing that the existing incremental build replaces;
  a page whose pictures fit one frame's budget takes the old synchronous path. Engine test:
  settled frame and backing pixel-identical to the synchronous path; canvas e2e suite with
  base-generated Windows baselines: same 16 environmental failures on base and head, no
  snapshot diffs.

Still slow: the switch's population delta + derived instance sync + layout (~1–2 s tasks);
the first-visit render takes ~10 s of sliced work (recording plus two playbacks); an edit on
this page still spends ~0.9 s computing retained subtree bounds for region repaint.

## Round 2 (G18 faster open, G19 region redraw) — measured 2026-10-09

Same file and method: production build served locally, headless Chromium on the RTX 3080 Ti,
1440×900, `?navigation-benchmark&renderer=retained`; scripts in
`scratchpad/perf-g/` (`bench.ts`, `dump.ts`, `equiv-transfer.ts`). "Before" is `main` at
`2866486df` (round 1 already merged).

| Metric (Altitude `.fig`) | Before | After |
|---|---|---|
| `openFile` → first page shown | 17.2 s | **9.2 s** |
| Longest main-thread task while opening | 3,770 ms | **118 ms** |
| All long tasks while opening | 3,990 ms | 743 ms |
| JS heap after open | 896 MB | 729 MB |
| Switch to FOUNDATIONS / ATOMS (first visit) | 2.3 s / 0.95 s | 0.14 s / 0.10 s |
| Switch to internal canvas + fit (first visit) | 19.1 s, longest task 8.7 s | 22.3 s, longest task 8.2 s |
| Opacity edit at fit, to two frames | 330–400 ms | **190–210 ms** |
| Pan at fit (40 wheel steps), p95 / worst frame | 28 ms / 1,147 ms | 14 ms / 1,029 ms¹ |
| Pan right after an edit, worst frame | 4,560 ms | **14 ms** |

¹ The remaining ~1 s task during that pan is the document-recovery snapshot writing to
IndexedDB (CPU profile: `write` in the recovery store), not rendering; renderer frames
during the gesture stay under 50 ms in the navigation trace.

Per change (open, longest main-thread task): on-demand component population 14.9 s / 4.2 s;
plus compact streamed transfer 9.5 s / 124 ms; plus lazy vector networks 9.3 s / 120 ms and
heap 884 → 731 MB.

What changed:

- **On-demand component population (1E).** First-page mode no longer populates every page
  that holds a component (45 of 55). Each population pass is planned from the requested page:
  pages holding components its instances can clone (component, symbol-override swaps,
  instance-swap props) join transitively, in document order. The Altitude cover has no
  instances, so open populates one 17-node page. Worker import 9.2 → 4.9 s (Bun). The opened
  page is identical to the eager pass on the fixtures and Altitude (`dump.ts`). After visiting
  every page, 0.4 % (material3) / 1.5 % (Altitude) of nodes differ from the eager order,
  because the override engine is order-dependent: the eager pass itself differs from
  `populate: 'all'` on 3.9 % of Altitude nodes, and the on-demand result is as close to it.
  The cost moves to the first visit of a page that needs the internal canvas.
- **Compact streamed transfer (1D).** The session worker sends nodes as the fields that differ
  from `createDefaultNode` (source and source.fig diffed too), 2,000 nodes per message, before
  the rest of the graph; population deltas use the same encoding. Field-for-field and key-order
  equal to the old full clone on all 98,411 nodes (`equiv-transfer.ts`).
- **Lazy vector networks (1C).** A network equal to what `source.fig.rawNodeFields.vectorData`
  decodes to is not sent; the node gets an accessor that decodes on first read (52,246 nodes).
- **Region repaint (2D/G19).** The retained backing keeps its surface and each top-level
  child's painted bounds. Attributable edits repaint only the children's old and new bounds,
  from a same-size scratch surface drawn unclipped and copied back, so the result equals a full
  rebuild pixel for pixel (engine test; drawing into a clip is not exact on the CPU raster).
  Panning past the overscan shifts the old pixels and draws only the exposed strips (3.5 ms
  instead of a 1.2–1.4 s full render); that backing and one recorded before a font load are
  presented only while navigating and rebuilt by the time-sliced build. Guide owners are cached
  per scene version (the overlay walked 82k nodes per frame).
- **Tiled renderer measured, not adopted.** `?renderer=tiled` on the same build pans as
  smoothly once settled, but the internal canvas took 32 s more to settle after the switch
  (55 s of long tasks) and edits cost ~395 ms; retained stays the default.

Still slow (next steps):

- *(Addressed in round 3.)* **Internal canvas first visit, 22 s:** first-time recording of 6,083 subtree pictures
  synchronously (8.6 s), the recovery snapshot exporting the whole document on the main thread
  (7.6 s, triggered by the switch's population/layout scene versions), layout 1.5 s, and the
  page's population in the worker. Recording the first backing time-sliced and keeping
  recovery off non-user changes (or in a worker) are the two big levers.
- Font loads still invalidate every retained picture; they are now rebuilt without a freeze.

## 1. Opening big files: ~27 s to first page

| Stage | Time |
|---|---|
| zstd + Kiwi decode | ~1.1 s |
| `importNodeChanges` (first-page mode), in worker | 9–13 s |
| Worker → main transfer (structured clone of the whole graph, ~660 MB) | **5–7 s main-thread block** |
| `deserializeSceneGraph` | 1.2 s |
| JS heap after open / after visiting the internal canvas | 908 MB / 1.68 GB |

Opening is not actually lazy for this file. Every node on every page is created up front.
"Lazy" only defers instance population, and `componentPageIdsForLazyPopulation` pulls in
**45 of 55 pages**, because they contain components. The population worker is DEV-only
(`canUseFigPopulationWorker` checks `import.meta.env.DEV`), so production populates pages
on the main thread. `buildOverrideContext` rescans the full change map on every lazy page:
about 0.6 s even for an empty page.

| # | Fix | Impact | Effort |
|---|---|---|---|
| 1A | Keep the change map in the worker instead of sending it with the graph; drop the DEV-only gate on the population worker | 1–3 s off the main-thread block; page switches stop freezing | S |
| 1B | Cache the invariant parts of `buildOverrideContext` | ~0.5 s per page switch | S |
| 1C | Decode `vectorNetwork` lazily and keep it out of the transfer | ~30% of the payload | M |
| 1D | Send a compact or columnar graph, or render from the worker's graph | removes the multi-second block | L |
| 1E | Build component instance contents on demand rather than per page | largest import win for DS files | M–L |

## 2. Canvas lag: selecting one component takes 13 s on the internal canvas

The cover page is fine: 7 ms frames. On the internal canvas: page switch 12–16 s, hover
75–90 ms per move, single opacity edit 2.4–3.2 s, select one component 12.7–14 s, select
all 17–18 s, pan p95 frame 150 ms–1 s.

| # | Bottleneck → fix | Impact | Effort |
|---|---|---|---|
| 2A | `SharedStyleField.vue` mounts an `AppSelect` with **3,250 fill-style options** in two sections. Reka `SelectRoot.onOptionAdd` makes this quadratic. `getSharedStyles` scans all 98k nodes per section on every change. → Virtualized combobox, or render options only while open; index shared styles once and update from events | **8–10 s off every selection** | S |
| 2B | `retained-backing.ts` throws away and re-records every retained picture on any `sceneVersion` change. → Invalidate per node or subtree (`invalidateNodePicture` exists) | edits 3 s → <100 ms | M |
| 2C | Component labels (`labels/cache.ts`, `drawComponentLabels`) recompute world bounds and draw ~20k labels every frame. → Cull with a spatial index, hide by zoom or count, cache origins | ~30% of navigation CPU | S |
| 2D | Settled frames draw every top-level picture (`Surface.flush` 17 s at fit). → Default to the tiled renderer (`?renderer=tiled`) on large pages, or cull pictures against the viewport | large at fit | M |
| 2E | Hit testing is linear and the position cache is cleared every frame. → `rbush` spatial index (already a dependency) | hover | S–M |

Already done well: the graph is `shallowReactive`, the layer tree is virtualized, renders
are batched to one per animation frame, and pan/zoom draw from a backing image.

## 3. Code panel / HTML export (fork-local)

| Subtree | Code panel config (facts on, geometry off) | Geometry on | Facts off |
|---|---|---|---|
| Button set, 1,441 nodes | 140 ms | 281 ms | 9 ms |
| Icons, 3,050 nodes | 895 ms / 4.3 MB | 2.1 s / 62.6 MB | 212 ms |
| Internal canvas, 81,931 nodes | 6.8 s / 86.7 MB | 14.5 s / 391.5 MB | 1.16 s |

| # | Fix | Effort |
|---|---|---|
| 3A | `residualFacts`: check bulky geometry fields first, use cheap type and emptiness checks before `JSON.stringify` compares, drop `structuredClone` (~3× estimated) | S |
| 3B | Debounce or idle-schedule `CodePanel` `generatedJSX`; skip during interactive edits (*inferred*: currently recomputes on every `sceneVersion` bump) | S |
| 3C | Encode each fact once; single-pass `escapeAttr` | S |
| 3D | Don't build children under vector nodes that emit raw SVG | S |

## 4. App startup: 1.9 MB gzip of JS before the canvas starts loading

`boot.ts` statically pulls 50 chunks (6.4 MB raw / 1.89 MB gzip). CanvasKit (2.8 MB gzip)
starts downloading only in `onMounted`, after all of that JS. The PWA precaches 28 MB.

| # | Fix | Saves (gzip) | Effort |
|---|---|---|---|
| 4A | AI SDK + chat markdown/Shiki off the critical path (largely solved by removing the AI tab; make the remaining imports dynamic) | ~430 KB | M |
| 4B | Load collab (mqtt/yjs/trystero) only when sharing starts | ~135 KB | S–M |
| 4C | Preload or kick off CanvasKit in `boot()` | overlaps 2.8 MB | S |
| 4D | Start WebMCP when idle | ~80 KB | S |
| 4E | Make sucrase, opentype and unifont dynamic | ~250 KB | M–L |
| 4F | Async-load the global dialogs; narrow the PWA precache | — | S |

## Order of attack

1. **2A, 1A, 1B, 3A–3D, 4C** — all small, together the bulk of the felt pain.
2. **2B, 2C, 2E, 4A, 4B, 4D**.
3. **1C–1E, 2D, 4E** — structural; worth upstreaming to OpenPencil, since areas 1, 2 and 4
   are upstream code.

Raw profiles and logs (local only):
`%TEMP%\claude\D--slate\70eab8ac-…\scratchpad\perf\`.
