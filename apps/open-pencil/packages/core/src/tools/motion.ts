import * as v from 'valibot'

import {
  MOTION_EASING_KEYWORDS,
  MOTION_NODE_TYPES,
  MOTION_PROPERTIES,
  MOTION_SPEC_VERSION,
  MOTION_TRIGGERS,
  MOTION_USE_CASES,
  motionPluginData,
  readMotionSpec,
  type MotionDuration,
  type MotionEasing,
  type MotionEasingKeyword,
  type MotionSpec,
  type MotionTransition,
  type MotionUseCase,
  type SceneGraph,
  type Variable
} from '@open-pencil/scene-graph'

import { variableCSSName } from '#core/io/formats/dtcg/metadata'
import {
  motionSpecTransitionCSS,
  motionTransitionItems,
  parseCSSEasing,
  resolveMotionContext,
  resolveMotionTiming,
  sampleMotion,
  isTransitionCompositeVariable,
  useCaseForCompositeVariable,
  variantOptions
} from '#core/motion'
import { nodeIdInput, toolNumber } from '#core/tools/input'
import { defineTool, nodeNotFound } from '#core/tools/schema'

/** A variable by id, exact name, or CSS custom property (`--al-x` or `var(--al-x)`). */
function findVariable(graph: SceneGraph, ref: string): Variable | null {
  const direct = graph.variables.get(ref)
  if (direct) return direct
  const css = /^(?:var\(\s*)?(--[\w-]+)\s*\)?$/.exec(ref.trim())?.[1]
  for (const variable of graph.variables.values()) {
    if (variable.name === ref) return variable
    if (css && variableCSSName(variable) === css) return variable
  }
  return null
}

const MS_OR_S = /^(-?\d*\.?\d+)\s*(ms|s)$/i

function parseDuration(
  graph: SceneGraph,
  value: number | string
): MotionDuration | { error: string } {
  if (typeof value === 'number') return { ms: Math.max(0, value) }
  const literal = MS_OR_S.exec(value.trim())
  if (literal) {
    const amount = Number(literal[1]) * (literal[2].toLowerCase() === 's' ? 1000 : 1)
    return { ms: Math.max(0, amount) }
  }
  const variable = findVariable(graph, value)
  if (!variable) return { error: `Duration variable "${value}" not found` }
  if (isTransitionCompositeVariable(variable)) {
    return { error: `"${variable.name}" is a transition composite; pass it as "use" instead` }
  }
  if (variable.type !== 'FLOAT') return { error: `"${variable.name}" is not a number variable` }
  return { variableId: variable.id }
}

function parseEasing(graph: SceneGraph, value: string): MotionEasing | { error: string } {
  const text = value.trim()
  if ((MOTION_EASING_KEYWORDS as readonly string[]).includes(text)) {
    return { keyword: text as MotionEasingKeyword }
  }
  const curve = parseCSSEasing(text)
  if (curve && text.startsWith('cubic-bezier')) return { cubicBezier: curve }
  const variable = findVariable(graph, text)
  if (!variable) return { error: `Easing "${value}" is neither a curve nor a variable` }
  if (isTransitionCompositeVariable(variable)) {
    return { error: `"${variable.name}" is a transition composite; pass it as "use" instead` }
  }
  if (variable.type !== 'STRING') return { error: `"${variable.name}" is not a string variable` }
  return { variableId: variable.id }
}

/** `hover`, or a transition composite variable whose last segment names the use case. */
function parseUse(graph: SceneGraph, value: string): MotionUseCase | { error: string } {
  if ((MOTION_USE_CASES as readonly string[]).includes(value)) return value as MotionUseCase
  const variable = findVariable(graph, value)
  const use = variable ? useCaseForCompositeVariable(variable) : null
  return use ?? { error: `Unknown use case "${value}" (expected ${MOTION_USE_CASES.join(', ')})` }
}

const stringRecord = v.record(v.string(), v.string())

const transitionInput = v.object({
  id: v.optional(v.pipe(v.string(), v.description('Stable id; defaults to the trigger'))),
  trigger: v.pipe(v.picklist(MOTION_TRIGGERS), v.description('What starts the transition')),
  from: v.optional(
    v.pipe(stringRecord, v.description('Variant values it starts from, e.g. {"State":"Default"}'))
  ),
  to: v.optional(
    v.pipe(
      stringRecord,
      v.description(
        'Variant values it ends at, e.g. {"State":"Hover"}. Omit to infer from the trigger.'
      )
    )
  ),
  properties: v.optional(
    v.pipe(
      v.array(v.picklist(MOTION_PROPERTIES)),
      v.description('CSS properties to animate (default all)')
    )
  ),
  use: v.optional(
    v.pipe(
      v.string(),
      v.description(
        'Use case: hover | expand | overlay | emphasis, or a transition composite token such as theme/animation/transition/hover. Picks role tokens that follow the Motion mode.'
      )
    )
  ),
  duration: v.optional(
    v.pipe(
      v.union([v.number(), v.string()]),
      v.description('Override: milliseconds, "0.2s", or a duration variable id/name/--css-name')
    )
  ),
  easing: v.optional(
    v.pipe(
      v.string(),
      v.description('Override: CSS keyword, cubic-bezier(…), or an easing variable id/name')
    )
  ),
  delay: v.optional(toolNumber(v.pipe(v.number(), v.minValue(0), v.description('Delay in ms'))))
})

function parseTransitionInput(
  graph: SceneGraph,
  input: v.InferOutput<typeof transitionInput>
): MotionTransition | { error: string } {
  const transition: MotionTransition = {
    id: input.id ?? input.trigger,
    trigger: input.trigger,
    properties: input.properties?.length ? input.properties : ['all']
  }
  if (input.from) transition.from = input.from
  if (input.to) transition.to = input.to
  if (input.use) {
    const use = parseUse(graph, input.use)
    if (typeof use !== 'string') return use
    transition.use = use
  }
  if (input.duration !== undefined) {
    const duration = parseDuration(graph, input.duration)
    if ('error' in duration) return duration
    transition.duration = duration
  }
  if (input.easing) {
    const easing = parseEasing(graph, input.easing)
    if ('error' in easing) return easing
    transition.easing = easing
  }
  if (input.delay) transition.delay = input.delay
  return transition
}

function describeTransitions(graph: SceneGraph, nodeId: string, transitions: MotionTransition[]) {
  return transitions.map((transition) => {
    const timing = resolveMotionTiming(graph, transition, { nodeId })
    return {
      ...transition,
      resolved: {
        use: timing.use,
        durationMs: timing.durationMs,
        easing: `cubic-bezier(${timing.easing.join(', ')})`,
        durationVariable: timing.durationVariableId
          ? graph.variables.get(timing.durationVariableId)?.name
          : undefined,
        easingVariable: timing.easingVariableId
          ? graph.variables.get(timing.easingVariableId)?.name
          : undefined
      },
      css: motionTransitionItems(graph, transition).join(', ')
    }
  })
}

export const getMotion = defineTool({
  name: 'get_motion',
  description:
    'Read the motion spec that governs a component set, variant, frame or instance: its transitions (trigger, variant from/to, properties, use case or token bindings), the timing they resolve to in the current Motion variable mode, the CSS transition they export as, and the variant options.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.object({ id: nodeIdInput }),
  execute: (figma, { id }) => {
    const graph = figma.graph
    const node = graph.getNode(id)
    if (!node) return nodeNotFound(id)
    const context = resolveMotionContext(graph, id)
    const componentSet = context?.componentSet
    return {
      id,
      ownerId: context?.owner.id ?? null,
      ownerName: context?.owner.name ?? null,
      own: readMotionSpec(node) !== null,
      variants: componentSet ? Object.fromEntries(variantOptions(graph, componentSet)) : {},
      transitions: context ? describeTransitions(graph, id, context.spec.transitions) : [],
      css: context ? motionSpecTransitionCSS(graph, context.spec) : null
    }
  }
})

export const setMotion = defineTool({
  name: 'set_motion',
  description:
    'Set the motion spec of a component set (or variant/frame): how instances transition between variants. Prefer a use case (hover, expand, overlay, emphasis) so timing follows the Motion variable mode (full/reduced/expressive); override duration/easing only when the design system has no role for it. mode "merge" replaces transitions with the same id and keeps the rest. Pass transitions: [] with mode "replace" to remove motion.',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.object({
    id: nodeIdInput,
    transitions: v.array(transitionInput),
    mode: v.optional(v.picklist(['replace', 'merge']))
  }),
  execute: (figma, { id, transitions, mode }) => {
    const graph = figma.graph
    const node = graph.getNode(id)
    if (!node) return nodeNotFound(id)
    if (!MOTION_NODE_TYPES.has(node.type)) {
      return { error: `Motion lives on component sets, variants or frames, not ${node.type}` }
    }
    const parsed: MotionTransition[] = []
    for (const input of transitions) {
      const transition = parseTransitionInput(graph, input)
      if ('error' in transition) return transition
      parsed.push(transition)
    }
    const existing = mode === 'merge' ? (readMotionSpec(node)?.transitions ?? []) : []
    const ids = new Set(parsed.map((transition) => transition.id))
    const next = [...existing.filter((transition) => !ids.has(transition.id)), ...parsed]
    const spec: MotionSpec | null = next.length
      ? { version: MOTION_SPEC_VERSION, transitions: next }
      : null
    graph.updateNode(id, { pluginData: motionPluginData(node, spec) })
    return {
      id,
      transitions: spec ? describeTransitions(graph, id, spec.transitions) : [],
      css: spec ? motionSpecTransitionCSS(graph, spec) : null
    }
  }
})

export const previewMotion = defineTool({
  name: 'preview_motion',
  description:
    'Simulate a motion trigger on an instance, variant or component set without changing the document: returns the destination variant, the resolved timing, and timed frames of the properties that change. Pass motion_mode (e.g. "reduced") to evaluate another Motion variable mode; reduced resolves to 0 ms (instant).',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.object({
    id: nodeIdInput,
    trigger: v.picklist(MOTION_TRIGGERS),
    motion_mode: v.optional(
      v.pipe(
        v.string(),
        v.description('Mode name of the collection holding the motion role tokens')
      )
    ),
    samples: v.optional(
      toolNumber(v.pipe(v.number(), v.minValue(1), v.maxValue(60), v.description('Frames')))
    )
  }),
  execute: (figma, { id, trigger, motion_mode, samples }) => {
    const graph = figma.graph
    let modes: Record<string, string> | undefined
    if (motion_mode) {
      const wanted = motion_mode.toLowerCase()
      modes = {}
      for (const collection of graph.variableCollections.values()) {
        const mode = collection.modes.find((candidate) => candidate.name.toLowerCase() === wanted)
        if (mode) modes[collection.id] = mode.modeId
      }
      if (!Object.keys(modes).length) return { error: `No collection has a mode "${motion_mode}"` }
    }
    return sampleMotion(graph, id, trigger, { modes, samples, nodeId: id })
  }
})
