import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { copyEffects, copyFills, copyStrokes } from '@open-pencil/scene-graph/copy'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'

import { cssVarName } from './design-tokens'
import type { DesignFact, DesignVariableRef } from './types'

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

/** Canvas coordinates as carried in `data-op-pos`. */
interface CanvasPosition {
  x?: number
  y?: number
}

export const DESIGN_ATTRS = {
  nodeType: 'data-op-type',
  name: 'data-op-name',
  componentId: 'data-op-component-id',
  componentKey: 'data-op-component-key',
  boundVariables: 'data-op-vars',
  variableModes: 'data-op-var-modes',
  styleIds: 'data-op-styles',
  fills: 'data-op-fills',
  strokes: 'data-op-strokes',
  effects: 'data-op-effects',
  position: 'data-op-pos',
  residual: 'data-op-props'
} as const

/**
 * Scene-node fields with NO CSS expression at all, carried verbatim.
 *
 * The membership rule matters, because it decides who wins on re-import. CSS-expressible
 * properties are deliberately absent: if `padding-left` is editable in the exported
 * markup, a carried fact would silently clobber whoever edited it, and an edit that does
 * not survive is worse than a value that does not. Everything here is inexpressible in
 * CSS, so there is no competing edit to lose.
 *
 * Grouped by why CSS cannot say it. See `.slate/ROUND-TRIP.md` for the precedence rules.
 */
const RESIDUAL_FIELDS = [
  // Components and variants — CSS has no concept of a component, let alone a variant axis.
  'componentPropertyDefinitions',
  'componentPropertyValues',
  'componentPropertyAssignments',
  'componentPropertyReferences',
  'variantOptions',
  'variantPropSpecs',
  'instanceOverrides',
  'overrideKey',

  // Library/symbol bookkeeping that is a published fact, not a rendering detail.
  'symbolDescription',
  'symbolLinks',
  'sharedSymbolVersion',
  'isSymbolPublishable',
  'isPublishable',
  'sharedStyleType',

  // Typography beyond what CSS exposes: mixed-format runs, OpenType axes, auto-resize.
  'styleRuns',
  'fontFeatures',
  'fontVariations',
  'textAutoResize',
  'textAlignVertical',
  'textTruncation',
  'leadingTrim',
  'textDecorationStyle',
  'textDecorationThickness',
  'textDecorationSkipInk',
  'textUnderlineOffset',
  'textDecorationFills',
  'textDirection',
  'textLanguage',
  'textPathData',
  'textPathBox',

  // Resize behaviour and sizing modes. Hug/Fill is a design intent; CSS only has results.
  'horizontalConstraint',
  'verticalConstraint',
  'counterAxisSizing',
  'primaryAxisSizing',
  'counterAxisAlignContent',
  'layoutGrow',
  'layoutDirection',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
  'layoutGrids',
  'gridPosition',

  // Vector geometry. Belongs in SVG, never in CSS — see the SVG escape hatch.
  'vectorNetwork',
  'fillGeometry',
  'strokeGeometry',
  'arcData',
  'starInnerRadius',
  'pointCount',
  'handleMirroring',
  'booleanOperation',
  'strokeCap',
  'strokeJoin',
  'strokeMiterLimit',
  'dashPattern',

  // Masking and layer state.
  'isMask',
  'maskType',
  'maskIsOutline',
  'locked',

  /**
   * Only PARTIALLY expressible in CSS, so the fact has to travel too.
   *
   * `mix-blend-mode` has no `pass-through`, which is the scene default — so an explicit
   * `NORMAL` is indistinguishable from "inherit the group's blending" once it reaches
   * CSS. `independentStrokeWeights` is a design intent that the import side otherwise
   * has to re-derive by comparing weights, which flips whenever all four happen to
   * equal the stroke weight. The CSS declarations are still emitted for rendering;
   * these keep the distinction.
   */
  'blendMode',
  'independentStrokeWeights',

  /** Figma's squircle corner smoothing. CSS has no equivalent at all. */
  'cornerSmoothing'
] as const

/**
 * The residual allow-list as a set, used to police what may be written back.
 *
 * `applyDesignFactToNode` assigns residual entries straight onto the node, and on the
 * HTML path those entries come from MARKUP — which humans and agents are expected to
 * edit. Without this filter a `data-op-props` of `{"id":"x","childIds":[],"parentId":"y"}`
 * overwrote the node's identity and its place in the tree, leaving `graph.nodes` keyed by
 * one id while the node claimed another. Structural corruption from a plausible-looking
 * attribute is not an exotic threat here; it is Tuesday.
 */
const RESIDUAL_FIELD_SET: ReadonlySet<string> = new Set(RESIDUAL_FIELDS)

/**
 * Node types that may be restored from markup. Anything else is not a scene type, and
 * `createNode` would happily mint a node with a nonsense type that nothing can render.
 */
export const RESTORABLE_NODE_TYPES: ReadonlySet<string> = new Set([
  'FRAME',
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'ELLIPSE',
  'TEXT',
  'LINE',
  'STAR',
  'POLYGON',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'GROUP',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'CONNECTOR',
  'SHAPE_WITH_TEXT'
])

/** Scene-node fields that reference a shared style, and the name we record them under. */
const STYLE_ID_FIELDS = [
  ['fill', 'fillStyleId'],
  ['stroke', 'strokeStyleId'],
  ['effect', 'effectStyleId'],
  ['text', 'textStyleId'],
  ['grid', 'gridStyleId']
] as const


function variableRef(graph: SceneGraph, variableId: string, prefix?: string): DesignVariableRef {
  const variable = graph.variables.get(variableId)
  // A dangling binding still records its id — a named unknown beats a silent drop.
  if (!variable) return { id: variableId }
  return {
    id: variableId,
    name: variable.name,
    cssVar: cssVarName(variable.name, prefix)
  }
}

/**
 * Geometry fields whose serialised form is enormous.
 *
 * Measured on a real design system: carrying these in attributes produced 114MB of HTML,
 * 95% of it `data-op-*`. That is fatal for the stated goal — no person and no model reads
 * 110MB of JSON blobs — and it is redundant for a code consumer, because the SVG escape
 * hatch already puts the artwork in the markup in readable form.
 *
 * They are still carried by default: silently losing geometry is worse than a large file.
 * `geometryFacts: false` trades exactness for legibility, and says so as a degradation.
 */
const BULKY_GEOMETRY_FIELDS: ReadonlySet<string> = new Set([
  'vectorNetwork',
  'fillGeometry',
  'strokeGeometry'
])

export interface DesignFactOptions {
  /** Prefix for generated custom properties, e.g. 'al' produces `--al-color-primary`. */
  cssVarPrefix?: string
  /**
   * Carry raw vector geometry as facts. Default true (exact). False yields legible
   * markup and records a named degradation; the inline SVG still shows the artwork.
   */
  geometryFacts?: boolean
}

/** Geometry fields dropped by the most recent export, for the caller to report. */
export interface OmittedGeometry {
  nodeName: string
  fields: string[]
}

let omittedGeometry: OmittedGeometry[] = []

/** Reset before an export walk. */
export function resetOmittedGeometry(): void {
  omittedGeometry = []
}

/** Geometry the most recent export chose not to carry. Named, never silent. */
export function lastOmittedGeometry(): readonly OmittedGeometry[] {
  return omittedGeometry
}

/**
 * Per-type default nodes, built once and reused, so residual facts can be diffed against
 * them.
 *
 * Without this, every node carried every residual field — `starInnerRadius: 0.38` and
 * `maskType: "ALPHA"` on a plain frame — which made a one-div export several hundred
 * bytes of noise and destroyed the readability that putting facts in the markup was
 * supposed to buy. Restoring a default is a no-op anyway, so only differences travel.
 */
/** A scene node addressed by field name, for the generic field walks below. */
type IndexedNode = SceneNode & Record<string, unknown>

const defaultNodeCache = new Map<string, IndexedNode>()

function defaultsForType(type: string): IndexedNode {
  let defaults = defaultNodeCache.get(type)
  if (!defaults) {
    defaults = createDefaultNode(() => 'default', type as SceneNode['type'], {}) as IndexedNode
    defaultNodeCache.set(type, defaults)
  }
  return defaults
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
function residualFacts(node: SceneNode, includeGeometry: boolean): Record<string, unknown> | undefined {
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

  if (skipped.length) omittedGeometry.push({ nodeName: node.name || '(unnamed)', fields: skipped })

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

  const residual = residualFacts(node, options.geometryFacts ?? true)
  if (residual) fact.residual = residual

  return fact
}

/**
 * Map-aware JSON.
 *
 * `JSON.stringify(new Map([['a', 1]]))` is `{}` — it does not throw, it just quietly
 * returns nothing. `instanceOverrides` is built from nested Maps, so a plain stringify
 * carried an attribute that *looked* like the fact was preserved while having destroyed
 * it. A value that silently becomes empty is worse than one that is openly missing, so
 * Maps get an explicit tagged encoding both ways.
 */
const MAP_TAG = '__map__'

function mapAwareReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return { [MAP_TAG]: [...value.entries()] }
  if (value instanceof Set) return { __set__: [...value.values()] }
  return value
}

/** The shape the replacer above emits for a Map or a Set. */
interface TaggedCollection {
  [MAP_TAG]?: [unknown, unknown][]
  __set__?: unknown[]
}

function mapAwareReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const tagged = value as TaggedCollection
    if (Array.isArray(tagged[MAP_TAG])) return new Map(tagged[MAP_TAG])
    if (Array.isArray(tagged.__set__)) return new Set(tagged.__set__)
  }
  return value
}

function encodeFactJSON(value: unknown): string {
  return JSON.stringify(value, mapAwareReplacer)
}

/** Serialise a design fact into `data-op-*` attributes. */
export function designFactToAttrs(fact: DesignFact | undefined): Record<string, string> {
  if (!fact) return {}
  const attrs: Record<string, string> = {}
  if (fact.nodeType) attrs[DESIGN_ATTRS.nodeType] = fact.nodeType
  if (fact.name) attrs[DESIGN_ATTRS.name] = fact.name
  if (fact.componentId) attrs[DESIGN_ATTRS.componentId] = fact.componentId
  if (fact.componentKey) attrs[DESIGN_ATTRS.componentKey] = fact.componentKey
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
  if (fact.residual) attrs[DESIGN_ATTRS.residual] = encodeFactJSON(fact.residual)
  return attrs
}

function parseJSONArrayAttr(value: string | undefined, label: string): unknown[] | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value, mapAwareReviver)
    if (Array.isArray(parsed)) return parsed
  } catch {
    console.warn(`[dom-css] ignoring malformed ${label} attribute: ${value.slice(0, 80)}`)
  }
  return undefined
}

function parseJSONAttr(value: string | undefined, label: string): Record<string, never> | undefined {
  if (!value) return undefined
  try {
    const parsed = JSON.parse(value, mapAwareReviver)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  } catch {
    // Malformed markup is not this layer's problem to fix, but it must not be silent.
    console.warn(`[dom-css] ignoring malformed ${label} attribute: ${value.slice(0, 80)}`)
  }
  return undefined
}

/** Recover a design fact from `data-op-*` attributes after an HTML round trip. */
export function designFactFromAttrs(attrs: Record<string, string>): DesignFact | undefined {
  const fact: DesignFact = {}

  const nodeType = attrs[DESIGN_ATTRS.nodeType]
  if (nodeType) fact.nodeType = nodeType
  const name = attrs[DESIGN_ATTRS.name]
  if (name) fact.name = name
  const componentId = attrs[DESIGN_ATTRS.componentId]
  if (componentId) fact.componentId = componentId
  const componentKey = attrs[DESIGN_ATTRS.componentKey]
  if (componentKey) fact.componentKey = componentKey

  const boundVariables = parseJSONAttr(
    attrs[DESIGN_ATTRS.boundVariables],
    DESIGN_ATTRS.boundVariables
  )
  if (boundVariables) fact.boundVariables = boundVariables as DesignFact['boundVariables']
  const variableModes = parseJSONAttr(attrs[DESIGN_ATTRS.variableModes], DESIGN_ATTRS.variableModes)
  if (variableModes) fact.variableModes = variableModes as DesignFact['variableModes']
  const styleIds = parseJSONAttr(attrs[DESIGN_ATTRS.styleIds], DESIGN_ATTRS.styleIds)
  if (styleIds) fact.styleIds = styleIds as DesignFact['styleIds']

  const fills = parseJSONArrayAttr(attrs[DESIGN_ATTRS.fills], DESIGN_ATTRS.fills)
  if (fills) fact.fills = fills
  const strokes = parseJSONArrayAttr(attrs[DESIGN_ATTRS.strokes], DESIGN_ATTRS.strokes)
  if (strokes) fact.strokes = strokes
  const effects = parseJSONArrayAttr(attrs[DESIGN_ATTRS.effects], DESIGN_ATTRS.effects)
  if (effects) fact.effects = effects

  const position: CanvasPosition | undefined = parseJSONAttr(
    attrs[DESIGN_ATTRS.position],
    DESIGN_ATTRS.position
  )
  if (typeof position?.x === 'number') fact.x = position.x
  if (typeof position?.y === 'number') fact.y = position.y

  const residual = parseJSONAttr(attrs[DESIGN_ATTRS.residual], DESIGN_ATTRS.residual)
  if (residual) fact.residual = residual as DesignFact['residual']

  return Object.keys(fact).length ? fact : undefined
}

/** Restore paint structure; authoritative over whatever the CSS mapping inferred. */
function applyPaints(node: SceneNode, fact: DesignFact): void {
  if (fact.fills) node.fills = copyFills(fact.fills as SceneNode['fills'])
  if (fact.strokes) node.strokes = copyStrokes(fact.strokes as SceneNode['strokes'])
  if (fact.effects) node.effects = copyEffects(fact.effects as SceneNode['effects'])
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
