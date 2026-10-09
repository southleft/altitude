import type { Image as CKImage, Surface } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'
import type { VisualBounds } from '@open-pencil/scene-graph/geometry'

import type { SkiaRenderer } from '#core/canvas/renderer'

import { computeRetainedSubtreeBounds, renderBackingChild } from './children'
import { ensureSubtreePictureCacheScope } from './invalidation'
import type { SceneBacking, SceneBackingGeometry } from './types'

/** A rectangle in backing device pixels: left, top, right, bottom. */
type DeviceRect = [number, number, number, number]

/**
 * Device pixels added around every repainted region. Picture bounds include strokes and
 * effects, but glyphs and antialiasing can reach slightly past them.
 */
const REGION_MARGIN_DEVICE_PX = 4
/**
 * Past this share of the page's children redrawn, a full rebuild costs about the same as a
 * partial one; drawing those children's pictures is the cost either way.
 */
const MAX_REDRAWN_CHILDREN = 0.5
/** A shift keeps at least this share of the old backing's pixels. */
const MIN_KEPT_AREA = 0.25

function deviceRect(bounds: VisualBounds, backing: SceneBackingGeometry): DeviceRect {
  const scale = backing.zoom * backing.dpr
  const originX = backing.panX * backing.dpr
  const originY = backing.panY * backing.dpr
  return [
    Math.floor(bounds.minX * scale + originX) - REGION_MARGIN_DEVICE_PX,
    Math.floor(bounds.minY * scale + originY) - REGION_MARGIN_DEVICE_PX,
    Math.ceil(bounds.maxX * scale + originX) + REGION_MARGIN_DEVICE_PX,
    Math.ceil(bounds.maxY * scale + originY) + REGION_MARGIN_DEVICE_PX
  ]
}

function clampRect(rect: DeviceRect, width: number, height: number): DeviceRect | null {
  const clamped: DeviceRect = [
    Math.max(0, rect[0]),
    Math.max(0, rect[1]),
    Math.min(width, rect[2]),
    Math.min(height, rect[3])
  ]
  return clamped[0] < clamped[2] && clamped[1] < clamped[3] ? clamped : null
}

function intersects(a: DeviceRect, b: DeviceRect): boolean {
  return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
}

function area(rect: DeviceRect): number {
  return (rect[2] - rect[0]) * (rect[3] - rect[1])
}

function deviceSize(backing: SceneBackingGeometry): { width: number; height: number } {
  return {
    width: Math.ceil(backing.width * backing.dpr),
    height: Math.ceil(backing.height * backing.dpr)
  }
}

function childDeviceRects(
  childIds: readonly string[],
  childBounds: Map<string, VisualBounds | null>,
  geometry: SceneBackingGeometry
): Array<DeviceRect | null> {
  return childIds.map((id) => {
    const bounds = childBounds.get(id)
    return bounds ? deviceRect(bounds, geometry) : null
  })
}

/** Whether repainting `regions` redraws few enough children to beat a full rebuild. */
function worthRepainting(
  regions: readonly DeviceRect[],
  childRects: ReadonlyArray<DeviceRect | null>
): boolean {
  let redrawn = 0
  for (const rect of childRects) {
    if (rect && regions.some((region) => intersects(rect, region))) redrawn++
  }
  return redrawn <= childRects.length * MAX_REDRAWN_CHILDREN
}

/**
 * Repaint `regions` of `target` from a scratch surface of the same size holding the page color
 * and, in page order, every top-level child whose bounds reach a region, drawn unclipped.
 *
 * Inside a region that scratch surface holds the pixels a full rebuild would: the same pictures
 * meet the same transform on a surface of the same size, and a child that does not reach the
 * region paints nothing there. Drawing straight into a clipped region would not be exact,
 * because antialiased rasterization of a shape changes where a clip cuts through it. Returns
 * false when no scratch surface can be allocated.
 */
function repaintRegions(
  r: SkiaRenderer,
  graph: SceneGraph,
  target: Surface,
  createSurface: () => Surface | null,
  geometry: SceneBackingGeometry,
  childIds: readonly string[],
  childRects: ReadonlyArray<DeviceRect | null>,
  childBounds: Map<string, VisualBounds | null>,
  regions: readonly DeviceRect[],
  sceneVersion: number
): boolean {
  if (regions.length === 0) return true
  const scratch = createSurface()
  if (!scratch) return false
  try {
    scratch.getCanvas().clear(r.ck.Color4f(r.pageColor.r, r.pageColor.g, r.pageColor.b, 1))
    childIds.forEach((childId, index) => {
      const rect = childRects[index]
      if (!rect || !regions.some((region) => intersects(rect, region))) return
      childBounds.set(
        childId,
        renderBackingChild(r, graph, scratch, childId, geometry, sceneVersion)
      )
    })
    const image = snapshot(scratch)
    try {
      const canvas = target.getCanvas()
      for (const region of regions) {
        const rect = r.ck.LTRBRect(region[0], region[1], region[2], region[3])
        canvas.drawImageRectOptions(
          image,
          rect,
          rect,
          r.ck.FilterMode.Nearest,
          r.ck.MipmapMode.None,
          null
        )
      }
    } finally {
      image.delete()
    }
    return true
  } finally {
    scratch.delete()
  }
}

/** A device offset as whole pixels, tolerating floating-point drift from repeated pans. */
function wholeDevicePixels(offset: number): number | null {
  const rounded = Math.round(offset)
  return Math.abs(offset - rounded) < 1e-6 ? rounded : null
}

function snapshot(surface: Surface): CKImage {
  surface.flush()
  return surface.makeImageSnapshot()
}

function sameChildOrder(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false
  return true
}

/**
 * Whether `backing` was drawn for this page, preview state, and page child list at the given
 * zoom and pixel density, so its pixels can be partly reused.
 */
function reusableBacking(
  r: SkiaRenderer,
  graph: SceneGraph,
  backing: SceneBacking,
  zoom: number,
  dpr: number
): boolean {
  if (
    backing.pageId !== r.pageId ||
    backing.positionPreviewVersion !== graph.positionPreviewVersion ||
    backing.zoom !== zoom ||
    backing.dpr !== dpr
  ) {
    return false
  }
  const page = graph.getNode(r.pageId ?? graph.rootId)
  return !!page && sameChildOrder(page.childIds, backing.childIds)
}

/**
 * Bring a backing from an older scene version up to `sceneVersion` by repainting only the
 * world regions of the top-level children edited since: each child's previous bounds (what it
 * painted before) and its current bounds. Returns false, leaving the backing untouched, when the
 * change cannot be attributed (unknown edits, document-wide inputs, a different page child
 * list, other zoom, fonts, or previews) or covers most of the backing.
 */
export function repaintSceneBackingRegions(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number,
  createSurface: () => Surface | null
): boolean {
  const backing = r.sceneBacking
  if (
    !backing?.surface ||
    backing.sceneVersion === sceneVersion ||
    backing.fontGeneration !== r.fontGeneration
  ) {
    return false
  }
  ensureSubtreePictureCacheScope(r, graph, sceneVersion)
  if (
    r.sceneBackingDirtyUnknown ||
    r.sceneBackingDirtyVersion !== backing.sceneVersion ||
    !reusableBacking(r, graph, backing, r.zoom, r.dpr)
  ) {
    return false
  }

  const { width, height } = deviceSize(backing)
  const regions: DeviceRect[] = []
  const currentBounds = new Map<string, VisualBounds | null>()
  for (const childId of r.sceneBackingDirtyIds) {
    const bounds = computeRetainedSubtreeBounds(graph, childId)
    currentBounds.set(childId, bounds)
    for (const painted of [backing.childBounds.get(childId), bounds]) {
      const rect = painted ? clampRect(deviceRect(painted, backing), width, height) : null
      if (rect) regions.push(rect)
    }
  }
  const nextBounds = new Map(backing.childBounds)
  for (const [childId, bounds] of currentBounds) nextBounds.set(childId, bounds)
  const childRects = childDeviceRects(backing.childIds, nextBounds, backing)
  if (!worthRepainting(regions, childRects)) return false
  if (
    !repaintRegions(
      r,
      graph,
      backing.surface,
      createSurface,
      backing,
      backing.childIds,
      childRects,
      nextBounds,
      regions,
      sceneVersion
    )
  ) {
    return false
  }
  backing.childBounds = nextBounds
  const image = snapshot(backing.surface)
  backing.image.delete()
  backing.image = image
  backing.sceneVersion = sceneVersion
  r.sceneBackingDirtyIds.clear()
  r.sceneBackingDirtyVersion = sceneVersion
  return true
}

/**
 * Lay out a backing for `geometry` from the current one when only the viewport moved by whole
 * device pixels at the same zoom: the overlapping pixels are copied and only the newly exposed
 * strips are drawn. Returns the new backing parts, or null when a full rebuild is needed.
 *
 * Used while navigating: the result keeps the old backing's font generation and is marked
 * inexact (see `SceneBacking.exact`), so it is rebuilt once navigation settles.
 */
export function shiftSceneBacking(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number,
  geometry: SceneBackingGeometry,
  surface: Surface,
  createSurface: () => Surface | null
): Pick<SceneBacking, 'image' | 'childIds' | 'childBounds' | 'fontGeneration' | 'exact'> | null {
  const backing = r.sceneBacking
  if (
    !backing ||
    backing.sceneVersion !== sceneVersion ||
    backing.width !== geometry.width ||
    backing.height !== geometry.height ||
    !reusableBacking(r, graph, backing, geometry.zoom, geometry.dpr)
  ) {
    return null
  }
  const dx = wholeDevicePixels((geometry.panX - backing.panX) * geometry.dpr)
  const dy = wholeDevicePixels((geometry.panY - backing.panY) * geometry.dpr)
  if (dx === null || dy === null) return null

  const { width, height } = deviceSize(geometry)
  const kept = clampRect([dx, dy, dx + width, dy + height], width, height)
  if (!kept || area(kept) < width * height * MIN_KEPT_AREA) return null

  const canvas = surface.getCanvas()
  canvas.clear(r.ck.Color4f(r.pageColor.r, r.pageColor.g, r.pageColor.b, 1))
  canvas.drawImageRectOptions(
    backing.image,
    r.ck.LTRBRect(kept[0] - dx, kept[1] - dy, kept[2] - dx, kept[3] - dy),
    r.ck.LTRBRect(kept[0], kept[1], kept[2], kept[3]),
    r.ck.FilterMode.Nearest,
    r.ck.MipmapMode.None,
    null
  )
  // The exposed area is the backing minus the kept rectangle: up to four strips.
  const exposed: DeviceRect[] = []
  if (kept[1] > 0) exposed.push([0, 0, width, kept[1]])
  if (kept[3] < height) exposed.push([0, kept[3], width, height])
  if (kept[0] > 0) exposed.push([0, kept[1], kept[0], kept[3]])
  if (kept[2] < width) exposed.push([kept[2], kept[1], width, kept[3]])

  const childBounds = new Map(backing.childBounds)
  const childRects = childDeviceRects(backing.childIds, childBounds, geometry)
  if (!worthRepainting(exposed, childRects)) return null
  if (
    !repaintRegions(
      r,
      graph,
      surface,
      createSurface,
      geometry,
      backing.childIds,
      childRects,
      childBounds,
      exposed,
      sceneVersion
    )
  ) {
    return null
  }
  return {
    image: snapshot(surface),
    childIds: backing.childIds,
    childBounds,
    fontGeneration: backing.fontGeneration,
    exact: false
  }
}
