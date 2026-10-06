import {
  MOTION_TRIGGERS,
  type MotionProperty,
  type MotionTransition,
  type MotionTrigger,
  type MotionUseCase
} from '@open-pencil/scene-graph'

/**
 * Pure edits on a transition list. Each returns a new list; the Motion section writes the
 * result back as one undoable spec replacement.
 */

export const DEFAULT_TRIGGER_PROPERTIES: Readonly<Record<MotionTrigger, MotionProperty[]>> = {
  hover: ['background-color', 'border-color', 'color', 'box-shadow'],
  press: ['background-color', 'border-color', 'color', 'box-shadow'],
  focus: ['box-shadow', 'border-color'],
  expand: ['height', 'transform'],
  enter: ['opacity', 'transform'],
  exit: ['opacity', 'transform'],
  'variant-change': ['all']
}

type TransitionPatch = (transition: MotionTransition) => MotionTransition

function withoutKey(transition: MotionTransition, key: keyof MotionTransition): MotionTransition {
  const copy = { ...transition }
  Reflect.deleteProperty(copy, key)
  return copy
}

export function patchTransition(
  list: readonly MotionTransition[],
  id: string,
  patch: TransitionPatch
): MotionTransition[] | null {
  if (!list.some((transition) => transition.id === id)) return null
  return list.map((transition) => (transition.id === id ? patch(transition) : transition))
}

/** Add a transition for `trigger`, or the first trigger the list does not use yet. */
export function addTransition(
  list: readonly MotionTransition[],
  trigger?: MotionTrigger
): MotionTransition[] {
  const used = new Set(list.map((transition) => transition.trigger))
  const chosen = trigger ?? MOTION_TRIGGERS.find((candidate) => !used.has(candidate)) ?? 'hover'
  let id: string = chosen
  for (let index = 2; list.some((transition) => transition.id === id); index++) {
    id = `${chosen}-${index}`
  }
  return [...list, { id, trigger: chosen, properties: [...DEFAULT_TRIGGER_PROPERTIES[chosen]] }]
}

export const setTrigger =
  (trigger: MotionTrigger): TransitionPatch =>
  (transition) => ({ ...transition, trigger })

export const setUse =
  (use: MotionUseCase | null): TransitionPatch =>
  (transition) =>
    use ? { ...transition, use } : withoutKey(transition, 'use')

export const toggleProperty =
  (property: MotionProperty): TransitionPatch =>
  (transition) => {
    const properties = new Set<MotionProperty>(
      transition.properties.filter((entry) => entry !== 'all')
    )
    if (properties.has(property)) properties.delete(property)
    else properties.add(property)
    return { ...transition, properties: properties.size ? [...properties] : ['all'] }
  }

/** Bind the duration to a variable, or null to follow the use case's role token. */
export const setDurationVariable =
  (variableId: string | null): TransitionPatch =>
  (transition) =>
    variableId ? { ...transition, duration: { variableId } } : withoutKey(transition, 'duration')

export const setEasingVariable =
  (variableId: string | null): TransitionPatch =>
  (transition) =>
    variableId ? { ...transition, easing: { variableId } } : withoutKey(transition, 'easing')

/** Set one destination variant value, or null to infer it from the trigger. */
export const setTarget =
  (property: string, value: string | null): TransitionPatch =>
  (transition) => {
    const to = Object.fromEntries(
      Object.entries(transition.to ?? {}).filter(([key]) => key !== property)
    )
    if (value) to[property] = value
    return Object.keys(to).length ? { ...transition, to } : withoutKey(transition, 'to')
  }
