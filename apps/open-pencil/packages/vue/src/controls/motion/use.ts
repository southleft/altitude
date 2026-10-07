import { computed } from 'vue'

import {
  findMotionRoleVariable,
  motionSpecForStates,
  resolveMotionContext,
  resolveMotionTiming,
  transitionUseCase,
  variantOptions
} from '@open-pencil/core/motion'
import {
  MOTION_SPEC_VERSION,
  readMotionSpec,
  type MotionProperty,
  type MotionSpec,
  type MotionTransition,
  type MotionTrigger,
  type MotionUseCase,
  type SceneNode
} from '@open-pencil/scene-graph'

import { useEditor } from '#vue/editor/context'
import { useSceneComputed } from '#vue/internal/scene-computed/use'

import {
  addTransition,
  patchTransition,
  setDurationVariable,
  setEasingVariable,
  setTarget,
  setTrigger,
  setUse,
  toggleProperty
} from './edit'
import { useMotionPlay } from './play'

/** One transition as the Motion section shows it, with timing resolved for the selection. */
export interface MotionTransitionControl {
  id: string
  trigger: MotionTrigger
  use: MotionUseCase
  properties: MotionProperty[]
  to: Record<string, string> | null
  durationMs: number
  easing: string
  /** Variable the duration reads (role token or explicit binding), when any. */
  durationVariable: { id: string; name: string } | null
  easingVariable: { id: string; name: string } | null
  /** True when the duration is an explicit binding rather than the use case's role token. */
  durationBound: boolean
  easingBound: boolean
}

export interface MotionModeControl {
  collectionId: string
  collectionName: string
  activeModeId: string
  modes: Array<{ modeId: string; name: string }>
}

export interface MotionVariableOption {
  id: string
  name: string
}

function motionTarget(node: SceneNode | null): SceneNode | null {
  if (!node) return null
  if (node.type === 'COMPONENT_SET' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    return node
  }
  return null
}

/**
 * Headless state and actions for the Design panel's Motion section.
 *
 * Shows the spec that governs the selected component set, variant or instance. Edits are
 * written to the spec's owner (normally the COMPONENT_SET) as single undo steps; an instance
 * selection is read-only apart from playing a transition on it.
 */
export function useMotionSpec() {
  const editor = useEditor()

  const selected = useSceneComputed(() => {
    const nodes = editor.getSelectedNodes()
    return nodes.length === 1 ? motionTarget(nodes[0] ?? null) : null
  })

  const context = useSceneComputed(() => {
    const node = selected.value
    return node ? resolveMotionContext(editor.graph, node.id) : null
  })

  /** Where edits go: the existing owner, else the component set (or lone component). */
  const owner = useSceneComputed<SceneNode | null>(() => {
    const node = selected.value
    if (!node) return null
    if (context.value) return context.value.owner
    if (node.type === 'COMPONENT_SET') return node
    if (node.type === 'COMPONENT') {
      const parent = node.parentId ? editor.graph.getNode(node.parentId) : undefined
      return parent?.type === 'COMPONENT_SET' ? parent : node
    }
    return null
  })

  const active = computed(() => selected.value !== null)
  const editable = computed(() => owner.value !== null && !owner.value.librarySource?.readOnly)
  const isInstance = computed(() => selected.value?.type === 'INSTANCE')

  const spec = computed<MotionSpec | null>(() => context.value?.spec ?? null)

  const variants = useSceneComputed<Record<string, string[]>>(() => {
    const set =
      context.value?.componentSet ?? (owner.value?.type === 'COMPONENT_SET' ? owner.value : null)
    return set ? Object.fromEntries(variantOptions(editor.graph, set)) : {}
  })

  function variableRef(id: string | undefined) {
    const variable = id ? editor.graph.variables.get(id) : undefined
    return variable ? { id: variable.id, name: variable.name } : null
  }

  const transitions = useSceneComputed<MotionTransitionControl[]>(() => {
    const node = selected.value
    const current = spec.value
    if (!node || !current) return []
    return current.transitions.map((transition) => {
      const timing = resolveMotionTiming(editor.graph, transition, { nodeId: node.id })
      return {
        id: transition.id,
        trigger: transition.trigger,
        use: transitionUseCase(transition),
        properties: [...transition.properties],
        to: transition.to ? { ...transition.to } : null,
        durationMs: Math.round(timing.durationMs),
        easing: `cubic-bezier(${timing.easing.join(', ')})`,
        durationVariable: variableRef(timing.durationVariableId),
        easingVariable: variableRef(timing.easingVariableId),
        durationBound: transition.duration !== undefined,
        easingBound: transition.easing !== undefined
      }
    })
  })

  /** The collection holding the motion role tokens, for the mode switcher. */
  const motionMode = useSceneComputed<MotionModeControl | null>(() => {
    const variable = findMotionRoleVariable(editor.graph, 'duration', 'fast')
    const collection = variable
      ? editor.graph.variableCollections.get(variable.collectionId)
      : undefined
    if (!collection || collection.modes.length < 2) return null
    return {
      collectionId: collection.id,
      collectionName: collection.name,
      activeModeId: editor.graph.getActiveModeId(collection.id),
      modes: collection.modes.map((mode) => ({ modeId: mode.modeId, name: mode.name }))
    }
  })

  const durationVariables = useSceneComputed<MotionVariableOption[]>(() =>
    [...editor.graph.variables.values()]
      .filter((variable) => variable.type === 'FLOAT' && /duration/i.test(variable.name))
      .map((variable) => ({ id: variable.id, name: variable.name }))
  )

  const easingVariables = useSceneComputed<MotionVariableOption[]>(() =>
    [...editor.graph.variables.values()]
      .filter((variable) => variable.type === 'STRING' && /(timing|easing)/i.test(variable.name))
      .map((variable) => ({ id: variable.id, name: variable.name }))
  )

  function write(next: MotionTransition[] | null, label: string) {
    const target = owner.value
    if (!next || !target || !editable.value) return false
    return editor.setMotionSpec(
      target.id,
      next.length ? { version: MOTION_SPEC_VERSION, transitions: next } : null,
      label
    )
  }

  function current(): MotionTransition[] {
    const target = owner.value
    return target ? (readMotionSpec(target)?.transitions ?? []) : []
  }

  const edit = (id: string, patch: Parameters<typeof patchTransition>[2]) =>
    write(patchTransition(current(), id, patch), 'Edit motion')

  /** Default transitions from the variant values the set already has (Hover, Pressed…). */
  function suggestFromVariants() {
    const states = Object.values(variants.value)
      .flat()
      .map((value) => value.toLowerCase())
    const suggested = motionSpecForStates({ states })
    return suggested ? write(suggested.transitions, 'Suggest motion') : false
  }

  function setMotionMode(modeId: string) {
    const mode = motionMode.value
    if (mode) editor.setActiveMode(mode.collectionId, modeId)
  }

  const { playing, play } = useMotionPlay(editor, selected, transitions)

  return {
    active,
    editable,
    isInstance,
    owner,
    spec,
    variants,
    transitions,
    motionMode,
    durationVariables,
    easingVariables,
    playing,
    addTransition: (trigger?: MotionTrigger) =>
      write(addTransition(current(), trigger), 'Add motion'),
    removeTransition: (id: string) =>
      write(
        current().filter((transition) => transition.id !== id),
        'Remove motion'
      ),
    setTrigger: (id: string, trigger: MotionTrigger) => edit(id, setTrigger(trigger)),
    setUse: (id: string, use: MotionUseCase | null) => edit(id, setUse(use)),
    toggleProperty: (id: string, property: MotionProperty) => edit(id, toggleProperty(property)),
    setDurationVariable: (id: string, variableId: string | null) =>
      edit(id, setDurationVariable(variableId)),
    setEasingVariable: (id: string, variableId: string | null) =>
      edit(id, setEasingVariable(variableId)),
    setTarget: (id: string, property: string, value: string | null) =>
      edit(id, setTarget(property, value)),
    suggestFromVariants,
    setMotionMode,
    play
  }
}
