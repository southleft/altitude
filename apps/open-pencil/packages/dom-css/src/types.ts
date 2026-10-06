import type {
  CodeBinding,
  Effect,
  Fill,
  SceneGraph,
  SceneNode,
  Stroke
} from '@open-pencil/scene-graph'

export type DesignNode = DesignElement | DesignText

export interface DesignDocument {
  type: 'document'
  children: DesignNode[]
  stylesheets?: DesignStyleSheet[]
  sourceGraph?: SceneGraph
}

export interface DesignElement {
  type: 'element'
  tagName: string
  attrs: Record<string, string>
  children: DesignNode[]
  inlineStyle?: DesignStyleDeclaration
  computedStyle?: DesignStyleDeclaration
  sourceSceneNodeId?: string
  sourceSceneNode?: SceneNode
  /**
   * Verbatim markup for content that HTML+CSS cannot describe as boxes — vector
   * geometry, emitted as inline SVG. Serialised as-is, never escaped, so only
   * generator-produced markup belongs here.
   */
  rawHTML?: string
  /**
   * What this element IS, as opposed to how it looks. CSS cannot express node type,
   * component identity or token bindings, so without this they are lost on every
   * crossing. Mirrored into `data-op-*` attributes, which is the form that survives
   * HTML serialisation. See `design-fact/`.
   */
  design?: DesignFact
}

/** Design facts that have no CSS representation. */
export interface DesignFact {
  nodeType?: string
  /** The layer name. CSS has no carrier for it, so without this it becomes the tag name. */
  name?: string
  componentId?: string
  componentKey?: string
  /** Code identity of a component or component set (tag, attributes, slots). */
  codeBinding?: CodeBinding
  /** Binding field (e.g. `fills/0/color`, `paddingLeft`) -> the variable it is bound to. */
  boundVariables?: Record<string, DesignVariableRef>
  /** Collection id -> mode id, for nodes that pin a variable mode. */
  variableModes?: Record<string, string>
  /** Shared-style references, keyed `fill` | `stroke` | `effect` | `text` | `grid'. */
  styleIds?: Record<string, string>
  /**
   * Paint structure, verbatim. A `Fill` carries about twenty fields — gradient stops and
   * transforms, per-layer opacity and visibility, blend mode, image scaling — against the
   * four CSS can express. The CSS declarations stay idiomatic for rendering; these keep
   * the truth.
   */
  fills?: Fill[]
  strokes?: Stroke[]
  effects?: Effect[]
  /**
   * Canvas coordinates. CSS expresses position only for absolutely positioned boxes; for
   * flow children it is derived, so the value has to travel as a fact to survive.
   */
  x?: number
  y?: number
  /**
   * Scene-node fields with no CSS expression at all — component properties, variant
   * axes, typography beyond CSS, sizing intent, vector geometry, masks. Carried
   * verbatim because there is no competing CSS value that an edit could express, so
   * restoring them can never clobber someone's change.
   */
  residual?: Record<string, unknown>
}

export interface DesignVariableRef {
  /** The authoritative id — what makes the binding restorable. */
  id: string
  /** Human-readable variable name, e.g. `color/primary/default`. */
  name?: string
  /** CSS custom property derived from `name`, e.g. `--color-primary-default`. */
  cssVar?: string
}

export interface DesignText {
  type: 'text'
  text: string
}

export interface DesignStyleSheet {
  type: 'stylesheet'
  cssText: string
  href?: string
}

export type DesignStyleDeclaration = Record<string, string>

export interface CSSComputeOptions {
  includeBrowserDefaults?: boolean
}

export interface CSSRuntime {
  readonly kind: 'browser' | 'headless'
  parseHTML(html: string): DesignDocument
  serializeHTML(document: DesignDocument): string
  computeStyles(
    document: DesignDocument,
    cssText?: string,
    options?: CSSComputeOptions
  ): Promise<DesignDocument>
}
