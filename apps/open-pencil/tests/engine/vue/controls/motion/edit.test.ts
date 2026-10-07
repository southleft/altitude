import { describe, expect, test } from 'bun:test'

import type { MotionTransition } from '@open-pencil/scene-graph'

import {
  addTransition,
  patchTransition,
  setDurationVariable,
  setTarget,
  setUse,
  toggleProperty
} from '#vue/controls/motion/edit'

const hover: MotionTransition = {
  id: 'hover',
  trigger: 'hover',
  use: 'hover',
  properties: ['background-color']
}

describe('motion section edits', () => {
  test('adds the first unused trigger with its default properties and a unique id', () => {
    const list = addTransition([hover])
    expect(list[1]).toEqual({
      id: 'press',
      trigger: 'press',
      properties: ['background-color', 'border-color', 'color', 'box-shadow']
    })
    expect(addTransition([hover], 'hover')[1]?.id).toBe('hover-2')
  })

  test('toggles properties and falls back to all when none are left', () => {
    const [withColor] = patchTransition([hover], 'hover', toggleProperty('color')) ?? []
    expect(withColor?.properties).toEqual(['background-color', 'color'])
    const [none] = patchTransition([hover], 'hover', toggleProperty('background-color')) ?? []
    expect(none?.properties).toEqual(['all'])
  })

  test('clears optional fields instead of storing nulls', () => {
    const [bound] = patchTransition([hover], 'hover', setDurationVariable('var:fast')) ?? []
    expect(bound?.duration).toEqual({ variableId: 'var:fast' })
    const [unbound] =
      patchTransition(bound ? [bound] : [], 'hover', setDurationVariable(null)) ?? []
    expect(unbound && 'duration' in unbound).toBe(false)
    const [noUse] = patchTransition([hover], 'hover', setUse(null)) ?? []
    expect(noUse && 'use' in noUse).toBe(false)
    const [target] = patchTransition([hover], 'hover', setTarget('State', 'Hover')) ?? []
    expect(target?.to).toEqual({ State: 'Hover' })
    const [auto] = patchTransition(target ? [target] : [], 'hover', setTarget('State', null)) ?? []
    expect(auto && 'to' in auto).toBe(false)
    expect(patchTransition([hover], 'missing', setUse('overlay'))).toBeNull()
  })
})
