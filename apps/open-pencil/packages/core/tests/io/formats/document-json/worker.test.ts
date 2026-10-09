import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  DocumentJSONSnapshotStaleError,
  gitBlobSHA,
  graphFromDocumentJSONSnapshot,
  snapshotDocumentJSONGraph,
  writeDocumentJSON,
  writeDocumentJSONOffThread,
  type DocumentJSONSnapshot
} from '@open-pencil/core/io/formats/document-json'
import { parseFigFile } from '@open-pencil/core/io/formats/fig'
import { populateAllLazyFigImportRoots } from '@open-pencil/core/kiwi'
import { SceneGraph } from '@open-pencil/scene-graph'

setDefaultTimeout(120_000)

const FIXTURES = resolve(import.meta.dir, '../../../../../../tests/fixtures')

function sampleGraph(): SceneGraph {
  const graph = new SceneGraph()
  const cover = graph.getPages()[0]
  graph.updateNode(cover.id, { name: 'Cover' })
  const components = graph.addPage('Components')
  const button = graph.createNode('COMPONENT', components.id, { name: 'Button', width: 120 })
  graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go', textPicture: new Uint8Array(8) })
  graph.createInstance(button.id, cover.id, { name: 'Hero button' })
  graph.createNode('RECTANGLE', cover.id, { name: 'Hero', width: 200, x: -0 })
  graph.images.set('f'.repeat(40), new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]))
  return graph
}

function bytesByPath(snapshot: DocumentJSONSnapshot): Map<string, Uint8Array> {
  return new Map(snapshot.files.map((file) => [file.path, file.bytes]))
}

function expectIdentical(actual: DocumentJSONSnapshot, expected: DocumentJSONSnapshot) {
  expect(actual.files.map((file) => file.path)).toEqual(expected.files.map((file) => file.path))
  const actualBytes = bytesByPath(actual)
  for (const file of expected.files) {
    expect(
      Buffer.compare(Buffer.from(actualBytes.get(file.path) ?? []), Buffer.from(file.bytes))
    ).toBe(0)
  }
  expect(actual.pages).toEqual(expected.pages)
}

async function expectedSHAs(snapshot: DocumentJSONSnapshot) {
  const shas: Record<string, string> = {}
  for (const file of snapshot.files) shas[file.path] = await gitBlobSHA(file.bytes)
  return shas
}

describe('document-json off the main thread', () => {
  test('the transfer snapshot rebuilds a graph that writes the same bytes', () => {
    const graph = sampleGraph()
    const expected = writeDocumentJSON(graph, { name: 'Sample' })
    const rebuilt = graphFromDocumentJSONSnapshot(structuredClone(snapshotDocumentJSONGraph(graph)))
    expectIdentical(writeDocumentJSON(rebuilt, { name: 'Sample' }), expected)
  })

  test('the snapshot is isolated from edits made after it was taken', () => {
    const graph = sampleGraph()
    const expected = writeDocumentJSON(graph, { name: 'Sample' })
    const snapshot = snapshotDocumentJSONGraph(graph)
    const page = graph.getPages()[0]
    graph.updateNode(page.id, { name: 'Renamed' })
    graph.createNode('ELLIPSE', page.id, { name: 'Late' })
    expectIdentical(
      writeDocumentJSON(graphFromDocumentJSONSnapshot(snapshot), { name: 'Sample' }),
      expected
    )
  })

  test('a real worker writes byte-identical files and git blob SHAs', async () => {
    const graph = sampleGraph()
    const expected = writeDocumentJSON(graph, { name: 'Sample' })
    const written = await writeDocumentJSONOffThread(graph, { name: 'Sample', mode: 'worker' })
    expectIdentical(written, expected)
    expect(written.blobSHAs).toEqual(await expectedSHAs(expected))
  })

  test('sliced copies are byte-identical and stop when the graph changes', async () => {
    const graph = sampleGraph()
    const expected = writeDocumentJSON(graph, { name: 'Sample' })
    const sliced = await writeDocumentJSONOffThread(graph, {
      name: 'Sample',
      mode: 'worker',
      isStale: () => false
    })
    expectIdentical(sliced, expected)
    let changed = false
    const stale = writeDocumentJSONOffThread(graph, {
      name: 'Sample',
      mode: 'worker',
      sliceMs: 0,
      isStale: () => changed
    })
    changed = true
    await expect(stale).rejects.toBeInstanceOf(DocumentJSONSnapshotStaleError)
  })

  test('the main-thread fallback matches the worker', async () => {
    const graph = sampleGraph()
    const main = await writeDocumentJSONOffThread(graph, { name: 'Sample', mode: 'main-thread' })
    const worker = await writeDocumentJSONOffThread(graph, { name: 'Sample', mode: 'worker' })
    expectIdentical(worker, main)
    expect(worker.blobSHAs).toEqual(main.blobSHAs)
  })

  test('auto falls back to the main thread when the worker fails', async () => {
    const graph = sampleGraph()
    const failing = () =>
      new Worker(new URL('data:text/javascript,throw new Error("boom")'), { type: 'module' })
    const original = console.warn
    console.warn = () => undefined
    try {
      const written = await writeDocumentJSONOffThread(graph, {
        name: 'Sample',
        mode: 'auto',
        createWorker: failing
      })
      expectIdentical(written, writeDocumentJSON(graph, { name: 'Sample' }))
    } finally {
      console.warn = original
    }
  })

  test('repeated worker writes are deterministic', async () => {
    const graph = sampleGraph()
    const first = await writeDocumentJSONOffThread(graph, { name: 'Sample', mode: 'worker' })
    const second = await writeDocumentJSONOffThread(graph, { name: 'Sample', mode: 'worker' })
    expectIdentical(second, first)
    expect(second.blobSHAs).toEqual(first.blobSHAs)
  })

  test('a large imported document is byte-identical through the worker', async () => {
    const bytes = readFileSync(resolve(FIXTURES, 'gold-preview.fig'))
    const graph = await parseFigFile(bytes.buffer.slice(0), { populate: 'all' })
    populateAllLazyFigImportRoots(graph)
    const written = await writeDocumentJSONOffThread(graph, { name: 'Gold', mode: 'worker' })
    expectIdentical(written, writeDocumentJSON(graph, { name: 'Gold' }))
  })
})
