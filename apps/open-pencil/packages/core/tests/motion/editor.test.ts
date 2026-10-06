import { describe, expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core/editor'
import { importDesignTokens } from '@open-pencil/core/io/formats/dtcg'
import { MOTION_SPEC_VERSION, type MotionSpec } from '@open-pencil/scene-graph'

import { buttonSet, motionMapping, motionTokenFiles } from './fixtures'

const spec: MotionSpec = {
  version: MOTION_SPEC_VERSION,
  transitions: [{ id: 'hover', trigger: 'hover', use: 'hover', properties: ['background-color'] }]
}

function setup() {
  const editor = createEditor()
  importDesignTokens(editor.graph, motionTokenFiles(), motionMapping)
  const fixture = buttonSet(editor.graph)
  editor.setMotionReducedMotionSource(() => false)
  return { editor, ...fixture }
}

describe('editor motion actions', () => {
  test('sets and clears a spec as undoable steps on component sets only', () => {
    const { editor, set, instance } = setup()
    expect(editor.setMotionSpec(instance.id, spec)).toBe(false)
    expect(editor.setMotionSpec(set.id, spec)).toBe(true)
    expect(editor.getMotionSpec(set.id)).toEqual(spec)
    expect(editor.getNodeMotion(instance.id)?.owner.id).toBe(set.id)

    editor.undo.undo()
    expect(editor.getMotionSpec(set.id)).toBeNull()
    editor.undo.redo()
    expect(editor.getMotionSpec(set.id)).toEqual(spec)
    expect(editor.setMotionSpec(set.id, null, 'Remove motion')).toBe(true)
    expect(editor.getMotionSpec(set.id)).toBeNull()
  })

  test('preview playback never enters history and disabling preview restores the instance', () => {
    const { editor, set, instance } = setup()
    editor.setMotionSpec(set.id, spec)
    const events: boolean[] = []
    editor.onEditorEvent('motion:preview-changed', (enabled) => events.push(enabled))
    let historyChanges = 0
    editor.onEditorEvent('history:changed', () => historyChanges++)

    editor.setMotionPreviewEnabled(true)
    const label = editor.graph.getNode(instance.childIds[0])
    expect(editor.findMotionTarget(label?.id ?? null)).toBe(instance.id)
    expect(editor.playMotion(instance.id, 'hover').status).toBe('animating')
    expect(editor.isMotionPlaying(instance.id)).toBe(true)
    expect(editor.isInteractiveEditing()).toBe(true)

    editor.setMotionPreviewEnabled(false)
    expect(editor.isMotionPlaying(instance.id)).toBe(false)
    expect(editor.isInteractiveEditing()).toBe(false)
    expect(editor.graph.getNode(instance.id)?.fills[0]?.color.b).toBe(1)
    expect(historyChanges).toBe(0)
    expect(events).toEqual([true, false])
  })
})
