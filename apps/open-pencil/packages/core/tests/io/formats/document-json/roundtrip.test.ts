import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { isEqualWith } from 'es-toolkit'

import {
  decodeValue,
  encodeValue,
  readDocumentJSON,
  writeDocumentJSON,
  type DocumentJSONSnapshot
} from '@open-pencil/core/io/formats/document-json'
import { parseFigFile } from '@open-pencil/core/io/formats/fig'
import { populateAllLazyFigImportRoots } from '@open-pencil/core/kiwi'
import {
  SceneGraph,
  motionPluginData,
  setInstanceOverride,
  type SceneNode
} from '@open-pencil/scene-graph'

setDefaultTimeout(60_000)

const FIXTURES = resolve(import.meta.dir, '../../../../../../tests/fixtures')

function sourceFor(snapshot: DocumentJSONSnapshot) {
  const files = new Map(snapshot.files.map((file) => [file.path, file.bytes]))
  return {
    read(path: string) {
      const bytes = files.get(path)
      return bytes ? Promise.resolve(bytes) : Promise.reject(new Error(`Missing ${path}`))
    }
  }
}

function distinguishZero(first: unknown, second: unknown): boolean | undefined {
  return typeof first === 'number' && typeof second === 'number'
    ? Object.is(first, second)
    : undefined
}

function comparableNode(node: SceneNode): SceneNode {
  return { ...node, textPicture: null }
}

/** The scene-graph contract: everything a SceneGraph owns except runtime caches. */
function contract(graph: SceneGraph) {
  return {
    rootId: graph.rootId,
    // Node map order follows the file layout (tree order); membership is the contract.
    nodes: new Map(
      [...graph.nodes]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([id, node]) => [id, comparableNode(node)])
    ),
    images: graph.images,
    variables: graph.variables,
    variableCollections: graph.variableCollections,
    activeMode: graph.activeMode,
    documentColorSpace: graph.documentColorSpace,
    figKiwiVersion: graph.figKiwiVersion,
    figSchemaDeflated: graph.figSchemaDeflated,
    enabledLibraries: graph.enabledLibraries
    // instanceIndex is derived from componentId and rebuilt on load (tested below).
  }
}

async function expectLosslessRoundTrip(graph: SceneGraph, name: string) {
  const first = writeDocumentJSON(graph, { name })
  const loaded = await readDocumentJSON(sourceFor(first))
  expect(loaded.name).toBe(name)
  const actual = contract(loaded.graph)
  const expected = contract(graph)
  // isEqual first: a full toEqual over 40k nodes is slow; it only runs to explain a failure.
  if (!isEqualWith(actual, expected, distinguishZero)) expect(actual).toEqual(expected)
  for (const [id, node] of graph.nodes) {
    // toEqual ignores undefined-valued keys; the key sets must match exactly too.
    expect(Object.keys(comparableNode(loaded.graph.nodes.get(id) as SceneNode)).sort()).toEqual(
      Object.keys(comparableNode(node)).sort()
    )
  }
  const second = writeDocumentJSON(loaded.graph, { name })
  expect(second.files.map((file) => file.path)).toEqual(first.files.map((file) => file.path))
  for (const [index, file] of first.files.entries()) {
    expect(Buffer.from(second.files[index].bytes).equals(Buffer.from(file.bytes))).toBe(true)
  }
  return first
}

function syntheticGraph(): SceneGraph {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.updateNode(page.id, { name: 'Cover' })
  const second = graph.addPage('Components')
  graph.addPage('Cover')

  const collection = graph.createCollection('Theme')
  graph.addMode(collection.id, 'Dark')
  const color = graph.createVariable('brand', 'COLOR', collection.id, {
    r: 0.2,
    g: 0.4,
    b: 0.6,
    a: 1
  })
  graph.activeMode.set(collection.id, collection.modes[0].id)

  const component = graph.createNode('COMPONENT', second.id, {
    name: 'Button',
    width: 120,
    height: 40,
    layoutMode: 'HORIZONTAL',
    codeBinding: {
      tagName: 'al-button',
      package: '@southleft/al-web-components',
      props: [{ property: 'Size', attribute: 'size', type: 'enum', values: { Md: 'md' } }],
      slots: [{ slot: '', property: 'Label' }]
    }
  })
  graph.updateNode(component.id, {
    pluginData: motionPluginData(component, {
      version: 1,
      transitions: [{ id: 't1', trigger: 'hover', properties: ['opacity'], use: 'hover' }]
    }),
    boundVariables: { fills: color.id }
  })
  const label = graph.createNode('TEXT', component.id, { name: 'Label', text: 'Click' })
  const instance = graph.createInstance(component.id, page.id, { x: 200, name: 'Primary' })
  if (!instance) throw new Error('instance was not created')
  const instanceLabel = graph.getChildren(instance.id)[0]
  setInstanceOverride(instance.instanceOverrides, instance.id, instanceLabel.id, 'text', 'Go')
  graph.updateNode(instanceLabel.id, { text: 'Go' })

  const rect = graph.createNode('RECTANGLE', page.id, {
    name: '$special',
    rotation: -0,
    opacity: 0.5
  })
  ;(rect as unknown as Record<string, unknown>).pluginRelaunchData = []
  const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
  graph.images.set('abc123', image)
  graph.updateNode(rect.id, {
    fills: [{ type: 'IMAGE', imageHash: 'abc123', scaleMode: 'FILL', opacity: 1, visible: true }]
  } as Partial<SceneNode>)
  void label
  return graph
}

describe('document JSON codec', () => {
  test('encodes values plain JSON cannot hold and escapes $ keys', () => {
    const value = {
      bytes: new Uint8Array([1, 2, 255]),
      floats: new Float32Array([1.5, -2]),
      missing: undefined,
      nan: NaN,
      negativeZero: -0,
      infinite: -Infinity,
      big: 12n,
      map: new Map([['a', new Set([1, 2])]]),
      $bytes: 'not a tag',
      nested: [undefined, { $$weird: 1 }]
    }
    const roundTripped = decodeValue(JSON.parse(JSON.stringify(encodeValue(value))))
    expect(roundTripped).toEqual(value)
    expect(Object.is((roundTripped as typeof value).negativeZero, -0)).toBe(true)
    expect('missing' in (roundTripped as object)).toBe(true)
  })

  test('rejects class instances it cannot represent', () => {
    expect(() => encodeValue({ when: new (class Opaque {})() })).toThrow(/Opaque/)
  })
})

describe('document JSON round trip', () => {
  test('synthetic graph with components, instances, overrides, variables and motion', async () => {
    const graph = syntheticGraph()
    const snapshot = await expectLosslessRoundTrip(graph, 'Synthetic')
    expect(snapshot.files.map((file) => file.path)).toEqual([
      'document.json',
      'images/abc123.png',
      'pages/components.json',
      'pages/components.source.json',
      'pages/cover-2.json',
      'pages/cover-2.source.json',
      'pages/cover.json',
      'pages/cover.source.json',
      'styles.json',
      'styles.source.json',
      'variables.json'
    ])
    const cover = new TextDecoder().decode(
      snapshot.files.find((file) => file.path === 'pages/cover.json')?.bytes
    )
    expect(cover).toContain('  "nodes": [')
    expect(cover).toContain('"name": "$special"')
    expect(cover.endsWith('\n')).toBe(true)
  })

  test('writes the same bytes for the same graph', () => {
    const graph = syntheticGraph()
    const first = writeDocumentJSON(graph, { name: 'Twice' })
    const second = writeDocumentJSON(graph, { name: 'Twice' })
    expect(second).toEqual(first)
  })

  test('an edit changes only the file of the edited page', () => {
    const graph = syntheticGraph()
    const before = writeDocumentJSON(graph, { name: 'Doc' })
    const target = graph.getChildren(graph.getPages()[1].id)[0]
    graph.updateNode(target.id, { x: 999 })
    const after = writeDocumentJSON(graph, { name: 'Doc' })
    const changed = after.files
      .filter(
        (file, index) => !Buffer.from(file.bytes).equals(Buffer.from(before.files[index].bytes))
      )
      .map((file) => file.path)
    // The record and its provenance (source.editedFields now lists x) change; nothing else.
    expect(changed).toEqual(['pages/components.json', 'pages/components.source.json'])
  })

  for (const fixture of ['circle-text.fig', 'gold-preview.fig']) {
    test(`${fixture} survives load(save(graph))`, async () => {
      const bytes = readFileSync(resolve(FIXTURES, fixture))
      const graph = await parseFigFile(bytes.buffer.slice(0), { populate: 'all' })
      populateAllLazyFigImportRoots(graph)
      await expectLosslessRoundTrip(graph, fixture.replace(/\.fig$/, ''))
    })
  }
})

test('loading rebuilds the instance index from componentId', async () => {
  const graph = syntheticGraph()
  const loaded = await readDocumentJSON(sourceFor(writeDocumentJSON(graph, { name: 'Index' })))
  for (const node of loaded.graph.nodes.values()) {
    if (node.componentId) {
      expect(loaded.graph.instanceIndex.get(node.componentId)?.has(node.id)).toBe(true)
    }
  }
})
