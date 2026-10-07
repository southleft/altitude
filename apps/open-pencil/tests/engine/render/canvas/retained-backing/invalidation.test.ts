import { beforeAll, describe, expect, test } from 'bun:test'

import { SceneGraph, type Color } from '@open-pencil/scene-graph'

import { initCanvasKit } from '#cli/headless'
import { SkiaRenderer } from '#core/canvas'
import {
  retainedSceneFingerprint,
  retainedTopLevelIds
} from '#core/canvas/renderer/retained-backing/invalidation'
import { createGraphEventSubscription } from '#core/editor/graph-events'

import { expectDefined } from '#tests/helpers/assert'

let ck: Awaited<ReturnType<typeof initCanvasKit>>

beforeAll(async () => {
  ck = await initCanvasKit()
})

const solid = (color: Color) => [{ type: 'SOLID' as const, color, opacity: 1, visible: true }]
const RED = { r: 1, g: 0, b: 0, a: 1 }
const BLUE = { r: 0, g: 0, b: 1, a: 1 }

function createFixture() {
  const graph = new SceneGraph()
  const page = expectDefined(graph.getPages()[0], 'page')
  const left = graph.createNode('FRAME', page.id, { x: 10, y: 10, width: 80, height: 80 })
  const right = graph.createNode('FRAME', page.id, { x: 110, y: 10, width: 80, height: 80 })
  const leftChild = graph.createNode('RECTANGLE', left.id, {
    x: 10,
    y: 10,
    width: 40,
    height: 40,
    fills: solid(RED)
  })
  const rightChild = graph.createNode('RECTANGLE', right.id, {
    x: 10,
    y: 10,
    width: 40,
    height: 40,
    fills: solid(BLUE)
  })
  return { graph, pageId: page.id, left, right, leftChild, rightChild }
}

function createRenderer(graph: SceneGraph, pageId: string) {
  const renderer = new SkiaRenderer(ck, expectDefined(ck.MakeSurface(200, 100), 'surface'))
  renderer.viewportWidth = 200
  renderer.viewportHeight = 100
  renderer.dpr = 1
  renderer.pageId = pageId
  renderer.pageColor = { r: 1, g: 1, b: 1, a: 1 }
  const events = createGraphEventSubscription({
    getGraph: () => graph,
    getRenderers: () => [renderer],
    scheduleComponentSync: () => undefined,
    requestRender: () => undefined,
    emitEditorEvent: () => undefined
  })
  events.subscribeToGraph()
  return { renderer, dispose: () => events.unsubscribeFromGraph() }
}

function settle(renderer: SkiaRenderer, graph: SceneGraph, sceneVersion: number) {
  for (let frame = 0; frame < 20; frame++) {
    renderer.sceneBackingPreviewUntil = 0
    renderer.render(graph, new Set(), {}, sceneVersion, 'scene')
    if (!renderer.sceneBackingNeedsCrispRender) break
  }
}

function pictures(renderer: SkiaRenderer) {
  return new Map([...renderer.subtreePictureCache].map(([id, entry]) => [id, entry.picture]))
}

function pixels(renderer: SkiaRenderer) {
  renderer.surface.flush()
  const image = renderer.surface.makeImageSnapshot()
  try {
    return expectDefined(
      image.readPixels(0, 0, {
        width: 200,
        height: 100,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'pixels'
    )
  } finally {
    image.delete()
  }
}

function expectMatchesFreshRender(graph: SceneGraph, pageId: string, actual: Uint8Array) {
  const fresh = createRenderer(graph, pageId)
  try {
    settle(fresh.renderer, graph, 1)
    const expected = pixels(fresh.renderer)
    const differing = actual.reduce(
      (count, value, index) => count + Number(value !== expected[index]),
      0
    )
    expect(differing).toBe(0)
  } finally {
    fresh.dispose()
    fresh.renderer.destroy()
  }
}

describe('retained subtree invalidation', () => {
  test('re-records only the top-level subtree containing an edited node', () => {
    const { graph, pageId, left, right, leftChild } = createFixture()
    const { renderer, dispose } = createRenderer(graph, pageId)
    try {
      settle(renderer, graph, 1)
      const before = pictures(renderer)
      expect(before.size).toBe(2)

      graph.updateNode(leftChild.id, { fills: solid(BLUE) })
      settle(renderer, graph, 2)
      const after = pictures(renderer)
      expect(after.get(right.id)).toBe(before.get(right.id))
      expect(after.get(left.id)).toBeDefined()
      expect(after.get(left.id)).not.toBe(before.get(left.id))
      expect(renderer.subtreePictureCache.get(right.id)?.sceneVersion).toBe(2)
      expectMatchesFreshRender(graph, pageId, pixels(renderer))
    } finally {
      dispose()
      renderer.destroy()
    }
  })

  test('reparenting and deletion re-record both affected subtrees', () => {
    const { graph, pageId, left, right, leftChild, rightChild } = createFixture()
    const { renderer, dispose } = createRenderer(graph, pageId)
    try {
      settle(renderer, graph, 1)
      const before = pictures(renderer)
      graph.reparentNode(leftChild.id, right.id)
      settle(renderer, graph, 2)
      const moved = pictures(renderer)
      expect(moved.get(left.id)).not.toBe(before.get(left.id))
      expect(moved.get(right.id)).not.toBe(before.get(right.id))
      expectMatchesFreshRender(graph, pageId, pixels(renderer))

      graph.deleteNode(rightChild.id)
      settle(renderer, graph, 3)
      const deleted = pictures(renderer)
      expect(deleted.get(left.id)).toBe(moved.get(left.id))
      expect(deleted.get(right.id)).not.toBe(moved.get(right.id))
      expectMatchesFreshRender(graph, pageId, pixels(renderer))
    } finally {
      dispose()
      renderer.destroy()
    }
  })

  test('versions without node events or with document-wide changes discard every picture', () => {
    const { graph, pageId, left, right, leftChild } = createFixture()
    const { renderer, dispose } = createRenderer(graph, pageId)
    try {
      settle(renderer, graph, 1)
      const initial = pictures(renderer)
      settle(renderer, graph, 2)
      const unattributed = pictures(renderer)
      expect(unattributed.get(left.id)).not.toBe(initial.get(left.id))
      expect(unattributed.get(right.id)).not.toBe(initial.get(right.id))

      graph.addCollection({
        id: 'colors',
        name: 'Colors',
        modes: [{ modeId: 'light', name: 'Light' }],
        defaultModeId: 'light',
        variableIds: []
      })
      graph.updateNode(leftChild.id, { opacity: 0.5 })
      settle(renderer, graph, 3)
      const global = pictures(renderer)
      expect(global.get(right.id)).not.toBe(unattributed.get(right.id))
    } finally {
      dispose()
      renderer.destroy()
    }
  })

  test('committed moves re-record only the moved subtree and match a fresh render', () => {
    const { graph, pageId, left, right } = createFixture()
    const { renderer, dispose } = createRenderer(graph, pageId)
    try {
      settle(renderer, graph, 1)
      const before = pictures(renderer)
      graph.updateNodePreview(left.id, { x: 20, y: 15 })
      settle(renderer, graph, 1)
      expectMatchesFreshRender(graph, pageId, pixels(renderer))
      graph.updateNode(left.id, { x: 30, y: 20 })
      settle(renderer, graph, 2)
      const after = pictures(renderer)
      expect(after.get(right.id)).toBe(before.get(right.id))
      expect(after.get(left.id)).not.toBe(before.get(left.id))
      expectMatchesFreshRender(graph, pageId, pixels(renderer))
    } finally {
      dispose()
      renderer.destroy()
    }
  })
})

describe('retained invalidation helpers', () => {
  test('resolves nested and missing nodes to top-level page children', () => {
    const { graph, pageId, left, right, leftChild } = createFixture()
    const other = graph.addPage('Other')
    const elsewhere = graph.createNode('RECTANGLE', other.id)
    expect(
      retainedTopLevelIds(graph, pageId, [leftChild.id, right.id, elsewhere.id, 'missing'])
    ).toEqual(new Set([left.id, right.id]))
  })

  test('fingerprint tracks variables, modes, images and color space', () => {
    const graph = new SceneGraph()
    const initial = retainedSceneFingerprint(graph)
    graph.addCollection({
      id: 'c',
      name: 'C',
      modes: [
        { modeId: 'a', name: 'A' },
        { modeId: 'b', name: 'B' }
      ],
      defaultModeId: 'a',
      variableIds: []
    })
    const withCollection = retainedSceneFingerprint(graph)
    expect(withCollection).not.toBe(initial)
    graph.addVariable({
      id: 'v',
      name: 'Primary',
      type: 'COLOR',
      collectionId: 'c',
      valuesByMode: { a: RED, b: BLUE },
      description: '',
      hiddenFromPublishing: false
    })
    const withVariable = retainedSceneFingerprint(graph)
    const variable = expectDefined(graph.variables.get('v'), 'variable')
    variable.valuesByMode.a = BLUE
    const edited = retainedSceneFingerprint(graph)
    expect(edited).not.toBe(withVariable)
    graph.setActiveMode('c', 'b')
    const moded = retainedSceneFingerprint(graph)
    expect(moded).not.toBe(edited)
    graph.images.set('hash', new Uint8Array([1]))
    const imaged = retainedSceneFingerprint(graph)
    expect(imaged).not.toBe(moded)
    graph.documentColorSpace = 'display-p3'
    expect(retainedSceneFingerprint(graph)).not.toBe(imaged)
  })
})
