import type { CanvasKit } from 'canvaskit-wasm'

import type { SceneGraph } from '@open-pencil/scene-graph'

import type { SkiaRenderer } from '#core/canvas'
import { IS_BROWSER, IS_TAURI } from '#core/constants'
import { renderThumbnail } from '#core/io/formats/raster'

import { encodeFigFile, FIG_THUMBNAIL_PLACEHOLDER } from './encode'

export { compressFigData, compressFigDataSync } from './encode'

const THUMBNAIL_WIDTH = 512
const THUMBNAIL_HEIGHT = 512

async function renderFigThumbnail(
  graph: SceneGraph,
  pageId: string | undefined,
  ck?: CanvasKit,
  renderer?: SkiaRenderer,
  renderHeadless = false
): Promise<Uint8Array> {
  if (!pageId) return FIG_THUMBNAIL_PLACEHOLDER
  if (ck && renderer) {
    return (
      renderThumbnail(ck, renderer, graph, pageId, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT) ??
      FIG_THUMBNAIL_PLACEHOLDER
    )
  }
  if (!renderHeadless || IS_BROWSER || IS_TAURI) return FIG_THUMBNAIL_PLACEHOLDER
  const { headlessRenderThumbnail } = await import('#core/io/formats/raster')
  return (
    (await headlessRenderThumbnail(graph, pageId, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT)) ??
    FIG_THUMBNAIL_PLACEHOLDER
  )
}

export function exportFigFile(
  sourceGraph: SceneGraph,
  ck?: CanvasKit,
  renderer?: SkiaRenderer,
  pageId?: string,
  renderHeadlessThumbnail = false
): Promise<Uint8Array> {
  return encodeFigFile(sourceGraph, pageId, (graph, currentPageId) =>
    renderFigThumbnail(graph, currentPageId, ck, renderer, renderHeadlessThumbnail)
  )
}
