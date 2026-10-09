import { describe, expect, test } from 'bun:test'

import {
  diffDocuments,
  readDocumentJSON,
  writeDocumentJSON
} from '@open-pencil/core/io/formats/document-json'
import { SceneGraph } from '@open-pencil/scene-graph'

const red = { r: 1, g: 0, b: 0, a: 1 }
const blue = { r: 0, g: 0, b: 1, a: 1 }

/** Write and read back, as a commit and a checkout would. */
async function committed(graph: SceneGraph): Promise<SceneGraph> {
  const files = new Map(
    writeDocumentJSON(graph, { name: 'Doc' }).files.map((f) => [f.path, f.bytes])
  )
  const { graph: read } = await readDocumentJSON({
    read: (path) => {
      const bytes = files.get(path)
      return bytes ? Promise.resolve(bytes) : Promise.reject(new Error(`Missing ${path}`))
    }
  })
  return read
}

function fixture() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.updateNode(page.id, { name: 'Home' })
  const collection = graph.createCollection('Colors')
  const variable = graph.createVariable('brand/primary', 'COLOR', collection.id, blue)
  const component = graph.createNode('COMPONENT', page.id, { name: 'Chip', width: 80, height: 24 })
  const card = graph.createNode('FRAME', page.id, {
    name: 'Card',
    width: 200,
    height: 100,
    fills: [{ type: 'SOLID', color: red, opacity: 1, visible: true }]
  })
  const title = graph.createNode('TEXT', card.id, { name: 'Title', text: 'Hello' })
  const chip = graph.createInstance(component.id, card.id, { name: 'Chip' })
  const gone = graph.createNode('RECTANGLE', card.id, { name: 'Divider' })
  if (!chip) throw new Error('instance')
  return { graph, page, variable, component, card, title, chip, gone }
}

function onlyPage(diff: ReturnType<typeof diffDocuments>) {
  const [page] = diff.pages
  if (!page) throw new Error('no page diff')
  return page
}

describe('diffDocuments', () => {
  test('an unchanged document reports no changes', async () => {
    const { graph } = fixture()
    const base = await committed(graph)
    const head = await committed(graph)
    const diff = diffDocuments(base, head)
    expect(diff.changed).toBe(false)
    expect(diff.pages).toEqual([])
  })

  test('reports added, removed and changed nodes with their properties', async () => {
    const { graph, card, title, gone } = fixture()
    const base = await committed(graph)
    graph.updateNode(title.id, { text: 'Hello there' })
    graph.updateNode(card.id, { cornerRadius: 8 })
    graph.deleteNode(gone.id)
    const badge = graph.createNode('FRAME', card.id, { name: 'Badge' })
    graph.createNode('TEXT', badge.id, { name: 'Label', text: 'New' })
    const diff = diffDocuments(base, await committed(graph))

    const page = onlyPage(diff)
    expect(page.name).toBe('Home')
    expect(page.status).toBe('changed')
    expect(page.nodes.added.map((node) => node.path)).toEqual([['Card', 'Badge']])
    expect(page.nodes.addedCount).toBe(2)
    expect(page.nodes.removed.map((node) => node.name)).toEqual(['Divider'])
    const titleChange = page.nodes.changed.find((node) => node.id === title.id)
    expect(titleChange?.changes).toContainEqual({
      field: 'text',
      before: 'Hello',
      after: 'Hello there'
    })
    const cardChange = page.nodes.changed.find((node) => node.id === card.id)
    expect(cardChange?.changes.map((change) => change.field)).toContain('cornerRadius')
    expect(diff.summary).toMatchObject({ nodesAdded: 2, nodesRemoved: 1 })
  })

  test('reports token bindings by variable name', async () => {
    const { graph, card, variable } = fixture()
    graph.updateNode(card.id, { boundVariables: { 'fills/0/color': variable.id } })
    const base = await committed(graph)
    graph.updateNode(card.id, { boundVariables: { itemSpacing: variable.id } })
    const page = onlyPage(diffDocuments(base, await committed(graph)))
    expect(page.tokenBindings.added).toMatchObject([
      { id: card.id, field: 'itemSpacing', variable: 'brand/primary' }
    ])
    expect(page.tokenBindings.removed).toMatchObject([
      { id: card.id, field: 'fills/0/color', variable: 'brand/primary' }
    ])
  })

  test('reports placed, removed and detached instances', async () => {
    const { graph, card, component, chip } = fixture()
    const base = await committed(graph)
    graph.detachInstance(chip.id)
    const placed = graph.createInstance(component.id, card.id, { name: 'Chip 2' })
    const diff = diffDocuments(base, await committed(graph))
    const page = onlyPage(diff)
    expect(page.instances.detached.map((node) => node.id)).toEqual([chip.id])
    expect(page.instances.detached[0]?.component).toBe('Chip')
    expect(page.instances.added.map((node) => node.id)).toEqual([placed?.id])
    const detached = page.nodes.changed.find((node) => node.id === chip.id)
    expect(detached?.typeBefore).toBe('INSTANCE')
    expect(detached?.type).toBe('FRAME')
  })

  test('reports changed components and added or removed pages', async () => {
    const { graph, component } = fixture()
    const base = await committed(graph)
    graph.updateNode(component.id, { width: 96 })
    graph.addPage('Notes')
    const diff = diffDocuments(base, await committed(graph))
    expect(diff.pages.map((page) => [page.name, page.status])).toEqual([
      ['Home', 'changed'],
      ['Notes', 'added']
    ])
    expect(diff.pages[0]?.changedComponents).toEqual([component.id])
    expect(diffDocuments(await committed(graph), base).pages.at(-1)?.status).toBe('removed')
  })

  test('treats a missing side as an added or deleted document', async () => {
    const { graph } = fixture()
    const head = await committed(graph)
    expect(diffDocuments(null, head).summary.pagesAdded).toBe(1)
    expect(diffDocuments(head, null).summary.pagesRemoved).toBe(1)
  })

  test('is deterministic', async () => {
    const { graph, title } = fixture()
    const base = await committed(graph)
    graph.updateNode(title.id, { fontSize: 20 })
    const head = await committed(graph)
    expect(JSON.stringify(diffDocuments(base, head))).toBe(
      JSON.stringify(diffDocuments(await committed(await committed(base)), head))
    )
  })
})
