import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { encodeValue, stringifyDocumentJSON, type JSONValue } from './codec'
import {
  DOCUMENT_JSON_BASE_VERSION,
  DOCUMENT_JSON_FORMAT,
  DOCUMENT_JSON_MAX_FILE_BYTES,
  DOCUMENT_JSON_PARTS_VERSION,
  FIG_SCHEMA_PATH,
  MANIFEST_PATH,
  PAGES_DIRECTORY,
  STYLES_PATH,
  VARIABLES_PATH,
  imagePath,
  pagePartPath,
  uniqueSlugs
} from './layout'
import { componentBase, encodeNodeRecord } from './nodes'

export interface DocumentJSONFile {
  /** Path relative to the document folder, with `/` separators. */
  path: string
  bytes: Uint8Array
}

/** A continuation of a page that was too large for one file, and its sidecar. */
export interface DocumentJSONPagePart {
  path: string
  source: string
}

export interface DocumentJSONPage {
  id: string
  name: string
  path: string
  /** Parts 2 and up, in order, when the page was split; absent otherwise. */
  parts?: DocumentJSONPagePart[]
}

export interface DocumentJSONSnapshot {
  /** Every file of the folder, sorted by path. */
  files: DocumentJSONFile[]
  pages: DocumentJSONPage[]
}

export interface WriteDocumentJSONOptions {
  name: string
  /**
   * Split a page whose file or sidecar would exceed this many bytes into parts.
   * `DOCUMENT_JSON_MAX_FILE_BYTES` (50 MB) by default.
   */
  maxFileBytes?: number
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

/** A node record without its provenance, and that provenance keyed by node id. */
type SplitRecord = { node: JSONValue; source: [string, JSONValue] | null }

function splitRecord(record: JSONValue): SplitRecord {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { node: record, source: null }
  }
  if (!('source' in record) || typeof record.id !== 'string') return { node: record, source: null }
  const { source, ...rest } = record
  return { node: rest, source: [record.id, source] }
}

/** A node file and its sidecar, both always written so the file list stays stable. */
function nodeFilePair(path: string, header: Record<string, JSONValue>, records: SplitRecord[]) {
  const sources: Record<string, JSONValue> = {}
  for (const record of records) if (record.source) sources[record.source[0]] = record.source[1]
  return [
    textFile(path, { ...header, nodes: records.map((record) => record.node) }),
    // Always written, even empty, so the manifest never changes because provenance appeared.
    textFile(sourceSidecarPath(path), { nodes: sources })
  ]
}

function byteLength(value: JSONValue): number {
  return encoder.encode(stringifyDocumentJSON(value)).byteLength
}

/**
 * Consecutive groups of records whose node and provenance JSON each stay under `budget`
 * bytes. A record larger than the budget gets a group of its own.
 */
function groupRecords(records: SplitRecord[], budget: number, sizes: Array<[number, number]>) {
  const groups: SplitRecord[][] = [[]]
  let nodeBytes = 0
  let sourceBytes = 0
  records.forEach((record, index) => {
    const [node, source] = sizes[index]
    const group = groups[groups.length - 1]
    if (group.length > 0 && (nodeBytes + node > budget || sourceBytes + source > budget)) {
      groups.push([record])
      nodeBytes = node
      sourceBytes = source
      return
    }
    group.push(record)
    nodeBytes += node
    sourceBytes += source
  })
  return groups
}

/**
 * Write node records to `path`, moving each record's `source` (imported `.fig` provenance,
 * large and rarely edited) to a sidecar so the main file stays readable and small.
 *
 * When either file would exceed `maxBytes`, the records are split in tree order into parts:
 * `path` holds the first, `pagePartPath(path, 2)` and on the rest, each with its own sidecar.
 * The split depends only on the content, so the same graph always splits the same way.
 */
function nodeFiles(
  path: string,
  header: Record<string, JSONValue>,
  records: JSONValue[],
  maxBytes: number
) {
  const split = records.map(splitRecord)
  const whole = nodeFilePair(path, header, split)
  const sidecar = sourceSidecarPath(path)
  if (whole.every((file) => file.bytes.byteLength <= maxBytes)) {
    return { files: whole, sidecar, parts: [] as DocumentJSONPagePart[] }
  }
  const sizes = split.map((record): [number, number] => [
    byteLength(record.node),
    record.source ? byteLength(record.source[1]) : 0
  ])
  // Pretty-printing nests records one level deeper than measured; aim below the limit and
  // halve the budget until every file fits (or every part holds a single record).
  for (let budget = Math.floor(maxBytes * 0.9); ; budget = Math.floor(budget / 2)) {
    const groups = groupRecords(split, Math.max(1, budget), sizes)
    const files = groups.flatMap((group, index) =>
      nodeFilePair(
        index === 0 ? path : pagePartPath(path, index + 1),
        index === 0 ? header : { ...header, part: index + 1 },
        group
      )
    )
    const fits = files.every((file) => file.bytes.byteLength <= maxBytes)
    if (fits || groups.every((group) => group.length <= 1) || budget <= 1) {
      const parts = groups.slice(1).map((_, index) => {
        const partPath = pagePartPath(path, index + 2)
        return { path: partPath, source: sourceSidecarPath(partPath) }
      })
      return { files, sidecar, parts }
    }
  }
}

/** A page's manifest entry; `parts` appears only for a split page, so others never change. */
function manifestPage(page: DocumentJSONPage, source: string | null): JSONValue {
  const entry: Record<string, JSONValue> = { id: page.id, name: page.name, path: page.path, source }
  if (page.parts) entry.parts = page.parts.map((part) => ({ path: part.path, source: part.source }))
  return entry
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
  const pages: DocumentJSONPage[] = pageNodes.map((page, index) => ({
    id: page.id,
    name: page.name,
    path: `${PAGES_DIRECTORY}/${slugs[index]}.json`
  }))
  const maxBytes = options.maxFileBytes ?? DOCUMENT_JSON_MAX_FILE_BYTES
  const pageSources: Array<string | null> = []
  for (const page of pages) {
    const written = nodeFiles(
      page.path,
      { id: page.id, name: page.name },
      walker.subtree(page.id, false),
      maxBytes
    )
    files.push(...written.files)
    pageSources.push(written.sidecar)
    if (written.parts.length > 0) page.parts = written.parts
  }
  const split = pages.some((page) => page.parts)

  const styleNodes: JSONValue[] = []
  for (const id of styleIds) styleNodes.push(...walker.subtree(id, true))
  // Styles stay one file: they are shared definitions, not page content.
  const styles = nodeFiles(STYLES_PATH, {}, styleNodes, Number.POSITIVE_INFINITY)
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
      pages: pages.map((page, index) => manifestPage(page, pageSources[index])),
      root: encodeNodeRecord(root),
      styles: STYLES_PATH,
      stylesSource: styles.sidecar,
      variables: VARIABLES_PATH,
      version: split ? DOCUMENT_JSON_PARTS_VERSION : DOCUMENT_JSON_BASE_VERSION
    })
  )

  files.sort((first, second) => compareCodeUnits(first.path, second.path))
  return { files, pages }
}
