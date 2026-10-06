import { colorToCSS } from '@open-pencil/core/color'
import type { Color, SceneGraph } from '@open-pencil/scene-graph'

import type { DesignFact, DesignStyleDeclaration } from './types'

/**
 * Tokens as CSS.
 *
 * Separated from `design-fact/` because these are two different jobs: that module
 * decides WHICH facts travel and how they are encoded; this one decides how a token
 * BINDING becomes a CSS declaration. Keeping them together pushed one file past every
 * size and complexity threshold the repo enforces.
 */

export interface TokenCSSOptions {
  /** Prefix for generated custom properties, e.g. 'al' produces `--al-color-primary`. */
  cssVarPrefix?: string
}

/**
 * Figma variable names are slash-delimited hierarchies (`color/primary/default`). CSS
 * custom properties are flat, so the separator becomes a hyphen. Anything that is not
 * alphanumeric collapses to a single hyphen so the result is always a legal ident.
 */
export function cssVarName(variableName: string, prefix = ''): string {
  const slug = variableName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `--${prefix ? `${prefix}-` : ''}${slug}`
}

/**
 * Binding field -> CSS property. Phase 2: a bound value should export as
 * `var(--token, literal)` so the CSS both renders standalone and re-links to the token
 * file when one is present.
 *
 * `rotation` is deliberately absent — it belongs in `transform`, which composes several
 * values and cannot take a bare `var()` substitution here.
 */
const BINDING_CSS_PROPERTY: Record<string, string> = {
  'fills/0/color': 'background-color',
  'strokes/0/color': 'border-color',
  opacity: 'opacity',
  width: 'width',
  height: 'height',
  minWidth: 'min-width',
  maxWidth: 'max-width',
  minHeight: 'min-height',
  maxHeight: 'max-height',
  cornerRadius: 'border-radius',
  topLeftRadius: 'border-top-left-radius',
  topRightRadius: 'border-top-right-radius',
  bottomLeftRadius: 'border-bottom-left-radius',
  bottomRightRadius: 'border-bottom-right-radius',
  fontSize: 'font-size',
  fontFamily: 'font-family',
  letterSpacing: 'letter-spacing',
  lineHeight: 'line-height',
  itemSpacing: 'gap',
  counterAxisSpacing: 'row-gap',
  gridRowGap: 'row-gap',
  gridColumnGap: 'column-gap',
  paddingLeft: 'padding-left',
  paddingRight: 'padding-right',
  paddingTop: 'padding-top',
  paddingBottom: 'padding-bottom',
  borderTopWeight: 'border-top-width',
  borderBottomWeight: 'border-bottom-width',
  borderLeftWeight: 'border-left-width',
  borderRightWeight: 'border-right-width',
  x: 'left',
  y: 'top'
}

/**
 * The CSS property a bound field is written to. For a TEXT node a fill paints the glyphs,
 * not a background.
 */
export function cssPropertyForBinding(
  field: string,
  nodeType: string | undefined
): string | undefined {
  if (field === 'fills/0/color' && nodeType === 'TEXT') return 'color'
  return BINDING_CSS_PROPERTY[field]
}

/**
 * Rewrite declarations that a token controls into `var(--token, <existing literal>)`.
 * The literal already in `style` becomes the fallback, so nothing is lost if the custom
 * property is undefined at render time.
 *
 * Returns the number of declarations rewritten, so callers can report coverage instead
 * of assuming success.
 */
export function applyVariableCSS(
  style: DesignStyleDeclaration,
  fact: DesignFact | undefined
): number {
  if (!fact?.boundVariables) return 0
  let rewritten = 0
  for (const [field, ref] of Object.entries(fact.boundVariables)) {
    if (!ref.cssVar) continue
    const property = cssPropertyForBinding(field, fact.nodeType)
    if (!property) continue
    const literal = style[property]
    style[property] = literal ? `var(${ref.cssVar}, ${literal})` : `var(${ref.cssVar})`
    rewritten++
  }
  return rewritten
}

/**
 * Emit a node's variable collections as a CSS custom-property block. Without this the
 * `var()` references above resolve to their fallbacks only — correct, but not linked.
 */
export function variableCollectionsToCSS(graph: SceneGraph, options: TokenCSSOptions = {}): string {
  const lines: string[] = []
  for (const collection of graph.variableCollections.values()) {
    for (const modeIndex of collection.modes.keys()) {
      const mode = collection.modes[modeIndex]
      const declarations: string[] = []
      for (const variableId of collection.variableIds) {
        const variable = graph.variables.get(variableId)
        if (!variable) continue
        const value = graph.resolveVariable(variableId, mode.modeId)
        const css = variableValueToCSS(value)
        if (css === undefined) continue
        declarations.push(`  ${cssVarName(variable.name, options.cssVarPrefix)}: ${css};`)
      }
      if (!declarations.length) continue
      const selector =
        mode.modeId === collection.defaultModeId
          ? ':root'
          : `:root[data-mode="${cssVarName(mode.name).slice(2)}"]`
      lines.push(`/* ${collection.name} — ${mode.name} */`)
      lines.push(`${selector} {`, ...declarations, '}')
    }
  }
  return lines.join('\n')
}

function variableValueToCSS(value: unknown): string | undefined {
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (value && typeof value === 'object' && 'r' in value) {
    // colorToCSS owns the colour-space handling; a hand-rolled rgb() string drifts from it.
    return colorToCSS(value as Color)
  }
  return undefined
}
