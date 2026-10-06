import type { FigPageManifestEntry } from '@open-pencil/kiwi/fig'

import type { FigImportOptions } from '#core/kiwi/fig/import'
import type { LazyFigImportSourceChunk, SerializedSceneGraph } from '#core/kiwi/fig/parse/transfer'
import type { FigPopulationDelta } from '#core/kiwi/fig/population/delta'

/**
 * Past this size the main thread populates pages itself, so the worker sends the lazy
 * source with the graph instead of retaining it.
 */
export const MAX_FIG_POPULATION_WORKER_NODES = 200_000

export interface FigSessionOpenRequest {
  type: 'open'
  originalBuffer: ArrayBuffer
  archiveBuffer: ArrayBuffer
  options?: FigImportOptions
  port: MessagePort
}

export interface FigSessionPopulateRequest {
  type: 'populate'
  requestId: string
  baseRevision: number
  pageId: string
}

export interface FigSessionOriginalArchiveRequest {
  type: 'original-archive'
  requestId: string
}

/**
 * Ask for the lazy-import source the worker retained instead of sending with the graph. It
 * arrives as `lazy-source-chunk` messages followed by one `lazy-source-result`.
 */
export interface FigSessionLazySourceRequest {
  type: 'lazy-source'
  requestId: string
}

export interface FigSessionCancelRequest {
  type: 'cancel'
  requestId?: string
}

export interface FigSessionDisposeRequest {
  type: 'dispose'
}

export type FigSessionRequest =
  | FigSessionPopulateRequest
  | FigSessionOriginalArchiveRequest
  | FigSessionLazySourceRequest
  | FigSessionCancelRequest
  | FigSessionDisposeRequest

export type FigSessionResponse =
  | { type: 'page-manifest'; pages: FigPageManifestEntry[] }
  | { type: 'graph'; graph?: SerializedSceneGraph; error?: string }
  | {
      type: 'population-result'
      requestId: string
      baseRevision: number
      populated: boolean
      delta: FigPopulationDelta
    }
  | { type: 'population-error'; requestId?: string; error: string }
  | { type: 'original-archive-result'; requestId: string; bytes: Uint8Array }
  | { type: 'lazy-source-chunk'; requestId: string; chunk: LazyFigImportSourceChunk }
  | { type: 'lazy-source-result'; requestId: string; blobs?: Uint8Array[]; error?: string }
  | { type: 'disposed' }
