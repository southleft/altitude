import type { EnabledLibraryBinding, SceneGraph } from '@open-pencil/scene-graph'

import type { CompactSceneNode } from '#core/kiwi/fig/parse/compact-nodes'
import type { LazyFigImportSourceChunk } from '#core/kiwi/fig/parse/transfer'

type Entries<T> = T extends Map<infer K, infer V> ? Array<[K, V]> : never

/**
 * Everything `exportFigFile` reads from a graph besides nodes, images and the lazy source,
 * which the worker mirrors incrementally. Small enough to send with every export.
 */
export interface FigExportGraphHeader {
  rootId: string
  variables: Entries<SceneGraph['variables']>
  variableCollections: Entries<SceneGraph['variableCollections']>
  activeMode: Entries<SceneGraph['activeMode']>
  figKiwiVersion: SceneGraph['figKiwiVersion']
  figSchemaDeflated: SceneGraph['figSchemaDeflated']
  documentColorSpace: SceneGraph['documentColorSpace']
  enabledLibraries: Array<[string, EnabledLibraryBinding]>
  /** Images the graph holds now; mirrored images missing here are dropped. */
  imageHashes: string[]
  /** Lazily imported pages already populated, or null for a graph without a lazy source. */
  populatedRootIds: string[] | null
}

export interface FigExportFont {
  family: string
  style: string
  data: ArrayBuffer
}

/**
 * Main thread to worker, in order. Node changes are applied deletions first, then upserts;
 * an `export` covers every message sent before it.
 */
export type FigExportWorkerRequest =
  | { type: 'reset' }
  | { type: 'nodes'; upserts: CompactSceneNode[]; deletes: string[] }
  | { type: 'images'; entries: Array<[string, Uint8Array]> }
  | { type: 'fonts'; fonts: FigExportFont[] }
  | { type: 'lazy-source-chunk'; chunk: LazyFigImportSourceChunk }
  | { type: 'lazy-source-blobs'; blobs: Uint8Array[] }
  | { type: 'export'; requestId: number; header: FigExportGraphHeader; pageId?: string }

/** Worker to main thread. The file bytes are transferred, not copied. */
export type FigExportWorkerResponse =
  | { type: 'exported'; requestId: number; bytes: Uint8Array }
  | { type: 'error'; requestId?: number; message: string }
