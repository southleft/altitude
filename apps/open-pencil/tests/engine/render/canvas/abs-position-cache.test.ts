import { beforeAll, expect, spyOn, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { initCanvasKit } from '#cli/headless'
import { SkiaRenderer } from '#core/canvas'
import { render } from '#core/canvas/renderer/pipeline'

import { expectDefined } from '#tests/helpers/assert'

let ck: Awaited<ReturnType<typeof initCanvasKit>>

beforeAll(async () => {
  ck = await initCanvasKit()
})

test('repaints keep cached world positions until the scene version or graph changes', () => {
  const graph = new SceneGraph()
  const page = expectDefined(graph.getPages()[0], 'page')
  graph.createNode('RECTANGLE', page.id, { x: 10, y: 10, width: 20, height: 20 })
  const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(64, 64), 'surface'))
  renderer.viewportWidth = 64
  renderer.viewportHeight = 64
  renderer.pageId = page.id
  const clears = spyOn(graph, 'clearAbsPosCache')
  try {
    render(renderer, graph, new Set(), {}, 1, 'overlays')
    render(renderer, graph, new Set(), {}, 1, 'overlays')
    expect(clears).toHaveBeenCalledTimes(1)

    render(renderer, graph, new Set(), {}, 2, 'overlays')
    expect(clears).toHaveBeenCalledTimes(2)

    render(renderer, graph, new Set(), {}, -1, 'overlays')
    render(renderer, graph, new Set(), {}, -1, 'overlays')
    expect(clears).toHaveBeenCalledTimes(4)

    const other = new SceneGraph()
    const otherClears = spyOn(other, 'clearAbsPosCache')
    render(renderer, other, new Set(), {}, -1, 'overlays')
    render(renderer, other, new Set(), {}, 5, 'overlays')
    render(renderer, graph, new Set(), {}, 5, 'overlays')
    expect(otherClears).toHaveBeenCalledTimes(2)
    expect(clears).toHaveBeenCalledTimes(5)
  } finally {
    clears.mockRestore()
    renderer.destroy()
  }
})
