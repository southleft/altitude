import { populateAndApplyOverrides } from '@open-pencil/fig/instance-overrides'
import type { InstanceNodeChange } from '@open-pencil/fig/instance-overrides'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { planLazyPopulationRoots } from '#core/kiwi/fig/population/roots'

export interface LazyFigImportContext {
  changeMap: Map<string, InstanceNodeChange>
  guidToNodeId: Map<string, string>
  blobs: Uint8Array[]
  /**
   * Pages populated in full, plus top-level subtrees of other pages that an earlier pass
   * populated because a populated instance depends on them.
   */
  populatedRootIds: Set<string>
}

/** The source half of a lazy context: read-only once import has built it. */
export type LazyFigImportSource = Omit<LazyFigImportContext, 'populatedRootIds'>

/**
 * A lazy context whose source changes are still held by the worker that parsed the file.
 *
 * The change map is as large as the document, so copying it to the main thread with the
 * graph cost seconds of structured clone that most sessions never use: the worker that
 * keeps it also populates pages. It is fetched only when the main thread has to populate
 * by itself (a stale or failed worker, or a whole-document export).
 */
interface DeferredLazyFigImport {
  populatedRootIds: Set<string>
  load: () => Promise<LazyFigImportSource>
  pending?: Promise<LazyFigImportContext | undefined>
}

const lazyFigImportContexts = new WeakMap<SceneGraph, LazyFigImportContext>()
const deferredLazyFigImports = new WeakMap<SceneGraph, DeferredLazyFigImport>()

export function setLazyFigImportContext(graph: SceneGraph, context: LazyFigImportContext): void {
  deferredLazyFigImports.delete(graph)
  lazyFigImportContexts.set(graph, context)
}

/** Register a lazy context whose source is loaded on demand; see `DeferredLazyFigImport`. */
export function setDeferredLazyFigImportContext(
  graph: SceneGraph,
  populatedRootIds: Iterable<string>,
  load: () => Promise<LazyFigImportSource>
): void {
  lazyFigImportContexts.delete(graph)
  deferredLazyFigImports.set(graph, { populatedRootIds: new Set(populatedRootIds), load })
}

/** The context, when its source is already on this thread. */
export function getLazyFigImportContext(graph: SceneGraph): LazyFigImportContext | undefined {
  return lazyFigImportContexts.get(graph)
}

/** Whether the graph still has lazily imported pages, loaded or deferred. */
export function hasLazyFigImport(graph: SceneGraph): boolean {
  return lazyFigImportContexts.has(graph) || deferredLazyFigImports.has(graph)
}

/** Whether the lazy context still has to fetch its source before main-thread population. */
export function isLazyFigImportDeferred(graph: SceneGraph): boolean {
  return deferredLazyFigImports.has(graph)
}

/** Record pages populated elsewhere (by the population worker) as loaded. */
export function setLazyFigImportPopulatedRoots(graph: SceneGraph, rootIds: Iterable<string>): void {
  const populated =
    lazyFigImportContexts.get(graph)?.populatedRootIds ??
    deferredLazyFigImports.get(graph)?.populatedRootIds
  if (!populated) return
  populated.clear()
  for (const id of rootIds) populated.add(id)
}

/**
 * Make the lazy context available on this thread, fetching a deferred source once.
 * Resolves undefined when the graph has no lazy context or the source is unavailable
 * (its worker died); population then has nothing to apply.
 */
export function ensureLazyFigImportContext(
  graph: SceneGraph
): Promise<LazyFigImportContext | undefined> {
  const loaded = lazyFigImportContexts.get(graph)
  if (loaded) return Promise.resolve(loaded)
  const deferred = deferredLazyFigImports.get(graph)
  if (!deferred) return Promise.resolve(undefined)
  deferred.pending ??= deferred.load().then(
    (source) => {
      if (deferredLazyFigImports.get(graph) !== deferred) return lazyFigImportContexts.get(graph)
      const context = { ...source, populatedRootIds: deferred.populatedRootIds }
      setLazyFigImportContext(graph, context)
      return context
    },
    (error: unknown) => {
      if (deferredLazyFigImports.get(graph) === deferred) deferred.pending = undefined
      console.warn('[fig] Lazy page source is unavailable:', error)
      return undefined
    }
  )
  return deferred.pending
}

export function clearLazyFigImportContext(graph: SceneGraph): void {
  lazyFigImportContexts.delete(graph)
  deferredLazyFigImports.delete(graph)
}

function applyPopulation(
  graph: SceneGraph,
  context: LazyFigImportContext,
  rootIds?: string[]
): void {
  graph.withDerivedMutations(() => {
    graph.preserveSourceMetadataDuring(() => {
      populateAndApplyOverrides(
        graph,
        context.changeMap,
        context.guidToNodeId,
        context.blobs,
        rootIds
      )
    })
  })
  const populatedRootIds = rootIds ?? graph.getPages(true).map((page) => page.id)
  for (const id of populatedRootIds) context.populatedRootIds.add(id)
}

function populateRoots(
  graph: SceneGraph,
  context: LazyFigImportContext,
  rootIds: Iterable<string>
): boolean {
  const pending = [...rootIds].filter((id) => id && !context.populatedRootIds.has(id))
  if (pending.length === 0) return false
  const planned = planLazyPopulationRoots(graph, context, pending)
  if (planned.length > 0) applyPopulation(graph, context, planned)
  for (const id of pending) context.populatedRootIds.add(id)
  return true
}

export function populateLazyFigImportRoots(graph: SceneGraph, rootIds: Iterable<string>): boolean {
  const context = getLazyFigImportContext(graph)
  return context ? populateRoots(graph, context, rootIds) : false
}

export function populateAllLazyFigImportRoots(graph: SceneGraph): boolean {
  const context = getLazyFigImportContext(graph)
  if (!context) return false
  const rootIds = graph.getPages(true).map((page) => page.id)
  if (rootIds.every((id) => context.populatedRootIds.has(id))) return false

  // Revisit the initially populated page without an active-root filter.
  // Cross-page component chains can only stabilize when global override
  // resolution can see every source and target in the same pass.
  applyPopulation(graph, context)
  return true
}
