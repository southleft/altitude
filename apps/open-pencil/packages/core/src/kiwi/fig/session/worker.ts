import { parseFigBuffer } from '@open-pencil/fig'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { importNodeChanges } from '#core/kiwi/fig/import'
import { getLazyFigImportContext, populateLazyFigImportRoots } from '#core/kiwi/fig/lazy-import'
import {
  lazyFigImportSourceChunks,
  serializeSceneGraph,
  serializedSceneGraphTransferList
} from '#core/kiwi/fig/parse/transfer'
import { buildFigPopulationDelta, installFigMutationJournal } from '#core/kiwi/fig/population/delta'
import {
  MAX_FIG_POPULATION_WORKER_NODES,
  type FigSessionOpenRequest,
  type FigSessionRequest,
  type FigSessionResponse
} from '#core/kiwi/fig/session/protocol'

/**
 * Entries per lazy-source message. Each message is deserialized as its own main-thread task,
 * so this keeps every task well under the 50 ms long-task threshold on a large document.
 */
const LAZY_SOURCE_CHUNK_ENTRIES = 2_000

let graph: SceneGraph | undefined
let originalArchive: Uint8Array | undefined
let port: MessagePort | undefined

function respond(message: FigSessionResponse, transfer: Transferable[] = []): void {
  port?.postMessage(message, transfer)
}

function sendLazySource(requestId: string): void {
  const context = graph ? getLazyFigImportContext(graph) : undefined
  if (!context) {
    respond({ type: 'lazy-source-result', requestId, error: 'FIG session has no lazy source' })
    return
  }
  for (const chunk of lazyFigImportSourceChunks(context, LAZY_SOURCE_CHUNK_ENTRIES)) {
    respond({ type: 'lazy-source-chunk', requestId, chunk })
  }
  // Copied, not transferred: the worker keeps populating pages from the same blobs.
  respond({ type: 'lazy-source-result', requestId, blobs: context.blobs })
}

function populate(request: Extract<FigSessionRequest, { type: 'populate' }>): void {
  if (!graph) throw new Error('FIG session has no retained graph')
  const journal = installFigMutationJournal(graph)
  try {
    const populated = populateLazyFigImportRoots(graph, [request.pageId])
    const context = getLazyFigImportContext(graph)
    if (!context) throw new Error('FIG session has no lazy import context')
    respond({
      type: 'population-result',
      requestId: request.requestId,
      baseRevision: request.baseRevision,
      populated,
      delta: buildFigPopulationDelta(graph, journal, context.populatedRootIds)
    })
  } finally {
    journal.stop()
  }
}

function handleRequest(request: FigSessionRequest): void {
  try {
    if (request.type === 'original-archive') {
      if (!originalArchive) throw new Error('FIG session has no original archive')
      const bytes = originalArchive.slice()
      port?.postMessage({ type: 'original-archive-result', requestId: request.requestId, bytes }, [
        bytes.buffer
      ])
      return
    }
    if (request.type === 'dispose') {
      graph = undefined
      originalArchive = undefined
      respond({ type: 'disposed' })
      port?.close()
      port = undefined
      self.close()
      return
    }
    if (request.type === 'lazy-source') {
      sendLazySource(request.requestId)
      return
    }
    if (request.type === 'cancel') return
    populate(request)
  } catch (error) {
    respond({
      type: 'population-error',
      requestId: request.type === 'populate' ? request.requestId : undefined,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

self.onmessage = (event: MessageEvent<FigSessionOpenRequest>) => {
  const request = event.data
  port = request.port
  port.onmessage = (message: MessageEvent<FigSessionRequest>) => handleRequest(message.data)
  port.start()
  originalArchive = new Uint8Array(request.archiveBuffer)
  try {
    const { nodeChanges, blobs, images, figKiwiVersion, figSchemaDeflated } = parseFigBuffer(
      request.originalBuffer,
      (pages) => respond({ type: 'page-manifest', pages })
    )
    const parsedGraph = importNodeChanges(nodeChanges, blobs, new Map(images), request.options)
    parsedGraph.figKiwiVersion = figKiwiVersion
    parsedGraph.figSchemaDeflated = figSchemaDeflated
    graph = request.options?.populate === 'first-page' ? parsedGraph : undefined
    // A retained graph populates later pages here, so its change map stays here too; the
    // main thread asks for it only if it has to populate by itself.
    const retainLazySource =
      graph !== undefined && parsedGraph.nodes.size <= MAX_FIG_POPULATION_WORKER_NODES
    const serialized = serializeSceneGraph(parsedGraph, { retainLazySource })
    respond({ type: 'graph', graph: serialized }, serializedSceneGraphTransferList(serialized))
  } catch (error) {
    respond({ type: 'graph', error: error instanceof Error ? error.message : String(error) })
  }
}
