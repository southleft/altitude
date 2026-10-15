import { afterEach, describe, expect, setDefaultTimeout, test } from 'bun:test'

import {
  createFigExportMirror,
  exportFigFile,
  type FigExportMirror
} from '@open-pencil/core/io/formats/fig'
import { setLazyFigImportContext } from '@open-pencil/core/kiwi/fig/lazy-import'
import { parseFigBuffer } from '@open-pencil/fig'
import { SceneGraph } from '@open-pencil/scene-graph'

setDefaultTimeout(60_000)

let mirror: FigExportMirror | null = null
let workersCreated = 0

function createWorker() {
  workersCreated++
  return new Worker(
    new URL('../../../../../packages/core/src/io/formats/fig/mirror/worker.ts', import.meta.url),
    { type: 'module' }
  )
}

afterEach(() => {
  mirror?.dispose()
  mirror = null
  workersCreated = 0
})

function sampleGraph() {
  const graph = new SceneGraph()
  const cover = graph.getPages()[0]
  const components = graph.addPage('Components')
  const button = graph.createNode('COMPONENT', components.id, { name: 'Button', width: 120 })
  graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go' })
  graph.createInstance(button.id, cover.id, { name: 'Hero button' })
  const card = graph.createNode('FRAME', cover.id, { name: 'Card', width: 300, height: 200 })
  graph.createNode('RECTANGLE', card.id, { name: 'Media', width: 300, height: 120 })
  graph.createNode('ELLIPSE', card.id, { name: 'Badge', width: 24, height: 24 })
  graph.images.set('f'.repeat(40), new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]))
  return { graph, cover, card, button }
}

/** The decoded document, without the archive metadata (which carries a timestamp). */
function decoded(bytes: Uint8Array) {
  const parsed = parseFigBuffer(bytes.slice().buffer)
  return { nodeChanges: parsed.nodeChanges, blobs: parsed.blobs, images: [...parsed.images] }
}

async function expectSameExport(graph: SceneGraph, pageId: string) {
  const expected = await exportFigFile(graph, undefined, undefined, pageId)
  if (!mirror) throw new Error('mirror not created')
  const actual = await mirror.exportFigFile(graph, pageId)
  expect(decoded(actual)).toEqual(decoded(expected))
}

describe('fig export mirror', () => {
  test('a worker mirror exports the same document as the main thread, after edits too', async () => {
    const { graph, cover, card, button } = sampleGraph()
    mirror = createFigExportMirror({ mode: 'worker', createWorker })
    await expectSameExport(graph, cover.id)

    // Rename, reparent, reorder, delete a subtree, add nodes and an image.
    graph.updateNode(card.id, { name: 'Renamed card', opacity: 0.5 })
    const media = graph.getChildren(card.id)[0]
    graph.reparentNode(media.id, cover.id)
    graph.createNode('TEXT', cover.id, { name: 'Caption', text: 'Hello' })
    graph.deleteNode(card.id)
    graph.createInstance(button.id, cover.id, { name: 'Second button' })
    graph.images.set('e'.repeat(40), new Uint8Array([0x89, 0x50, 0x4e, 0x47, 9]))
    await expectSameExport(graph, cover.id)

    graph.images.delete('f'.repeat(40))
    graph.updateNode(cover.id, { name: 'Cover' })
    await expectSameExport(graph, cover.id)
    // Later exports send changes to the same worker.
    expect(workersCreated).toBe(1)
  })

  test('populates lazily imported pages in the worker like the main-thread export', async () => {
    const graph = new SceneGraph()
    const firstPage = graph.getPages()[0]
    const secondPage = graph.addPage('Second')
    const component = graph.createNode('COMPONENT', firstPage.id, { name: 'Button' })
    graph.createNode('TEXT', component.id, { text: 'Label' })
    graph.createNode('INSTANCE', secondPage.id, {
      name: 'Button instance',
      componentId: component.id
    })
    setLazyFigImportContext(graph, {
      changeMap: new Map(),
      guidToNodeId: new Map(),
      blobs: [],
      populatedRootIds: new Set([firstPage.id])
    })
    mirror = createFigExportMirror({ mode: 'worker', createWorker })
    await expectSameExport(graph, firstPage.id)
    // The export populated a copy; the graph itself is untouched.
    expect(graph.getChildren(graph.getChildren(secondPage.id)[0].id)).toHaveLength(0)
  })

  test('a new graph starts a new mirror instead of mixing documents', async () => {
    mirror = createFigExportMirror({ mode: 'worker', createWorker })
    const first = sampleGraph()
    await expectSameExport(first.graph, first.cover.id)
    const second = new SceneGraph()
    second.createNode('RECTANGLE', second.getPages()[0].id, { name: 'Only' })
    await expectSameExport(second, second.getPages()[0].id)
    expect(workersCreated).toBe(2)
  })
})
