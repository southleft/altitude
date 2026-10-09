import { describe, expect, test } from 'bun:test'

import {
  DOCUMENT_JSON_BASE_VERSION,
  DOCUMENT_JSON_PARTS_VERSION,
  MANIFEST_PATH,
  pageFilePath,
  pagePartPath,
  parseDocumentJSONManifest,
  readDocumentJSON,
  writeDocumentJSON,
  writeDocumentJSONOffThread,
  type DocumentJSONSnapshot
} from '@open-pencil/core/io/formats/document-json'
import { SceneGraph } from '@open-pencil/scene-graph'

const MAX = 6 * 1024

function largeGraph(): SceneGraph {
  const graph = new SceneGraph()
  const cover = graph.getPages()[0]
  graph.updateNode(cover.id, { name: 'Cover' })
  const small = graph.addPage('Small')
  graph.createNode('RECTANGLE', small.id, { name: 'Only' })
  for (let index = 0; index < 120; index++) {
    const frame = graph.createNode('FRAME', cover.id, { name: `Frame ${index}`, width: index })
    graph.updateNode(frame.id, {
      source: {
        ...frame.source,
        format: 'fig',
        id: `1:${index}`,
        fig: { ...frame.source.fig, rawNodeFields: { note: 'x'.repeat(200 + index) } }
      }
    })
    graph.createNode('TEXT', frame.id, { name: `Label ${index}`, text: `Label ${index}` })
  }
  return graph
}

function sourceFor(snapshot: DocumentJSONSnapshot) {
  const files = new Map(snapshot.files.map((file) => [file.path, file.bytes]))
  return {
    read(path: string) {
      const bytes = files.get(path)
      return bytes ? Promise.resolve(bytes) : Promise.reject(new Error(`Missing ${path}`))
    }
  }
}

function manifestOf(snapshot: DocumentJSONSnapshot) {
  const file = snapshot.files.find((candidate) => candidate.path === MANIFEST_PATH)
  if (!file) throw new Error('no manifest')
  return parseDocumentJSONManifest(file.bytes)
}

function texts(snapshot: DocumentJSONSnapshot) {
  const decoder = new TextDecoder()
  return snapshot.files.map((file) => [file.path, decoder.decode(file.bytes)])
}

describe('oversized pages', () => {
  test('part paths map back to their page file', () => {
    expect(pagePartPath('pages/cover.json', 2)).toBe('pages/cover.part-2.json')
    expect(pageFilePath('pages/cover.part-3.source.json')).toBe('pages/cover.json')
    expect(pageFilePath('pages/cover.source.json')).toBe('pages/cover.json')
    expect(pageFilePath('pages/cover.json')).toBe('pages/cover.json')
    expect(pageFilePath('images/abc.png')).toBe('images/abc.png')
  })

  test('a page over the limit is split into parts that each fit, and reads back whole', async () => {
    const graph = largeGraph()
    const snapshot = writeDocumentJSON(graph, { name: 'Large', maxFileBytes: MAX })
    const manifest = manifestOf(snapshot)
    expect(manifest.version).toBe(DOCUMENT_JSON_PARTS_VERSION)
    const cover = manifest.pages.find((page) => page.name === 'Cover')
    const small = manifest.pages.find((page) => page.name === 'Small')
    expect(cover?.parts?.length).toBeGreaterThan(1)
    expect(small?.parts).toBeUndefined()
    expect(cover?.parts?.[0]).toEqual({
      path: 'pages/cover.part-2.json',
      source: 'pages/cover.part-2.source.json'
    })
    for (const file of snapshot.files) {
      if (file.path.startsWith('pages/cover'))
        expect(file.bytes.byteLength).toBeLessThanOrEqual(MAX)
    }
    expect(snapshot.pages.find((page) => page.name === 'Cover')?.parts).toEqual(cover?.parts)

    const { graph: read } = await readDocumentJSON(sourceFor(snapshot))
    // Reading and writing again without a limit matches writing the original without one.
    expect(texts(writeDocumentJSON(read, { name: 'Large' }))).toEqual(
      texts(writeDocumentJSON(graph, { name: 'Large' }))
    )
  })

  test('splitting is deterministic and matches through the worker', async () => {
    const graph = largeGraph()
    const first = writeDocumentJSON(graph, { name: 'Large', maxFileBytes: MAX })
    const second = writeDocumentJSON(graph, { name: 'Large', maxFileBytes: MAX })
    expect(texts(second)).toEqual(texts(first))
    const worker = await writeDocumentJSONOffThread(graph, {
      name: 'Large',
      maxFileBytes: MAX,
      mode: 'worker'
    })
    expect(texts(worker)).toEqual(texts(first))
  })

  test('documents within the limit keep the base version and no parts', () => {
    const snapshot = writeDocumentJSON(largeGraph(), { name: 'Large' })
    const manifest = manifestOf(snapshot)
    expect(manifest.version).toBe(DOCUMENT_JSON_BASE_VERSION)
    expect(manifest.pages.every((page) => page.parts === undefined)).toBe(true)
    expect(snapshot.files.some((file) => file.path.includes('.part-'))).toBe(false)
  })
})
