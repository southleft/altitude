import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { copyEffects, copyFills, copyStrokes } from '@open-pencil/scene-graph/copy'

import { cssVarNameForVariable } from '../design-tokens'
import type { DesignFact, DesignVariableRef } from '../types'
import {
  BULKY_GEOMETRY_FIELDS,
  RESIDUAL_FIELDS,
  RESIDUAL_FIELD_SET,
  STYLE_ID_FIELDS,
  defaultsForType,
  type IndexedNode
} from './fields'
import { encodeFactJSON } from './json'

export { designFactFromAttrs, designFactToAttrs } from './attrs'
export { DESIGN_ATTRS, RESTORABLE_NODE_TYPES } from './fields'

/**
 * The design fact carrier.
 *
 * A `DesignElement` used to hold only tagName/attrs/style/children, so anything that was
 * not CSS had nowhere to live. Node type, component identity and token bindings all died
 * for that one reason — measured on a real design system: 17,196 bindings in, 0 out, and
 * every node type flattened to FRAME.
 *
 * Every element now carries two facts: what it IS (this module) and what it MEANS (the
 * CSS declarations). Facts travel two ways so both round trips work:
 *
 *   - `element.design` — typed, used by the in-memory model round trip.
 *   - `data-op-*` attributes — strings, the only thing that survives HTML serialisation.
 *
 * `from-scene-graph` writes both; `to-scene-graph` prefers `design` and falls back to
 * parsing the attributes. The attributes are also the point at which exported markup
 * becomes legible to a human or an agent: a div says it is a Button instance bound to
 * `--al-color-primary` instead of being an anonymous box.
 */

function variableRef(graph: SceneGraph, variableId: string, prefix?: string): DesignVariableRef {
  const variable = graph.variables.get(variableId)
  // A dangling binding still records its id — a named unknown beats a silent drop.
  if (!variable) return { id: variableId }
  return {
    id: variableId,
    name: variable.name,
    cssVar: cssVarNameForVariable(variable, prefix)
  }
}

export interface DesignFactOptions {
  /** Prefix for generated custom properties, e.g. 'al' produces `--al-color-primary`. */
  cssVarPrefix?: string
  /**
   * Carry raw vector geometry as facts. Default true (exact). False yields legible
   * markup and records a named degradation; the inline SVG still shows the artwork.
   */
  geometryFacts?: boolean
  /**
   * Receives the geometry fields left out when `geometryFacts` is false. Collected per call,
   * so concurrent exports never share a report.
   */
  omittedGeometry?: OmittedGeometry[]
}

/** Geometry fields an export chose not to carry, for the caller to report. */
export interface OmittedGeometry {
  nodeName: string
  fields: string[]
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a && b && typeof a === 'object') {
    try {
      return encodeFactJSON(a) === encodeFactJSON(b)
    } catch {
      return false
    }
  }
  return false
}

/** Residual fields whose value differs from this node type's default. */
function residualFacts(
  node: SceneNode,
  includeGeometry: boolean,
  omitted: OmittedGeometry[] | undefined
): Record<string, unknown> | undefined {
  const defaults = defaultsForType(node.type)
  const residual: Record<string, unknown> = {}
  const skipped: string[] = []

  for (const field of RESIDUAL_FIELDS) {
    const value = (node as IndexedNode)[field]
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue
    }
    if (sameValue(value, defaults[field])) continue
    if (!includeGeometry && BULKY_GEOMETRY_FIELDS.has(field)) {
      skipped.push(field)
      continue
    }
    residual[field] = structuredClone(value)
  }

  if (skipped.length) omitted?.push({ nodeName: node.name || '(unnamed)', fields: skipped })

  return Object.keys(residual).length ? residual : undefined
}

/** Identity: what this layer is called and what component it belongs to. */
function collectIdentity(node: SceneNode, fact: DesignFact): void {
  if (node.name) fact.name = node.name
  if (node.componentId) fact.componentId = node.componentId
  if (node.componentKey) fact.componentKey = node.componentKey
}

/** Paint structure and canvas position — the partially-CSS-expressible group. */
function collectPaintsAndPosition(node: SceneNode, fact: DesignFact): void {
  if (node.fills.length) fact.fills = copyFills(node.fills)
  if (node.strokes.length) fact.strokes = copyStrokes(node.strokes)
  if (node.effects.length) fact.effects = copyEffects(node.effects)
  if (typeof node.x === 'number' && node.x !== 0) fact.x = node.x
  if (typeof node.y === 'number' && node.y !== 0) fact.y = node.y
}

/** Token bindings, pinned modes and shared-style references. */
function collectTokenFacts(
  graph: SceneGraph,
  node: SceneNode,
  fact: DesignFact,
  prefix?: string
): void {
  const vars: Record<string, DesignVariableRef> = {}
  for (const [field, variableId] of Object.entries(node.boundVariables)) {
    if (typeof variableId !== 'string') continue
    vars[field] = variableRef(graph, variableId, prefix)
  }
  if (Object.keys(vars).length) fact.boundVariables = vars

  if (Object.keys(node.variableModes).length) {
    fact.variableModes = { ...node.variableModes }
  }

  const styleIds: Record<string, string> = {}
  for (const [name, field] of STYLE_ID_FIELDS) {
    const value = node[field]
    if (typeof value === 'string' && value) styleIds[name] = value
  }
  if (Object.keys(styleIds).length) fact.styleIds = styleIds
}

/** Collect everything about a node that CSS cannot express. */
export function designFactFromNode(
  graph: SceneGraph,
  node: SceneNode,
  options: DesignFactOptions = {}
): DesignFact | undefined {
  const fact: DesignFact = { nodeType: node.type }

  collectIdentity(node, fact)
  collectPaintsAndPosition(node, fact)
  collectTokenFacts(graph, node, fact, options.cssVarPrefix)

  const residual = residualFacts(node, options.geometryFacts ?? true, options.omittedGeometry)
  if (residual) fact.residual = residual

  return fact
}

/** Restore paint structure; authoritative over whatever the CSS mapping inferred. */
function applyPaints(node: SceneNode, fact: DesignFact): void {
  if (fact.fills) node.fills = copyFills(fact.fills)
  if (fact.strokes) node.strokes = copyStrokes(fact.strokes)
  if (fact.effects) node.effects = copyEffects(fact.effects)
}

/** Restore bindings, pinned modes and shared-style references. */
function applyTokenFacts(node: SceneNode, fact: DesignFact): void {
  if (fact.boundVariables) {
    const bound: Record<string, string> = {}
    for (const [field, ref] of Object.entries(fact.boundVariables)) {
      if (typeof ref.id === 'string') bound[field] = ref.id
    }
    if (Object.keys(bound).length) node.boundVariables = bound
  }

  if (fact.variableModes) node.variableModes = { ...fact.variableModes }

  if (!fact.styleIds) return
  for (const [name, field] of STYLE_ID_FIELDS) {
    const value = fact.styleIds[name]
    if (typeof value === 'string' && value) {
      ;(node as IndexedNode)[field] = value
    }
  }
}

/** Apply a design fact back onto a freshly created scene node. */
export function applyDesignFactToNode(node: SceneNode, fact: DesignFact | undefined): void {
  if (!fact) return

  if (fact.name) node.name = fact.name
  if (fact.componentId) node.componentId = fact.componentId
  if (fact.componentKey) node.componentKey = fact.componentKey
  if (typeof fact.x === 'number') node.x = fact.x
  if (typeof fact.y === 'number') node.y = fact.y

  applyPaints(node, fact)
  applyTokenFacts(node, fact)

  // Residual facts have no CSS representation, so nothing in the markup can contradict
  // them — but only fields on the allow-list may be written. Identity and tree structure
  // (`id`, `parentId`, `childIds`) are owned by the graph, never by an attribute.
  for (const [field, value] of Object.entries(fact.residual ?? {})) {
    if (!RESIDUAL_FIELD_SET.has(field)) continue
    ;(node as IndexedNode)[field] = structuredClone(value)
  }
}
