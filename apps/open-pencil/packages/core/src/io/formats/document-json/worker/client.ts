import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { IS_BROWSER } from '#core/constants'
import type { WriteDocumentJSONOptions } from '#core/io/formats/document-json/write'

import { writeHashedDocumentJSON, type HashedDocumentJSONSnapshot } from './hashed'
import type { DocumentJSONWorkerRequest, DocumentJSONWorkerResponse } from './protocol'
import {
  copyDocumentJSONNode,
  documentJSONGraphHeader,
  snapshotDocumentJSONGraph
} from './transfer'

/** Nodes per message. Small enough that one clone is a few milliseconds. */
export const DOCUMENT_JSON_NODE_CHUNK = 100
/** Main-thread time spent copying and posting before yielding to input and rendering. */
export const DOCUMENT_JSON_SLICE_MS = 8

export type DocumentJSONWorkerMode = 'auto' | 'worker' | 'main-thread'

export interface WriteDocumentJSONOffThreadOptions extends WriteDocumentJSONOptions {
  /** `auto` uses a worker in browsers and falls back to the main thread if it fails. */
  mode?: DocumentJSONWorkerMode
  /** Creates the worker; tests and other runtimes can supply their own. */
  createWorker?: () => Worker
  /**
   * Copy the graph slice by slice instead of all at once, checking this between slices.
   * When it returns true (the graph changed, or an interactive edit began) the write stops
   * with `DocumentJSONSnapshotStaleError` rather than mix two states. Without it the graph
   * is copied in one synchronous step first.
   */
  isStale?: () => boolean
  /** Main-thread budget per slice; `DOCUMENT_JSON_SLICE_MS` by default. */
  sliceMs?: number
}

/** The graph changed while it was being copied; the write was abandoned. */
export class DocumentJSONSnapshotStaleError extends Error {
  constructor() {
    super('The document changed while it was being written')
    this.name = 'DocumentJSONSnapshotStaleError'
  }
}

function defaultWorker(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
}

/** Let input and rendering run between slices. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

type NodeSource = { count: number; copy(start: number, end: number): SceneNode[] }

function eagerNodes(graph: SceneGraph): { nodes: NodeSource; images: Array<[string, Uint8Array]> } {
  const snapshot = snapshotDocumentJSONGraph(graph)
  return {
    nodes: {
      count: snapshot.nodes.length,
      copy: (start, end) => snapshot.nodes.slice(start, end)
    },
    images: snapshot.images
  }
}

function lazyNodes(graph: SceneGraph): { nodes: NodeSource; images: Array<[string, Uint8Array]> } {
  // Map order is the writer's order; the id list is cheap to take up front.
  const ids = [...graph.nodes.keys()]
  return {
    nodes: {
      count: ids.length,
      copy(start, end) {
        const nodes: SceneNode[] = []
        for (const id of ids.slice(start, end)) {
          const node = graph.nodes.get(id)
          if (!node) throw new DocumentJSONSnapshotStaleError()
          nodes.push(copyDocumentJSONNode(node))
        }
        return nodes
      }
    },
    images: [...graph.images]
  }
}

async function writeInWorker(
  graph: SceneGraph,
  options: WriteDocumentJSONOffThreadOptions,
  createWorker: () => Worker
): Promise<HashedDocumentJSONSnapshot> {
  const { isStale } = options
  const sliceMs = options.sliceMs ?? DOCUMENT_JSON_SLICE_MS
  // Without a staleness check the copy must be taken at once: later edits must not reach
  // a half-sent snapshot. With one, slices are copied as they are sent.
  const header = documentJSONGraphHeader(graph)
  const { nodes, images } = isStale ? lazyNodes(graph) : eagerNodes(graph)
  const worker = createWorker()
  const state: { failed: Error | null } = { failed: null }
  const result = new Promise<HashedDocumentJSONSnapshot>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<DocumentJSONWorkerResponse>) => {
      const message = event.data
      if (message.type === 'done') {
        resolve({ files: message.files, pages: message.pages, blobSHAs: message.blobSHAs })
      } else {
        reject(new Error(message.message))
      }
    }
    worker.onerror = (event) => {
      event.preventDefault()
      const error = new Error(event.message || 'Document worker failed')
      state.failed = error
      reject(error)
    }
  })
  // Observed here so an early rejection is never reported as unhandled while sending.
  result.catch(() => undefined)
  const send = (message: DocumentJSONWorkerRequest) => worker.postMessage(message, [])
  let sliceStart = performance.now()
  async function maybeYield() {
    if (performance.now() - sliceStart < sliceMs) return
    await yieldToEventLoop()
    if (isStale?.()) throw new DocumentJSONSnapshotStaleError()
    sliceStart = performance.now()
  }
  try {
    send({
      type: 'begin',
      header,
      options: { name: options.name, maxFileBytes: options.maxFileBytes }
    })
    for (let start = 0; start < nodes.count; start += DOCUMENT_JSON_NODE_CHUNK) {
      if (state.failed) break
      await maybeYield()
      send({ type: 'nodes', nodes: nodes.copy(start, start + DOCUMENT_JSON_NODE_CHUNK) })
    }
    for (const [hash, bytes] of images) {
      if (state.failed) break
      await maybeYield()
      send({ type: 'image', hash, bytes })
    }
    if (!state.failed) send({ type: 'end' })
    return await result
  } finally {
    worker.terminate()
  }
}

/**
 * Write a graph as document-json and hash every file without blocking the main thread for
 * the whole document: the graph is copied and sent to a worker in short slices between
 * event-loop turns, and written and hashed there. The output is byte-identical to
 * `writeDocumentJSON`. Without workers (or when one fails in `auto` mode) it runs on the
 * main thread instead. The graph must be fully populated first.
 */
export async function writeDocumentJSONOffThread(
  graph: SceneGraph,
  options: WriteDocumentJSONOffThreadOptions
): Promise<HashedDocumentJSONSnapshot> {
  const mode = options.mode ?? 'auto'
  const canUseWorker = typeof Worker !== 'undefined' && (IS_BROWSER || mode === 'worker')
  if (mode === 'main-thread' || !canUseWorker) return writeHashedDocumentJSON(graph, options)
  try {
    return await writeInWorker(graph, options, options.createWorker ?? defaultWorker)
  } catch (error) {
    if (mode === 'worker' || error instanceof DocumentJSONSnapshotStaleError) throw error
    console.warn('Document worker failed, writing on the main thread:', error)
    return writeHashedDocumentJSON(graph, options)
  }
}
