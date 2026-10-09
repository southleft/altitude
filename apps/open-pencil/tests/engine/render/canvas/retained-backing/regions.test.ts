import { beforeAll, expect, spyOn, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { initCanvasKit } from '#cli/headless'
import { SkiaRenderer } from '#core/canvas'
import { subscribeNavigationTrace } from '#core/profiler'

import { expectDefined } from '#tests/helpers/assert'

let ck: Awaited<ReturnType<typeof initCanvasKit>>

beforeAll(async () => {
  ck = await initCanvasKit()
})

const solid = (r: number, g: number, b: number) => [
  { type: 'SOLID' as const, color: { r, g, b, a: 1 }, opacity: 1, visible: true }
]

/** Overlapping shapes on a grid, so repainted regions cross neighbors drawn before and after. */
function createFixture() {
  const graph = new SceneGraph()
  const page = expectDefined(graph.getPages()[0], 'page')
  const ids: string[] = []
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 8; col++) {
      const node = graph.createNode(row % 2 ? 'ELLIPSE' : 'RECTANGLE', page.id, {
        x: col * 90.25 - 200,
        y: row * 70.5 - 150,
        width: 80,
        height: 50,
        rotation: (row * 8 + col) % 5 === 0 ? 17 : 0,
        cornerRadius: col % 3 === 0 ? 12 : 0,
        fills: solid(((col * 31) % 255) / 255, ((row * 47) % 255) / 255, 0.5),
        strokes:
          col % 2
            ? [
                {
                  color: { r: 0, g: 0, b: 0, a: 1 },
                  weight: 3,
                  opacity: 1,
                  visible: true,
                  align: 'CENTER'
                }
              ]
            : []
      })
      ids.push(node.id)
    }
  }
  return { graph, pageId: page.id, ids }
}

function createRenderer(pageId: string, panX: number, panY: number) {
  const surface = expectDefined(ck.MakeSurface(1200, 900), 'surface')
  const renderer = new SkiaRenderer(ck, surface)
  renderer.viewportWidth = 600
  renderer.viewportHeight = 450
  renderer.dpr = 2
  renderer.zoom = 0.75
  renderer.pageId = pageId
  renderer.pageColor = { r: 0.96, g: 0.96, b: 0.96, a: 1 }
  renderer.panX = panX
  renderer.panY = panY
  return renderer
}

function settle(renderer: SkiaRenderer, graph: SceneGraph, sceneVersion: number) {
  for (let frame = 0; frame < 50; frame++) {
    renderer.sceneBackingPreviewUntil = 0
    renderer.render(graph, new Set(), {}, sceneVersion, 'scene')
    if (!renderer.sceneBackingNeedsCrispRender) break
  }
  expect(renderer.sceneBackingNeedsCrispRender).toBe(false)
  return expectDefined(renderer.sceneBacking, 'settled backing')
}

function backingPixels(renderer: SkiaRenderer) {
  const backing = expectDefined(renderer.sceneBacking, 'backing')
  return expectDefined(
    backing.image.readPixels(0, 0, {
      width: backing.image.width(),
      height: backing.image.height(),
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Unpremul,
      colorSpace: ck.ColorSpace.SRGB
    }),
    'backing pixels'
  )
}

/** The backing a renderer with no history builds for the same scene and viewport. */
function freshBackingPixels(graph: SceneGraph, pageId: string, panX: number, panY: number) {
  const renderer = createRenderer(pageId, panX, panY)
  try {
    settle(renderer, graph, 99)
    return backingPixels(renderer)
  } finally {
    renderer.destroy()
  }
}

function differingChannels(actual: ArrayLike<number>, expected: ArrayLike<number>): number {
  expect(actual.length).toBe(expected.length)
  let count = 0
  for (let index = 0; index < actual.length; index++)
    count += Number(actual[index] !== expected[index])
  return count
}

test('edits repaint only their regions and match a full rebuild pixel for pixel', () => {
  const { graph, pageId, ids } = createFixture()
  const renderer = createRenderer(pageId, 180.5, 140.25)
  try {
    const backing = settle(renderer, graph, 1)
    const fullDraws = spyOn(renderer, 'renderNode')
    try {
      const moved = expectDefined(ids[19], 'moved shape')
      const recolored = expectDefined(ids[40], 'recolored shape')
      graph.updateNode(moved, {
        x: expectDefined(graph.getNode(moved), 'moved node').x + 37.5,
        y: 12
      })
      graph.updateNode(recolored, { fills: solid(1, 0, 0), opacity: 0.6 })
      renderer.invalidateNodePicture(moved)
      renderer.invalidateNodePicture(recolored)
      const repainted = settle(renderer, graph, 2)
      expect(repainted).toBe(backing)
      expect(repainted.sceneVersion).toBe(2)
      // Only the two edited subtrees are recorded again.
      expect(fullDraws).toHaveBeenCalledTimes(2)
    } finally {
      fullDraws.mockRestore()
    }
    expect(
      differingChannels(backingPixels(renderer), freshBackingPixels(graph, pageId, 180.5, 140.25))
    ).toBe(0)
  } finally {
    renderer.destroy()
  }
})

test('panning past the backing shifts its pixels, then settles to an exact rebuild', () => {
  const { graph, pageId } = createFixture()
  const renderer = createRenderer(pageId, 180.5, 140.25)
  try {
    const backing = settle(renderer, graph, 1)
    const fullDraws = spyOn(renderer, 'renderNode')
    try {
      renderer.navigationPhase = 'pan'
      renderer.panX += 700
      renderer.panY -= 200
      renderer.render(graph, new Set(), {}, 1, 'scene')
      expect(renderer.profiler.stats.scenePictureMissReason).toBe('backing')
      const shifted = expectDefined(renderer.sceneBacking, 'shifted backing')
      expect(shifted).not.toBe(backing)
      expect(shifted.exact).toBe(false)
      expect(shifted.anchorPanX).toBe(880.5)
      // Exposed strips draw retained pictures; nothing renders the page node by node.
      expect(fullDraws).not.toHaveBeenCalled()
    } finally {
      fullDraws.mockRestore()
    }
    renderer.navigationPhase = 'idle'
    expect(settle(renderer, graph, 1).exact).toBe(true)
    expect(
      differingChannels(backingPixels(renderer), freshBackingPixels(graph, pageId, 880.5, -59.75))
    ).toBe(0)
  } finally {
    renderer.destroy()
  }
})

test('unattributed changes and structural edits rebuild the whole backing', () => {
  const { graph, pageId, ids } = createFixture()
  const renderer = createRenderer(pageId, 180.5, 140.25)
  try {
    const backing = settle(renderer, graph, 1)
    graph.updateNode(expectDefined(ids[3], 'shape'), { x: 400 })
    // No picture invalidation reported: the change cannot be located.
    const rebuilt = settle(renderer, graph, 2)
    expect(rebuilt).not.toBe(backing)
    graph.deleteNode(expectDefined(ids[5], 'deleted shape'))
    renderer.invalidateNodePicture(expectDefined(ids[5], 'deleted shape'))
    expect(settle(renderer, graph, 3)).not.toBe(rebuilt)
    expect(
      differingChannels(backingPixels(renderer), freshBackingPixels(graph, pageId, 180.5, 140.25))
    ).toBe(0)
  } finally {
    renderer.destroy()
  }
})

test('a font load rebuilds the backing over frames while presenting the previous one', () => {
  const { graph, pageId } = createFixture()
  const renderer = createRenderer(pageId, 180.5, 140.25)
  const fonts = spyOn(renderer, 'syncFontGeneration')
  try {
    fonts.mockImplementation(() => undefined)
    const backing = settle(renderer, graph, 1)
    renderer.fontGeneration++
    renderer.navigationPhase = 'pan'
    renderer.render(graph, new Set(), {}, 1, 'scene')
    expect(renderer.profiler.stats.scenePictureMissReason).toBe('backing')
    expect(renderer.sceneBacking).toBe(backing)
    renderer.navigationPhase = 'idle'
    const builds: string[] = []
    const unsubscribe = subscribeNavigationTrace((event) => {
      if (event.name === 'backing:build') builds.push(String(event.detail.phase))
    })
    let rebuilt: ReturnType<typeof settle> | undefined
    try {
      rebuilt = settle(renderer, graph, 1)
    } finally {
      unsubscribe()
    }
    // Rebuilt by the time-sliced build, not by one synchronous whole-page pass.
    expect(builds).toEqual(['start'])
    rebuilt = expectDefined(rebuilt, 'rebuilt backing')
    expect(rebuilt).not.toBe(backing)
    expect(rebuilt.fontGeneration).toBe(renderer.fontGeneration)
  } finally {
    fonts.mockRestore()
    renderer.destroy()
  }
})
