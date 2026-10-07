import {
  readMotionSpec,
  type MotionSpec,
  type MotionTransition,
  type MotionTrigger,
  type SceneGraph,
  type SceneNode
} from '@open-pencil/scene-graph'

/**
 * Where a node's motion comes from, and which variant a trigger moves it to.
 *
 * An INSTANCE moves by its main component's COMPONENT_SET spec; a variant COMPONENT uses its
 * set's spec unless it has its own; a COMPONENT_SET, COMPONENT or FRAME may carry its own.
 */

export interface MotionContext {
  /** The node whose spec applies (usually the COMPONENT_SET). */
  owner: SceneNode
  spec: MotionSpec
  componentSet: SceneNode | null
  /** The variant COMPONENT the node currently shows, when there is one. */
  variant: SceneNode | null
}

function parentComponentSet(graph: SceneGraph, component: SceneNode): SceneNode | null {
  const parent = component.parentId ? graph.getNode(component.parentId) : undefined
  return parent?.type === 'COMPONENT_SET' ? parent : null
}

/** The motion spec governing `nodeId`, or null when nothing applies. */
export function resolveMotionContext(graph: SceneGraph, nodeId: string): MotionContext | null {
  const node = graph.getNode(nodeId)
  if (!node) return null
  let variant: SceneNode | null = null
  if (node.type === 'INSTANCE') {
    variant = node.componentId ? (graph.getNode(node.componentId) ?? null) : null
  } else if (node.type === 'COMPONENT') {
    variant = node
  }
  let componentSet: SceneNode | null = null
  if (node.type === 'COMPONENT_SET') componentSet = node
  else if (variant) componentSet = parentComponentSet(graph, variant)

  const candidates = [node.type === 'INSTANCE' ? null : node, variant, componentSet]
  for (const candidate of candidates) {
    if (!candidate) continue
    const spec = readMotionSpec(candidate)
    if (spec) return { owner: candidate, spec, componentSet, variant }
  }
  return null
}

/** Variant values that mean "the state this trigger produces", most specific first. */
export const TRIGGER_STATE_VALUES: Readonly<Record<MotionTrigger, readonly string[]>> = {
  hover: ['hover', 'hovered', 'hovering'],
  press: ['pressed', 'press', 'active'],
  focus: ['focus', 'focused', 'focus-visible', 'focus visible'],
  expand: ['expanded', 'open', 'opened', 'expand'],
  enter: ['open', 'visible', 'shown', 'enter', 'in'],
  exit: ['closed', 'hidden', 'exit', 'out'],
  'variant-change': []
}

function matches(values: Readonly<Record<string, string>>, subset?: Record<string, string>) {
  if (!subset) return true
  return Object.entries(subset).every(([key, value]) => values[key] === value)
}

export function variantValues(node: SceneNode | null): Record<string, string> {
  return node ? { ...node.componentPropertyValues } : {}
}

export function componentSetVariants(graph: SceneGraph, componentSet: SceneNode): SceneNode[] {
  return componentSet.childIds
    .map((id) => graph.getNode(id))
    .filter((child): child is SceneNode => child?.type === 'COMPONENT')
}

/** The variant whose values equal `values` exactly on every property it defines. */
export function findVariant(
  graph: SceneGraph,
  componentSet: SceneNode,
  values: Readonly<Record<string, string>>
): SceneNode | null {
  return (
    componentSetVariants(graph, componentSet).find((variant) => {
      const own = variant.componentPropertyValues
      const keys = new Set([...Object.keys(own), ...Object.keys(values)])
      return [...keys].every((key) => own[key] === values[key])
    }) ?? null
  )
}

/** Variant property options across the set: `{ State: ['Default', 'Hover'] }`. */
export function variantOptions(graph: SceneGraph, componentSet: SceneNode): Map<string, string[]> {
  const options = new Map<string, string[]>()
  for (const variant of componentSetVariants(graph, componentSet)) {
    for (const [key, value] of Object.entries(variant.componentPropertyValues)) {
      const list = options.get(key) ?? []
      if (!list.includes(value)) list.push(value)
      options.set(key, list)
    }
  }
  return options
}

/**
 * The values a trigger moves to when a transition does not say: the first property with an
 * option that names the trigger's state (`State=Hover` for `hover`).
 */
export function inferTriggerTarget(
  graph: SceneGraph,
  componentSet: SceneNode,
  trigger: MotionTrigger
): Record<string, string> | null {
  const wanted = TRIGGER_STATE_VALUES[trigger]
  for (const state of wanted) {
    for (const [key, values] of variantOptions(graph, componentSet)) {
      const value = values.find((option) => option.toLowerCase() === state)
      if (value) return { [key]: value }
    }
  }
  return null
}

export interface MotionStep {
  transition: MotionTransition
  from: SceneNode
  to: SceneNode
}

/**
 * The transition and destination variant for `trigger` from the current variant. Returns null
 * when the spec has no matching transition or the destination variant does not exist.
 */
export function resolveMotionStep(
  graph: SceneGraph,
  context: MotionContext,
  trigger: MotionTrigger
): MotionStep | null {
  const { componentSet, variant, spec } = context
  if (!componentSet || !variant) return null
  const current = variantValues(variant)
  for (const transition of spec.transitions) {
    if (transition.trigger !== trigger || !matches(current, transition.from)) continue
    const target = transition.to ?? inferTriggerTarget(graph, componentSet, trigger)
    if (!target) continue
    const destination = findVariant(graph, componentSet, { ...current, ...target })
    if (destination && destination.id !== variant.id) {
      return { transition, from: variant, to: destination }
    }
  }
  return null
}
