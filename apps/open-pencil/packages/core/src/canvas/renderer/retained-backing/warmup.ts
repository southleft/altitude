import type { Canvas, Image as CKImage, Surface } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'
import type { VisualBounds } from '@open-pencil/scene-graph/geometry'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { worldNodeVisualBounds } from '#core/canvas/renderer/visual-bounds'
import { emitNavigationTrace } from '#core/profiler'

import {
  cachedSubtreePicture,
  currentSubtreePicture,
  hasCacheableEffects,
  renderBackingChild
} from './children'
import { ensureSubtreePictureCacheScope } from './invalidation'
import type { RetainedPictureWarmup, SceneBacking, SceneBackingGeometry } from './types'

const now = typeof performance !== 'undefined' ? () => performance.now() : () => 0

/**
 * Main-thread time per frame for recording and drawing a page's retained pictures before its
 * backing exists. A large page records thousands; recording them in one task froze the
 * canvas for seconds on the first visit.
 */
export const RETAINED_PICTURE_WARMUP_BUDGET_MS = 10

/** Zoom change past which the warmup raster is redrawn at the new scale. */
const MAX_WARMUP_ZOOM_RATIO = 2

type Viewport = SkiaRenderer['worldViewport']

export interface RetainedPictureWarmupHost {
  /** Overscanned geometry for the live viewport. */
  geometry: () => SceneBackingGeometry
  createSurface: (width: number, height: number) => Surface | null
  /** Install the finished raster as the page's (inexact) backing. */
  install: (
    content: Pick<SceneBacking, 'image' | 'surface' | 'childIds' | 'childBounds' | 'exact'>,
    warmup: RetainedPictureWarmup
  ) => void
}

/**
 * `drawing`: pictures are still being recorded; present the warmup raster.
 * `installed`: every picture is recorded and the raster is now the page's inexact backing,
 * which the regular incremental build replaces with an exact one.
 * `none`: no warmup is needed (every missing picture fit the first frame's budget) or
 * possible (no surface); build the backing directly.
 */
export type RetainedPictureWarmupState = 'drawing' | 'installed' | 'none'

function intersects(bounds: VisualBounds, viewport: Viewport): boolean {
  return (
    bounds.maxX >= viewport.x &&
    bounds.maxY >= viewport.y &&
    bounds.minX <= viewport.x + viewport.w &&
    bounds.minY <= viewport.y + viewport.h
  )
}

function distanceToViewport(bounds: VisualBounds, viewport: Viewport): number {
  const dx = Math.max(viewport.x - bounds.maxX, 0, bounds.minX - (viewport.x + viewport.w))
  const dy = Math.max(viewport.y - bounds.maxY, 0, bounds.minY - (viewport.y + viewport.h))
  return dx * dx + dy * dy
}

/**
 * Visible children first, in paint order, so the viewport is exact once they are drawn
 * (children outside it paint nothing there); then the rest, nearest first, for panning.
 */
function warmupOrder(graph: SceneGraph, childIds: readonly string[], viewport: Viewport) {
  const visible: string[] = []
  const rest: Array<{ id: string; distance: number }> = []
  for (const id of childIds) {
    const child = graph.getNode(id)
    if (!child?.visible) continue
    // The node itself, not its overflowing descendants: good enough for ordering.
    const bounds = worldNodeVisualBounds(graph, child)
    if (intersects(bounds, viewport)) visible.push(id)
    else rest.push({ id, distance: distanceToViewport(bounds, viewport) })
  }
  rest.sort((a, b) => a.distance - b.distance)
  return [...visible, ...rest.map((entry) => entry.id)]
}

function contentMatches(
  warmup: RetainedPictureWarmup,
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number
): boolean {
  return (
    warmup.graph === graph &&
    warmup.pageId === r.pageId &&
    warmup.sceneVersion === sceneVersion &&
    warmup.positionPreviewVersion === graph.positionPreviewVersion &&
    warmup.fontGeneration === r.fontGeneration
  )
}

/** Whether the warmup raster still covers the screen at a usable scale. */
function coversViewport(warmup: RetainedPictureWarmup, r: SkiaRenderer): boolean {
  if (warmup.dpr !== r.dpr) return false
  const ratio = r.zoom / warmup.zoom
  if (ratio > MAX_WARMUP_ZOOM_RATIO || ratio < 1 / MAX_WARMUP_ZOOM_RATIO) return false
  const x = r.panX - warmup.panX * ratio
  const y = r.panY - warmup.panY * ratio
  return (
    x <= 0 &&
    y <= 0 &&
    x + warmup.width * ratio >= r.viewportWidth &&
    y + warmup.height * ratio >= r.viewportHeight
  )
}

export function disposeRetainedPictureWarmup(r: SkiaRenderer): void {
  r.retainedPictureWarmup?.image?.delete()
  r.retainedPictureWarmup?.surface.delete()
  r.retainedPictureWarmup = null
}

/**
 * Record missing pictures within the frame budget, without drawing. Returns true when none
 * are left, so the backing can be built at once, as before, for any page that fits.
 */
function recordWithinBudget(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number,
  order: readonly string[],
  startedAt: number
): boolean {
  for (const id of order) {
    if (hasCacheableEffects(graph.getNode(id))) continue
    if (currentSubtreePicture(r, graph, id, sceneVersion)) continue
    if (now() - startedAt >= RETAINED_PICTURE_WARMUP_BUDGET_MS) return false
    cachedSubtreePicture(r, graph, id, sceneVersion)
  }
  return true
}

/**
 * After an edit that dropped many pictures, start from the page's previous backing rather
 * than a blank page: the progressive frame then shows the old content until redrawn.
 */
function seedFromPreviousBacking(r: SkiaRenderer, canvas: Canvas, geometry: SceneBackingGeometry) {
  const previous = r.sceneBacking
  if (!previous || previous.pageId !== r.pageId) return
  const scale = geometry.zoom / previous.zoom
  const x = (previous.panX * scale - geometry.panX) * geometry.dpr
  const y = (previous.panY * scale - geometry.panY) * geometry.dpr
  const width = previous.width * scale * geometry.dpr
  const height = previous.height * scale * geometry.dpr
  r.opacityPaint.setAlphaf(1)
  canvas.drawImageRectOptions(
    previous.image,
    r.ck.LTRBRect(0, 0, previous.width * previous.dpr, previous.height * previous.dpr),
    r.ck.LTRBRect(-x, -y, -x + width, -y + height),
    r.ck.FilterMode.Linear,
    r.ck.MipmapMode.None,
    r.opacityPaint
  )
}

function startWarmup(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number,
  host: RetainedPictureWarmupHost,
  startedAt: number
): RetainedPictureWarmup | 'none' {
  const childIds = graph.getNode(r.pageId ?? graph.rootId)?.childIds ?? []
  const order = warmupOrder(graph, childIds, r.worldViewport)
  if (recordWithinBudget(r, graph, sceneVersion, order, startedAt)) return 'none'
  const geometry = host.geometry()
  const surface = host.createSurface(geometry.width, geometry.height)
  if (!surface) return 'none'
  const canvas = surface.getCanvas()
  canvas.clear(r.ck.Color4f(r.pageColor.r, r.pageColor.g, r.pageColor.b, 1))
  seedFromPreviousBacking(r, canvas, geometry)
  emitNavigationTrace('backing:warmup', { phase: 'start', childCount: order.length })
  return {
    ...geometry,
    graph,
    pageId: r.pageId,
    sceneVersion,
    positionPreviewVersion: graph.positionPreviewVersion,
    fontGeneration: r.fontGeneration,
    surface,
    image: null,
    childIds: [...childIds],
    pending: order,
    childBounds: new Map(),
    startedAt
  }
}

/**
 * Advance the current page's first-time picture recording by one frame's budget. Pictures
 * are recorded and drawn into an overscanned raster, visible ones first; once all exist the
 * raster becomes the page's inexact backing (see `RetainedPictureWarmupState`). A viewport
 * that leaves the raster restarts it; recorded pictures stay cached, so that is cheap.
 */
export function advanceRetainedPictureWarmup(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number,
  host: RetainedPictureWarmupHost
): RetainedPictureWarmupState {
  const startedAt = now()
  if (!graph.getNode(r.pageId ?? graph.rootId)?.childIds.length) return 'none'
  ensureSubtreePictureCacheScope(r, graph, sceneVersion)
  let warmup = r.retainedPictureWarmup
  if (warmup && (!contentMatches(warmup, r, graph, sceneVersion) || !coversViewport(warmup, r))) {
    disposeRetainedPictureWarmup(r)
    warmup = null
  }
  if (!warmup) {
    const started = startWarmup(r, graph, sceneVersion, host, startedAt)
    if (started === 'none') return 'none'
    warmup = started
    r.retainedPictureWarmup = warmup
  }

  let drawn = 0
  while (warmup.pending.length > 0) {
    // At least one child per frame, so every frame makes progress.
    if (drawn > 0 && now() - startedAt >= RETAINED_PICTURE_WARMUP_BUDGET_MS) break
    const childId = warmup.pending.shift()
    if (!childId) continue
    warmup.childBounds.set(
      childId,
      renderBackingChild(r, graph, warmup.surface, childId, warmup, sceneVersion)
    )
    drawn++
  }
  warmup.surface.flush()
  let image: CKImage
  try {
    image = warmup.surface.makeImageSnapshot()
  } catch (error) {
    disposeRetainedPictureWarmup(r)
    throw error
  }
  warmup.image?.delete()
  warmup.image = image
  emitNavigationTrace('backing:warmup', {
    phase: warmup.pending.length > 0 ? 'step' : 'done',
    drawn,
    remaining: warmup.pending.length,
    elapsedMs: now() - warmup.startedAt
  })
  if (warmup.pending.length > 0) return 'drawing'

  r.retainedPictureWarmup = null
  host.install(
    {
      image,
      surface: warmup.surface,
      childIds: warmup.childIds,
      childBounds: warmup.childBounds,
      exact: false
    },
    warmup
  )
  return 'installed'
}

/** Present the warmup raster, scaled and offset to the live viewport. */
export function drawRetainedPictureWarmup(r: SkiaRenderer, canvas: Canvas): void {
  const warmup = r.retainedPictureWarmup
  if (!warmup?.image) return
  const scale = r.zoom / warmup.zoom
  const x = r.panX - warmup.panX * scale
  const y = r.panY - warmup.panY * scale
  r.opacityPaint.setAlphaf(1)
  canvas.drawImageRectOptions(
    warmup.image,
    r.ck.LTRBRect(0, 0, warmup.width * warmup.dpr, warmup.height * warmup.dpr),
    r.ck.LTRBRect(x, y, x + warmup.width * scale, y + warmup.height * scale),
    r.ck.FilterMode.Linear,
    r.ck.MipmapMode.None,
    r.opacityPaint
  )
}
