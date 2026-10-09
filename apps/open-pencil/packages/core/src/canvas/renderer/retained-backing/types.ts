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
}

export interface SceneBackingBuild extends RenderContentVersion, SceneBackingGeometry {
  surface: Surface
  graph: SceneGraph
  childIds: string[]
  childBounds: Map<string, VisualBounds | null>
  index: number
  startedAt: number
}
