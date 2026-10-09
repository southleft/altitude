import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { BUILTIN_IO_FORMATS, IORegistry, initCanvasKit } from '@open-pencil/core/io'
import { MANIFEST_PATH, readDocumentJSON } from '@open-pencil/core/io/formats/document-json'
import { populateAllLazyFigImportRoots, populateLazyFigImportRoots } from '@open-pencil/core/kiwi'
import { computeAllLayouts } from '@open-pencil/core/layout'
import type { SceneGraph } from '@open-pencil/scene-graph'

export { initCanvasKit }

const io = new IORegistry(BUILTIN_IO_FORMATS)

/**
 * Read a document folder in the committed document-json format (`document.json`, `pages/…`).
 * The manifest schema keeps every referenced path inside the folder.
 */
export async function readDocumentFolder(dir: string): Promise<SceneGraph> {
  const { graph } = await readDocumentJSON({
    read: async (path) => new Uint8Array(await readFile(join(dir, ...path.split('/'))))
  })
  return graph
}

/** True when `path` is a document-json folder rather than a single document file. */
export async function isDocumentFolder(path: string): Promise<boolean> {
  const info = await stat(path).catch(() => null)
  if (!info?.isDirectory()) return false
  const manifest = await stat(join(path, MANIFEST_PATH)).catch(() => null)
  if (!manifest?.isFile()) {
    throw new Error(`${path} is a folder without ${MANIFEST_PATH}; pass a document folder or file`)
  }
  return true
}

/** Load a document file (.fig, .pen, …) or a document-json folder, with layout computed. */
export async function loadDocument(filePath: string): Promise<SceneGraph> {
  if (await isDocumentFolder(filePath)) {
    const graph = await readDocumentFolder(filePath)
    computeAllLayouts(graph)
    return graph
  }
  const bytes = new Uint8Array(await readFile(filePath))
  const { graph } = await io.readDocument({ name: filePath, data: bytes })
  computeAllLayouts(graph)
  return graph
}

export function populateDocumentPage(graph: SceneGraph, pageId: string): boolean {
  const changed = populateLazyFigImportRoots(graph, [pageId])
  if (changed) computeAllLayouts(graph, pageId)
  return changed
}

export function populateWholeDocument(graph: SceneGraph): boolean {
  const changed = populateAllLazyFigImportRoots(graph)
  if (changed) computeAllLayouts(graph)
  return changed
}

function pageNameFromArgs(args: unknown): string | undefined {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return undefined
  const page = (args as { page?: unknown }).page
  return typeof page === 'string' ? page : undefined
}

function populateRequestedPage(graph: SceneGraph, pageName?: string): void {
  const pages = graph.getPages()
  const page = pageName ? pages.find((candidate) => candidate.name === pageName) : pages[0]
  if (page) populateDocumentPage(graph, page.id)
}

export function prepareDocumentForRPC(graph: SceneGraph, command: string, args?: unknown): void {
  if (command === 'pages' || command === 'variables') return
  if (command === 'tree') {
    populateRequestedPage(graph, pageNameFromArgs(args))
    return
  }
  if (command === 'find' || command === 'query') {
    const pageName = pageNameFromArgs(args)
    if (pageName) populateRequestedPage(graph, pageName)
    else populateWholeDocument(graph)
    return
  }
  populateWholeDocument(graph)
}
