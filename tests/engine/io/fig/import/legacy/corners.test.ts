import { describe, expect, test } from 'bun:test'

import { importNodeChanges } from '@open-pencil/core'
import type { NodeChange } from '@open-pencil/kiwi/fig/codec'

import { canvas, doc, node } from './helpers'

describe('fig-import: corner geometry', () => {
  test('imports corner smoothing', () => {
    const graph = importNodeChanges([
      doc(),
      canvas(),
      node('RECTANGLE', 10, 1, {
        cornerRadius: 24,
        cornerSmoothing: 0.72
      } as Partial<NodeChange>)
    ])
    const imported = graph.getChildren(graph.getPages()[0].id)[0]
    expect(imported.cornerRadius).toBe(24)
    expect(imported.cornerSmoothing).toBe(0.72)
  })
})
