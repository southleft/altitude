import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'
import { htmlToSceneGraph, sceneNodesToDesignDocument, serializeHTML } from '@open-pencil/dom-css'

import {
  commitDOMCodeSession,
  createDOMCodeSession,
  previewDOMCode,
  resetDOMCodePreview
} from '@/app/code/dom-preview'

import { expectDefined } from '#tests/helpers/assert'

function setup() {
  const editor = createEditor()
  const store = Object.assign(editor, { viewportCanvasCenter: () => ({ x: 0, y: 0 }) })
  const pageId = expectDefined(editor.graph.getPages()[0]).id
  const keep = editor.graph.createNode('FRAME', pageId, {
    name: 'Untouched',
    x: 400,
    y: 0,
    width: 50,
    height: 50
  })
  const target = editor.graph.createNode('FRAME', pageId, {
    name: 'Target',
    x: 10,
    y: 20,
    width: 100,
    height: 60
  })
  editor.graph.createNode('RECTANGLE', target.id, { name: 'Child', width: 10, height: 10 })
  editor.select([target.id])
  return { editor, store, pageId, keep, target }
}

const parseHeadless = (source: string) => htmlToSceneGraph(source, { pageName: 'Code preview' })

function pageChildNames(editor: ReturnType<typeof setup>['editor'], pageId: string): string[] {
  return expectDefined(editor.graph.getNode(pageId)).childIds.map(
    (id) => editor.graph.getNode(id)?.name ?? '?'
  )
}

describe('HTML/CSS code preview', () => {
  test('replaces only the selected layer and keeps the rest of the document', async () => {
    const { editor, store, pageId, keep, target } = setup()
    const created = createDOMCodeSession(store)
    if (!created.ok) throw new Error(created.error)

    const html = serializeHTML(sceneNodesToDesignDocument(editor.graph, [target.id]))
    const edited = html.replace('width: 100px', 'width: 180px')
    const result = await previewDOMCode(store, created.session, edited, parseHeadless)
    if (!result.ok) throw new Error(result.error)

    expect(editor.graph.getNode(keep.id)?.name).toBe('Untouched')
    expect(editor.graph.getNode(target.id)).toBeUndefined()
    expect(pageChildNames(editor, pageId)).toEqual(['Untouched', 'Target'])
    const replacement = expectDefined(editor.graph.getNode(expectDefined(result.nodeIds[0])))
    expect(replacement.width).toBe(180)
    expect(replacement.x).toBe(10)
    expect(replacement.y).toBe(20)
    expect(replacement.childIds).toHaveLength(1)
  })

  test('reset restores the original layer exactly', async () => {
    const { editor, store, target } = setup()
    const before = structuredClone(editor.graph.getNode(target.id))
    const created = createDOMCodeSession(store)
    if (!created.ok) throw new Error(created.error)

    await previewDOMCode(store, created.session, '<div style="width: 5px">x</div>', parseHeadless)
    resetDOMCodePreview(store, created.session)

    expect(editor.graph.getNode(target.id)).toEqual(expectDefined(before))
    expect([...editor.state.selectedIds]).toEqual([target.id])
  })

  test('commit records one undo step that restores the whole page', async () => {
    const { editor, store, pageId, keep, target } = setup()
    const created = createDOMCodeSession(store)
    if (!created.ok) throw new Error(created.error)

    await previewDOMCode(store, created.session, '<div style="width: 5px"></div>', parseHeadless)
    await previewDOMCode(store, created.session, '<div style="width: 7px"></div>', parseHeadless)
    commitDOMCodeSession(store, created.session)

    expect(editor.undo.undoLabel).toBe('Edit HTML/CSS')
    editor.undo.undo()
    expect(editor.graph.getNode(target.id)?.name).toBe('Target')
    expect(editor.graph.getNode(keep.id)?.name).toBe('Untouched')
    expect(pageChildNames(editor, pageId)).toEqual(['Untouched', 'Target'])
  })

  test('with no selection the markup is inserted instead of replacing the page', async () => {
    const { editor, store, pageId } = setup()
    editor.select([])
    const created = createDOMCodeSession(store)
    if (!created.ok) throw new Error(created.error)

    const result = await previewDOMCode(
      store,
      created.session,
      '<div style="width: 30px; height: 30px"></div>',
      parseHeadless
    )
    if (!result.ok) throw new Error(result.error)
    expect(pageChildNames(editor, pageId)).toHaveLength(3)
  })
})
