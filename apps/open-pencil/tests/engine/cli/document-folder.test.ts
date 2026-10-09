import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { writeDocumentJSON } from '@open-pencil/core/io/formats/document-json'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { loadDocument } from '#cli/headless'

import { runOpenPencilCLI } from '#tests/helpers/cli'
import { createRect, firstPageId, makeSceneGraph } from '#tests/helpers/scene'

setDefaultTimeout(60_000)

async function writeFolder(graph: SceneGraph, dir: string): Promise<string> {
  for (const file of writeDocumentJSON(graph, { name: 'Card' }).files) {
    const path = join(dir, ...file.path.split('/'))
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, file.bytes)
  }
  return dir
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'open-pencil-folder-'))
  const graph = makeSceneGraph('Screens')
  const frame = graph.createNode('FRAME', firstPageId(graph), {
    name: 'Card',
    width: 160,
    height: 80,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  const rect = createRect(graph, frame.id, { name: 'Swatch', width: 40, height: 40 })
  const base = await writeFolder(graph, join(root, 'base', 'card'))
  graph.updateNode(rect.id, { width: 60 })
  graph.createNode('TEXT', frame.id, { name: 'Caption', text: 'Hi' })
  const head = await writeFolder(graph, join(root, 'head', 'card'))
  return { root, base, head, rect }
}

describe('document-json folders as CLI input', () => {
  test('loadDocument reads a folder with layout computed', async () => {
    const { head } = await fixture()
    const graph = await loadDocument(head)
    expect(graph.getPages().map((page) => page.name)).toContain('Screens')
    expect([...graph.getAllNodes()].some((node) => node.name === 'Caption')).toBe(true)
  })

  test('a folder without document.json is rejected', async () => {
    const { root } = await fixture()
    await expect(loadDocument(root)).rejects.toThrow('without document.json')
  })

  test('lint and export accept a folder', async () => {
    const { root, head } = await fixture()
    const lint = await runOpenPencilCLI(['lint', head, '--json'])
    expect(JSON.parse(lint.stdout)).toHaveProperty('messages')
    const output = join(root, 'card.png')
    const exported = await runOpenPencilCLI(['export', head, '--output', output])
    expect(exported.exitCode).toBe(0)
    const png = new Uint8Array(await Bun.file(output).arrayBuffer())
    expect([...png.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47])
  })

  test('design diff reports node changes as JSON', async () => {
    const { base, head, rect } = await fixture()
    const { stdout, exitCode } = await runOpenPencilCLI(['design', 'diff', base, head, '--json'])
    expect(exitCode).toBe(0)
    const diff = JSON.parse(stdout)
    expect(diff.summary).toMatchObject({ pagesChanged: 1, nodesAdded: 1 })
    const [page] = diff.pages
    expect(page.nodes.added[0].name).toBe('Caption')
    expect(page.nodes.changed).toContainEqual(
      expect.objectContaining({ id: rect.id, changes: [{ field: 'width', before: 40, after: 60 }] })
    )
  })

  test('design diff of identical folders reports no changes', async () => {
    const { base } = await fixture()
    const { stdout, exitCode } = await runOpenPencilCLI(['design', 'diff', base, base])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('No design changes.')
  })
})
