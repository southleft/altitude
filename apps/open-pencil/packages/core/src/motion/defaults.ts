import type {
  MotionProperty,
  MotionSpec,
  MotionTransition,
  MotionTrigger,
  MotionUseCase
} from '@open-pencil/scene-graph'
import { MOTION_SPEC_VERSION } from '@open-pencil/scene-graph'

/**
 * Default motion from interaction states, following the use-case table in Altitude's
 * MOTION.md: hover, press and focus are `hover` (fast + standard); disclosure is `expand`
 * (base + standard); a surface entering or leaving is `overlay` (slow + standard).
 *
 * Design-system specifics (which components are overlays, which CSS properties a state
 * changes) are supplied by the caller — see `tools/altitude` for the Altitude mapping.
 */

export type MotionComponentKind = 'control' | 'disclosure' | 'overlay'

export interface MotionDefaultsInput {
  /** Interaction states the component declares, e.g. `['hover', 'focus', 'disabled']`. */
  states: readonly string[]
  kind?: MotionComponentKind
  /** CSS properties each state changes, e.g. `{ hover: ['background-color', 'color'] }`. */
  properties?: Readonly<Record<string, readonly MotionProperty[]>>
}

interface StateRule {
  trigger: MotionTrigger
  use: MotionUseCase
  properties: MotionProperty[]
}

/** State name → trigger and use case. States not listed (disabled, invalid…) do not move. */
export const MOTION_STATE_RULES: Readonly<Record<string, StateRule>> = {
  hover: {
    trigger: 'hover',
    use: 'hover',
    properties: ['background-color', 'border-color', 'color', 'box-shadow']
  },
  active: {
    trigger: 'press',
    use: 'hover',
    properties: ['background-color', 'border-color', 'color', 'box-shadow']
  },
  pressed: {
    trigger: 'press',
    use: 'hover',
    properties: ['background-color', 'border-color', 'color', 'box-shadow']
  },
  focus: { trigger: 'focus', use: 'hover', properties: ['box-shadow', 'border-color'] },
  'focus-visible': { trigger: 'focus', use: 'hover', properties: ['box-shadow', 'border-color'] },
  expanded: { trigger: 'expand', use: 'expand', properties: ['height', 'transform'] },
  open: { trigger: 'expand', use: 'expand', properties: ['height', 'transform'] }
}

const KIND_TRANSITIONS: Readonly<Record<Exclude<MotionComponentKind, 'control'>, StateRule[]>> = {
  disclosure: [{ trigger: 'expand', use: 'expand', properties: ['height', 'transform'] }],
  overlay: [
    { trigger: 'enter', use: 'overlay', properties: ['opacity', 'transform'] },
    { trigger: 'exit', use: 'overlay', properties: ['opacity', 'transform'] }
  ]
}

/** Transitions implied by a component's states and kind. Triggers are not repeated. */
export function motionTransitionsForStates(input: MotionDefaultsInput): MotionTransition[] {
  const transitions: MotionTransition[] = []
  const triggers = new Set<MotionTrigger>()
  const add = (rule: StateRule, override?: readonly MotionProperty[]) => {
    if (triggers.has(rule.trigger)) return
    triggers.add(rule.trigger)
    transitions.push({
      id: rule.trigger,
      trigger: rule.trigger,
      use: rule.use,
      properties: override?.length ? [...new Set(override)] : [...rule.properties]
    })
  }
  for (const state of input.states) {
    const key = state.toLowerCase()
    if (Object.hasOwn(MOTION_STATE_RULES, key))
      add(MOTION_STATE_RULES[key], input.properties?.[state])
  }
  if (input.kind && input.kind !== 'control') {
    for (const rule of KIND_TRANSITIONS[input.kind]) add(rule, input.properties?.[rule.trigger])
  }
  return transitions
}

/** A motion spec from states, or null when nothing would move. */
export function motionSpecForStates(input: MotionDefaultsInput): MotionSpec | null {
  const transitions = motionTransitionsForStates(input)
  return transitions.length ? { version: MOTION_SPEC_VERSION, transitions } : null
}
