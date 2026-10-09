import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { writeDocumentJSON } from '@open-pencil/core/io/formats/document-json'
import { computeAllLayouts } from '@open-pencil/core/layout'
import { createLibraryRevision, materializeLibraryAsset } from '@open-pencil/core/library'
import { SceneGraph, type Color, type SceneNode } from '@open-pencil/scene-graph'

import { arrangeLibraryPage, buildAltitudeLibrary, componentSetKey } from '../library/index'

/**
 * A small synthetic design change for the dry run: a "Checkout" document that places the
 * code-built Altitude Button, written as a base folder, then edited the way a designer
 * might — recoloured, re-spaced, one button detached, a non-Altitude component placed,
 * and the materialized Button set tampered with — and written as the head folder.
 */

const hex = (value: string): Color => ({
  r: Number.parseInt(value.slice(1, 3), 16) / 255,
  g: Number.parseInt(value.slice(3, 5), 16) / 255,
  b: Number.parseInt(value.slice(5, 7), 16) / 255,
  a: 1
})

const solid = (value: string) => [
  {
    type: 'SOLID' as const,
    color: hex(value),
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL' as const
  }
]

async function writeFolder(graph: SceneGraph, name: string, dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true })
  for (const file of writeDocumentJSON(graph, { name }).files) {
    const path = join(dir, ...file.path.split('/'))
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.bytes)
  }
}

function variant(graph: SceneGraph, setId: string, values: Record<string, string>): SceneNode {
  const variants = graph.getChildren(setId).filter((child) => child.type === 'COMPONENT')
  const match = variants.find((candidate) =>
    Object.entries(values).every(([key, value]) => candidate.componentPropertyValues[key] === value)
  )
  if (match) return match
  const first = variants.at(0)
  if (!first) throw new Error('Button set has no variants')
  return first
}

function text(
  graph: SceneGraph,
  parentId: string,
  name: string,
  content: string,
  overrides: Partial<SceneNode> = {}
) {
  return graph.createNode('TEXT', parentId, {
    name,
    text: content,
    fontFamily: 'Public Sans',
    fontSize: 16,
    lineHeight: 24,
    width: 280,
    height: 24,
    fills: solid('#1d1d1a'),
    ...overrides
  })
}

/** Write `<out>/base/documents/checkout` and `<out>/head/documents/checkout`. */
export async function writeSampleChange(altitudeRoot: string, out: string) {
  const library = await buildAltitudeLibrary(altitudeRoot, { only: ['al-button'] })
  computeAllLayouts(library.graph)
  arrangeLibraryPage(library.graph, library.pageId)
  const revision = await createLibraryRevision({
    libraryId: 'altitude',
    name: 'Altitude',
    graph: library.graph
  })
  const asset = revision.manifest.assets.find((item) => item.key === componentSetKey('al-button'))
  if (!asset) throw new Error('The Altitude library has no al-button asset')

  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.updateNode(page.id, { name: 'Checkout' })
  const { componentSetId } = materializeLibraryAsset(graph, revision, asset.key)
  if (!componentSetId) throw new Error('al-button did not materialize as a component set')

  const card = graph.createNode('FRAME', page.id, {
    name: 'Order summary',
    x: 0,
    y: 0,
    width: 360,
    height: 240,
    layoutMode: 'VERTICAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'FIXED',
    itemSpacing: 12,
    paddingTop: 24,
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    cornerRadius: 8,
    fills: solid('#ffffff'),
    strokes: [{ color: hex('#d5d3cc'), weight: 1, opacity: 1, visible: true, align: 'INSIDE' }]
  })
  text(graph, card.id, 'Title', 'Order summary', { fontSize: 20, lineHeight: 28, fontWeight: 600 })
  text(graph, card.id, 'Total', 'Total  $128.00')
  const actions = graph.createNode('FRAME', card.id, {
    name: 'Actions',
    layoutMode: 'HORIZONTAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    itemSpacing: 8,
    fills: []
  })
  const primary = graph.createInstance(
    variant(graph, componentSetId, {
      Variant: 'Primary',
      Size: 'Md',
      State: 'Default',
      Shape: 'Default'
    }).id,
    actions.id,
    { name: 'Button' }
  )
  const secondary = graph.createInstance(
    variant(graph, componentSetId, {
      Variant: 'Neutral',
      Size: 'Md',
      State: 'Default',
      Shape: 'Default'
    }).id,
    actions.id,
    { name: 'Button' }
  )
  if (!primary || !secondary) throw new Error('Could not place Button instances')
  computeAllLayouts(graph)
  await writeFolder(graph, 'Checkout', join(out, 'base', 'documents', 'checkout'))

  // The head: what a designer's branch might contain.
  graph.updateNode(card.id, { fills: solid('#2e5ce6'), paddingTop: 16, paddingBottom: 16 })
  const space = [...graph.variables.values()].find((item) => item.name === 'theme/space/md')
  if (space)
    graph.updateNode(card.id, { boundVariables: { ...card.boundVariables, itemSpacing: space.id } })
  graph.detachInstance(secondary.id)
  text(graph, card.id, 'Note', 'Free shipping over $100', {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20
  })
  const promo = graph.createNode('COMPONENT', page.id, {
    name: 'Promo tile',
    x: 420,
    y: 0,
    width: 200,
    height: 120,
    fills: solid('#f5eee0'),
    cornerRadius: 12
  })
  text(graph, promo.id, 'Label', 'Spring sale')
  const promoInstance = graph.createInstance(promo.id, card.id, { name: 'Promo tile' })
  if (!promoInstance) throw new Error('Could not place the promo tile')
  // A hand edit to the materialized Altitude Button: a size code value the element rejects,
  // and a fill no longer bound to its token.
  const set = graph.getNode(componentSetId)
  if (set?.codeBinding) {
    const props = set.codeBinding.props.map((prop) =>
      prop.attribute === 'size' && prop.values
        ? {
            ...prop,
            values: Object.fromEntries(
              Object.entries(prop.values).map(([k, v]) => [k, v === 'md' ? 'medium' : v])
            )
          }
        : prop
    )
    graph.updateNode(set.id, { codeBinding: { ...set.codeBinding, props } })
  }
  for (const child of graph.getChildren(componentSetId)) {
    const { 'fills/0/color': _removed, ...rest } = child.boundVariables
    graph.updateNode(child.id, { boundVariables: rest })
  }
  computeAllLayouts(graph)
  await writeFolder(graph, 'Checkout', join(out, 'head', 'documents', 'checkout'))
  return { base: join(out, 'base'), head: join(out, 'head') }
}
