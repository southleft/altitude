import type { PluginDataEntry, SceneNode } from './types'

/**
 * Motion specs: how a component moves between its variant states.
 *
 * Code is the source of truth for motion (Altitude's `al-motion-transition()` mixin and its
 * DTCG role tokens); the canvas expresses it. A spec therefore names *use cases* and *role
 * tokens* rather than raw numbers wherever it can, so switching a Motion variable mode
 * (full / reduced / expressive) changes the timing exactly as `<al-theme motion>` does.
 *
 * Specs live on COMPONENT_SET (and optionally COMPONENT or FRAME) nodes. They are stored as
 * JSON in OpenPencil plugin data, so they survive copy/paste, undo, `.fig` save/reopen, and
 * library publication without a new Kiwi field.
 */

export const MOTION_PLUGIN_ID = 'open-pencil'
export const MOTION_PLUGIN_KEY = 'motion'
export const MOTION_SPEC_VERSION = 1

export const MOTION_TRIGGERS = [
  'hover',
  'press',
  'focus',
  'expand',
  'enter',
  'exit',
  'variant-change'
] as const
export type MotionTrigger = (typeof MOTION_TRIGGERS)[number]

/** Altitude's use cases: which duration role pairs with which easing role. */
export const MOTION_USE_CASES = ['hover', 'expand', 'overlay', 'emphasis'] as const
export type MotionUseCase = (typeof MOTION_USE_CASES)[number]

export const MOTION_DURATION_ROLES = ['fast', 'base', 'slow'] as const
export type MotionDurationRole = (typeof MOTION_DURATION_ROLES)[number]

export const MOTION_EASING_ROLES = ['standard', 'emphasized'] as const
export type MotionEasingRole = (typeof MOTION_EASING_ROLES)[number]

/** CSS-ish property names a transition can animate. `all` animates every changed field. */
export const MOTION_PROPERTIES = [
  'all',
  'opacity',
  'transform',
  'background-color',
  'color',
  'border-color',
  'border-width',
  'border-radius',
  'box-shadow',
  'width',
  'height',
  'padding',
  'gap',
  'inset'
] as const
export type MotionProperty = (typeof MOTION_PROPERTIES)[number]

export type CubicBezier = readonly [number, number, number, number]

/** A duration: bound to a variable (FLOAT, milliseconds) or literal milliseconds. */
export type MotionDuration = { variableId: string } | { ms: number }

/** An easing: bound to a variable (STRING CSS easing), a curve, or a CSS keyword. */
export type MotionEasing =
  | { variableId: string }
  | { cubicBezier: CubicBezier }
  | { keyword: MotionEasingKeyword }

export const MOTION_EASING_KEYWORDS = [
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out'
] as const
export type MotionEasingKeyword = (typeof MOTION_EASING_KEYWORDS)[number]

export interface MotionTransition {
  id: string
  trigger: MotionTrigger
  /** Variant property values the transition starts from, e.g. `{ State: 'Default' }`. */
  from?: Record<string, string>
  /** Variant property values the transition ends at, e.g. `{ State: 'Hover' }`. */
  to?: Record<string, string>
  properties: MotionProperty[]
  /** Use case: picks the duration and easing roles. Explicit timing overrides it. */
  use?: MotionUseCase
  duration?: MotionDuration
  easing?: MotionEasing
  /** Delay in milliseconds. */
  delay?: number
}

export interface MotionSpec {
  version: typeof MOTION_SPEC_VERSION
  transitions: MotionTransition[]
}

export const MOTION_NODE_TYPES: ReadonlySet<SceneNode['type']> = new Set([
  'COMPONENT_SET',
  'COMPONENT',
  'FRAME'
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function includes<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string'
  )
  return entries.length ? Object.fromEntries(entries) : undefined
}

function parseDuration(value: unknown): MotionDuration | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.variableId === 'string' && value.variableId) {
    return { variableId: value.variableId }
  }
  if (finite(value.ms) && value.ms >= 0) return { ms: value.ms }
  return undefined
}

export function isCubicBezier(value: unknown): value is CubicBezier {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every(finite) &&
    value[0] >= 0 &&
    value[0] <= 1 &&
    value[2] >= 0 &&
    value[2] <= 1
  )
}

function parseEasing(value: unknown): MotionEasing | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.variableId === 'string' && value.variableId) {
    return { variableId: value.variableId }
  }
  if (isCubicBezier(value.cubicBezier)) {
    const [x1, y1, x2, y2] = value.cubicBezier
    return { cubicBezier: [x1, y1, x2, y2] }
  }
  if (includes(MOTION_EASING_KEYWORDS, value.keyword)) return { keyword: value.keyword }
  return undefined
}

/** Validate one transition from untrusted JSON; invalid fields are dropped, not cast. */
export function parseMotionTransition(value: unknown, index = 0): MotionTransition | null {
  if (!isRecord(value) || !includes(MOTION_TRIGGERS, value.trigger)) return null
  const properties = Array.isArray(value.properties)
    ? value.properties.filter((property): property is MotionProperty =>
        includes(MOTION_PROPERTIES, property)
      )
    : []
  const transition: MotionTransition = {
    id: typeof value.id === 'string' && value.id ? value.id : `transition-${index + 1}`,
    trigger: value.trigger,
    properties: properties.length ? [...new Set(properties)] : ['all']
  }
  const from = parseStringRecord(value.from)
  if (from) transition.from = from
  const to = parseStringRecord(value.to)
  if (to) transition.to = to
  if (includes(MOTION_USE_CASES, value.use)) transition.use = value.use
  const duration = parseDuration(value.duration)
  if (duration) transition.duration = duration
  const easing = parseEasing(value.easing)
  if (easing) transition.easing = easing
  if (finite(value.delay) && value.delay > 0) transition.delay = value.delay
  return transition
}

/** Validate a spec from untrusted JSON. Returns null when nothing usable remains. */
export function parseMotionSpec(value: unknown): MotionSpec | null {
  if (!isRecord(value) || !Array.isArray(value.transitions)) return null
  const transitions = value.transitions
    .map((entry, index) => parseMotionTransition(entry, index))
    .filter((entry): entry is MotionTransition => entry !== null)
  return transitions.length ? { version: MOTION_SPEC_VERSION, transitions } : null
}

function isMotionEntry(entry: PluginDataEntry): boolean {
  return entry.pluginId === MOTION_PLUGIN_ID && entry.key === MOTION_PLUGIN_KEY
}

/** The node's own motion spec, or null. */
export function readMotionSpec(node: Pick<SceneNode, 'pluginData'>): MotionSpec | null {
  const raw = node.pluginData.find(isMotionEntry)?.value
  if (!raw) return null
  try {
    return parseMotionSpec(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * The `pluginData` array that stores `spec` on `node` (or removes it for null / empty).
 * Apply it with `graph.updateNode()` or an undoable editor update.
 */
export function motionPluginData(
  node: Pick<SceneNode, 'pluginData'>,
  spec: MotionSpec | null
): PluginDataEntry[] {
  const rest = node.pluginData.filter((entry) => !isMotionEntry(entry))
  const valid = spec ? parseMotionSpec(spec) : null
  if (!valid) return rest
  return [
    ...rest,
    { pluginId: MOTION_PLUGIN_ID, key: MOTION_PLUGIN_KEY, value: JSON.stringify(valid) }
  ]
}

/** Durations and easings per use case (Altitude MOTION.md, mirrored by `$al-motion-uses`). */
export const MOTION_USE_CASE_ROLES: Readonly<
  Record<MotionUseCase, { duration: MotionDurationRole; easing: MotionEasingRole }>
> = {
  hover: { duration: 'fast', easing: 'standard' },
  expand: { duration: 'base', easing: 'standard' },
  overlay: { duration: 'slow', easing: 'standard' },
  emphasis: { duration: 'base', easing: 'emphasized' }
}

/** The use case a trigger implies when a transition does not name one. */
export function defaultUseCaseForTrigger(trigger: MotionTrigger): MotionUseCase {
  if (trigger === 'expand') return 'expand'
  if (trigger === 'enter' || trigger === 'exit') return 'overlay'
  if (trigger === 'variant-change') return 'emphasis'
  return 'hover'
}
