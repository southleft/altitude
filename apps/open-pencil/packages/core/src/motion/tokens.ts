import {
  MOTION_USE_CASE_ROLES,
  defaultUseCaseForTrigger,
  type CubicBezier,
  type MotionDurationRole,
  type MotionEasingRole,
  type MotionTransition,
  type MotionUseCase,
  type SceneGraph,
  type Variable,
  type VariableValue
} from '@open-pencil/scene-graph'
import { resolveVariableForNode, resolveVariableInModes } from '@open-pencil/scene-graph/variables'

import { readTokenMetadata } from '#core/io/formats/dtcg/metadata'

import { EASING_KEYWORD_CURVES, parseCSSEasing } from './easing'

/**
 * Motion role tokens.
 *
 * A transition that names a use case reads two ROLE variables — a duration role and an
 * easing role — rather than numbers. The roles are found by name: a variable whose path ends
 * in `animation/duration/role/<role>` or `animation/timing/role/<role>` (or whose DTCG path
 * ends in `animation.duration.role.<role>`). That is the convention Altitude's motion axis
 * uses, and any DTCG tree that follows it gets the same behaviour.
 *
 * Built-in values (Altitude's `full` mode) apply only when a document has no role tokens.
 */
export const DEFAULT_ROLE_DURATIONS_MS: Readonly<Record<MotionDurationRole, number>> = {
  fast: 200,
  base: 200,
  slow: 400
}

export const DEFAULT_ROLE_EASINGS: Readonly<Record<MotionEasingRole, CubicBezier>> = {
  standard: [0.15, 0.99, 0.18, 0.99],
  emphasized: [0.15, 0.99, 0.18, 0.99]
}

export type MotionRoleKind = 'duration' | 'easing'

const ROLE_SEGMENT: Record<MotionRoleKind, string> = { duration: 'duration', easing: 'timing' }

function variablePathSegments(variable: Variable): string[] {
  const path = readTokenMetadata(variable)?.path
  return (path ? path.split('.') : variable.name.split('/')).map((part) => part.toLowerCase())
}

function endsWith(segments: string[], suffix: string[]): boolean {
  if (segments.length < suffix.length) return false
  return suffix.every((part, index) => segments[segments.length - suffix.length + index] === part)
}

/** The variable holding a motion role (e.g. duration `fast`), or null when none exists. */
export function findMotionRoleVariable(
  graph: SceneGraph,
  kind: MotionRoleKind,
  role: string
): Variable | null {
  const suffix = ['animation', ROLE_SEGMENT[kind], 'role', role.toLowerCase()]
  let fallback: Variable | null = null
  for (const variable of graph.variables.values()) {
    if (kind === 'duration' && variable.type !== 'FLOAT') continue
    if (kind === 'easing' && variable.type !== 'STRING') continue
    const segments = variablePathSegments(variable)
    if (!endsWith(segments, suffix)) continue
    // Prefer the theme-level role over any deeper or component-scoped namesake.
    if (segments[0] === 'theme') return variable
    fallback ??= variable
  }
  return fallback
}

/** True for DTCG `transition` composites, which must never be read as one variable. */
export function isTransitionCompositeVariable(variable: Pick<Variable, 'extensions'>): boolean {
  return readTokenMetadata(variable)?.type === 'transition'
}

/** The use case named by a transition composite (`…/transition/hover` → `hover`). */
export function useCaseForCompositeVariable(variable: Variable): MotionUseCase | null {
  const last = variablePathSegments(variable).at(-1)
  return last && Object.hasOwn(MOTION_USE_CASE_ROLES, last) ? (last as MotionUseCase) : null
}

export interface MotionResolveContext {
  /** Resolve variables as this node sees them (its pinned modes, then active modes). */
  nodeId?: string
  /** Explicit mode per collection id; wins over `nodeId` for the listed collections. */
  modes?: Readonly<Record<string, string>>
}

function resolveValue(
  graph: SceneGraph,
  variableId: string,
  context: MotionResolveContext
): VariableValue | undefined {
  if (context.modes && Object.keys(context.modes).length) {
    return resolveVariableInModes(graph, variableId, context.modes)
  }
  if (context.nodeId && graph.getNode(context.nodeId)) {
    return resolveVariableForNode(graph, context.nodeId, variableId)
  }
  return graph.resolveVariable(variableId)
}

export interface ResolvedMotionTiming {
  durationMs: number
  delayMs: number
  easing: CubicBezier
  use: MotionUseCase
  durationRole: MotionDurationRole
  easingRole: MotionEasingRole
  /** Variable the duration came from, when it came from one. */
  durationVariableId?: string
  easingVariableId?: string
}

export function transitionUseCase(transition: MotionTransition): MotionUseCase {
  return transition.use ?? defaultUseCaseForTrigger(transition.trigger)
}

/** The duration variable a transition reads: its explicit binding, else its role token. */
export function durationVariableFor(
  graph: SceneGraph,
  transition: MotionTransition
): Variable | null {
  const duration = transition.duration
  if (duration && 'variableId' in duration) {
    const variable = graph.variables.get(duration.variableId)
    if (variable && !isTransitionCompositeVariable(variable)) return variable
  }
  if (duration && 'ms' in duration) return null
  const role = MOTION_USE_CASE_ROLES[transitionUseCase(transition)].duration
  return findMotionRoleVariable(graph, 'duration', role)
}

/** The easing variable a transition reads: its explicit binding, else its role token. */
export function easingVariableFor(
  graph: SceneGraph,
  transition: MotionTransition
): Variable | null {
  const easing = transition.easing
  if (easing && 'variableId' in easing) {
    const variable = graph.variables.get(easing.variableId)
    if (variable && !isTransitionCompositeVariable(variable)) return variable
  }
  if (easing && !('variableId' in easing)) return null
  const role = MOTION_USE_CASE_ROLES[transitionUseCase(transition)].easing
  return findMotionRoleVariable(graph, 'easing', role)
}

/**
 * Resolve a transition's timing for one variable-mode context. A Motion collection in its
 * `reduced` mode resolves every role duration to 0 ms, so the transition becomes instant.
 */
export function resolveMotionTiming(
  graph: SceneGraph,
  transition: MotionTransition,
  context: MotionResolveContext = {}
): ResolvedMotionTiming {
  const use = transitionUseCase(transition)
  const roles = MOTION_USE_CASE_ROLES[use]
  const timing: ResolvedMotionTiming = {
    durationMs: DEFAULT_ROLE_DURATIONS_MS[roles.duration],
    delayMs: transition.delay ?? 0,
    easing: DEFAULT_ROLE_EASINGS[roles.easing],
    use,
    durationRole: roles.duration,
    easingRole: roles.easing
  }

  const duration = transition.duration
  if (duration && 'ms' in duration) {
    timing.durationMs = duration.ms
  } else {
    const variable = durationVariableFor(graph, transition)
    const value = variable ? resolveValue(graph, variable.id, context) : undefined
    if (variable && typeof value === 'number' && Number.isFinite(value)) {
      timing.durationMs = Math.max(0, value)
      timing.durationVariableId = variable.id
    }
  }

  const easing = transition.easing
  if (easing && 'cubicBezier' in easing) {
    timing.easing = easing.cubicBezier
  } else if (easing && 'keyword' in easing) {
    timing.easing = EASING_KEYWORD_CURVES[easing.keyword]
  } else {
    const variable = easingVariableFor(graph, transition)
    const value = variable ? resolveValue(graph, variable.id, context) : undefined
    const curve = typeof value === 'string' ? parseCSSEasing(value) : null
    if (variable && curve) {
      timing.easing = curve
      timing.easingVariableId = variable.id
    }
  }

  return timing
}
