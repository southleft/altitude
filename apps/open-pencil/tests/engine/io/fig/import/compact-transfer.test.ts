import { describe, expect, test } from 'bun:test'

import { importNodeChanges } from '@open-pencil/core/kiwi/fig/import'
import {
  compactSceneNodeChunks,
  deserializeSceneGraph,
  receiveCompactSceneNodes,
  serializeSceneGraph
} from '@open-pencil/core/kiwi/fig/parse/transfer'
import { parseFigBuffer } from '@open-pencil/fig'
import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

import { readFigFixture } from '#tests/helpers/fig-fixtures'

/** The graph as the session reader rebuilds it from streamed compact chunks. */
function streamGraph(graph: SceneGraph, chunkSize: number): SceneGraph {
  const nodes = new Map<string, SceneNode>()
  for (const chunk of compactSceneNodeChunks(graph, chunkSize)) {
    receiveCompactSceneNodes(structuredClone(chunk), nodes)
  }
  return deserializeSceneGraph(
    structuredClone(serializeSceneGraph(graph, { omitNodes: true })),
    nodes
  )
}

/** The graph as a full structured clone of every node rebuilds it. */
function cloneGraph(graph: SceneGraph): SceneGraph {
  return deserializeSceneGraph(structuredClone(serializeSceneGraph(graph)))
}

function expectSameNodes(actual: SceneGraph, expected: SceneGraph): void {
  expect([...actual.nodes.keys()]).toEqual([...expected.nodes.keys()])
  for (const [id, node] of expected.nodes) {
    const streamed = actual.nodes.get(id)
    expect(streamed && Object.keys(streamed)).toEqual(Object.keys(node))
    expect({ ...streamed }).toEqual({ ...node })
  }
}

describe('compact .fig graph transfer', () => {
  test('rebuilds edited, extended, and incomplete nodes exactly', () => {
    const graph = new SceneGraph()
    const [page] = graph.getPages()
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Card',
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
      cornerRadius: -0,
      opacity: Number.NaN
    })
    graph.createNode('TEXT', frame.id, { text: 'Label', fontSize: 12 })
    const text = graph.createNode('TEXT', frame.id, { text: 'Default fills' })
    graph.updateNode(text.id, { fills: [] })
    const extended = graph.createNode('RECTANGLE', page.id, { name: 'Extended' })
    Object.assign(extended, { booleanOperation: undefined })
    extended.source.fig.rawNodeFields = { strokeWeight: 2 }
    extended.source.id = '1:2'
    const incomplete = graph.createNode('ELLIPSE', page.id)
    Reflect.deleteProperty(incomplete, 'arcData')
    Reflect.deleteProperty(incomplete.source.fig, 'layout')

    for (const size of [1, 2, 100]) expectSameNodes(streamGraph(graph, size), cloneGraph(graph))
  })

  const fixture = readFigFixture('tests/fixtures/circle-text.fig')
  const describeWithFixture = fixture ? test : test.skip
  describeWithFixture('rebuilds an imported document exactly', () => {
    if (!fixture) throw new Error('circle-text.fig fixture unavailable')
    const { nodeChanges, blobs, images } = parseFigBuffer(fixture)
    const graph = importNodeChanges(nodeChanges, blobs, new Map(images), { populate: 'first-page' })
    expectSameNodes(streamGraph(graph, 3), cloneGraph(graph))
  })
})
