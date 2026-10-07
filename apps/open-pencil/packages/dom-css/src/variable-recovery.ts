import type { SceneGraph, VariableType, VariableValue } from '@open-pencil/scene-graph'

import { parseCSSColor, parseCSSNumber, pickStyle } from './css-values'
import { cssPropertyForBinding } from './design-tokens'
import type { DesignElement, DesignFact, DesignStyleDeclaration } from './types'

/**
 * Rebuild variable definitions from markup alone.
 *
 * A binding in `data-op-vars` carries the variable's id and name but not its type or value.
 * The type follows from the field it is bound to; the value, when present, is the literal
 * fallback of the `var(--token, literal)` declaration the exporter wrote for that field.
 */

const STRING_FIELDS: ReadonlySet<string> = new Set([
  'fontFamily',
  'fontStyle',
  'characters',
  'text'
])
const BOOLEAN_FIELDS: ReadonlySet<string> = new Set(['visible'])

/** The variable type a binding field implies. Numeric node fields are FLOAT. */
export function variableTypeForField(field: string): VariableType {
  if (field === 'fills' || field === 'strokes' || field.endsWith('/color') || field === 'color') {
    return 'COLOR'
  }
  if (STRING_FIELDS.has(field)) return 'STRING'
  if (BOOLEAN_FIELDS.has(field)) return 'BOOLEAN'
  return 'FLOAT'
}

function parseVariableValue(type: VariableType, literal: string): VariableValue | undefined {
  if (type === 'COLOR') return parseCSSColor(literal) ?? undefined
  if (type === 'FLOAT') return parseCSSNumber(literal) ?? undefined
  if (type === 'BOOLEAN') {
    const normalized = literal.trim().toLowerCase()
    if (normalized === '1' || normalized === 'true') return true
    if (normalized === '0' || normalized === 'false') return false
    return undefined
  }
  const unquoted = literal.trim().replace(/^(['"])(.*)\1$/, '$2')
  return unquoted || undefined
}

/** The fallback literal of `var(<cssVar>, literal)` for one property, if the markup has one. */
function fallbackLiteral(
  style: DesignStyleDeclaration | undefined,
  property: string,
  cssVar: string
): string | undefined {
  const declaration = style?.[property]
  if (!declaration?.replace(/\s+/g, '').startsWith(`var(${cssVar},`)) return undefined
  return pickStyle(style, property)
}

interface RecoveredVariable {
  name: string
  type: VariableType
  value?: VariableValue
}

/** Accumulates variable identity, type and value as elements are visited. */
export class VariableRecovery {
  private readonly variables = new Map<string, RecoveredVariable>()

  visit(element: DesignElement, fact: DesignFact | undefined): void {
    if (!fact?.boundVariables) return
    let inlineStyle: DesignStyleDeclaration | undefined
    for (const [field, ref] of Object.entries(fact.boundVariables)) {
      if (!ref.id) continue
      let entry = this.variables.get(ref.id)
      if (!entry) {
        entry = { name: ref.name ?? ref.id, type: variableTypeForField(field) }
        this.variables.set(ref.id, entry)
      }
      if (entry.value !== undefined || !ref.cssVar) continue
      const property = cssPropertyForBinding(field, fact.nodeType)
      if (!property) continue
      inlineStyle ??= element.inlineStyle
      const literal = fallbackLiteral(inlineStyle, property, ref.cssVar)
      if (literal !== undefined) entry.value = parseVariableValue(entry.type, literal)
    }
  }

  /** Write the recovered collection into `graph`. Returns counts for the caller to report. */
  restoreInto(graph: SceneGraph): { variables: number; withValues: number } {
    if (this.variables.size === 0) return { variables: 0, withValues: 0 }
    const collectionId = 'recovered-from-markup'
    const modeId = 'recovered-default'
    graph.variableCollections.set(collectionId, {
      id: collectionId,
      name: 'Recovered from markup',
      modes: [{ modeId, name: 'Default' }],
      defaultModeId: modeId,
      variableIds: [...this.variables.keys()]
    })
    graph.activeMode.set(collectionId, modeId)
    let withValues = 0
    for (const [id, recovered] of this.variables) {
      const hasValue = recovered.value !== undefined
      if (hasValue) withValues += 1
      graph.variables.set(id, {
        id,
        name: recovered.name,
        type: recovered.type,
        collectionId,
        valuesByMode: recovered.value === undefined ? {} : { [modeId]: recovered.value },
        description: hasValue
          ? 'Recovered from data-op-vars; value from the CSS fallback.'
          : 'Recovered from data-op-vars; value not carried in markup.',
        hiddenFromPublishing: false
      })
    }
    return { variables: this.variables.size, withValues }
  }
}
