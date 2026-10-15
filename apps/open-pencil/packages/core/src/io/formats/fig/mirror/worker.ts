import { encodeFigFile } from '#core/io/formats/fig/encode'
import { fontManager } from '#core/text/fonts'

import type { FigExportWorkerRequest, FigExportWorkerResponse } from './protocol'
import {
  applyFigExportMirrorNodes,
  createFigExportMirrorState,
  graphFromFigExportMirror,
  receiveFigExportLazySourceBlobs,
  receiveFigExportLazySourceChunk,
  resetFigExportMirrorNodes
} from './state'

/**
 * Mirrors one document and encodes `.fig` files from it, so building a recovery snapshot
 * of a large document does not block the main thread. See `createFigExportMirror`.
 */
const state = createFigExportMirrorState()

function reply(message: FigExportWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer })
}

async function exportMirror(request: Extract<FigExportWorkerRequest, { type: 'export' }>) {
  const graph = graphFromFigExportMirror(state, request.header)
  try {
    const bytes = await encodeFigFile(graph, request.pageId)
    const owned = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    const result = owned ? bytes : bytes.slice()
    reply({ type: 'exported', requestId: request.requestId, bytes: result }, [result.buffer])
  } catch (error) {
    reply({
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

function handle(message: FigExportWorkerRequest) {
  switch (message.type) {
    case 'reset':
      resetFigExportMirrorNodes(state)
      return
    case 'nodes':
      applyFigExportMirrorNodes(state, message.upserts, message.deletes)
      return
    case 'images':
      for (const [hash, bytes] of message.entries) state.images.set(hash, bytes)
      return
    case 'fonts':
      // Font digests and glyph outlines read loaded font data, which lives on the main thread.
      for (const font of message.fonts) fontManager.markLoaded(font.family, font.style, font.data)
      return
    case 'lazy-source-chunk':
      receiveFigExportLazySourceChunk(state, message.chunk)
      return
    case 'lazy-source-blobs':
      receiveFigExportLazySourceBlobs(state, message.blobs)
      return
    case 'export':
      void exportMirror(message)
  }
}

self.onmessage = (event: MessageEvent<FigExportWorkerRequest>) => {
  try {
    handle(event.data)
  } catch (error) {
    reply({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
