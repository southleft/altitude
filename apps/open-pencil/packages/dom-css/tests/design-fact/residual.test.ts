import { describe, expect, test } from 'bun:test'

import { designFactFromAttrs, designFactFromNode, designFactToAttrs } from '#dom-css/design-fact'
import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { designDocumentToSceneGraph } from '#dom-css/to-scene-graph'

import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

describe('residual facts', () => {
  test('carries facts CSS cannot express', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Card',
      width: 10,
      height: 10,
      horizontalConstraint: 'STRETCH',
      counterAxisSizing: 'HUG',
      isMask: true,
      dashPattern: [3, 1]
    })

    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.name === 'Card')

    expect(out?.horizontalConstraint).toBe('STRETCH')
    expect(out?.counterAxisSizing).toBe('HUG')
    expect(out?.isMask).toBe(true)
    expect(out?.dashPattern).toEqual([3, 1])
  })

  /**
   * `JSON.stringify(new Map())` is `{}` — silent, not an error. This pins the tagged
   * encoding, because the failure mode is an attribute that looks correct while the
   * fact inside it has been destroyed.
   */
  test('Map-valued facts survive the attribute encoding', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const instance = graph.createNode('INSTANCE', page.id, {
      name: 'Chip',
      width: 10,
      height: 10,
      componentId: 'c1'
    })
    const collection = graph.createCollection('T')
    const v = graph.createVariable('color/x', 'COLOR', collection.id, { r: 1, g: 1, b: 1, a: 1 })
    // bindVariable populates instanceOverrides, which is built from nested Maps.
    graph.bindVariable(
      instance.id,
      'opacity',
      graph.createVariable('n/x', 'FLOAT', collection.id, 1).id
    )
    expect(graph.getNode(instance.id)?.instanceOverrides.self.size ?? 0).toBeGreaterThan(0)

    const created = graph.getNode(instance.id)
    expect(created).toBeDefined()
    const fact = designFactFromNode(graph, created as SceneNode)
    const attrs = designFactToAttrs(fact)
    expect(attrs['data-op-props']).toContain('__map__')

    const recovered = designFactFromAttrs(attrs)
    const overrides = recovered?.residual?.instanceOverrides as {
      self: Map<string, unknown>
    }
    expect(overrides.self).toBeInstanceOf(Map)
    expect(overrides.self.size).toBeGreaterThan(0)
    expect(v.id).toBeTruthy()
  })

  test('a CSS-expressible property is NOT carried as a residual fact', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const node = graph.createNode('FRAME', page.id, {
      name: 'Padded',
      width: 10,
      height: 10,
      paddingLeft: 12
    })

    const created = graph.getNode(node.id)
    expect(created).toBeDefined()
    const fact = designFactFromNode(graph, created as SceneNode)
    // padding-left is editable in the markup; carrying it would clobber that edit.
    expect(fact?.residual?.paddingLeft).toBeUndefined()
  })
})
