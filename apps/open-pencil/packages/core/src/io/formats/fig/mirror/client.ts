import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { IS_BROWSER } from '#core/constants'
import { exportFigFile } from '#core/io/formats/fig/export'
import {
  ensureLazyFigImportContext,
  getLazyFigImportContext,
  isLazyFigImportDeferred
} from '#core/kiwi/fig/lazy-import'
import { encodeCompactSceneNode, type CompactSceneNode } from '#core/kiwi/fig/parse/compact-nodes'
import { lazyFigImportSourceChunks } from '#core/kiwi/fig/parse/transfer'
import { originalFigArchive } from '#core/kiwi/fig/session/original-archive'
import { fontManager, weightToStyle } from '#core/text/fonts'

import type {
  FigExportFont,
  FigExportGraphHeader,
  FigExportWorkerRequest,
  FigExportWorkerResponse
} from './protocol'

/** Main-thread time spent encoding and posting changes before yielding to input and rendering. */
export const FIG_EXPORT_MIRROR_SLICE_MS = 8
/** Nodes per message, so no single structured clone is large. */
const NODE_MESSAGE_SIZE = 200
/** Lazy-source entries per message. */
const LAZY_SOURCE_CHUNK_ENTRIES = 250
/**
 * At or below this many changed nodes the last pass is sent in one step with the export
 * request, so the worker exports one consistent state. Larger change sets are sent in slices
 * first; edits made meanwhile are picked up by the next pass.
 */
const FINAL_PASS_NODES = 500
/** After this many slicing passes the rest is sent in one step regardless of its size. */
const MAX_SLICED_PASSES = 3
/** A worker idle this long is stopped; the next export syncs the whole document again. */
const DEFAULT_IDLE_MS = 120_000

export type FigExportMirrorMode = 'auto' | 'worker' | 'main-thread'

export interface FigExportMirrorOptions {
  /** `auto` uses a worker in browsers and falls back to the main thread if it fails. */
  mode?: FigExportMirrorMode
  /** Creates the worker; tests and other runtimes can supply their own. */
  createWorker?: () => Worker
  /** Main-thread budget per slice; `FIG_EXPORT_MIRROR_SLICE_MS` by default. */
  sliceMs?: number
  /** Stop the worker after this long without an export. */
  idleMs?: number
}

export interface FigExportMirror {
  /**
   * Encode the graph as a `.fig` file, like `exportFigFile` without a renderer. The file
   * reflects the graph as it was when the export request reached the worker.
   */
  exportFigFile(graph: SceneGraph, pageId?: string): Promise<Uint8Array>
  dispose(): void
}

interface PendingExport {
  resolve: (bytes: Uint8Array) => void
  reject: (error: Error) => void
}

interface MirrorSession {
  graph: SceneGraph
  worker: Worker
  /** Nodes changed since they were last sent (including deleted ones). */
  dirty: Set<string>
  sentImages: Set<string>
  /** Fonts used by text nodes sent so far, by `family|style`. */
  fontKeys: Map<string, [family: string, style: string]>
  sentFonts: Map<string, ArrayBuffer>
  lazySourceSent: boolean
  pending: Map<number, PendingExport>
  failed: Error | null
  unbind: () => void
}

function defaultWorker(): Worker {
  return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function addFontKey(session: MirrorSession, family: string, weight: number, italic: boolean) {
  const style = weightToStyle(weight, italic)
  session.fontKeys.set(`${family}|${style}`, [family, style])
}

function collectFontKeys(session: MirrorSession, node: SceneNode) {
  if (node.type !== 'TEXT') return
  addFontKey(session, node.fontFamily, node.fontWeight, node.italic)
  for (const run of node.styleRuns) {
    addFontKey(
      session,
      run.style.fontFamily ?? node.fontFamily,
      run.style.fontWeight ?? node.fontWeight,
      run.style.italic ?? node.italic
    )
  }
}

function exportHeader(graph: SceneGraph): FigExportGraphHeader {
  const lazy = getLazyFigImportContext(graph)
  return {
    rootId: graph.rootId,
    variables: [...graph.variables],
    variableCollections: [...graph.variableCollections],
    activeMode: [...graph.activeMode],
    figKiwiVersion: graph.figKiwiVersion,
    figSchemaDeflated: graph.figSchemaDeflated,
    documentColorSpace: graph.documentColorSpace,
    enabledLibraries: [...graph.enabledLibraries],
    imageHashes: [...graph.images.keys()],
    populatedRootIds: lazy ? [...lazy.populatedRootIds] : null
  }
}

/**
 * Keeps a copy of one document in a worker and exports `.fig` files from it, so repeated
 * snapshots of a large document (recovery) neither block the main thread for the whole
 * encode nor copy the whole document each time: the first export sends every node in short
 * slices, later ones only the nodes changed since. Graph events drive the change tracking,
 * so the mirror follows any graph API mutation; replacing the graph starts a new mirror.
 * Without workers, or when one fails in `auto` mode, it exports on the main thread.
 */
export function createFigExportMirror(options: FigExportMirrorOptions = {}): FigExportMirror {
  const mode = options.mode ?? 'auto'
  const sliceMs = options.sliceMs ?? FIG_EXPORT_MIRROR_SLICE_MS
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS
  const createWorker = options.createWorker ?? defaultWorker
  let session: MirrorSession | null = null
  let nextRequestId = 1
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let queue: Promise<unknown> = Promise.resolve()
  let disposed = false

  function clearIdleTimer() {
    if (idleTimer !== null) clearTimeout(idleTimer)
    idleTimer = null
  }

  function closeSession(error = new Error('The export worker was stopped')) {
    const current = session
    if (!current) return
    session = null
    current.failed ??= error
    current.unbind()
    current.worker.terminate()
    for (const pending of current.pending.values()) pending.reject(current.failed)
    current.pending.clear()
  }

  function openSession(graph: SceneGraph): MirrorSession {
    const worker = createWorker()
    const dirty = new Set<string>(graph.nodes.keys())
    const mark = (...ids: Array<string | null | undefined>) => {
      for (const id of ids) if (id) dirty.add(id)
    }
    const opened: MirrorSession = {
      graph,
      worker,
      dirty,
      sentImages: new Set(),
      fontKeys: new Map(),
      sentFonts: new Map(),
      lazySourceSent: false,
      pending: new Map(),
      failed: null,
      unbind: graph.onNodeEvents({
        created: (node) => mark(node.id, node.parentId),
        updated: (id) => mark(id),
        previewUpdated: (id) => mark(id),
        deleted: (id, parentId) => mark(id, parentId),
        reparented: (id, oldParentId, newParentId) => mark(id, oldParentId, newParentId),
        reordered: (id, parentId, _index, previousParentId) => mark(id, parentId, previousParentId)
      })
    }
    worker.onmessage = (event: MessageEvent<FigExportWorkerResponse>) => {
      const message = event.data
      if (message.type === 'exported') {
        opened.pending.get(message.requestId)?.resolve(message.bytes)
        opened.pending.delete(message.requestId)
        return
      }
      const error = new Error(message.message)
      const pending =
        message.requestId === undefined ? undefined : opened.pending.get(message.requestId)
      if (pending && message.requestId !== undefined) {
        opened.pending.delete(message.requestId)
        pending.reject(error)
        return
      }
      // A change failed to apply, so the mirror can no longer be trusted.
      if (session === opened) closeSession(error)
    }
    worker.onerror = (event) => {
      event.preventDefault()
      if (session === opened) closeSession(new Error(event.message || 'Export worker failed'))
    }
    return opened
  }

  function sessionFor(graph: SceneGraph): MirrorSession {
    if (session?.graph !== graph) {
      closeSession()
      session = openSession(graph)
    }
    return session
  }

  function post(current: MirrorSession, message: FigExportWorkerRequest) {
    if (current.failed) throw current.failed
    current.worker.postMessage(message, [])
  }

  /** Encode and post the given nodes; deleted ones become deletions. */
  function postNodes(current: MirrorSession, ids: readonly string[]) {
    for (let start = 0; start < ids.length; start += NODE_MESSAGE_SIZE) {
      const upserts: CompactSceneNode[] = []
      const deletes: string[] = []
      for (const id of ids.slice(start, start + NODE_MESSAGE_SIZE)) {
        const node = current.graph.nodes.get(id)
        if (!node) {
          deletes.push(id)
          continue
        }
        upserts.push(encodeCompactSceneNode(node))
        collectFontKeys(current, node)
      }
      post(current, { type: 'nodes', upserts, deletes })
    }
  }

  function unsentImages(current: MirrorSession): Array<[string, Uint8Array]> {
    const entries: Array<[string, Uint8Array]> = []
    for (const [hash, bytes] of current.graph.images) {
      if (!current.sentImages.has(hash)) entries.push([hash, bytes])
    }
    return entries
  }

  function postImages(current: MirrorSession, entries: Array<[string, Uint8Array]>) {
    if (entries.length === 0) return
    post(current, { type: 'images', entries })
    for (const [hash] of entries) current.sentImages.add(hash)
  }

  function postFonts(current: MirrorSession) {
    const fonts: FigExportFont[] = []
    for (const [key, [family, style]] of current.fontKeys) {
      const data = fontManager.loadedData(family, style)
      if (!data || current.sentFonts.get(key) === data) continue
      fonts.push({ family, style, data })
      current.sentFonts.set(key, data)
    }
    if (fonts.length > 0) post(current, { type: 'fonts', fonts })
  }

  async function exportInWorker(graph: SceneGraph, pageId?: string): Promise<Uint8Array> {
    // Unpopulated pages are exported populated, which needs a source a worker may still hold.
    if (isLazyFigImportDeferred(graph)) await ensureLazyFigImportContext(graph)
    const current = sessionFor(graph)
    let sliceStart = performance.now()
    const maybeYield = async () => {
      if (performance.now() - sliceStart < sliceMs) return
      await yieldToEventLoop()
      if (session !== current) throw current.failed ?? new Error('The export was cancelled')
      sliceStart = performance.now()
    }

    const lazy = getLazyFigImportContext(graph)
    const hasUnpopulatedPages =
      !!lazy && graph.getPages(true).some((page) => !lazy.populatedRootIds.has(page.id))
    if (lazy && hasUnpopulatedPages && !current.lazySourceSent) {
      for (const chunk of lazyFigImportSourceChunks(lazy, LAZY_SOURCE_CHUNK_ENTRIES)) {
        await maybeYield()
        post(current, { type: 'lazy-source-chunk', chunk })
      }
      post(current, { type: 'lazy-source-blobs', blobs: lazy.blobs })
      current.lazySourceSent = true
    }

    for (let pass = 0; pass < MAX_SLICED_PASSES; pass++) {
      if (current.dirty.size <= FINAL_PASS_NODES) break
      const ids = [...current.dirty]
      current.dirty.clear()
      for (let start = 0; start < ids.length; start += NODE_MESSAGE_SIZE) {
        await maybeYield()
        postNodes(current, ids.slice(start, start + NODE_MESSAGE_SIZE))
      }
      for (const entry of unsentImages(current)) {
        await maybeYield()
        postImages(current, [entry])
      }
    }

    // One synchronous step from here to the export request: the worker sees one state.
    const ids = [...current.dirty]
    current.dirty.clear()
    postNodes(current, ids)
    postImages(current, unsentImages(current))
    postFonts(current)
    const requestId = nextRequestId++
    const exported = new Promise<Uint8Array>((resolve, reject) => {
      current.pending.set(requestId, { resolve, reject })
    })
    post(current, { type: 'export', requestId, header: exportHeader(graph), pageId })
    return exported
  }

  const isDisposed = () => disposed

  async function exportGraph(graph: SceneGraph, pageId?: string): Promise<Uint8Array> {
    if (isDisposed()) throw new Error('The export mirror was disposed')
    const original = await originalFigArchive(graph)
    if (original) return original.slice()
    const canUseWorker = typeof Worker !== 'undefined' && (IS_BROWSER || mode === 'worker')
    if (mode === 'main-thread' || !canUseWorker) {
      return exportFigFile(graph, undefined, undefined, pageId)
    }
    clearIdleTimer()
    try {
      return await exportInWorker(graph, pageId)
    } catch (error) {
      closeSession(error instanceof Error ? error : new Error(String(error)))
      if (mode === 'worker' || isDisposed()) throw error
      console.warn('[fig] Export worker failed, exporting on the main thread:', error)
      return await exportFigFile(graph, undefined, undefined, pageId)
    } finally {
      if (session && !isDisposed()) idleTimer = setTimeout(() => closeSession(), idleMs)
    }
  }

  return {
    exportFigFile(graph, pageId) {
      // One export at a time: each one's final step must follow the previous one's.
      const run = queue.then(() => exportGraph(graph, pageId))
      queue = run.catch(() => undefined)
      return run
    },
    dispose() {
      disposed = true
      clearIdleTimer()
      closeSession(new Error('The export mirror was disposed'))
    }
  }
}
