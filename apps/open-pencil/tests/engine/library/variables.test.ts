import { describe, expect, test } from 'bun:test'

import {
  createLibraryRevision,
  extractLibrarySnapshot,
  materializeLibraryAsset
} from '@open-pencil/core/library'
import { SceneGraph } from '@open-pencil/scene-graph'

function boundLibrary() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const collection = graph.createCollection('Theme')
  const base = graph.createVariable('color/blue/500', 'COLOR', collection.id, {
    r: 0,
    g: 0,
    b: 1,
    a: 1
  })
  const primary = graph.createVariable('color/primary', 'COLOR', collection.id, {
    aliasId: base.id
  })
  graph.createVariable('color/unused', 'COLOR', collection.id, { r: 1, g: 0, b: 0, a: 1 })
  const button = graph.createNode('COMPONENT', page.id, {
    name: 'Button',
    componentKey: 'button',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  graph.bindVariable(button.id, 'fills/0/color', primary.id)
  return { graph, collection, base, primary, button }
}

describe('library revisions carry the variables their components bind', () => {
  test('the snapshot includes bound variables and their alias targets, nothing else', () => {
    const { graph, collection, base, primary } = boundLibrary()
    const snapshot = extractLibrarySnapshot(graph)
    expect([...snapshot.graph.variables.keys()].sort()).toEqual([base.id, primary.id].sort())
    expect(snapshot.graph.variableCollections.get(collection.id)?.variableIds.sort()).toEqual(
      [base.id, primary.id].sort()
    )
    expect(snapshot.graph.resolveColorVariable(primary.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  })

  test("materializing an asset adds missing variables and keeps the consumer's own", async () => {
    const { graph, base, primary } = boundLibrary()
    const revision = await createLibraryRevision({ libraryId: 'ds', name: 'DS', graph })
    const consumer = new SceneGraph()
    const own = consumer.createCollection('Theme')
    consumer.addVariable({
      ...structuredClone(base),
      collectionId: own.id,
      valuesByMode: { [own.defaultModeId]: { r: 1, g: 1, b: 0, a: 1 } }
    })
    materializeLibraryAsset(consumer, revision, 'button')
    expect(consumer.variables.get(primary.id)?.name).toBe('color/primary')
    expect(consumer.variables.get(base.id)?.collectionId).toBe(own.id)
  })
})
