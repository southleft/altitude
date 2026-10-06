import { describe, expect, test } from 'bun:test'

import { nodeChangeToProps } from '@open-pencil/fig/node-change'
import type { NodeChange } from '@open-pencil/kiwi/fig/codec'

describe('Figma mask import', () => {
  test('imports schema mask fields', () => {
    const props = nodeChangeToProps(
      {
        type: 'RECTANGLE',
        mask: true,
        maskType: 'LUMINANCE',
        maskIsOutline: true
      } as NodeChange,
      []
    )

    expect(props.isMask).toBe(true)
    expect(props.maskType).toBe('LUMINANCE')
    expect(props.maskIsOutline).toBe(true)
  })
})
