import { describe, expect, test } from 'bun:test'

import {
  convertTokenValue,
  floatToCSS,
  resolveTokenImportConfig
} from '@open-pencil/core/io/formats/dtcg'

const config = resolveTokenImportConfig({})

function converted(type: string, value: unknown) {
  const result = convertTokenValue(type, value, config)
  if (!result.ok) throw new Error(result.message)
  return result.converted
}

describe('DTCG value conversion', () => {
  test('colors: hex, functional and 2025 object syntax become sRGB', () => {
    expect(converted('color', '#ff000080')).toEqual({ type: 'COLOR', value: { r: 1, g: 0, b: 0, a: 128 / 255 } })
    expect(converted('color', 'rgb(0 0 255)').value).toEqual({ r: 0, g: 0, b: 1, a: 1 })
    expect(converted('color', { colorSpace: 'srgb', components: [0, 1, 0], alpha: 0.5 }).value).toEqual({
      r: 0,
      g: 1,
      b: 0,
      a: 0.5
    })
    const p3 = converted('color', { colorSpace: 'display-p3', components: [1, 0, 0] }).value
    expect(p3).toMatchObject({ r: 1, a: 1 })
  })

  test('dimensions keep their authored unit; px and rem are canvas pixels', () => {
    expect(converted('dimension', '12px')).toEqual({ type: 'FLOAT', value: 12, unit: 'px' })
    expect(converted('dimension', { value: 1.5, unit: 'rem' })).toEqual({
      type: 'FLOAT',
      value: 24,
      unit: 'rem',
      remBase: 16
    })
    expect(converted('dimension', '8')).toMatchObject({ value: 8, unit: 'px' })
    expect(converted('letterSpacing', '1%')).toMatchObject({ value: 1, unit: '%' })
  })

  test('durations are milliseconds with the authored unit restored for CSS', () => {
    const seconds = converted('duration', '0.3s')
    expect(seconds).toEqual({ type: 'FLOAT', value: 300, unit: 's' })
    expect(floatToCSS(300, 's')).toBe('0.3s')
    expect(converted('duration', { value: 150, unit: 'ms' })).toMatchObject({ value: 150, unit: 'ms' })
    expect(floatToCSS(24, 'rem', 16)).toBe('1.5rem')
  })

  test('number, fontWeight, fontFamily and cubicBezier', () => {
    expect(converted('number', '0.4')).toMatchObject({ type: 'FLOAT', value: 0.4, unit: '' })
    expect(converted('fontWeight', 'SemiBold')).toMatchObject({ type: 'FLOAT', value: 600 })
    expect(converted('fontWeight', 'extra-bold').value).toBe(800)
    expect(converted('fontFamily', ['Inter', 'Helvetica Neue', 'sans-serif']).value).toBe(
      'Inter, "Helvetica Neue", sans-serif'
    )
    expect(converted('cubicBezier', [0.2, 0, 0, 1]).value).toBe('cubic-bezier(0.2, 0, 0, 1)')
    expect(converted('other', 'ease')).toEqual({ type: 'STRING', value: 'ease' })
  })

  test('composites become CSS strings with the structured value kept', () => {
    const shadow = converted('shadow', [
      { offsetX: '0px', offsetY: '2px', blur: '4px', spread: '0px', color: '#00000033' },
      { x: '0', y: '1', blur: '2', spread: '0', color: '#000', inset: true }
    ])
    expect(shadow.type).toBe('STRING')
    expect(shadow.value).toBe('0px 2px 4px 0px #00000033, inset 0px 1px 2px 0px #000')
    expect(shadow.composite).toBeArray()

    const typography = converted('typography', {
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fontSize: '16px',
      lineHeight: 1.5,
      letterSpacing: '0.01em'
    })
    expect(typography.value).toBe('700 16px/1.5 Inter')
    expect(typography.lossy).toContain('letterSpacing')

    expect(converted('border', { width: '1px', style: 'solid', color: '#fff' }).value).toBe('1px solid #fff')
    expect(
      converted('transition', { duration: '200ms', timingFunction: [0.4, 0, 0.2, 1], delay: '0ms' }).value
    ).toBe('200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms')
    expect(
      converted('gradient', [
        { color: '#000', position: 0 },
        { color: '#fff', position: 1 }
      ]).value
    ).toBe('linear-gradient(#000 0%, #fff 100%)')
  })

  test('composites can be skipped by mapping, and invalid values are named', () => {
    const skipping = resolveTokenImportConfig({ composites: { shadow: 'skip' } })
    expect(convertTokenValue('shadow', { x: 0, y: 0, blur: 0, spread: 0, color: '#000' }, skipping)).toMatchObject({
      ok: false,
      code: 'composite-skipped'
    })
    expect(convertTokenValue('color', 'not-a-color', config)).toMatchObject({ ok: false, code: 'invalid-value' })
    expect(convertTokenValue('fontWeight', 'Italic', config)).toMatchObject({ ok: false, code: 'invalid-value' })
    expect(convertTokenValue('mystery', { nested: true }, config)).toMatchObject({
      ok: false,
      code: 'unsupported-type'
    })
  })
})
