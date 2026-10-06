import type {
  MotionProperty,
  MotionSpec,
  MotionTransition,
  SceneGraph,
  Variable
} from '@open-pencil/scene-graph'

import { readTokenMetadata, variableCSSName } from '#core/io/formats/dtcg/metadata'
import { floatToCSS } from '#core/io/formats/dtcg/values'

import { EASING_KEYWORD_CURVES, cubicBezierCSS } from './easing'
import { durationVariableFor, easingVariableFor, resolveMotionTiming } from './tokens'

/**
 * CSS for motion specs, in Altitude's fallback pattern:
 *
 *   transition: background-color
 *     var(--al-theme-animation-duration-role-fast, var(--al-theme-animation-duration))
 *     var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing));
 *
 * Each role token is read with the legacy token it falls back to. The fallback is derived,
 * not hard-coded: a role token that is omitted from CSS in some mode (AXES.md §2.3 — it has
 * no `:root` value) aliases its fallback in that mode, so the alias target IS the fallback.
 *
 * Transition composites (`theme.animation.transition.*`) are never emitted as a custom
 * property: their `var()` references would resolve once at `:root` and freeze every nested
 * `<al-theme motion="reduced">` at full-motion timing (MOTION.md). The use case is expanded
 * at the call site instead, exactly like the `al-motion-transition()` mixin.
 */

const MAX_FALLBACK_DEPTH = 4

function aliasFallback(graph: SceneGraph, variable: Variable): Variable | null {
  const metadata = readTokenMetadata(variable)
  const omitted = metadata?.cssOmittedModes ?? []
  if (!omitted.length) return null
  const collection = graph.variableCollections.get(variable.collectionId)
  for (const name of omitted) {
    const mode = collection?.modes.find((candidate) => candidate.name === name)
    const value = mode ? variable.valuesByMode[mode.modeId] : undefined
    if (value && typeof value === 'object' && 'aliasId' in value) {
      const target = graph.variables.get(value.aliasId)
      if (target && target.id !== variable.id) return target
    }
  }
  return null
}

function literalCSS(graph: SceneGraph, variable: Variable): string | null {
  const value = graph.resolveVariable(variable.id)
  if (typeof value === 'number') {
    const unit = readTokenMetadata(variable)?.unit
    return unit ? floatToCSS(value, unit) : `${value}ms`
  }
  if (typeof value === 'string') return value
  return null
}

/** `var(--role, var(--legacy))` for a variable, or its literal value when it has no CSS name. */
export function motionVariableCSS(graph: SceneGraph, variable: Variable, depth = 0): string | null {
  const name = variableCSSName(variable)
  if (!name) return literalCSS(graph, variable)
  const fallback = depth < MAX_FALLBACK_DEPTH ? aliasFallback(graph, variable) : null
  const fallbackCSS = fallback ? motionVariableCSS(graph, fallback, depth + 1) : null
  return fallbackCSS ? `var(${name}, ${fallbackCSS})` : `var(${name})`
}

function durationCSS(graph: SceneGraph, transition: MotionTransition): string {
  const duration = transition.duration
  if (duration && 'ms' in duration) return `${duration.ms}ms`
  const variable = durationVariableFor(graph, transition)
  const css = variable ? motionVariableCSS(graph, variable) : null
  return css ?? `${resolveMotionTiming(graph, transition).durationMs}ms`
}

function easingCSS(graph: SceneGraph, transition: MotionTransition): string {
  const easing = transition.easing
  if (easing && 'keyword' in easing) return easing.keyword
  if (easing && 'cubicBezier' in easing) return cubicBezierCSS(easing.cubicBezier)
  const variable = easingVariableFor(graph, transition)
  const css = variable ? motionVariableCSS(graph, variable) : null
  if (css) return css
  const curve = resolveMotionTiming(graph, transition).easing
  const keyword = Object.entries(EASING_KEYWORD_CURVES).find(
    ([, value]) => value.join(',') === curve.join(',')
  )?.[0]
  return keyword ?? cubicBezierCSS(curve)
}

/** The CSS property name a motion property stands for. */
function motionPropertyCSS(property: MotionProperty): string {
  return property
}

/** One `transition` list item per property of `transition`. */
export function motionTransitionItems(graph: SceneGraph, transition: MotionTransition): string[] {
  const timing = `${durationCSS(graph, transition)} ${easingCSS(graph, transition)}`
  const delay = transition.delay ? ` ${transition.delay}ms` : ''
  return transition.properties.map((property) => `${motionPropertyCSS(property)} ${timing}${delay}`)
}

/**
 * The value of a `transition` declaration for a spec. A property named by several
 * transitions keeps the first, since one element has one transition per property.
 */
export function motionSpecTransitionCSS(graph: SceneGraph, spec: MotionSpec): string | null {
  const seen = new Set<string>()
  const items: string[] = []
  for (const transition of spec.transitions) {
    const [item] = motionTransitionItems(graph, { ...transition, properties: ['all'] })
    const timing = item.slice('all '.length)
    for (const property of transition.properties) {
      const css = motionPropertyCSS(property)
      if (seen.has(css)) continue
      seen.add(css)
      items.push(`${css} ${timing}`)
    }
  }
  return items.length ? items.join(', ') : null
}
