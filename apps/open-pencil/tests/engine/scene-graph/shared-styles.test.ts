import { describe, expect, test } from 'bun:test'

import { getSharedStyles, SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

function firstPageId(graph: SceneGraph): string {
  return graph.getPages()[0].id
}

function createStyle(graph: SceneGraph, name: string, sourceId: string, type: 'FILL' | 'TEXT') {
  const node = graph.createNode('RECTANGLE', firstPageId(graph), {
    name,
    sharedStyleType: type,
    internalOnly: true
  })
  graph.updateNode(node.id, { source: { ...node.source, id: sourceId, format: 'fig' } })
  return node
}

function names(graph: SceneGraph): string[] {
  return getSharedStyles(graph, 'fill').map((style) => style.name)
}

describe('shared style index', () => {
  test('returns the same sorted list until the catalog changes', () => {
    const graph = new SceneGraph()
    createStyle(graph, 'Brand/B', '1:2', 'FILL')
    createStyle(graph, 'Brand/A', '1:1', 'FILL')
    createStyle(graph, 'Heading', '1:3', 'TEXT')

    const first = getSharedStyles(graph, 'fill')
    expect(first.map((style) => style.name)).toEqual(['Brand/A', 'Brand/B'])
    expect(getSharedStyles(graph, 'stroke')).toBe(first)

    graph.createNode('RECTANGLE', firstPageId(graph), { name: 'Plain' })
    graph.updateNode(graph.getPages()[0].id, { opacity: 0.5 })
    expect(getSharedStyles(graph, 'fill')).toBe(first)
    expect(getSharedStyles(graph, 'text').map((style) => style.id)).toEqual(['1:3'])
  })

  test('tracks created, renamed, retyped and deleted definitions', () => {
    const graph = new SceneGraph()
    const a = createStyle(graph, 'A', '1:1', 'FILL')
    expect(names(graph)).toEqual(['A'])

    const b = createStyle(graph, 'B', '1:2', 'FILL')
    expect(names(graph)).toEqual(['A', 'B'])

    graph.updateNode(a.id, { name: 'C' })
    expect(names(graph)).toEqual(['B', 'C'])

    graph.updateNode(b.id, { sharedStyleType: 'TEXT' })
    expect(names(graph)).toEqual(['C'])
    expect(getSharedStyles(graph, 'text').map((style) => style.nodeId)).toEqual([b.id])

    graph.deleteNode(a.id)
    expect(names(graph)).toEqual([])
  })

  test('reads live source ids and rebuilds when the node map is replaced', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('RECTANGLE', firstPageId(graph), {
      name: 'Pending',
      sharedStyleType: 'FILL'
    })
    expect(names(graph)).toEqual([])
    node.source.id = '1:9'
    expect(getSharedStyles(graph, 'fill').map((style) => style.id)).toEqual(['1:9'])

    const replacement = new Map<string, SceneNode>(graph.nodes)
    const imported = structuredClone(node)
    imported.id = 'imported'
    imported.name = 'Imported'
    replacement.set(imported.id, imported)
    graph.nodes = replacement
    expect(names(graph)).toEqual(['Imported', 'Pending'])
  })
})
