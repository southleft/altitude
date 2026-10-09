import type { Canvas, Surface } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'
import {
  computeDescendantVisualBounds,
  unionVisualBounds,
  type VisualBounds
} from '@open-pencil/scene-graph/geometry'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { worldNodeVisualBounds } from '#core/canvas/renderer/visual-bounds'

import { ensureSubtreePictureCacheScope } from './invalidation'
import type { SceneBackingGeometry } from './types'

/**
 * Retained pictures are recorded in world coordinates, so their recording bounds must account for
 * the complete ancestor transform chain. The regular visual-bounds helper intentionally accepts
 * only an absolute origin and a node-local rotation; that is insufficient for descendants of
 * reflected or rotated instances and can clip otherwise valid draw commands from the picture.
 */
export function computeRetainedSubtreeBounds(
  graph: SceneGraph,
  childId: string
): VisualBounds | null {
  const visualBounds = computeDescendantVisualBounds(
    [childId],
    (id) => graph.getNode(id),
    (id) => graph.getAbsolutePosition(id)
  )
  let transformedBounds: VisualBounds | null = null
  const pending = [childId]

  while (pending.length > 0) {
    const nodeId = pending.pop()
    if (!nodeId) continue
    const node = graph.getNode(nodeId)
    if (!node?.visible) continue

    transformedBounds = unionVisualBounds(transformedBounds, worldNodeVisualBounds(graph, node))
    pending.push(...node.childIds)
  }

  return unionVisualBounds(visualBounds, transformedBounds)
}

function cachedSubtreePicture(
  r: SkiaRenderer,
  graph: SceneGraph,
  childId: string,
  sceneVersion: number
) {
  ensureSubtreePictureCacheScope(r, graph, sceneVersion)
  const cached = r.subtreePictureCache.get(childId)
  if (
    cached &&
    cached.pageId === r.pageId &&
    cached.sceneVersion === sceneVersion &&
    cached.positionPreviewVersion === graph.positionPreviewVersion &&
    cached.fontGeneration === r.fontGeneration
  ) {
    return cached
  }

  cached?.picture.delete()
  r.subtreePictureCache.delete(childId)
  const bounds = computeRetainedSubtreeBounds(graph, childId)
  if (!bounds) return null

  const recorder = new r.ck.PictureRecorder()
  const prevViewport = r.worldViewport
  try {
    const recCanvas = recorder.beginRecording(
      r.ck.LTRBRect(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY)
    )
    r.worldViewport = {
      x: bounds.minX,
      y: bounds.minY,
      w: bounds.maxX - bounds.minX,
      h: bounds.maxY - bounds.minY
    }
    r.renderNode(recCanvas, graph, childId, {})
    const entry = {
      picture: recorder.finishRecordingAsPicture(),
      bounds,
      pageId: r.pageId,
      sceneVersion,
      positionPreviewVersion: graph.positionPreviewVersion,
      fontGeneration: r.fontGeneration
    }
    r.subtreePictureCache.set(childId, entry)
    return entry
  } finally {
    r.worldViewport = prevViewport
    recorder.delete()
  }
}

/**
 * Draw one top-level page child, from its retained picture when it has one, and return the
 * world bounds it can paint (null when it paints nothing).
 */
export function drawRetainedChild(
  r: SkiaRenderer,
  graph: SceneGraph,
  canvas: Canvas,
  childId: string,
  sceneVersion: number,
  renderingSceneBacking: boolean
): VisualBounds | null {
  const child = graph.getNode(childId)
  const hasCacheableEffects = child?.effects.some(
    (effect) => effect.visible && (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
  )
  if (hasCacheableEffects) {
    const previous = r.renderingSceneBacking
    r.renderingSceneBacking = renderingSceneBacking
    try {
      r.renderNode(canvas, graph, childId, {})
    } finally {
      r.renderingSceneBacking = previous
    }
    return computeRetainedSubtreeBounds(graph, childId)
  }
  const cached = cachedSubtreePicture(r, graph, childId, sceneVersion)
  if (cached) {
    canvas.drawPicture(cached.picture)
    return cached.bounds
  }
  r.renderNode(canvas, graph, childId, {})
  return null
}

/** Draw a top-level page child into a backing surface laid out by `backing`. */
export function renderBackingChild(
  r: SkiaRenderer,
  graph: SceneGraph,
  surface: Surface,
  childId: string,
  backing: SceneBackingGeometry,
  sceneVersion: number
): VisualBounds | null {
  const canvas = surface.getCanvas()
  const prevViewport = r.worldViewport
  r.worldViewport = {
    x: backing.worldX,
    y: backing.worldY,
    w: backing.worldWidth,
    h: backing.worldHeight
  }
  canvas.save()
  try {
    canvas.scale(r.dpr, r.dpr)
    canvas.translate(backing.panX, backing.panY)
    canvas.scale(r.zoom, r.zoom)
    return drawRetainedChild(r, graph, canvas, childId, sceneVersion, true)
  } finally {
    canvas.restore()
    r.worldViewport = prevViewport
  }
}
