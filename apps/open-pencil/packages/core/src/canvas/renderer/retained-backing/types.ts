import type { Image as CKImage, Surface } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'
import type { VisualBounds } from '@open-pencil/scene-graph/geometry'

export interface RenderContentVersion {
  pageId: string | null
  sceneVersion: number
  positionPreviewVersion: number
  fontGeneration: number
}

export interface SceneBackingGeometry {
  /** Viewport translation at rasterization, before adding integer-device-pixel overscan. */
  anchorPanX: number
  anchorPanY: number
  marginDeviceX: number
  marginDeviceY: number
  panX: number
  panY: number
  zoom: number
  width: number
  height: number
  dpr: number
  worldX: number
  worldY: number
  worldWidth: number
  worldHeight: number
}

export interface SceneBacking extends RenderContentVersion, SceneBackingGeometry {
  image: CKImage
  /** The surface `image` was taken from, kept to repaint regions in place. */
  surface: Surface | null
  /** Page children in the order they were drawn. */
  childIds: string[]
  /** World bounds each child painted into this backing; null when it painted nothing. */
  childBounds: Map<string, VisualBounds | null>
  /**
   * False for a backing assembled from shifted pixels while navigating. Rasterization is not
   * exactly translation invariant, so such a backing is presented only while navigating and
   * rebuilt before the scene settles.
   */
  exact: boolean
}

export interface SceneBackingBuild extends RenderContentVersion, SceneBackingGeometry {
  surface: Surface
  graph: SceneGraph
  childIds: string[]
  childBounds: Map<string, VisualBounds | null>
  index: number
  startedAt: number
}

/**
 * A page's first-time picture recording, drawn as it goes into an overscanned raster that is
 * presented until every picture exists.
 */
export interface RetainedPictureWarmup extends RenderContentVersion, SceneBackingGeometry {
  graph: SceneGraph
  surface: Surface
  /** The raster as of the last step. */
  image: CKImage | null
  /** Page children in paint order. */
  childIds: string[]
  /** Children still to draw: visible ones in paint order, then the rest, nearest first. */
  pending: string[]
  childBounds: Map<string, VisualBounds | null>
  startedAt: number
}
