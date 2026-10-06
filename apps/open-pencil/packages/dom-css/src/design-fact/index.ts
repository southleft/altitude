import {
  copyCodeBinding,
  motionPluginData,
  readMotionSpec,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'
import { copyEffects, copyFills, copyStrokes } from '@open-pencil/scene-graph/copy'

import { cssVarNameForVariable } from '../design-tokens'
import type { DesignFact, DesignVariableRef } from '../types'
import { factToAttrs } from './attrs'
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

/** Encoded per-type defaults, keyed by type then field. `null` marks a default JSON rejects. */
const defaultEncodings = new Map<string, Map<string, string | null>>()

function tryEncode(value: unknown): string | null {
  try {
    return encodeFactJSON(value)
  } catch {
    return null
  }
}

function encodedDefault(type: string, field: string, value: unknown): string | null {
  let byField = defaultEncodings.get(type)
  if (!byField) {
    byField = new Map()
    defaultEncodings.set(type, byField)
  }
  let encoded = byField.get(field)
  if (encoded === undefined) {
    encoded = tryEncode(value)
    byField.set(field, encoded)
  }
  return encoded
}

/**
 * Whether a value's encoding can differ from its default's without encoding either: the
 * answer is decided by identity, type, array-ness, length or collection size. Undefined
 * means only the encodings can tell.
 */
function cheapSameValue(value: unknown, fallback: unknown): boolean | undefined {
  if (value === fallback) return true
  if (typeof value !== typeof fallback) return false
  if (!value || typeof value !== 'object') return false
  if (!fallback || typeof fallback !== 'object') return false
  if (Array.isArray(value) !== Array.isArray(fallback)) return false
  if (Array.isArray(value) && Array.isArray(fallback) && value.length !== fallback.length) {
    return false
  }
  if (value instanceof Map !== fallback instanceof Map) return false
  if (value instanceof Map && fallback instanceof Map && value.size !== fallback.size) {
    return false
  }
  return provablySameEncoding(value, fallback, 2) || undefined
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * True only when two values must encode identically: the same reference or primitive, two
 * empty Maps, Sets or arrays, or plain objects with the same keys in the same order whose
 * values pass the same test. False means "not proven", never "different".
 * `instanceOverrides` — `{ self: Map, descendants: Map }` on every node — settles here.
 */
function provablySameEncoding(a: unknown, b: unknown, depth: number): boolean {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  if (a instanceof Map || a instanceof Set || Array.isArray(a)) return bothEmptyCollections(a, b)
  if (depth === 0 || !isPlainObject(a) || !isPlainObject(b)) return false
  return sameKeysProvablySame(a, b, depth - 1)
}

/** Two empty Maps, Sets or arrays of the same kind encode identically. */
function bothEmptyCollections(
  a: Map<unknown, unknown> | Set<unknown> | unknown[],
  b: object
): boolean {
  if (Array.isArray(a)) return Array.isArray(b) && a.length === 0 && b.length === 0
  if (!(b instanceof Map || b instanceof Set) || a.constructor !== b.constructor) return false
  return a.size === 0 && b.size === 0
}

function sameKeysProvablySame(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  depth: number
): boolean {
  const keys = Object.keys(a)
  const otherKeys = Object.keys(b)
  if (keys.length !== otherKeys.length) return false
  return keys.every(
    (key, index) => key === otherKeys[index] && provablySameEncoding(a[key], b[key], depth)
  )
}

function hasOwnKey(value: object): boolean {
  for (const key in value) if (Object.hasOwn(value, key)) return true
  return false
}

function isEmptyFact(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  return typeof value === 'object' && !hasOwnKey(value)
}

interface ResidualFacts {
  residual: Record<string, unknown>
  /** `encodeFactJSON(residual)`, assembled from the per-field encodings made while diffing. */
  encoded: string | undefined
}

/**
 * Residual fields whose value differs from this node type's default.
 *
 * Diffing used to encode both the value and the default to JSON for every field of every
 * node — the bulk of an export's time, dominated by vector geometry that `geometryFacts:
 * false` then dropped anyway. Bulky fields are now settled first, cheap structural checks
 * decide most comparisons, defaults are encoded once, and each kept value's encoding is
 * reused for the attribute instead of being produced a second time.
 */
function residualFacts(
  node: SceneNode,
  includeGeometry: boolean,
  omitted: OmittedGeometry[] | undefined
): ResidualFacts | undefined {
  const defaults = defaultsForType(node.type)
  const residual: Record<string, unknown> = {}
  const encodedFields: string[] = []
  let encodable = true
  const skipped: string[] = []

  for (const field of RESIDUAL_FIELDS) {
    const value = (node as IndexedNode)[field]
    const fallback = defaults[field]
    // Most fields hold their default; both checks skip the field, so the cheaper goes first.
    if (value === fallback || isEmptyFact(value)) continue
    let encoded: string | null | undefined
    let same = cheapSameValue(value, fallback)
    if (same === undefined) {
      encoded = tryEncode(value)
      same = encoded !== null && encoded === encodedDefault(node.type, field, fallback)
    }
    if (same) continue
    if (!includeGeometry && BULKY_GEOMETRY_FIELDS.has(field)) {
      skipped.push(field)
      continue
    }
    // Primitives need no copy; structures are copied so the fact never aliases the node.
    residual[field] = typeof value === 'object' ? structuredClone(value) : value
    encoded ??= tryEncode(value)
    if (encoded === null) encodable = false
    else encodedFields.push(`${JSON.stringify(field)}:${encoded}`)
  }

  if (skipped.length) omitted?.push({ nodeName: node.name || '(unnamed)', fields: skipped })

  if (!Object.keys(residual).length) return undefined
  // A value JSON rejects is left for the attribute encoder to reject, exactly as before.
  return { residual, encoded: encodable ? `{${encodedFields.join(',')}}` : undefined }
}

/** Identity: what this layer is called and what component it belongs to. */
function collectIdentity(node: SceneNode, fact: DesignFact): void {
  if (node.name) fact.name = node.name
  if (node.componentId) fact.componentId = node.componentId
  if (node.componentKey) fact.componentKey = node.componentKey
  if (node.codeBinding) fact.codeBinding = copyCodeBinding(node.codeBinding) ?? undefined
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

function collectDesignFact(
  graph: SceneGraph,
  node: SceneNode,
  options: DesignFactOptions
): { fact: DesignFact; encodedResidual?: string } {
  const fact: DesignFact = { nodeType: node.type }

  collectIdentity(node, fact)
  collectPaintsAndPosition(node, fact)
  collectTokenFacts(graph, node, fact, options.cssVarPrefix)
  const motion = readMotionSpec(node)
  if (motion) fact.motion = motion

  const residual = residualFacts(node, options.geometryFacts ?? true, options.omittedGeometry)
  if (!residual) return { fact }
  fact.residual = residual.residual
  return { fact, encodedResidual: residual.encoded }
}

/** Collect everything about a node that CSS cannot express. */
export function designFactFromNode(
  graph: SceneGraph,
  node: SceneNode,
  options: DesignFactOptions = {}
): DesignFact | undefined {
  return collectDesignFact(graph, node, options).fact
}

/**
 * `designFactFromNode` plus its `data-op-*` attributes, encoding each value once: the
 * residual attribute reuses the encodings the diff against defaults already produced.
 */
export function designFactWithAttrsFromNode(
  graph: SceneGraph,
  node: SceneNode,
  options: DesignFactOptions = {}
): { fact: DesignFact; attrs: Record<string, string> } {
  const { fact, encodedResidual } = collectDesignFact(graph, node, options)
  return { fact, attrs: factToAttrs(fact, encodedResidual) }
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
  if (fact.codeBinding) node.codeBinding = copyCodeBinding(fact.codeBinding)
  if (typeof fact.x === 'number') node.x = fact.x
  if (typeof fact.y === 'number') node.y = fact.y

  applyPaints(node, fact)
  applyTokenFacts(node, fact)
  if (fact.motion) node.pluginData = motionPluginData(node, fact.motion)

  // Residual facts have no CSS representation, so nothing in the markup can contradict
  // them — but only fields on the allow-list may be written. Identity and tree structure
  // (`id`, `parentId`, `childIds`) are owned by the graph, never by an attribute.
  for (const [field, value] of Object.entries(fact.residual ?? {})) {
    if (!RESIDUAL_FIELD_SET.has(field)) continue
    ;(node as IndexedNode)[field] = structuredClone(value)
  }
}
