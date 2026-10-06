import { describe, expect, test } from 'bun:test'

import { linearGradientEndpoints } from '#core/canvas/fills'

describe('canvas gradients', () => {
  test('maps figma linear gradient start color to transformed x-axis endpoint', () => {
    const endpoints = linearGradientEndpoints(188, 270, {
      m00: 0,
      m01: 1,
      m02: 0,
      m10: -1,
      m11: 0,
      m12: 1
    })

    expect(endpoints.start).toEqual({ x: 0, y: 0 })
    expect(endpoints.end).toEqual({ x: 0, y: 270 })
  })
})
