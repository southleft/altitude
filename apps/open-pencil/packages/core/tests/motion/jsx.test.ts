import { describe, expect, test } from 'bun:test'

import { renderJSX } from '@open-pencil/core'
import { SceneGraph, readMotionSpec } from '@open-pencil/scene-graph'

describe('motion in design JSX', () => {
  test('a component set accepts motion transitions', async () => {
    const graph = new SceneGraph()
    await renderJSX(
      graph,
      `<ComponentSet name="Button" motion={[{ trigger: 'hover', to: { State: 'Hover' }, use: 'hover', properties: ['background-color'] }]}>
        <Component name="State=Default" w={120} h={40} bg="#2563eb" />
        <Component name="State=Hover" w={120} h={40} bg="#1d4ed8" />
      </ComponentSet>`
    )
    const set = [...graph.nodes.values()].find((node) => node.type === 'COMPONENT_SET')
    expect(set && readMotionSpec(set)?.transitions).toEqual([
      {
        id: 'transition-1',
        trigger: 'hover',
        to: { State: 'Hover' },
        use: 'hover',
        properties: ['background-color']
      }
    ])
  })

  test('rejects motion on nodes that cannot carry it', async () => {
    const graph = new SceneGraph()
    await expect(
      renderJSX(graph, `<Rectangle w={10} h={10} motion={[{ trigger: 'hover' }]} />`)
    ).rejects.toThrow('accept motion')
  })
})
