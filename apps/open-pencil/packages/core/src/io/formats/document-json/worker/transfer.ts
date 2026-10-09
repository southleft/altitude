import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

type Entries<T> = T extends Map<infer K, infer V> ? Array<[K, V]> : never

/**
 * Everything `writeDocumentJSON` reads from a graph except nodes and images, which travel
 * separately so that no single message, and no single main-thread clone, is large.
 */
export interface DocumentJSONGraphHeader {
  rootId: string
  variables: Entries<SceneGraph['variables']>
  variableCollections: Entries<SceneGraph['variableCollections']>
  activeMode: Entries<SceneGraph['activeMode']>
  figKiwiVersion: SceneGraph['figKiwiVersion']
  figSchemaDeflated: SceneGraph['figSchemaDeflated']
  documentColorSpace: SceneGraph['documentColorSpace']
  enabledLibraries: Entries<SceneGraph['enabledLibraries']>
}

/** A point-in-time copy of the graph state the writer reads, safe to send in pieces. */
export interface DocumentJSONGraphSnapshot {
  header: DocumentJSONGraphHeader
  /** Nodes in map order: the writer's output depends on it. */
  nodes: SceneNode[]
  images: Entries<SceneGraph['images']>
}

/**
 * Copy what the writer reads, synchronously, so edits made while the copy is being sent
 * cannot tear it. Nodes are copied shallowly: graph updates replace field values rather
 * than mutating them in place, except `childIds` and `source`, which are copied.
 * `textPicture` is a renderer cache the writer never emits, so it is dropped.
 */
export function snapshotDocumentJSONGraph(graph: SceneGraph): DocumentJSONGraphSnapshot {
  const nodes: SceneNode[] = []
  for (const node of graph.nodes.values()) nodes.push(copyDocumentJSONNode(node))
  return { header: documentJSONGraphHeader(graph), nodes, images: [...graph.images] }
}

/**
 * One node as the writer needs it, detached from later edits (see the snapshot). `source`
 * is copied one level deep because edits rewrite its `editedFields` in place; its Figma
 * payload is replaced, never mutated, so it is shared.
 */
export function copyDocumentJSONNode(node: SceneNode): SceneNode {
  return {
    ...node,
    childIds: [...node.childIds],
    source: { ...node.source },
    textPicture: null
  }
}

export function documentJSONGraphHeader(graph: SceneGraph): DocumentJSONGraphHeader {
  return {
    rootId: graph.rootId,
    variables: [...graph.variables],
    variableCollections: [...graph.variableCollections],
    activeMode: [...graph.activeMode],
    figKiwiVersion: graph.figKiwiVersion,
    figSchemaDeflated: graph.figSchemaDeflated,
    documentColorSpace: graph.documentColorSpace,
    enabledLibraries: [...graph.enabledLibraries]
  }
}

/** A graph the writer can read, rebuilt from a snapshot's pieces in their original order. */
export function graphFromDocumentJSONSnapshot(snapshot: DocumentJSONGraphSnapshot): SceneGraph {
  const { header } = snapshot
  const graph = new SceneGraph()
  graph.rootId = header.rootId
  graph.nodes = new Map(snapshot.nodes.map((node) => [node.id, node]))
  graph.images = new Map(snapshot.images)
  graph.variables = new Map(header.variables)
  graph.variableCollections = new Map(header.variableCollections)
  graph.activeMode = new Map(header.activeMode)
  graph.figKiwiVersion = header.figKiwiVersion
  graph.figSchemaDeflated = header.figSchemaDeflated
  graph.documentColorSpace = header.documentColorSpace
  graph.enabledLibraries = new Map(header.enabledLibraries)
  return graph
}
