import { asRecord } from './names'
import type { CSSTokens } from './types'

/** `{ cssProp: binding }` → `{ cssProp: variableName }`; `background` reads as `background-color`. */
export function tokenNames(map: unknown): CSSTokens {
  const out: CSSTokens = {}
  for (const [cssProp, binding] of Object.entries(asRecord(map))) {
    const figma = asRecord(binding).figma
    if (typeof figma !== 'string' || !figma) continue
    out[cssProp === 'background' ? 'background-color' : cssProp] = figma
  }
  return out
}

/** `parts: { icon: { … } }` inside a conditional binding → part name → tokens. */
export function partTokenNames(layer: Record<string, unknown>): Record<string, CSSTokens> {
  const parts: Record<string, CSSTokens> = {}
  for (const [part, map] of Object.entries(asRecord(layer.parts))) {
    const names = tokenNames(map)
    if (Object.keys(names).length) parts[part] = names
  }
  return parts
}

/** Longhands a shorthand overrides, so a later layer's shorthand is not shadowed. */
function coveredBy(shorthand: string, longhand: string): boolean {
  if (shorthand === longhand) return false
  if (shorthand === 'border-color') return /^border-[a-z-]+-color$/.test(longhand)
  if (shorthand === 'border-width' || shorthand === 'border') {
    return /^border-(top|right|bottom|left|block|inline)[a-z-]*-width$/.test(longhand)
  }
  if (shorthand === 'border-radius') return /^border-[a-z]+-[a-z]+-radius$/.test(longhand)
  if (shorthand === 'padding') return longhand.startsWith('padding-')
  if (shorthand === 'gap') return longhand === 'row-gap' || longhand === 'column-gap'
  return false
}

/**
 * Layer `names` over `target` the way the cascade would: a later layer's property moves to
 * the end (bindings apply in insertion order) and drops the longhands its shorthand covers.
 */
export function layerTokens(target: CSSTokens, names: CSSTokens): void {
  for (const [prop, name] of Object.entries(names)) {
    for (const existing of Object.keys(target)) {
      if (existing === prop || coveredBy(prop, existing)) Reflect.deleteProperty(target, existing)
    }
    target[prop] = name
  }
}
