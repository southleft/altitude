import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

import { setLazyFigImportContext, type LazyFigImportSource } from '#core/kiwi/fig/lazy-import'
import type { CompactSceneNode } from '#core/kiwi/fig/parse/compact-nodes'
import {
  receiveCompactSceneNodes,
  type LazyFigImportSourceChunk
} from '#core/kiwi/fig/parse/transfer'

import type { FigExportGraphHeader } from './protocol'

/**
 * The export worker's copy of a document: nodes, images and the lazy-import source arrive
 * once and then as changes, so each export sends only what changed since the last one.
 */
export interface FigExportMirrorState {
  nodes: Map<string, SceneNode>
  images: Map<string, Uint8Array>
  lazySource: LazyFigImportSource | null
}

export function createFigExportMirrorState(): FigExportMirrorState {
  return { nodes: new Map(), images: new Map(), lazySource: null }
}

/** Drop the mirrored nodes; a full node sync follows. Images and the lazy source stay valid. */
export function resetFigExportMirrorNodes(state: FigExportMirrorState): void {
  state.nodes = new Map()
}

function deleteMirroredSubtree(nodes: Map<string, SceneNode>, id: string): void {
  const pending = [id]
  while (pending.length > 0) {
    const nodeId = pending.pop()
    if (nodeId === undefined) continue
    const node = nodes.get(nodeId)
    if (!node) continue
    nodes.delete(nodeId)
    pending.push(...node.childIds)
  }
}

/**
 * Apply one batch of node changes. Deletions remove whole mirrored subtrees: descendants the
 * graph kept (moved elsewhere first) are in the same or a later batch's upserts.
 */
export function applyFigExportMirrorNodes(
  state: FigExportMirrorState,
  upserts: readonly CompactSceneNode[],
  deletes: readonly string[]
): void {
  for (const id of deletes) deleteMirroredSubtree(state.nodes, id)
  receiveCompactSceneNodes(upserts, state.nodes)
}

export function receiveFigExportLazySourceChunk(
  state: FigExportMirrorState,
  chunk: LazyFigImportSourceChunk
): void {
  state.lazySource ??= { changeMap: new Map(), guidToNodeId: new Map(), blobs: [] }
  for (const [key, change] of chunk.changeMap) state.lazySource.changeMap.set(key, change)
  for (const [guid, id] of chunk.guidToNodeId) state.lazySource.guidToNodeId.set(guid, id)
}

export function receiveFigExportLazySourceBlobs(
  state: FigExportMirrorState,
  blobs: Uint8Array[]
): void {
  state.lazySource ??= { changeMap: new Map(), guidToNodeId: new Map(), blobs: [] }
  state.lazySource.blobs = blobs
}

/**
 * A graph `exportFigFile` can read, taken from the mirror now. Changes that arrive while an
 * export runs replace node objects rather than mutate them, so the copied map stays a
 * consistent snapshot; export clones the nodes again before populating them.
 */
export function graphFromFigExportMirror(
  state: FigExportMirrorState,
  header: FigExportGraphHeader
): SceneGraph {
  const graph = new SceneGraph()
  graph.rootId = header.rootId
  graph.nodes = new Map(state.nodes)
  const imageHashes = new Set(header.imageHashes)
  for (const hash of state.images.keys()) {
    if (!imageHashes.has(hash)) state.images.delete(hash)
  }
  graph.images = new Map(state.images)
  graph.variables = new Map(header.variables)
  graph.variableCollections = new Map(header.variableCollections)
  graph.activeMode = new Map(header.activeMode)
  graph.figKiwiVersion = header.figKiwiVersion
  graph.figSchemaDeflated = header.figSchemaDeflated
  graph.documentColorSpace = header.documentColorSpace
  graph.enabledLibraries = new Map(header.enabledLibraries)
  // The graph maintains this index from instance nodes as they are created and updated.
  for (const node of state.nodes.values()) {
    if (node.type !== 'INSTANCE' || !node.componentId) continue
    let instances = graph.instanceIndex.get(node.componentId)
    if (!instances) {
      instances = new Set()
      graph.instanceIndex.set(node.componentId, instances)
    }
    instances.add(node.id)
  }
  if (state.lazySource && header.populatedRootIds) {
    setLazyFigImportContext(graph, {
      ...state.lazySource,
      populatedRootIds: new Set(header.populatedRootIds)
    })
  }
  return graph
}
