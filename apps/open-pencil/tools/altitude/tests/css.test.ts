import { describe, expect, test } from 'bun:test'

import { canonicalCSSValue, parseCustomProperties, resolveCustomProperties } from '../src/css'

describe('parity CSS helpers', () => {
  test('parses custom properties and follows var() chains', () => {
    const css = `/* generated */\n:root {\n  --a: 4px;\n  --b: var(--a);\n  --c: var(--missing, 2px) var(--b);\n}`
    const resolved = resolveCustomProperties(parseCustomProperties(css))
    expect(resolved.get('--b')).toBe('4px')
    expect(resolved.get('--c')).toBe('2px 4px')
  })

  test('canonical values compare equal across equivalent CSS spellings', () => {
    expect(canonicalCSSValue('#fdecec')).toBe(canonicalCSSValue('rgb(253, 236, 236)'))
    expect(canonicalCSSValue('0.75rem')).toBe(canonicalCSSValue('12px'))
    expect(canonicalCSSValue('0.1s')).toBe(canonicalCSSValue('100ms'))
    expect(canonicalCSSValue('0px 2px 2px 0px #1313114d')).toBe(
      canonicalCSSValue('0px 2px 2px 0px rgba(19, 19, 17, 0.3)')
    )
    expect(canonicalCSSValue('cubic-bezier(0.2,0,0,1)')).toBe(
      canonicalCSSValue('cubic-bezier(0.2, 0, 0, 1)')
    )
    expect(canonicalCSSValue('400 1rem/1.5rem Inter')).toBe('400 16px/24px Inter')
    expect(canonicalCSSValue('1px')).not.toBe(canonicalCSSValue('2px'))
  })
})
