import type { InstanceNodeChange } from '@open-pencil/fig/instance-overrides'
import { SceneGraph } from '@open-pencil/scene-graph'
import type { EnabledLibraryBinding, SceneNode } from '@open-pencil/scene-graph'

import {
  getLazyFigImportContext,
  setLazyFigImportContext,
  type LazyFigImportContext,
  type LazyFigImportSource
} from '#core/kiwi/fig/lazy-import'
import {
  decodeCompactSceneNode,
  encodeCompactSceneNode,
  type CompactSceneNode
} from '#core/kiwi/fig/parse/compact-nodes'
import type { PortableSceneGraphData } from '#core/kiwi/fig/parse/portable-data'

export interface SerializedLazyFigImportContext {
  changeMap: Array<[string, InstanceNodeChange]>
  guidToNodeId: Array<[string, string]>
  blobs: Uint8Array[]
  populatedRootIds: string[]
}

/** One slice of a retained lazy source, small enough to deserialize without a long task. */
export interface LazyFigImportSourceChunk {
  changeMap: Array<[string, InstanceNodeChange]>
  guidToNodeId: Array<[string, string]>
}

export interface SerializeSceneGraphOptions {
  /**
   * Leave the lazy-import source out: the sender keeps it and serves it on request.
   * Only the populated page IDs travel, as `lazyFigImportRetained`.
   */
  retainLazySource?: boolean
  /**
   * Leave the nodes out: the sender streams them first as compact chunks
   * (`compactSceneNodeChunks`), and the receiver passes the decoded map to
   * `deserializeSceneGraph`.
   */
  omitNodes?: boolean
}

export interface SerializedSceneGraph extends PortableSceneGraphData {
  instanceIndex: Array<[string, string[]]>
  figKiwiVersion: number | null
  figSchemaDeflated: Uint8Array | null
  enabledLibraries?: Array<[string, EnabledLibraryBinding]>
  lazyFigImport?: SerializedLazyFigImportContext
  /** Set instead of `lazyFigImport` when the sender retained the source. */
  lazyFigImportRetained?: { populatedRootIds: string[] }
}

/** Split a lazy source's maps into chunks of at most `size` entries each. */
export function* lazyFigImportSourceChunks(
  source: LazyFigImportSource,
  size: number
): Generator<LazyFigImportSourceChunk> {
  const changes = [...source.changeMap]
  const guids = [...source.guidToNodeId]
  for (let start = 0; start < Math.max(changes.length, guids.length); start += size) {
    yield {
      changeMap: changes.slice(start, start + size),
      guidToNodeId: guids.slice(start, start + size)
    }
  }
}

function serializeLazyFigImport(
  context: LazyFigImportContext | undefined,
  retainSource: boolean
): Pick<SerializedSceneGraph, 'lazyFigImport' | 'lazyFigImportRetained'> {
  if (!context) return {}
  const populatedRootIds = [...context.populatedRootIds]
  if (retainSource) return { lazyFigImportRetained: { populatedRootIds } }
  return {
    lazyFigImport: {
      changeMap: [...context.changeMap],
      guidToNodeId: [...context.guidToNodeId],
      blobs: context.blobs,
      populatedRootIds
    }
  }
}

export function serializeSceneGraph(
  graph: SceneGraph,
  options: SerializeSceneGraphOptions = {}
): SerializedSceneGraph {
  return {
    rootId: graph.rootId,
    nodes: options.omitNodes ? [] : [...graph.nodes],
    images: [...graph.images],
    variables: [...graph.variables],
    variableCollections: [...graph.variableCollections],
    activeMode: [...graph.activeMode],
    instanceIndex: [...graph.instanceIndex].map(([id, nodeIds]) => [id, [...nodeIds]]),
    figKiwiVersion: graph.figKiwiVersion,
    figSchemaDeflated: graph.figSchemaDeflated,
    documentColorSpace: graph.documentColorSpace,
    enabledLibraries: [...graph.enabledLibraries],
    ...serializeLazyFigImport(getLazyFigImportContext(graph), options.retainLazySource ?? false)
  }
}

/**
 * The graph's nodes, in order, as compact chunks of at most `size` nodes.
 *
 * Each chunk is its own message, so the receiving thread deserializes and rebuilds one
 * chunk per task instead of blocking for the whole graph; see `CompactSceneNode`.
 */
export function* compactSceneNodeChunks(
  graph: SceneGraph,
  size: number
): Generator<CompactSceneNode[]> {
  let chunk: CompactSceneNode[] = []
  for (const node of graph.nodes.values()) {
    chunk.push(encodeCompactSceneNode(node))
    if (chunk.length >= size) {
      yield chunk
      chunk = []
    }
  }
  if (chunk.length > 0) yield chunk
}

/** Rebuild streamed compact nodes into `nodes`, in the order they were sent. */
export function receiveCompactSceneNodes(
  chunk: readonly CompactSceneNode[],
  nodes: Map<string, SceneNode>
): void {
  for (const compact of chunk) {
    // Freshly built, so guides are repaired in place; copying would read lazy fields.
    const node = decodeCompactSceneNode(compact)
    if (!Array.isArray(node.guides)) node.guides = []
    nodes.set(compact.i, node)
  }
}

/** A view's buffer, when the view owns all of it and moving it cannot detach anything else. */
function ownedBuffer(view: Uint8Array): ArrayBuffer | undefined {
  return view.buffer instanceof ArrayBuffer &&
    view.byteOffset === 0 &&
    view.byteLength === view.buffer.byteLength
    ? view.buffer
    : undefined
}

/**
 * Buffers that can move instead of being copied. The sender must not read them again:
 * it gives up image and schema bytes, and blobs whenever they are sent.
 */
export function serializedSceneGraphTransferList(data: SerializedSceneGraph): Transferable[] {
  const buffers = new Set<ArrayBuffer>()
  const views = [
    ...data.images.map(([, image]) => image),
    ...(data.lazyFigImport?.blobs ?? []),
    ...(data.figSchemaDeflated ? [data.figSchemaDeflated] : [])
  ]
  for (const view of views) {
    const buffer = ownedBuffer(view)
    if (buffer) buffers.add(buffer)
  }
  return [...buffers]
}

/**
 * Clone the graph state that lazy FIG population may mutate while retaining immutable imported
 * resources by reference. Population replaces node fields and mutates child ID arrays, but only
 * reads image bytes, variables, source changes, GUID mappings, blobs, and schema bytes.
 */
export function cloneSceneGraphForFigExport(graph: SceneGraph): SceneGraph {
  const cloned = new SceneGraph()
  cloned.rootId = graph.rootId
  cloned.nodes = new Map(
    [...graph.nodes].map(([id, node]) => [id, { ...node, childIds: [...node.childIds] }])
  )
  cloned.images = new Map(graph.images)
  cloned.variables = new Map(graph.variables)
  cloned.variableCollections = new Map(graph.variableCollections)
  cloned.activeMode = new Map(graph.activeMode)
  cloned.instanceIndex = new Map(
    [...graph.instanceIndex].map(([id, nodeIds]) => [id, new Set(nodeIds)])
  )
  cloned.figKiwiVersion = graph.figKiwiVersion
  cloned.figSchemaDeflated = graph.figSchemaDeflated
  cloned.documentColorSpace = graph.documentColorSpace
  cloned.enabledLibraries = new Map(graph.enabledLibraries)

  const lazyFigImport = getLazyFigImportContext(graph)
  if (lazyFigImport) {
    setLazyFigImportContext(cloned, {
      changeMap: lazyFigImport.changeMap,
      guidToNodeId: lazyFigImport.guidToNodeId,
      blobs: lazyFigImport.blobs,
      populatedRootIds: new Set(lazyFigImport.populatedRootIds)
    })
  }
  return cloned
}

function normalizeNodeGuides(node: SceneNode): SceneNode {
  return Array.isArray(node.guides) ? node : { ...node, guides: [] }
}

/**
 * Rebuild a graph sent by `serializeSceneGraph`. Pass `nodes` when they were streamed as
 * compact chunks (`omitNodes`) instead of sent in `data.nodes`.
 */
export function deserializeSceneGraph(
  data: SerializedSceneGraph,
  nodes?: Map<string, SceneNode>
): SceneGraph {
  const graph = new SceneGraph()
  graph.rootId = data.rootId
  graph.nodes = nodes ?? new Map(data.nodes.map(([id, node]) => [id, normalizeNodeGuides(node)]))
  graph.images = new Map(data.images)
  graph.variables = new Map(data.variables)
  graph.variableCollections = new Map(data.variableCollections)
  graph.activeMode = new Map(data.activeMode)
  graph.instanceIndex = new Map(data.instanceIndex.map(([id, nodeIds]) => [id, new Set(nodeIds)]))
  graph.figKiwiVersion = data.figKiwiVersion
  graph.figSchemaDeflated = data.figSchemaDeflated
  graph.documentColorSpace = data.documentColorSpace
  graph.enabledLibraries = data.enabledLibraries ? new Map(data.enabledLibraries) : new Map()
  if (data.lazyFigImport) {
    setLazyFigImportContext(graph, {
      changeMap: new Map(data.lazyFigImport.changeMap),
      guidToNodeId: new Map(data.lazyFigImport.guidToNodeId),
      blobs: data.lazyFigImport.blobs,
      populatedRootIds: new Set(data.lazyFigImport.populatedRootIds)
    })
  }
  return graph
}
