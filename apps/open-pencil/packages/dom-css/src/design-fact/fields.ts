import type { SceneNode } from '@open-pencil/scene-graph'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'

/** Which facts travel, under which attribute, and the per-type defaults they are diffed against. */

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
  residual: 'data-op-props',
  motion: 'data-op-motion'
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
 * Grouped by why CSS cannot say it. The precedence rules are documented in the round-trip
 * contract (`packages/docs/development/round-trip.md`).
 */
export const RESIDUAL_FIELDS = [
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
export const RESIDUAL_FIELD_SET: ReadonlySet<string> = new Set(RESIDUAL_FIELDS)

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
export const STYLE_ID_FIELDS = [
  ['fill', 'fillStyleId'],
  ['stroke', 'strokeStyleId'],
  ['effect', 'effectStyleId'],
  ['text', 'textStyleId'],
  ['grid', 'gridStyleId']
] as const

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
export const BULKY_GEOMETRY_FIELDS: ReadonlySet<string> = new Set([
  'vectorNetwork',
  'fillGeometry',
  'strokeGeometry'
])

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
export type IndexedNode = SceneNode & Record<string, unknown>

const defaultNodeCache = new Map<string, IndexedNode>()

export function defaultsForType(type: string): IndexedNode {
  let defaults = defaultNodeCache.get(type)
  if (!defaults) {
    defaults = createDefaultNode(() => 'default', type as SceneNode['type'], {}) as IndexedNode
    defaultNodeCache.set(type, defaults)
  }
  return defaults
}
