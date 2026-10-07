import type { MotionTrigger, SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { cubicBezierEasing } from './easing'
import { interpolateSnapshot, type MotionSnapshot } from './interpolate'
import { planVariantMotion } from './plan'
import { resolveMotionTiming, type MotionResolveContext, type ResolvedMotionTiming } from './tokens'
import { componentSetVariants, resolveMotionContext, resolveMotionStep } from './variants'

/**
 * Headless motion sampling: what a trigger does to a node, as timed frames. Used by agents
 * (`preview_motion`) and tests to inspect motion without a canvas. Nothing is mutated.
 */

export interface MotionSampleOptions extends MotionResolveContext {
  /** Number of frames including both ends. Default 5. */
  samples?: number
  /** Treat as OS reduced motion: one instant frame. */
  reducedMotion?: boolean
}

export interface MotionSampleFrame {
  /** Milliseconds since the trigger, delay included. */
  time: number
  /** Eased progress; may leave [0, 1] for overshooting curves. */
  progress: number
  nodes: Array<{ nodeId: string; name: string; values: MotionSnapshot }>
}

export interface MotionSample {
  nodeId: string
  trigger: MotionTrigger
  transitionId: string
  fromVariant: { id: string; name: string }
  toVariant: { id: string; name: string }
  timing: ResolvedMotionTiming
  instant: boolean
  frames: MotionSampleFrame[]
}

function subjectFor(graph: SceneGraph, node: SceneNode): SceneNode | null {
  if (node.type === 'INSTANCE' || node.type === 'COMPONENT') return node
  if (node.type === 'COMPONENT_SET') return componentSetVariants(graph, node)[0] ?? null
  return null
}

export function sampleMotion(
  graph: SceneGraph,
  nodeId: string,
  trigger: MotionTrigger,
  options: MotionSampleOptions = {}
): MotionSample | { error: string } {
  const node = graph.getNode(nodeId)
  if (!node) return { error: `Node "${nodeId}" not found` }
  const subject = subjectFor(graph, node)
  if (!subject) return { error: `"${node.name}" is not an instance, variant or component set` }
  const context = resolveMotionContext(graph, subject.id)
  if (!context) return { error: `"${node.name}" has no motion spec` }
  const step = resolveMotionStep(graph, context, trigger)
  if (!step) return { error: `No ${trigger} transition leads to another variant of "${node.name}"` }

  const timing = resolveMotionTiming(graph, step.transition, {
    nodeId: options.nodeId ?? subject.id,
    modes: options.modes
  })
  const tracks = planVariantMotion(graph, subject, step)
  const instant = options.reducedMotion === true || timing.durationMs <= 0
  const count = instant ? 1 : Math.max(2, Math.min(60, Math.round(options.samples ?? 5)))
  const ease = cubicBezierEasing(timing.easing)
  const names = new Map(
    tracks.map((track) => [track.nodeId, graph.getNode(track.nodeId)?.name ?? ''])
  )

  const frames: MotionSampleFrame[] = []
  for (let index = 0; index < count; index++) {
    const t = instant ? 1 : index / (count - 1)
    const progress = ease(t)
    frames.push({
      time: instant ? 0 : Math.round(timing.delayMs + timing.durationMs * t),
      progress,
      nodes: tracks.map((track) => ({
        nodeId: track.nodeId,
        name: names.get(track.nodeId) ?? '',
        values:
          t >= 1 ? track.to : interpolateSnapshot(track.from, track.to, progress, track.animated)
      }))
    })
  }

  return {
    nodeId,
    trigger,
    transitionId: step.transition.id,
    fromVariant: { id: step.from.id, name: step.from.name },
    toVariant: { id: step.to.id, name: step.to.name },
    timing,
    instant,
    frames
  }
}
