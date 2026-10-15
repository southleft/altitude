import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'

import { createDocumentChanges } from '@/app/document/io/changes'

test('repainting and selection do not dirty a document; content mutations do', () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  try {
    editor.requestRender()
    editor.requestRepaint()
    editor.clearSelection()
    expect(changes.hasUnsavedChanges()).toBe(false)
    editor.createShape('RECTANGLE', 0, 0, 100, 100)
    expect(changes.hasUnsavedChanges()).toBe(true)
    changes.markSaved()
    expect(changes.hasUnsavedChanges()).toBe(false)
    editor.undo.record({
      label: 'Variable edit',
      forward: () => undefined,
      inverse: () => undefined
    })
    expect(changes.hasUnsavedChanges()).toBe(true)
  } finally {
    changes.dispose()
    editor.dispose()
  }
})

test('saving an earlier revision cannot clear edits made while exporting or picking a file', () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  try {
    editor.createShape('RECTANGLE', 0, 0, 100, 100)
    const saving = changes.capture()
    editor.createShape('ELLIPSE', 0, 0, 100, 100)
    changes.markSaved(saving)
    expect(changes.hasUnsavedChanges()).toBe(true)
    changes.markSaved()
    expect(changes.hasUnsavedChanges()).toBe(false)
    changes.markChanged()
    expect(changes.hasUnsavedChanges()).toBe(true)
  } finally {
    changes.dispose()
    editor.dispose()
  }
})

test('layout, page population and the instance sync they cause do not dirty a document', async () => {
  const editor = createEditor()
  const changes = createDocumentChanges(editor)
  try {
    const graph = editor.graph
    const page = graph.getPages()[0]
    const component = graph.createNode('COMPONENT', page.id, { name: 'Button', width: 100 })
    graph.createInstance(component.id, page.id, { name: 'Instance' })
    await Promise.resolve()
    changes.markSaved()

    // Population materializes imported content; layout resizes it. Both reach instances.
    graph.withDerivedMutations(() => {
      graph.createNode('RECTANGLE', component.id, { name: 'Populated' })
    })
    graph.withLayoutMutations(() => graph.updateNode(component.id, { width: 120 }))
    await Promise.resolve()
    expect(graph.getChildren(graph.getInstances(component.id)[0].id)).toHaveLength(1)
    expect(changes.hasUnsavedChanges()).toBe(false)

    graph.updateNode(component.id, { name: 'Primary button' })
    expect(changes.hasUnsavedChanges()).toBe(true)
  } finally {
    changes.dispose()
    editor.dispose()
  }
})
