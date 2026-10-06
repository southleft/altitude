import { describe, expect, test } from 'bun:test'

import {
  cubicBezierCSS,
  cubicBezierEasing,
  interpolateSnapshot,
  lerpColor,
  lerpFills,
  motionFieldsForProperties,
  parseCSSEasing
} from '@open-pencil/core/motion'
import type { Fill } from '@open-pencil/scene-graph'

const solid = (r: number, g: number, b: number, opacity = 1): Fill => ({
  type: 'SOLID',
  color: { r, g, b, a: 1 },
  opacity,
  visible: true
})

describe('cubic-bezier easing', () => {
  test('pins the endpoints and stays monotonic for a standard curve', () => {
    const ease = cubicBezierEasing([0.15, 0.99, 0.18, 0.99])
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    let previous = 0
    for (let i = 1; i < 20; i++) {
      const value = ease(i / 20)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
  })

  test('linear is the identity and ease matches the CSS reference midpoint', () => {
    const linear = cubicBezierEasing([0, 0, 1, 1])
    expect(linear(0.37)).toBeCloseTo(0.37, 6)
    // CSS `ease` at 50% progress is ≈ 0.8024.
    expect(cubicBezierEasing([0.25, 0.1, 0.25, 1])(0.5)).toBeCloseTo(0.8024, 3)
  })

  test("Altitude's spring overshoots past 1 before settling", () => {
    const spring = cubicBezierEasing([0.34, 1.56, 0.64, 1])
    const peak = Math.max(...Array.from({ length: 50 }, (_, i) => spring(i / 50)))
    expect(peak).toBeGreaterThan(1.05)
    expect(spring(1)).toBe(1)
  })

  test('parses CSS easing text and rejects what it cannot express', () => {
    expect(parseCSSEasing('cubic-bezier(0.2, 0, 0, 1)')).toEqual([0.2, 0, 0, 1])
    expect(parseCSSEasing(' EASE-IN-OUT ')).toEqual([0.42, 0, 0.58, 1])
    expect(parseCSSEasing('steps(4)')).toBeNull()
    expect(parseCSSEasing('cubic-bezier(2, 0, 0, 1)')).toBeNull()
    expect(cubicBezierCSS([0.34, 1.56, 0.64, 1])).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)')
  })
})

describe('snapshot interpolation', () => {
  test('lerps colours and clamps channels under overshoot', () => {
    expect(lerpColor({ r: 0, g: 0, b: 1, a: 1 }, { r: 1, g: 0, b: 0, a: 1 }, 0.5)).toEqual({
      r: 0.5,
      g: 0,
      b: 0.5,
      a: 1
    })
    expect(lerpColor({ r: 0, g: 0, b: 0, a: 1 }, { r: 1, g: 1, b: 1, a: 1 }, 1.3).r).toBe(1)
  })

  test('interpolates same-shaped paints and switches mismatched ones at the midpoint', () => {
    expect(lerpFills([solid(0, 0, 0)], [solid(1, 1, 1, 0.5)], 0.5)[0]).toMatchObject({
      color: { r: 0.5, g: 0.5, b: 0.5 },
      opacity: 0.75
    })
    const gradient: Fill = { ...solid(0, 0, 0), type: 'GRADIENT_LINEAR', gradientStops: [] }
    expect(lerpFills([solid(0, 0, 0)], [gradient], 0.4)[0].type).toBe('SOLID')
    expect(lerpFills([solid(0, 0, 0)], [gradient], 0.6)[0].type).toBe('GRADIENT_LINEAR')
  })

  test('animates only the transitioned fields and jumps the rest', () => {
    const animated = motionFieldsForProperties(['background-color'], 'FRAME')
    const frame = interpolateSnapshot(
      { fills: [solid(0, 0, 1)], cornerRadius: 4, opacity: 1 },
      { fills: [solid(1, 0, 0)], cornerRadius: 8, opacity: 0.5 },
      0.25,
      animated
    )
    expect(frame.fills?.[0].color.r).toBeCloseTo(0.25)
    expect(frame.cornerRadius).toBe(8)
    expect(frame.opacity).toBe(0.5)
  })

  test('maps CSS properties to the fields of the right node type', () => {
    expect([...motionFieldsForProperties(['color'], 'TEXT')]).toEqual(['fills'])
    expect([...motionFieldsForProperties(['color'], 'FRAME')]).toEqual([])
    expect(motionFieldsForProperties(['all'], 'FRAME').has('visible')).toBe(false)
    expect(motionFieldsForProperties(['border-radius'], 'FRAME').has('topLeftRadius')).toBe(true)
  })

  test('keeps sizes non-negative and opacity within [0, 1] under overshoot', () => {
    const frame = interpolateSnapshot({ width: 10, opacity: 1 }, { width: 0, opacity: 0 }, 1.5)
    expect(frame.width).toBe(0)
    expect(frame.opacity).toBe(0)
  })
})
