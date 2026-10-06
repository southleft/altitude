import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import { populateAndApplyOverrides, type InstanceNodeChange } from '../src/instance-overrides'

const RED = { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true } as const
const BLUE = {
  type: 'SOLID',
  color: { r: 0, g: 0, b: 1, a: 1 },
  opacity: 1,
  visible: true
} as const

/** An instance child whose fill differs from its component source. */
function buildOverriddenClone(cloneFill: typeof RED | typeof BLUE = BLUE) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const component = graph.createNode('COMPONENT', pageId, { name: 'Button' })
  const source = graph.createNode('RECTANGLE', component.id, { fills: [RED] })
  const instance = graph.createNode('INSTANCE', pageId, { componentId: component.id })
  const clone = graph.createNode('RECTANGLE', instance.id, {
    componentId: source.id,
    fills: [cloneFill]
  })
  return { graph, clone }
}

const fillOf = (graph: SceneGraph, id: string) => graph.getNode(id)?.fills[0]?.color.b

/**
 * Source-change indexes are reused across lazy page populations. A kiwi change that
 * carries `fillPaints` protects the mapped clone's differing fill from propagation; these
 * tests pin that the reuse never answers with a stale mapping or stale graph state.
 */
describe('override context reuse across populations', () => {
  const changeMap = new Map<string, InstanceNodeChange>([['1:1', { fillPaints: [] }]])

  test('a different GUID mapping for the same change map is not served from the cache', () => {
    const mapped = buildOverriddenClone()
    populateAndApplyOverrides(mapped.graph, changeMap, new Map([['1:1', mapped.clone.id]]))
    expect(fillOf(mapped.graph, mapped.clone.id)).toBe(1)

    const unmapped = buildOverriddenClone()
    populateAndApplyOverrides(unmapped.graph, changeMap, new Map())
    expect(fillOf(unmapped.graph, unmapped.clone.id)).toBe(0)
  })

  test('a GUID mapping that grows between populations is re-indexed', () => {
    const { graph, clone } = buildOverriddenClone()
    const guidToNodeId = new Map<string, string>()
    populateAndApplyOverrides(graph, changeMap, guidToNodeId)
    expect(fillOf(graph, clone.id)).toBe(0)

    graph.updateNode(clone.id, { fills: [BLUE] })
    guidToNodeId.set('1:1', clone.id)
    populateAndApplyOverrides(graph, changeMap, guidToNodeId)
    expect(fillOf(graph, clone.id)).toBe(1)
  })

  test('protection is re-evaluated against the current graph on every population', () => {
    const { graph, clone } = buildOverriddenClone(RED)
    const guidToNodeId = new Map([['1:1', clone.id]])
    populateAndApplyOverrides(graph, changeMap, guidToNodeId)
    expect(fillOf(graph, clone.id)).toBe(0)

    // Same maps, but the clone now differs from its source: it must be protected.
    graph.updateNode(clone.id, { fills: [BLUE] })
    populateAndApplyOverrides(graph, changeMap, guidToNodeId)
    expect(fillOf(graph, clone.id)).toBe(1)
  })
})
