import type { SceneGraph } from '@open-pencil/scene-graph'

import {
  ensureLazyFigImportContext,
  hasLazyFigImport,
  isLazyFigImportDeferred,
  populateLazyFigImportRoots,
  setDeferredLazyFigImportContext,
  setLazyFigImportPopulatedRoots,
  type LazyFigImportSource
} from '#core/kiwi/fig/lazy-import'
import {
  MAX_FIG_POPULATION_WORKER_NODES,
  type FigSessionResponse
} from '#core/kiwi/fig/session/protocol'
import { randomHex } from '#core/random'

import { applyFigPopulationDelta, type FigPopulationDelta } from './delta'

interface PopulationResult {
  type: 'population-result'
  requestId: string
  baseRevision: number
  populated: boolean
  delta: FigPopulationDelta
}
type WorkerResult = PopulationResult | { type: 'population-error'; error: string }

const FIG_POPULATION_WORKER_TIMEOUT_MS = 30_000
const populationWorkers = new WeakMap<SceneGraph, FigPopulationWorker>()
interface OriginalArchiveRequest {
  request: () => Promise<Uint8Array>
  valid: boolean
  unbind: () => void
}
const originalArchiveRequests = new WeakMap<SceneGraph, OriginalArchiveRequest>()

export interface FigPopulationWorkerTelemetry {
  event: 'registered' | 'populate' | 'fallback' | 'stale' | 'terminated'
  reason?: 'oversized' | 'graph-mutation' | 'worker-error'
  durationMs?: number
  applyMs?: number
  created?: number
  updated?: number
  deleted?: number
}

function emitTelemetry(detail: FigPopulationWorkerTelemetry): void {
  if (typeof globalThis.dispatchEvent !== 'function') return
  globalThis.dispatchEvent(new CustomEvent('openpencil:fig-population-worker', { detail }))
}

export interface RegisterFigPopulationWorkerOptions {
  /**
   * The worker kept the lazy-import source (see `lazyFigImportRetained`); these pages are
   * already populated. The source is fetched through the worker's port on demand.
   */
  retainedPopulatedRootIds?: readonly string[]
}

export function registerFigPopulationWorker(
  graph: SceneGraph,
  worker: Worker,
  port?: MessagePort,
  options: RegisterFigPopulationWorkerOptions = {}
): void {
  if (options.retainedPopulatedRootIds && !port) {
    throw new Error('A retained FIG lazy source needs a session port')
  }
  if (graph.nodes.size > MAX_FIG_POPULATION_WORKER_NODES) {
    emitTelemetry({ event: 'fallback', reason: 'oversized' })
    if (!port) {
      worker.terminate()
      return
    }
    populationWorkers.set(graph, createDisposalOnlyWorker(worker, port))
    return
  }
  const client = createPopulationWorkerClient(graph, worker, port)
  populationWorkers.set(graph, client)
  if (options.retainedPopulatedRootIds) {
    setDeferredLazyFigImportContext(graph, options.retainedPopulatedRootIds, client.requestSource)
    scheduleLazySourcePrefetch(graph, client)
  }
  emitTelemetry({ event: 'registered' })
}

const LAZY_SOURCE_PREFETCH_TIMEOUT_MS = 10_000

/**
 * Bring a retained source over once the main thread is idle. The worker populates pages
 * only until the first main-thread edit (component sync after a population counts), and
 * fetching the source at that moment would stall a page switch; arriving early, in small
 * chunks, it costs no long task and leaves the open path untouched.
 */
function scheduleLazySourcePrefetch(graph: SceneGraph, client: FigPopulationWorker): void {
  const prefetch = () => {
    if (populationWorkers.get(graph) !== client || !isLazyFigImportDeferred(graph)) return
    void ensureLazyFigImportContext(graph)
  }
  if (typeof globalThis.requestIdleCallback === 'function') {
    globalThis.requestIdleCallback(prefetch, { timeout: LAZY_SOURCE_PREFETCH_TIMEOUT_MS })
  } else {
    setTimeout(prefetch, 0)
  }
}

export function canUseFigPopulationWorker(graph: SceneGraph): boolean {
  return populationWorkers.has(graph) && hasLazyFigImport(graph)
}

export function registerOriginalArchiveRequest(
  graph: SceneGraph,
  request: () => Promise<Uint8Array>
): void {
  const entry: OriginalArchiveRequest = { request, valid: true, unbind: () => undefined }
  const invalidate = () => {
    if (!graph.isApplyingLayout) entry.valid = false
  }
  entry.unbind = graph.onNodeEvents({
    created: invalidate,
    updated: invalidate,
    deleted: invalidate,
    reparented: invalidate,
    reordered: invalidate
  })
  originalArchiveRequests.set(graph, entry)
}

export async function requestOriginalArchive(graph: SceneGraph): Promise<Uint8Array | null> {
  const entry = originalArchiveRequests.get(graph)
  if (!entry?.valid) return null
  const archive = await entry.request()
  return originalArchiveRequests.get(graph)?.valid === true &&
    originalArchiveRequests.get(graph) === entry
    ? archive
    : null
}

export function releaseFigPopulationWorker(graph: SceneGraph): void {
  populationWorkers.get(graph)?.terminate()
  populationWorkers.delete(graph)
  originalArchiveRequests.get(graph)?.unbind()
  originalArchiveRequests.delete(graph)
}

export interface FigPopulationWorker {
  populate: (pageId: string, signal?: AbortSignal) => Promise<boolean | null>
  terminate: () => void
}

interface FigPopulationWorkerClient extends FigPopulationWorker {
  /** Fetch the lazy-import source the worker retained. */
  requestSource: () => Promise<LazyFigImportSource>
}

/** How long a failing worker may take to hand over a retained source before it is killed. */
const FIG_SOURCE_HANDOVER_TIMEOUT_MS = 30_000

function createDisposalOnlyWorker(worker: Worker, port: MessagePort): FigPopulationWorker {
  let disposed = false
  return {
    populate: () => Promise.resolve(null),
    terminate() {
      if (disposed) return
      disposed = true
      emitTelemetry({ event: 'terminated' })
      port.postMessage({ type: 'dispose' })
      port.close()
      worker.terminate()
    }
  }
}

export function createFigPopulationWorker(graph: SceneGraph): FigPopulationWorker | null {
  if (!canUseFigPopulationWorker(graph)) return null
  return populationWorkers.get(graph) ?? null
}

/**
 * Populate one lazy page outside an editor's page switch: in the population worker when it
 * is usable, otherwise on this thread once the source is here.
 */
export async function populateFigPage(graph: SceneGraph, pageId: string): Promise<boolean> {
  const worker = createFigPopulationWorker(graph)
  const result = worker ? await worker.populate(pageId) : null
  if (result !== null) return result
  if (isLazyFigImportDeferred(graph)) await ensureLazyFigImportContext(graph)
  return populateLazyFigImportRoots(graph, [pageId])
}

function createPopulationWorkerClient(
  graph: SceneGraph,
  worker: Worker,
  port?: MessagePort
): FigPopulationWorkerClient {
  const pending = new Map<
    string,
    {
      resolve: (value: boolean | null) => void
      abort?: () => void
      revision: number
      startedAt: number
      timeout: ReturnType<typeof setTimeout>
    }
  >()
  const sourceRequests = new Map<
    string,
    {
      changeMap: LazyFigImportSource['changeMap']
      guidToNodeId: LazyFigImportSource['guidToNodeId']
      resolve: (source: LazyFigImportSource) => void
      reject: (error: Error) => void
    }
  >()
  let revision = 0
  let stale = false
  let disposed = false
  let workerAlive = true
  let applyingDelta = false
  const rejectSourceRequests = (reason: string) => {
    for (const request of sourceRequests.values()) request.reject(new Error(reason))
    sourceRequests.clear()
  }
  const terminateWorker = () => {
    workerAlive = false
    rejectSourceRequests('FIG session worker was terminated')
    worker.terminate()
  }
  /**
   * Stop the worker, but first take back a source it still holds: once it is gone, the
   * main thread can no longer populate pages without it.
   */
  const retireWorker = (crashed: boolean) => {
    if (crashed || !workerAlive || !port || !isLazyFigImportDeferred(graph)) {
      terminateWorker()
      return
    }
    const deadline = setTimeout(terminateWorker, FIG_SOURCE_HANDOVER_TIMEOUT_MS)
    void ensureLazyFigImportContext(graph).finally(() => {
      clearTimeout(deadline)
      terminateWorker()
    })
  }
  const requestSource = (): Promise<LazyFigImportSource> => {
    if (!port || !workerAlive) {
      return Promise.reject(new Error('FIG session worker is not available'))
    }
    const requestId = randomHex()
    return new Promise((resolve, reject) => {
      sourceRequests.set(requestId, {
        changeMap: new Map(),
        guidToNodeId: new Map(),
        resolve,
        reject
      })
      port.postMessage({ type: 'lazy-source', requestId })
    })
  }
  const invalidate = () => {
    // Layout recomputation (import-time or after a switch) is derived from the
    // same scene graph the worker deltas were built from; it must not count as
    // user divergence. Only real user edits invalidate the worker.
    if (applyingDelta || stale || graph.isApplyingLayout) return
    revision++
    stale = true
    emitTelemetry({ event: 'stale', reason: 'graph-mutation' })
  }
  let unbind: (() => void) | undefined
  const releaseSubscription = () => {
    unbind?.()
    unbind = undefined
  }
  const fail = (emit = true, crashed = false) => {
    stale = true
    if (emit) emitTelemetry({ event: 'fallback', reason: 'worker-error' })
    for (const request of pending.values()) {
      clearTimeout(request.timeout)
      request.abort?.()
      request.resolve(null)
    }
    pending.clear()
    releaseSubscription()
    retireWorker(crashed)
    populationWorkers.delete(graph)
  }
  unbind = graph.onNodeEvents({
    created: invalidate,
    updated: invalidate,
    deleted: invalidate,
    reparented: invalidate,
    reordered: invalidate
  })
  const receiveSource = (
    message: Extract<FigSessionResponse, { type: 'lazy-source-chunk' | 'lazy-source-result' }>
  ) => {
    const request = sourceRequests.get(message.requestId)
    if (!request) return
    if (message.type === 'lazy-source-chunk') {
      for (const [id, change] of message.chunk.changeMap) request.changeMap.set(id, change)
      for (const [guid, nodeId] of message.chunk.guidToNodeId)
        request.guidToNodeId.set(guid, nodeId)
      return
    }
    sourceRequests.delete(message.requestId)
    if (!message.blobs) {
      request.reject(new Error(message.error ?? 'FIG session worker sent no lazy source'))
      return
    }
    request.resolve({
      changeMap: request.changeMap,
      guidToNodeId: request.guidToNodeId,
      blobs: message.blobs
    })
  }
  const receive = (result: WorkerResult) => {
    if (result.type === 'population-error') return fail()
    const request = pending.get(result.requestId)
    if (!request) return
    clearTimeout(request.timeout)
    request.abort?.()
    pending.delete(result.requestId)
    if (stale || revision !== request.revision || result.baseRevision !== request.revision) {
      emitTelemetry({ event: 'stale', reason: 'graph-mutation' })
      return request.resolve(null)
    }
    applyingDelta = true
    const applyStartedAt = performance.now()
    try {
      applyFigPopulationDelta(graph, result.delta)
      setLazyFigImportPopulatedRoots(graph, result.delta.populatedRootIds)
    } catch {
      applyingDelta = false
      fail()
      return request.resolve(null)
    } finally {
      applyingDelta = false
    }
    request.resolve(result.populated)
    emitTelemetry({
      event: 'populate',
      durationMs: performance.now() - request.startedAt,
      applyMs: performance.now() - applyStartedAt,
      created: result.delta.created.length,
      updated: result.delta.updated.length,
      deleted: result.delta.deleted.length
    })
  }
  if (port) {
    // The session reader keeps handling its own replies (original archive bytes).
    const forward = port.onmessage
    port.onmessage = (event: MessageEvent<FigSessionResponse>) => {
      const message = event.data
      if (message.type === 'lazy-source-chunk' || message.type === 'lazy-source-result') {
        receiveSource(message)
      } else if (message.type === 'population-result' || message.type === 'population-error') {
        receive(message)
      } else forward?.call(port, event)
    }
    port.start()
  } else {
    worker.onmessage = (event: MessageEvent<WorkerResult>) => receive(event.data)
  }
  worker.onerror = () => fail(true, true)
  return {
    requestSource,
    populate(pageId, signal) {
      signal?.throwIfAborted()
      if (stale) return Promise.resolve(null)
      const requestId = randomHex()
      const baseRevision = revision
      return new Promise((resolve, reject) => {
        const abort = () => {
          const request = pending.get(requestId)
          if (!request) return
          clearTimeout(request.timeout)
          pending.delete(requestId)
          fail(false)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal?.addEventListener('abort', abort, { once: true })
        const timeout = setTimeout(() => fail(), FIG_POPULATION_WORKER_TIMEOUT_MS)
        pending.set(requestId, {
          resolve,
          abort: () => signal?.removeEventListener('abort', abort),
          revision: baseRevision,
          startedAt: performance.now(),
          timeout
        })
        if (port) port.postMessage({ type: 'populate', requestId, baseRevision, pageId })
        else worker.postMessage({ type: 'populate', requestId, baseRevision, pageId }, [])
      })
    },
    terminate() {
      if (disposed) return
      disposed = true
      emitTelemetry({ event: 'terminated' })
      // Explicit termination does not hand over the source: a caller that still needs it
      // (page population falling back to the main thread) fetches it first.
      workerAlive = false
      rejectSourceRequests('FIG session worker was terminated')
      port?.postMessage({ type: 'dispose' })
      port?.close()
      fail(false)
    }
  }
}
