# Heavy-load performance — baseline and plan

**Measured 2026-10-06** on the Altitude design-system `.fig` (98,411 nodes populated; the
"Internal Only Canvas" holds 81,931 of them, including 18,681 components and 52,962
vectors). Production build, headless Chromium on a hardware GPU (RTX 3080 Ti), plus Bun
headless timings and CPU profiles. Unmarked numbers are measured; anything *inferred* comes
from reading code.

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
