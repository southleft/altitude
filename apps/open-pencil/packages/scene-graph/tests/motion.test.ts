import { describe, expect, test } from 'bun:test'

import {
  MOTION_SPEC_VERSION,
  SceneGraph,
  cloneNodeProps,
  motionPluginData,
  parseMotionSpec,
  readMotionSpec,
  type MotionSpec
} from '@open-pencil/scene-graph'

const spec: MotionSpec = {
  version: MOTION_SPEC_VERSION,
  transitions: [
    {
      id: 'hover',
      trigger: 'hover',
      from: { State: 'Default' },
      to: { State: 'Hover' },
      use: 'hover',
      properties: ['background-color', 'color']
    },
    {
      id: 'open',
      trigger: 'enter',
      properties: ['opacity'],
      duration: { variableId: 'var:slow' },
      easing: { cubicBezier: [0.34, 1.56, 0.64, 1] },
      delay: 40
    }
  ]
}

describe('motion spec model', () => {
  test('stores, reads and clears a spec through plugin data', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const set = graph.createNode('COMPONENT_SET', page.id, { name: 'Button' })
    graph.updateNode(set.id, { pluginData: motionPluginData(set, spec) })
    expect(readMotionSpec(graph.getNode(set.id) ?? set)).toEqual(spec)

    const node = graph.getNode(set.id) ?? set
    graph.updateNode(set.id, { pluginData: motionPluginData(node, null) })
    expect(readMotionSpec(graph.getNode(set.id) ?? set)).toBeNull()
  })

  test('keeps unrelated plugin data and travels with node copies', () => {
    const graph = new SceneGraph()
    const set = graph.createNode('COMPONENT_SET', graph.getPages()[0].id, {
      pluginData: [{ pluginId: 'other', key: 'k', value: 'v' }]
    })
    const pluginData = motionPluginData(set, spec)
    expect(pluginData[0]).toEqual({ pluginId: 'other', key: 'k', value: 'v' })
    graph.updateNode(set.id, { pluginData })
    const copy = cloneNodeProps(graph.getNode(set.id) ?? set)
    expect(readMotionSpec(copy)).toEqual(spec)
  })

  test('drops invalid fields from untrusted JSON instead of casting them', () => {
    expect(
      parseMotionSpec({
        transitions: [
          { trigger: 'wiggle', properties: ['opacity'] },
          {
            trigger: 'hover',
            properties: ['opacity', 'left', 'opacity'],
            use: 'teleport',
            duration: { ms: -5 },
            easing: { cubicBezier: [2, 0, 0, 1] },
            from: { State: 3, Size: 'L' }
          },
          { trigger: 'press' }
        ]
      })
    ).toEqual({
      version: MOTION_SPEC_VERSION,
      transitions: [
        { id: 'transition-2', trigger: 'hover', properties: ['opacity'], from: { Size: 'L' } },
        { id: 'transition-3', trigger: 'press', properties: ['all'] }
      ]
    })
    expect(parseMotionSpec({ transitions: [] })).toBeNull()
    expect(
      readMotionSpec({ pluginData: [{ pluginId: 'open-pencil', key: 'motion', value: '{' }] })
    ).toBeNull()
  })
})
