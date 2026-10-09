import { beforeAll, expect, setDefaultTimeout, spyOn, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { initCanvasKit } from '#cli/headless'
import { SkiaRenderer } from '#core/canvas'

import { expectDefined } from '#tests/helpers/assert'

setDefaultTimeout(60_000)

let ck: Awaited<ReturnType<typeof initCanvasKit>>

beforeAll(async () => {
  ck = await initCanvasKit()
})

const solid = (r: number, g: number, b: number) => [
  { type: 'SOLID' as const, color: { r, g, b, a: 1 }, opacity: 1, visible: true }
]

/** Overlapping shapes, some shadowed, spread past the viewport on every side. */
function createFixture() {
  const graph = new SceneGraph()
  const page = expectDefined(graph.getPages()[0], 'page')
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 10; col++) {
      const frame = graph.createNode('FRAME', page.id, {
        x: col * 110.5 - 400,
        y: row * 90.25 - 300,
        width: 120,
        height: 80,
        rotation: (row + col) % 7 === 0 ? 12 : 0,
        cornerRadius: col % 3 === 0 ? 10 : 0,
        fills: solid(((col * 37) % 255) / 255, ((row * 53) % 255) / 255, 0.4),
        effects:
          (row * 10 + col) % 11 === 0
            ? [
                {
                  type: 'DROP_SHADOW',
                  color: { r: 0, g: 0, b: 0, a: 0.5 },
                  offset: { x: 4, y: 6 },
                  radius: 6,
                  spread: 0,
                  visible: true
                }
              ]
            : []
      })
      graph.createNode('ELLIPSE', frame.id, {
        x: 10,
        y: 10,
        width: 40,
        height: 40,
        fills: solid(0.9, 0.2, ((row * 10 + col) % 9) / 9)
      })
    }
  }
  return { graph, pageId: page.id }
}

function createRenderer(pageId: string) {
  const surface = expectDefined(ck.MakeSurface(600, 450), 'surface')
  const renderer = new SkiaRenderer(ck, surface)
  renderer.viewportWidth = 600
  renderer.viewportHeight = 450
  renderer.dpr = 1
  renderer.zoom = 0.8
  renderer.pageId = pageId
  renderer.pageColor = { r: 0.96, g: 0.96, b: 0.96, a: 1 }
  renderer.panX = 120.5
  renderer.panY = 90.25
  return renderer
}

function renderFrame(renderer: SkiaRenderer, graph: SceneGraph) {
  renderer.sceneBackingPreviewUntil = 0
  renderer.render(graph, new Set(), {}, 1, 'scene')
}

/** Render until the frame is crisp; returns the number of frames. */
function settle(renderer: SkiaRenderer, graph: SceneGraph, maxFrames = 500): number {
  let frames = 0
  do {
    renderFrame(renderer, graph)
    frames++
  } while (renderer.sceneBackingNeedsCrispRender && frames < maxFrames)
  expect(renderer.sceneBackingNeedsCrispRender).toBe(false)
  return frames
}

function readPixels(image: ReturnType<SkiaRenderer['surface']['makeImageSnapshot']>) {
  return expectDefined(
    image.readPixels(0, 0, {
      width: image.width(),
      height: image.height(),
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Unpremul,
      colorSpace: ck.ColorSpace.SRGB
    }),
    'pixels'
  )
}

function framePixels(renderer: SkiaRenderer) {
  const image = renderer.surface.makeImageSnapshot()
  try {
    return readPixels(image)
  } finally {
    image.delete()
  }
}

function backingPixels(renderer: SkiaRenderer) {
  return readPixels(expectDefined(renderer.sceneBacking, 'backing').image)
}

function differingChannels(actual: ArrayLike<number>, expected: ArrayLike<number>): number {
  expect(actual.length).toBe(expected.length)
  let count = 0
  for (let index = 0; index < actual.length; index++)
    count += Number(actual[index] !== expected[index])
  return count
}

function intersectsViewport(renderer: SkiaRenderer, childId: string): boolean {
  const entry = expectDefined(renderer.subtreePictureCache.get(childId), 'picture')
  const view = renderer.worldViewport
  return (
    entry.bounds.maxX >= view.x &&
    entry.bounds.maxY >= view.y &&
    entry.bounds.minX <= view.x + view.w &&
    entry.bounds.minY <= view.y + view.h
  )
}

test('first-visit pictures are recorded across frames and settle to the synchronous pixels', () => {
  const { graph, pageId } = createFixture()

  // Reference: a clock that never advances fits the whole page in the first frame's budget,
  // which is the synchronous path.
  const frozen = spyOn(performance, 'now').mockImplementation(() => 0)
  const reference = createRenderer(pageId)
  let expectedFrame: Uint8Array | Float32Array
  let expectedBacking: Uint8Array | Float32Array
  try {
    renderFrame(reference, graph)
    // Every picture and the backing are recorded in the first frame.
    expect(reference.sceneBacking).not.toBeNull()
    settle(reference, graph)
    expectedFrame = framePixels(reference)
    expectedBacking = backingPixels(reference)
  } finally {
    frozen.mockRestore()
    reference.destroy()
  }

  // Every clock read exceeds the budget, so each frame records exactly one picture.
  let clock = 0
  const nowSpy = spyOn(performance, 'now').mockImplementation(() => (clock += 50))
  const sliced = createRenderer(pageId)
  try {
    const children = graph.getChildren(pageId)
    const shadowed = children.filter((child) => child.effects.length > 0).length
    // Each frame draws one child into the warmup raster, visible children first.
    let frames = 0
    while (sliced.subtreePictureCache.size < 4) {
      renderFrame(sliced, graph)
      frames++
      expect(sliced.sceneBackingNeedsCrispRender).toBe(true)
      expect(sliced.sceneBacking).toBeNull()
      expect(sliced.subtreePictureCache.size).toBeLessThanOrEqual(frames)
    }
    for (const id of sliced.subtreePictureCache.keys()) {
      expect(intersectsViewport(sliced, id)).toBe(true)
    }

    frames += settle(sliced, graph)
    expect(frames).toBeGreaterThanOrEqual(children.length - shadowed)
    expect(differingChannels(framePixels(sliced), expectedFrame)).toBe(0)
    expect(differingChannels(backingPixels(sliced), expectedBacking)).toBe(0)
  } finally {
    nowSpy.mockRestore()
    sliced.destroy()
  }
})

test('a viewport that leaves the raster restarts it around the new viewport', () => {
  const { graph, pageId } = createFixture()
  let clock = 0
  const nowSpy = spyOn(performance, 'now').mockImplementation(() => (clock += 50))
  const renderer = createRenderer(pageId)
  try {
    renderFrame(renderer, graph)
    const before = new Set(renderer.subtreePictureCache.keys())
    // Past the overscan, onto the leftmost columns.
    renderer.panX += 650
    renderFrame(renderer, graph)
    const recorded = [...renderer.subtreePictureCache.keys()].filter((id) => !before.has(id))
    expect(recorded).toHaveLength(1)
    expect(intersectsViewport(renderer, expectDefined(recorded[0], 'recorded picture'))).toBe(true)
    expect(renderer.sceneBackingNeedsCrispRender).toBe(true)
    settle(renderer, graph)
  } finally {
    nowSpy.mockRestore()
    renderer.destroy()
  }
})
