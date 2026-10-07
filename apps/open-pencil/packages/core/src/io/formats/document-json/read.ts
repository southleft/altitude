import * as v from 'valibot'

import { SceneGraph } from '@open-pencil/scene-graph'
import type {
  EnabledLibraryBinding,
  SceneNode,
  Variable,
  VariableCollection
} from '@open-pencil/scene-graph'

import { decodeValue, parseDocumentJSON, type JSONValue } from './codec'
import { DOCUMENT_JSON_FORMAT, DOCUMENT_JSON_VERSION, MANIFEST_PATH } from './layout'
import { NodeRecordDecoder } from './nodes'

const json = v.custom<JSONValue>(() => true)
const relativePath = v.pipe(
  v.string(),
  v.check(
    (path) => !path.startsWith('/') && !path.split('/').some((part) => part === '..' || !part),
    'Path must stay inside the document folder'
  )
)

const ManifestSchema = v.object({
  format: v.literal(DOCUMENT_JSON_FORMAT),
  version: v.number(),
  name: v.string(),
  documentColorSpace: v.picklist(['srgb', 'display-p3']),
  root: json,
  pages: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      path: relativePath,
      source: v.nullable(relativePath)
    })
  ),
  styles: relativePath,
  stylesSource: v.nullable(relativePath),
  variables: relativePath,
  images: v.array(v.object({ hash: v.string(), path: relativePath })),
  figKiwiVersion: v.nullable(v.number()),
  figSchema: v.nullable(relativePath),
  enabledLibraries: json,
  detachedNodes: v.array(json)
})

const NodeFileSchema = v.object({ nodes: v.array(json) })
const SourceFileSchema = v.object({ nodes: v.record(v.string(), json) })
const VariablesFileSchema = v.object({
  activeMode: json,
  collections: v.array(json),
  variables: v.array(json)
})

export type DocumentJSONManifest = v.InferOutput<typeof ManifestSchema>

export interface DocumentJSONSource {
  /** Bytes of a file in the document folder; reject when it is missing. */
  read(path: string): Promise<Uint8Array>
}

export interface ReadDocumentJSONResult {
  name: string
  graph: SceneGraph
  manifest: DocumentJSONManifest
}

const decoder = new TextDecoder()

/** Node records of a file with their sidecar `source` fields merged back. */
async function readNodeFile(
  source: DocumentJSONSource,
  path: string,
  sidecar: string | null
): Promise<JSONValue[]> {
  const [file, sources] = await Promise.all([
    readJSON(source, path).then((value) => v.parse(NodeFileSchema, value)),
    sidecar
      ? readJSON(source, sidecar).then((value) => v.parse(SourceFileSchema, value).nodes)
      : Promise.resolve({} as Record<string, JSONValue>)
  ])
  return file.nodes.map((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return record
    const id = record.id
    return typeof id === 'string' && Object.hasOwn(sources, id)
      ? { ...record, source: sources[id] }
      : record
  })
}

async function readJSON(source: DocumentJSONSource, path: string): Promise<JSONValue> {
  return parseDocumentJSON(decoder.decode(await source.read(path)))
}

export function parseDocumentJSONManifest(bytes: Uint8Array): DocumentJSONManifest {
  const manifest = v.parse(ManifestSchema, parseDocumentJSON(decoder.decode(bytes)))
  if (manifest.version > DOCUMENT_JSON_VERSION) {
    throw new Error(
      `This document uses format version ${manifest.version}; this OpenPencil reads up to ${DOCUMENT_JSON_VERSION}.`
    )
  }
  return manifest
}

/** Read a folder written by `writeDocumentJSON` back into an equivalent scene graph. */
export async function readDocumentJSON(
  source: DocumentJSONSource,
  options: { concurrency?: number } = {}
): Promise<ReadDocumentJSONResult> {
  const manifest = parseDocumentJSONManifest(await source.read(MANIFEST_PATH))
  const concurrency = Math.max(1, options.concurrency ?? 8)

  async function mapLimited<T, R>(items: readonly T[], read: (item: T) => Promise<R>) {
    const results: R[] = Array.from({ length: items.length })
    let next = 0
    async function worker() {
      while (next < items.length) {
        const index = next++
        results[index] = await read(items[index])
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
    return results
  }

  const [pageFiles, styles, variables, images, figSchema] = await Promise.all([
    mapLimited(manifest.pages, (page) => readNodeFile(source, page.path, page.source)),
    readNodeFile(source, manifest.styles, manifest.stylesSource),
    readJSON(source, manifest.variables).then((value) => v.parse(VariablesFileSchema, value)),
    mapLimited(
      manifest.images,
      async (image) => [image.hash, await source.read(image.path)] as const
    ),
    manifest.figSchema ? source.read(manifest.figSchema) : Promise.resolve(null)
  ])

  const records = new NodeRecordDecoder()
  const ids = [records.add(manifest.root, MANIFEST_PATH)]
  manifest.pages.forEach((page, index) => {
    for (const record of pageFiles[index]) ids.push(records.add(record, page.path))
  })
  for (const record of styles) ids.push(records.add(record, manifest.styles))
  for (const record of manifest.detachedNodes) ids.push(records.add(record, MANIFEST_PATH))
  const nodes = new Map<string, SceneNode>(ids.map((id) => [id, records.decode(id)]))
  const root = nodes.get(ids[0])
  if (!root) throw new Error('Document root is missing')

  const graph = new SceneGraph()
  graph.rootId = root.id
  graph.nodes = nodes
  graph.images = new Map(images.map(([hash, bytes]) => [hash, new Uint8Array(bytes)]))
  graph.variableCollections = new Map(
    variables.collections.map((value) => {
      const collection = decodeValue(value) as VariableCollection
      return [collection.id, collection]
    })
  )
  graph.variables = new Map(
    variables.variables.map((value) => {
      const variable = decodeValue(value) as Variable
      return [variable.id, variable]
    })
  )
  graph.activeMode = new Map(decodeValue(variables.activeMode) as Array<[string, string]>)
  graph.documentColorSpace = manifest.documentColorSpace
  graph.figKiwiVersion = manifest.figKiwiVersion
  graph.figSchemaDeflated = figSchema ? new Uint8Array(figSchema) : null
  graph.enabledLibraries = new Map(
    decodeValue(manifest.enabledLibraries) as Array<[string, EnabledLibraryBinding]>
  )
  graph.instanceIndex = new Map()
  for (const node of graph.nodes.values()) {
    if (!node.componentId) continue
    const instances = graph.instanceIndex.get(node.componentId) ?? new Set<string>()
    instances.add(node.id)
    graph.instanceIndex.set(node.componentId, instances)
  }
  return { name: manifest.name, graph, manifest }
}
