import type { CodeBinding, CodeBindingProp } from '@open-pencil/scene-graph'

import type { AnatomyNode, CemElement, ContractProp } from '../contract'

/** CSS property → variable name (the contract token's `figma` side). */
export type CSSTokens = Record<string, string>

export interface AxisCode {
  prop: ContractProp
  binding: CodeBindingProp
}

export interface PlanAxis {
  name: string
  values: string[]
  default: string
  /** `case` axes fan out a measured case dimension; buildOps calls these case axes. */
  kind: 'state' | 'prop' | 'case'
  code: AxisCode[]
  /** The anatomy case dimension a `case` axis comes from. */
  dimension?: string
}

export type PlanPropertyRole = 'text' | 'slot-toggle' | 'slot-icon' | 'prop'

export interface PlanProperty {
  name: string
  type: 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP'
  default: string
  role: PlanPropertyRole
  slot?: string
  icon?: string
}

export interface PlanVariant {
  name: string
  values: Record<string, string>
  state: string
  tree: AnatomyNode
  /** The measured case the tree came from, or null for the base anatomy. */
  caseName: string | null
  /** Root CSS property → variable name, after conditionalBindings and state layering. */
  rootTokens: CSSTokens
  /** Anatomy path (`0.1.0`) → tokens, from measured stateOverrides. */
  pathTokens: Record<string, CSSTokens>
  /** CSS part name → tokens, from conditionalBindings `parts`. */
  partTokens: Record<string, CSSTokens>
}

export interface ComponentPlan {
  tag: string
  name: string
  axes: PlanAxis[]
  properties: PlanProperty[]
  variants: PlanVariant[]
  defaultVariant: string
  textDefault: string | null
  nestedTags: string[]
  codeBinding: CodeBinding
  degradations: string[]
}

export interface PlanContext {
  cem?: CemElement
  reactComponents?: ReadonlySet<string>
  /** Variable names that exist in the document; bindings to anything else are reported. */
  variableNames?: ReadonlySet<string>
}
