import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import {
  ALTITUDE_FONT_FAMILIES,
  altitudeFontPolicy,
  isFontFamilyVariable
} from '@/app/editor/fonts/policy'

describe('Altitude font policy', () => {
  test('uses the built-in list when the document has no typography variables', () => {
    expect(altitudeFontPolicy(new SceneGraph())).toEqual({
      system: 'Altitude',
      families: [...ALTITUDE_FONT_FAMILIES],
      origin: 'preset'
    })
  })

  test('prefers the imported font-family variables', () => {
    const graph = new SceneGraph()
    graph.variables.set('primary', {
      id: 'primary',
      name: 'typography/font-family/primary',
      type: 'STRING',
      collectionId: 'tokens',
      valuesByMode: { light: 'Public Sans' },
      description: '',
      hiddenFromPublishing: false
    })
    expect(altitudeFontPolicy(graph)).toEqual({
      system: 'Altitude',
      families: ['Public Sans'],
      origin: 'document'
    })
  })

  test('recognises font-family token names only', () => {
    const named = (name: string) =>
      isFontFamilyVariable({
        id: name,
        name,
        type: 'STRING',
        collectionId: 'tokens',
        valuesByMode: {},
        description: '',
        hiddenFromPublishing: false
      })
    expect(named('typography/font-family/mono')).toBe(true)
    expect(named('font-family.secondary')).toBe(true)
    expect(named('typography/font-size/md')).toBe(false)
  })
})
