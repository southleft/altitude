import type { GenericSchema } from 'valibot'

import { parseCodeBinding, type CodeBinding } from '@open-pencil/scene-graph'

import type { DesignFact } from '../types'
import { DESIGN_ATTRS, RESIDUAL_FIELD_SET, RESTORABLE_NODE_TYPES, defaultsForType } from './fields'
import { encodeFactJSON, mapAwareReviver } from './json'
import {
  EffectSchema,
  FillSchema,
  PositionSchema,
  ResidualSchema,
  StringRecordSchema,
  StrokeSchema,
  VariableRefsSchema,
  validateEntries,
  validateValue,
  type FactIssueSink
} from './schema'

/** Serialise a design fact into `data-op-*` attributes. */
export function designFactToAttrs(fact: DesignFact | undefined): Record<string, string> {
  return fact ? factToAttrs(fact) : {}
}

/** `designFactToAttrs`, optionally with the residual already encoded by the caller. */
export function factToAttrs(fact: DesignFact, encodedResidual?: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (fact.nodeType) attrs[DESIGN_ATTRS.nodeType] = fact.nodeType
  if (fact.name) attrs[DESIGN_ATTRS.name] = fact.name
  if (fact.componentId) attrs[DESIGN_ATTRS.componentId] = fact.componentId
  if (fact.componentKey) attrs[DESIGN_ATTRS.componentKey] = fact.componentKey
  if (fact.codeBinding) attrs[DESIGN_ATTRS.codeBinding] = encodeFactJSON(fact.codeBinding)
  if (fact.boundVariables) {
    attrs[DESIGN_ATTRS.boundVariables] = encodeFactJSON(fact.boundVariables)
  }
  if (fact.variableModes) {
    attrs[DESIGN_ATTRS.variableModes] = encodeFactJSON(fact.variableModes)
  }
  if (fact.styleIds) attrs[DESIGN_ATTRS.styleIds] = encodeFactJSON(fact.styleIds)
  if (fact.fills) attrs[DESIGN_ATTRS.fills] = encodeFactJSON(fact.fills)
  if (fact.strokes) attrs[DESIGN_ATTRS.strokes] = encodeFactJSON(fact.strokes)
  if (fact.effects) attrs[DESIGN_ATTRS.effects] = encodeFactJSON(fact.effects)
  if (fact.x !== undefined || fact.y !== undefined) {
    attrs[DESIGN_ATTRS.position] = encodeFactJSON({ x: fact.x ?? 0, y: fact.y ?? 0 })
  }
  if (fact.residual) {
    attrs[DESIGN_ATTRS.residual] = encodedResidual ?? encodeFactJSON(fact.residual)
  }
  return attrs
}

/** The default sink: callers that do not collect issues still get validated facts. */
function ignoreIssue(): void {
  // Intentionally empty — validation already dropped the invalid value.
}

/** Parse a `data-op-*` JSON attribute, reporting malformed JSON instead of throwing. */
function parseJSONAttr(value: string | undefined, label: string, report: FactIssueSink): unknown {
  if (!value) return undefined
  try {
    return JSON.parse(value, mapAwareReviver)
  } catch {
    // Malformed markup is not this layer's problem to fix, but it must not be silent.
    report({ fact: label, reason: 'malformed JSON' })
    return undefined
  }
}

function parseArrayAttr(
  value: string | undefined,
  label: string,
  report: FactIssueSink
): unknown[] | undefined {
  const parsed = parseJSONAttr(value, label, report)
  if (parsed === undefined) return undefined
  if (Array.isArray(parsed)) return parsed
  report({ fact: label, reason: 'expected an array' })
  return undefined
}

/** A component's code binding from `data-op-code`; a malformed one is dropped and named. */
function codeBindingAttr(
  attrs: Record<string, string>,
  report: FactIssueSink
): CodeBinding | undefined {
  const raw = parseJSONAttr(attrs[DESIGN_ATTRS.codeBinding], DESIGN_ATTRS.codeBinding, report)
  if (raw === undefined) return undefined
  const binding = parseCodeBinding(raw)
  if (!binding) report({ fact: DESIGN_ATTRS.codeBinding, reason: 'not a valid code binding' })
  return binding ?? undefined
}

function valueKind(value: unknown): string {
  if (value === null || value === undefined) return 'empty'
  if (Array.isArray(value)) return 'array'
  if (value instanceof Map) return 'map'
  return typeof value
}

/**
 * A residual value is accepted only when it has the same kind as the field's default for
 * this node type. Residual fields are assigned straight onto the node, so a string where the
 * renderer expects a number would otherwise reach it unchecked.
 */
function validateResidual(
  raw: Record<string, unknown>,
  nodeType: string | undefined,
  report: FactIssueSink
): Record<string, unknown> | undefined {
  const defaults = defaultsForType(
    nodeType && RESTORABLE_NODE_TYPES.has(nodeType) ? nodeType : 'FRAME'
  )
  const residual: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(raw)) {
    const label = `${DESIGN_ATTRS.residual}.${field}`
    if (!RESIDUAL_FIELD_SET.has(field)) {
      report({ fact: label, reason: 'not a carried residual field' })
      continue
    }
    const expected = valueKind(defaults[field])
    const actual = valueKind(value)
    const compatible =
      expected === actual ||
      actual === 'empty' ||
      (expected === 'empty' && (actual === 'object' || actual === 'array' || actual === 'map'))
    if (!compatible) {
      report({ fact: label, reason: `expected ${expected}, got ${actual}` })
      continue
    }
    residual[field] = value
  }
  return Object.keys(residual).length ? residual : undefined
}

/**
 * Recover a design fact from `data-op-*` attributes after an HTML round trip.
 *
 * Markup is untrusted: invalid values are dropped and passed to `report` as named issues,
 * never thrown and never cast into the graph.
 */
export function designFactFromAttrs(
  attrs: Record<string, string>,
  report: FactIssueSink = ignoreIssue
): DesignFact | undefined {
  const fact: DesignFact = {}

  const nodeType = attrs[DESIGN_ATTRS.nodeType]
  if (nodeType) fact.nodeType = nodeType
  const name = attrs[DESIGN_ATTRS.name]
  if (name) fact.name = name
  const componentId = attrs[DESIGN_ATTRS.componentId]
  if (componentId) fact.componentId = componentId
  const componentKey = attrs[DESIGN_ATTRS.componentKey]
  if (componentKey) fact.componentKey = componentKey
  const codeBinding = codeBindingAttr(attrs, report)
  if (codeBinding) fact.codeBinding = codeBinding

  const objectAttr = <TSchema extends GenericSchema>(attr: string, schema: TSchema) => {
    const parsed = parseJSONAttr(attrs[attr], attr, report)
    return parsed === undefined ? undefined : validateValue(schema, parsed, attr, report)
  }

  const boundVariables = objectAttr(DESIGN_ATTRS.boundVariables, VariableRefsSchema)
  if (boundVariables) fact.boundVariables = boundVariables
  const variableModes = objectAttr(DESIGN_ATTRS.variableModes, StringRecordSchema)
  if (variableModes) fact.variableModes = variableModes
  const styleIds = objectAttr(DESIGN_ATTRS.styleIds, StringRecordSchema)
  if (styleIds) fact.styleIds = styleIds

  const paints = <TSchema extends GenericSchema>(attr: string, schema: TSchema) => {
    const raw = parseArrayAttr(attrs[attr], attr, report)
    if (!raw) return undefined
    const valid = validateEntries(schema, raw, attr, report)
    // Every entry rejected: let the CSS-derived paint stand rather than clearing it.
    return valid.length === 0 && raw.length > 0 ? undefined : valid
  }

  const fills = paints(DESIGN_ATTRS.fills, FillSchema)
  if (fills) fact.fills = fills
  const strokes = paints(DESIGN_ATTRS.strokes, StrokeSchema)
  if (strokes) fact.strokes = strokes
  const effects = paints(DESIGN_ATTRS.effects, EffectSchema)
  if (effects) fact.effects = effects

  const position = objectAttr(DESIGN_ATTRS.position, PositionSchema)
  if (position?.x !== undefined) fact.x = position.x
  if (position?.y !== undefined) fact.y = position.y

  const residual = objectAttr(DESIGN_ATTRS.residual, ResidualSchema)
  const validResidual = residual ? validateResidual(residual, nodeType, report) : undefined
  if (validResidual) fact.residual = validResidual

  return Object.keys(fact).length ? fact : undefined
}
