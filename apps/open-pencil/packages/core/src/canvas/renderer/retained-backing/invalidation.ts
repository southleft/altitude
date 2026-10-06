import type { SceneGraph } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { clearSubtreePictureCache } from '#core/canvas/renderer/state'

/**
 * Retained subtree pictures are keyed by top-level page children and recorded in world space.
 * Between scene versions the editor reports touched nodes; when every change is attributable to
 * those nodes, only the top-level subtrees containing them are re-recorded. Version changes with
 * no reported nodes, or with a changed document-wide input (variables, modes, images, color
 * space), still discard every picture.
 */

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

function hashString(hash: number, value: string): number {
  let next = hash
  for (let i = 0; i < value.length; i++) {
    next ^= value.charCodeAt(i)
    next = Math.imul(next, FNV_PRIME)
  }
  // Separator so adjacent fields cannot run together.
  return Math.imul(next ^ 0x1f, FNV_PRIME)
}

function hashValue(hash: number, value: unknown): number {
  if (value === null || typeof value !== 'object') return hashString(hash, String(value))
  return hashString(hash, JSON.stringify(value))
}

/** Document-wide render inputs that node events do not report. */
export function retainedSceneFingerprint(graph: SceneGraph): string {
  let hash = FNV_OFFSET
  hash = hashString(hash, graph.documentColorSpace)
  for (const [collectionId, modeId] of graph.activeMode) {
    hash = hashString(hashString(hash, collectionId), modeId)
  }
  for (const collection of graph.variableCollections.values()) {
    hash = hashString(hashString(hash, collection.id), collection.defaultModeId)
    for (const mode of collection.modes) hash = hashString(hash, mode.modeId)
  }
  for (const variable of graph.variables.values()) {
    hash = hashString(hashString(hash, variable.id), variable.type)
    for (const [modeId, value] of Object.entries(variable.valuesByMode)) {
      hash = hashValue(hashString(hash, modeId), value)
    }
  }
  return [
    graph.images.size,
    graph.variables.size,
    graph.variableCollections.size,
    graph.activeMode.size,
    (hash >>> 0).toString(36)
  ].join(':')
}

/** Record a node whose top-level subtree picture must be re-recorded at the next version. */
export function markRetainedSubtreeDirty(r: SkiaRenderer, nodeId: string): void {
  r.subtreePictureDirtyIds.add(nodeId)
}

/** Top-level page children containing the given nodes; nodes no longer on the page are ignored. */
export function retainedTopLevelIds(
  graph: SceneGraph,
  pageId: string,
  nodeIds: Iterable<string>
): Set<string> {
  const result = new Set<string>()
  const resolved = new Map<string, string | null>()
  for (const nodeId of nodeIds) {
    const visited: string[] = []
    let current = graph.getNode(nodeId)
    let topLevelId: string | null = null
    while (current) {
      const cached = resolved.get(current.id)
      if (cached !== undefined) {
        topLevelId = cached
        break
      }
      visited.push(current.id)
      if (current.parentId === pageId) {
        topLevelId = current.id
        break
      }
      current = current.parentId ? graph.getNode(current.parentId) : undefined
    }
    for (const id of visited) resolved.set(id, topLevelId)
    if (topLevelId) result.add(topLevelId)
  }
  return result
}

/** Advance the picture scope, dropping only dirty top-level subtrees when that is safe. */
export function ensureSubtreePictureCacheScope(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number
): void {
  const sameScope =
    r.subtreePictureCachePageId === r.pageId &&
    r.subtreePictureCacheFontGeneration === r.fontGeneration &&
    r.subtreePictureCacheGraph === graph
  if (
    sameScope &&
    r.subtreePictureCacheSceneVersion === sceneVersion &&
    r.subtreePictureCachePositionPreviewVersion === graph.positionPreviewVersion
  ) {
    return
  }
  const fingerprint = retainedSceneFingerprint(graph)
  const pageId = r.pageId
  if (
    sameScope &&
    pageId &&
    r.subtreePictureDirtyIds.size > 0 &&
    fingerprint === r.subtreePictureCacheFingerprint
  ) {
    for (const topLevelId of retainedTopLevelIds(graph, pageId, r.subtreePictureDirtyIds)) {
      r.subtreePictureCache.get(topLevelId)?.picture.delete()
      r.subtreePictureCache.delete(topLevelId)
    }
    for (const entry of r.subtreePictureCache.values()) {
      entry.sceneVersion = sceneVersion
      entry.positionPreviewVersion = graph.positionPreviewVersion
    }
    r.subtreePictureDirtyIds.clear()
  } else {
    clearSubtreePictureCache(r)
  }
  r.subtreePictureCachePageId = pageId
  r.subtreePictureCacheSceneVersion = sceneVersion
  r.subtreePictureCachePositionPreviewVersion = graph.positionPreviewVersion
  r.subtreePictureCacheFontGeneration = r.fontGeneration
  r.subtreePictureCacheGraph = graph
  r.subtreePictureCacheFingerprint = fingerprint
}
