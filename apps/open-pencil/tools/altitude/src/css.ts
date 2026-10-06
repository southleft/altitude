import { converter, parse } from 'culori'

import { colorToCSS } from '@open-pencil/core/color'

const toRGB = converter('rgb')

/**
 * Custom-property parsing and value canonicalisation for parity checks.
 *
 * Both sides are compared as resolved values: `var()` chains are followed within one
 * stylesheet, then each value is normalised so equal CSS compares equal — colours to
 * `rgba()`, `rem` to pixels (16px root, as Altitude's emitter assumes), seconds to
 * milliseconds, and whitespace around separators.
 */

export function parseCustomProperties(css: string): Map<string, string> {
  const declarations = new Map<string, string>()
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const match of text.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]*);/g)) {
    declarations.set(match[1], match[2].trim())
  }
  return declarations
}

function substituteVars(
  value: string,
  declarations: ReadonlyMap<string, string>,
  stack: readonly string[]
): string {
  return value.replace(
    /var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^()]*))?\)/g,
    (match, name: string, fallback?: string) => {
      if (stack.includes(name)) return match
      const target = declarations.get(name)
      if (target === undefined)
        return fallback === undefined ? match : substituteVars(fallback, declarations, stack)
      return substituteVars(target, declarations, [...stack, name])
    }
  )
}

/** Follow every `var()` reference within one stylesheet. */
export function resolveCustomProperties(
  declarations: ReadonlyMap<string, string>
): Map<string, string> {
  const resolved = new Map<string, string>()
  for (const [name, value] of declarations)
    resolved.set(name, substituteVars(value, declarations, [name]))
  return resolved
}

function round(value: number, digits = 4): string {
  return String(Math.round(value * 10 ** digits) / 10 ** digits)
}

function colorText(input: string): string | null {
  const color = parse(input)
  if (!color) return null
  const source = toRGB(color)
  // 8-bit channels and two-digit alpha: #1313114d and rgba(19, 19, 17, 0.3) are equal.
  const channel = (n: number | undefined) =>
    Math.round(Math.min(1, Math.max(0, n ?? 0)) * 255) / 255
  const alpha = Number(round(source.alpha ?? 1, 2))
  return colorToCSS({ r: channel(source.r), g: channel(source.g), b: channel(source.b), a: alpha })
}

const NAMED_COLORS = new Set(['transparent', 'white', 'black', 'currentcolor'])

export function canonicalCSSValue(value: string): string {
  let text = value.trim().replace(/\s+/g, ' ')
  if (NAMED_COLORS.has(text.toLowerCase())) return colorText(text) ?? text.toLowerCase()
  text = text.replace(/#[0-9a-f]{3,8}\b/gi, (hex) => colorText(hex) ?? hex)
  text = text.replace(/\b(?:rgba?|hsla?)\([^()]*\)/gi, (fn) => colorText(fn) ?? fn)
  text = text.replace(
    /(^|[\s,(/])(-?(?:\d+\.?\d*|\.\d+))(rem|px|ms|s|%)?(?=$|[\s,)/])/g,
    (_, lead: string, num: string, unit?: string) => {
      const n = Number(num)
      // Zero is zero in every length unit (0%, 0px, 0rem all compute the same radius).
      if (n === 0 && unit !== 's' && unit !== 'ms') return `${lead}0`
      if (unit === 'rem') return `${lead}${round(n * 16)}px`
      if (unit === 's') return `${lead}${round(n * 1000)}ms`
      return `${lead}${round(n)}${unit ?? ''}`
    }
  )
  return text
    .replace(/\s*,\s*/g, ', ')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*\/\s*/g, '/')
}
