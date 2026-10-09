import { describe, expect, test } from 'bun:test'

import { createEditor, fontReplacementChanges } from '@open-pencil/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

function setup() {
  const editor = createEditor()
  const pageId = editor.graph.getPages()[0].id
  const heading = editor.graph.createNode('TEXT', pageId, {
    name: 'Heading',
    text: 'Hello world',
    fontFamily: 'Agrandir',
    fontWeight: 700,
    styleRuns: [{ start: 0, length: 5, style: { fontWeight: 400, italic: true } }]
  })
  const body = editor.graph.createNode('TEXT', pageId, {
    name: 'Body',
    text: 'Copy with Agrandir',
    fontFamily: 'Public Sans',
    fontWeight: 400,
    styleRuns: [{ start: 10, length: 8, style: { fontFamily: 'Agrandir' } }]
  })
  const other = editor.graph.createNode('TEXT', pageId, {
    name: 'Other',
    text: 'Untouched',
    fontFamily: 'Inter'
  })
  return { editor, pageId, heading, body, other }
}

describe('replaceFontFace', () => {
  test('replaces every use of a family, runs included, keeping weights', () => {
    const { editor, heading, body, other } = setup()

    const result = editor.replaceFontFace({ family: 'Agrandir' }, { family: 'Public Sans' })

    expect(result.nodeIds.toSorted()).toEqual([heading.id, body.id].toSorted())
    const replacedHeading = getNodeOrThrow(editor.graph, heading.id)
    expect(replacedHeading.fontFamily).toBe('Public Sans')
    expect(replacedHeading.fontWeight).toBe(700)
    // The run inherited the family, so it follows the node.
    expect(replacedHeading.styleRuns[0].style).toEqual({ fontWeight: 400, italic: true })
    expect(getNodeOrThrow(editor.graph, body.id).styleRuns[0].style.fontFamily).toBe('Public Sans')
    expect(getNodeOrThrow(editor.graph, other.id).fontFamily).toBe('Inter')
  })

  test('is one undoable action', () => {
    const { editor, heading, body } = setup()
    const before = structuredClone({
      heading: getNodeOrThrow(editor.graph, heading.id).styleRuns,
      body: getNodeOrThrow(editor.graph, body.id).styleRuns
    })

    editor.replaceFontFace({ family: 'Agrandir' }, { family: 'Public Sans', style: 'SemiBold' })
    expect(getNodeOrThrow(editor.graph, heading.id).fontWeight).toBe(600)

    expect(editor.undo.canUndo).toBe(true)
    editor.undo.undo()
    expect(getNodeOrThrow(editor.graph, heading.id)).toMatchObject({
      fontFamily: 'Agrandir',
      fontWeight: 700
    })
    expect(getNodeOrThrow(editor.graph, heading.id).styleRuns).toEqual(before.heading)
    expect(getNodeOrThrow(editor.graph, body.id).styleRuns).toEqual(before.body)

    editor.undo.redo()
    expect(getNodeOrThrow(editor.graph, heading.id).fontFamily).toBe('Public Sans')
  })

  test('replaces only the selected style of a family', () => {
    const { editor, heading } = setup()

    editor.replaceFontFace({ family: 'Agrandir', style: 'Regular Italic' }, { family: 'Georgia' })

    const node = getNodeOrThrow(editor.graph, heading.id)
    expect(node.fontFamily).toBe('Agrandir')
    expect(node.styleRuns[0].style.fontFamily).toBe('Georgia')
  })

  test('changes nothing and records no history when the family is unused', () => {
    const { editor } = setup()
    const result = editor.replaceFontFace({ family: 'Nope' }, { family: 'Inter' })
    expect(result.nodeIds).toEqual([])
    expect(editor.undo.canUndo).toBe(false)
  })

  test('keeps text style bindings', () => {
    const { editor, heading } = setup()
    editor.graph.updateNode(heading.id, { textStyleId: 'style-1' })
    const changes = fontReplacementChanges(
      getNodeOrThrow(editor.graph, heading.id),
      {
        family: 'Agrandir'
      },
      { family: 'Inter' }
    )
    expect(changes).toMatchObject({ fontFamily: 'Inter', textStyleId: 'style-1' })
  })
})
