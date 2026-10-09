import { describe, expect, test } from 'bun:test'

import {
  getLazyFigImportContext,
  populateAllLazyFigImportRoots,
  populateLazyFigImportRoots,
  setLazyFigImportContext
} from '@open-pencil/core/kiwi/fig/lazy-import'
import { planLazyPopulationRoots } from '@open-pencil/core/kiwi/fig/population/roots'
import { SceneGraph } from '@open-pencil/scene-graph'

function createLazyGraph() {
  const graph = new SceneGraph()
  const [page1] = graph.getPages()
  const page2 = graph.addPage('Page 2')
  const component = graph.createNode('COMPONENT', page1.id, {
    name: 'Button',
    width: 100,
    height: 40
  })
  graph.createNode('RECTANGLE', component.id, {
    name: 'Background',
    width: 100,
    height: 40
  })
  const page1Instance = graph.createNode('INSTANCE', page1.id, {
    name: 'Button instance 1',
    componentId: component.id,
    width: 100,
    height: 40
  })
  const page2Instance = graph.createNode('INSTANCE', page2.id, {
    name: 'Button instance 2',
    componentId: component.id,
    width: 100,
    height: 40
  })

  setLazyFigImportContext(graph, {
    changeMap: new Map(),
    guidToNodeId: new Map(),
    blobs: [],
    populatedRootIds: new Set([page1.id])
  })

  return { graph, page1, page2, page1Instance, page2Instance }
}

describe('lazy .fig page population', () => {
  test('populates an unvisited page once', () => {
    const { graph, page2, page1Instance, page2Instance } = createLazyGraph()

    expect(graph.getChildren(page1Instance.id)).toHaveLength(0)
    expect(graph.getChildren(page2Instance.id)).toHaveLength(0)

    expect(populateLazyFigImportRoots(graph, [page2.id])).toBe(true)
    expect(graph.getChildren(page1Instance.id)).toHaveLength(0)
    expect(graph.getChildren(page2Instance.id)).toHaveLength(1)

    const nodeCount = graph.nodes.size
    expect(populateLazyFigImportRoots(graph, [page2.id])).toBe(false)
    expect(graph.nodes.size).toBe(nodeCount)
  })

  test('can populate all remaining pages before full-document operations', () => {
    const { graph, page1Instance, page2Instance } = createLazyGraph()

    expect(populateAllLazyFigImportRoots(graph)).toBe(true)
    expect(graph.getChildren(page1Instance.id)).toHaveLength(1)
    expect(graph.getChildren(page2Instance.id)).toHaveLength(1)
    expect(populateAllLazyFigImportRoots(graph)).toBe(false)
  })

  test('plans only the pages holding components a page depends on', () => {
    const graph = new SceneGraph()
    const [page1] = graph.getPages()
    const page2 = graph.addPage('Components')
    const page3 = graph.addPage('Other components')
    const page4 = graph.addPage('Nested')
    const nested = graph.createNode('COMPONENT', page4.id, { name: 'Icon' })
    graph.createNode('RECTANGLE', nested.id, { name: 'Glyph' })
    const button = graph.createNode('COMPONENT', page2.id, { name: 'Button' })
    graph.createNode('INSTANCE', button.id, { name: 'Icon', componentId: nested.id })
    graph.createNode('COMPONENT', page3.id, { name: 'Unused' })
    graph.createNode('INSTANCE', page1.id, { name: 'Button', componentId: button.id })
    const source = { changeMap: new Map(), guidToNodeId: new Map() }

    expect(
      planLazyPopulationRoots(graph, { ...source, populatedRootIds: new Set() }, [page1.id])
    ).toEqual([page1.id, page2.id, page4.id])
    expect(
      planLazyPopulationRoots(graph, { ...source, populatedRootIds: new Set([page4.id]) }, [
        page1.id
      ])
    ).toEqual([page1.id, page2.id])
    expect(
      planLazyPopulationRoots(graph, { ...source, populatedRootIds: new Set([page1.id]) }, [
        page1.id
      ])
    ).toEqual([])
  })

  test('populates the component pages a visited page needs in the same pass', () => {
    const graph = new SceneGraph()
    const [page1] = graph.getPages()
    const page2 = graph.addPage('Components')
    const page3 = graph.addPage('Usage')
    const component = graph.createNode('COMPONENT', page2.id, { name: 'Card' })
    const icon = graph.createNode('COMPONENT', page2.id, { name: 'Icon' })
    graph.createNode('RECTANGLE', icon.id, { name: 'Glyph' })
    const nestedInstance = graph.createNode('INSTANCE', component.id, {
      name: 'Icon',
      componentId: icon.id
    })
    const usage = graph.createNode('INSTANCE', page3.id, {
      name: 'Card',
      componentId: component.id
    })
    setLazyFigImportContext(graph, {
      changeMap: new Map(),
      guidToNodeId: new Map(),
      blobs: [],
      populatedRootIds: new Set([page1.id])
    })

    expect(populateLazyFigImportRoots(graph, [page3.id])).toBe(true)
    expect(graph.getChildren(nestedInstance.id)).toHaveLength(1)
    expect(graph.getChildren(usage.id)).toHaveLength(1)
    expect(getLazyFigImportContext(graph)?.populatedRootIds).toEqual(
      new Set([page1.id, page2.id, page3.id])
    )
  })
})
