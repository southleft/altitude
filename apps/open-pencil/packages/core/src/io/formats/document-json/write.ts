import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { encodeValue, stringifyDocumentJSON, type JSONValue } from './codec'
import {
  DOCUMENT_JSON_FORMAT,
  DOCUMENT_JSON_VERSION,
  FIG_SCHEMA_PATH,
  MANIFEST_PATH,
  PAGES_DIRECTORY,
  STYLES_PATH,
  VARIABLES_PATH,
  imagePath,
  uniqueSlugs
} from './layout'
import { componentBase, encodeNodeRecord } from './nodes'

export interface DocumentJSONFile {
  /** Path relative to the document folder, with `/` separators. */
  path: string
  bytes: Uint8Array
}

export interface DocumentJSONPage {
  id: string
  name: string
  path: string
}

export interface DocumentJSONSnapshot {
  /** Every file of the folder, sorted by path. */
  files: DocumentJSONFile[]
  pages: DocumentJSONPage[]
}

export interface WriteDocumentJSONOptions {
  name: string
}

const encoder = new TextEncoder()

function textFile(path: string, value: JSONValue): DocumentJSONFile {
  return { path, bytes: encoder.encode(stringifyDocumentJSON(value)) }
}

class NodeWalker {
  readonly visited = new Set<string>()

  constructor(
    private readonly graph: SceneGraph,
    private readonly styleIds: ReadonlySet<string>
  ) {}

  /** Pre-order records of a subtree; style definitions are left for `styles.json`. */
  subtree(rootId: string, includeStyles: boolean): JSONValue[] {
    const records: JSONValue[] = []
    const stack = [rootId]
    while (stack.length > 0) {
      const id = stack.pop()
      if (id === undefined || this.visited.has(id)) continue
      const node = this.graph.nodes.get(id)
      if (!node) continue
      if (!includeStyles && id !== rootId && this.styleIds.has(id)) continue
      this.visited.add(id)
      records.push(encodeNodeRecord(node, componentBase(this.graph, node)))
      for (let index = node.childIds.length - 1; index >= 0; index--)
        stack.push(node.childIds[index])
    }
    return records
  }
}

/** Sidecar for a node file: `pages/cover.json` keeps its `.fig` provenance in `pages/cover.source.json`. */
export function sourceSidecarPath(path: string): string {
  return path.replace(/.json$/, '.source.json')
}

/**
 * Write node records to `path`, moving each record's `source` (imported `.fig` provenance,
 * large and rarely edited) to a sidecar so the main file stays readable and small.
 */
function nodeFiles(path: string, header: Record<string, JSONValue>, records: JSONValue[]) {
  const sources: Record<string, JSONValue> = {}
  const nodes = records.map((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return record
    if (!('source' in record) || typeof record.id !== 'string') return record
    const { source, ...rest } = record
    sources[record.id] = source
    return rest
  })
  const files = [textFile(path, { ...header, nodes })]
  // Always written, even empty, so the manifest never changes because provenance appeared.
  const sidecar = sourceSidecarPath(path)
  files.push(textFile(sidecar, { nodes: sources }))
  return { files, sidecar }
}

/** Locale-independent order, so every machine writes the same file list. */
function compareCodeUnits(first: string, second: string): number {
  if (first === second) return 0
  return first < second ? -1 : 1
}

function isStyleDefinition(node: SceneNode, rootId: string): boolean {
  return node.sharedStyleType !== null && node.type !== 'CANVAS' && node.id !== rootId
}

/**
 * Write a scene graph as a folder of deterministic, pretty-printed JSON files.
 *
 * The same graph always produces the same bytes: nothing time- or session-dependent is
 * written, object keys are sorted, nodes follow tree order, and maps keep their order.
 * The graph must be fully populated (lazily imported pages loaded) before writing.
 */
export function writeDocumentJSON(
  graph: SceneGraph,
  options: WriteDocumentJSONOptions
): DocumentJSONSnapshot {
  const root = graph.nodes.get(graph.rootId)
  if (!root) throw new Error('Document root is missing')

  const styleIds = new Set<string>()
  for (const node of graph.nodes.values()) {
    if (isStyleDefinition(node, graph.rootId)) styleIds.add(node.id)
  }
  const walker = new NodeWalker(graph, styleIds)
  walker.visited.add(root.id)

  const files: DocumentJSONFile[] = []
  const pageNodes = root.childIds
    .map((id) => graph.nodes.get(id))
    .filter((node): node is SceneNode => node?.type === 'CANVAS')
  const slugs = uniqueSlugs(
    pageNodes.map((page) => page.name),
    'page'
  )
  const pages = pageNodes.map((page, index) => ({
    id: page.id,
    name: page.name,
    path: `${PAGES_DIRECTORY}/${slugs[index]}.json`
  }))
  const pageSources: Array<string | null> = []
  for (const page of pages) {
    const written = nodeFiles(
      page.path,
      { id: page.id, name: page.name },
      walker.subtree(page.id, false)
    )
    files.push(...written.files)
    pageSources.push(written.sidecar)
  }

  const styleNodes: JSONValue[] = []
  for (const id of styleIds) styleNodes.push(...walker.subtree(id, true))
  const styles = nodeFiles(STYLES_PATH, {}, styleNodes)
  files.push(...styles.files)

  const detachedNodes: JSONValue[] = []
  for (const node of graph.nodes.values()) {
    if (walker.visited.has(node.id)) continue
    walker.visited.add(node.id)
    detachedNodes.push(encodeNodeRecord(node, componentBase(graph, node)))
  }

  files.push(
    textFile(VARIABLES_PATH, {
      activeMode: encodeValue([...graph.activeMode]),
      collections: [...graph.variableCollections.values()].map((collection) =>
        encodeValue(collection, `collection ${collection.id}`)
      ),
      variables: [...graph.variables.values()].map((variable) =>
        encodeValue(variable, `variable ${variable.id}`)
      )
    })
  )

  const images: JSONValue[] = []
  const imagePaths = new Set<string>()
  for (const [hash, bytes] of graph.images) {
    let path = imagePath(hash, bytes)
    for (let suffix = 2; imagePaths.has(path); suffix++) {
      path = path.replace(/(\.[a-z]+)$/, `-${suffix}$1`)
    }
    imagePaths.add(path)
    images.push({ hash, path })
    files.push({ path, bytes: new Uint8Array(bytes) })
  }

  if (graph.figSchemaDeflated) {
    files.push({ path: FIG_SCHEMA_PATH, bytes: new Uint8Array(graph.figSchemaDeflated) })
  }

  files.push(
    textFile(MANIFEST_PATH, {
      detachedNodes,
      documentColorSpace: graph.documentColorSpace,
      enabledLibraries: encodeValue([...graph.enabledLibraries]),
      figKiwiVersion: graph.figKiwiVersion,
      figSchema: graph.figSchemaDeflated ? FIG_SCHEMA_PATH : null,
      format: DOCUMENT_JSON_FORMAT,
      images,
      name: options.name,
      pages: pages.map((page, index) => ({ ...page, source: pageSources[index] })),
      root: encodeNodeRecord(root),
      styles: STYLES_PATH,
      stylesSource: styles.sidecar,
      variables: VARIABLES_PATH,
      version: DOCUMENT_JSON_VERSION
    })
  )

  files.sort((first, second) => compareCodeUnits(first.path, second.path))
  return { files, pages }
}
