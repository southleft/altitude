import { pick } from 'es-toolkit'

import type { MotionTrigger, SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import { cubicBezierEasing } from './easing'
import { interpolateSnapshot, type MotionSnapshot } from './interpolate'
import { planVariantMotion, type MotionTrack } from './plan'
import { resolveMotionTiming, type ResolvedMotionTiming } from './tokens'
import { resolveMotionContext, resolveMotionStep, type MotionStep } from './variants'

/**
 * Motion preview playback.
 *
 * Moves an instance to the variant a trigger targets and back, by writing PREVIEW patches
 * (`graph.updateNodePreview`) frame by frame. Nothing is committed: no undo entry, no
 * component sync, and stopping restores every touched field exactly. Bound colours are
 * unbound in the patch (and restored afterwards) so the interpolated colour is what renders.
 */

export interface MotionClock {
  now: () => number
  requestFrame: (callback: () => void) => unknown
  cancelFrame: (handle: unknown) => void
}

export interface MotionPlaybackHost {
  getGraph: () => SceneGraph
  requestRepaint: () => void
  requestRender: () => void
  beginInteractiveEdit: () => () => void
  /** OS / app reduced-motion preference. Reduced motion makes every transition instant. */
  prefersReducedMotion: () => boolean
  clock?: MotionClock
}

export type MotionPlayStatus = 'animating' | 'instant' | 'none'

export interface MotionPlayResult {
  status: MotionPlayStatus
  instanceId: string
  trigger: MotionTrigger
  transitionId?: string
  fromVariantId?: string
  toVariantId?: string
  timing?: ResolvedMotionTiming
}

interface Segment {
  from: Map<string, MotionSnapshot>
  toward: 'target' | 'origin'
  start: number
  duration: number
  progressFrom: number
  ease: (t: number) => number
}

interface Playback {
  instanceId: string
  trigger: MotionTrigger
  graph: SceneGraph
  step: MotionStep
  timing: ResolvedMotionTiming
  tracks: MotionTrack[]
  originals: Map<string, Partial<SceneNode>>
  applied: Map<string, MotionSnapshot>
  progress: number
  segment: Segment | null
  release: () => void
}

const COLOR_BINDING = /^(fills|strokes)\/\d+\/color$/

function defaultClock(): MotionClock {
  const raf = typeof globalThis.requestAnimationFrame === 'function'
  return {
    now: () => (typeof performance === 'undefined' ? Date.now() : performance.now()),
    requestFrame: (callback) =>
      raf ? globalThis.requestAnimationFrame(callback) : setTimeout(callback, 16),
    cancelFrame: (handle) => {
      if (raf && typeof handle === 'number') globalThis.cancelAnimationFrame(handle)
      else clearTimeout(handle as ReturnType<typeof setTimeout>)
    }
  }
}

export function createMotionPlayback(host: MotionPlaybackHost) {
  const clock = host.clock ?? defaultClock()
  /** Per instance, a stack: a press on a hovered instance starts from the hover variant. */
  const stacks = new Map<string, Playback[]>()
  let frame: unknown = null

  function allPlaybacks(): Playback[] {
    return [...stacks.values()].flat()
  }

  function top(instanceId: string): Playback | undefined {
    return stacks.get(instanceId)?.at(-1)
  }

  function find(instanceId: string, trigger?: MotionTrigger): Playback | undefined {
    const stack = stacks.get(instanceId) ?? []
    return trigger ? stack.findLast((playback) => playback.trigger === trigger) : stack.at(-1)
  }

  function patchFor(playback: Playback, nodeId: string, snapshot: MotionSnapshot) {
    const patch: Partial<SceneNode> = { ...snapshot }
    const original = playback.originals.get(nodeId)?.boundVariables
    if (original && (snapshot.fills || snapshot.strokes)) {
      patch.boundVariables = Object.fromEntries(
        Object.entries(original).filter(([key]) => !COLOR_BINDING.test(key))
      )
    }
    return patch
  }

  function apply(playback: Playback, snapshots: Map<string, MotionSnapshot>) {
    if (playback.graph !== host.getGraph()) return
    for (const [nodeId, snapshot] of snapshots) {
      if (!playback.graph.getNode(nodeId)) continue
      playback.graph.updateNodePreview(nodeId, patchFor(playback, nodeId, snapshot))
      playback.applied.set(nodeId, snapshot)
    }
    host.requestRepaint()
  }

  function endpoint(playback: Playback, toward: Segment['toward']) {
    return new Map(
      playback.tracks.map((track) => [track.nodeId, toward === 'target' ? track.to : track.from])
    )
  }

  function remove(playback: Playback) {
    const stack = (stacks.get(playback.instanceId) ?? []).filter((entry) => entry !== playback)
    if (stack.length) stacks.set(playback.instanceId, stack)
    else stacks.delete(playback.instanceId)
  }

  function restore(playback: Playback) {
    // Anything stacked above was planned from this playback's state; unwind it first.
    const stack = stacks.get(playback.instanceId) ?? []
    for (const above of stack.slice(stack.indexOf(playback) + 1).reverse()) restore(above)
    remove(playback)
    if (playback.graph === host.getGraph()) {
      for (const [nodeId, original] of playback.originals) {
        if (playback.graph.getNode(nodeId)) {
          playback.graph.updateNodePreview(nodeId, structuredClone(original))
        }
      }
      host.requestRender()
    }
    playback.release()
  }

  function finish(playback: Playback, toward: Segment['toward']) {
    playback.segment = null
    playback.progress = toward === 'target' ? 1 : 0
    if (toward === 'origin') {
      restore(playback)
      return
    }
    apply(playback, endpoint(playback, 'target'))
  }

  function tick() {
    frame = null
    const now = clock.now()
    for (const playback of allPlaybacks()) {
      const segment = playback.segment
      if (!segment) continue
      const elapsed = now - segment.start
      if (elapsed < 0) continue
      const t = segment.duration > 0 ? Math.min(1, elapsed / segment.duration) : 1
      const goal = segment.toward === 'target' ? 1 : 0
      playback.progress = segment.progressFrom + (goal - segment.progressFrom) * t
      if (t >= 1) {
        finish(playback, segment.toward)
        continue
      }
      const eased = segment.ease(t)
      const goalSnapshots = endpoint(playback, segment.toward)
      const frameSnapshots = new Map<string, MotionSnapshot>()
      for (const track of playback.tracks) {
        const from = segment.from.get(track.nodeId) ?? track.from
        const to = goalSnapshots.get(track.nodeId) ?? track.to
        frameSnapshots.set(track.nodeId, interpolateSnapshot(from, to, eased, track.animated))
      }
      apply(playback, frameSnapshots)
    }
    schedule()
  }

  function schedule() {
    if (frame !== null) return
    if (allPlaybacks().some((playback) => playback.segment)) {
      frame = clock.requestFrame(tick)
    }
  }

  function startSegment(playback: Playback, toward: Segment['toward']) {
    const goal = toward === 'target' ? 1 : 0
    const remaining = Math.abs(goal - playback.progress)
    const instant = host.prefersReducedMotion() || playback.timing.durationMs <= 0
    if (instant || remaining === 0) {
      finish(playback, toward)
      return 'instant' as const
    }
    playback.segment = {
      from: new Map(
        playback.tracks.map((track) => [
          track.nodeId,
          playback.applied.get(track.nodeId) ?? track.from
        ])
      ),
      toward,
      start: clock.now() + playback.timing.delayMs,
      // Reversing part-way takes the share of the duration already travelled, as CSS does.
      duration: playback.timing.durationMs * remaining,
      progressFrom: playback.progress,
      ease: cubicBezierEasing(playback.timing.easing)
    }
    schedule()
    return 'animating' as const
  }

  function capture(graph: SceneGraph, tracks: MotionTrack[]) {
    const originals = new Map<string, Partial<SceneNode>>()
    for (const track of tracks) {
      const node = graph.getNode(track.nodeId)
      if (!node) continue
      const keys = [...(Object.keys(track.to) as (keyof SceneNode)[]), 'boundVariables' as const]
      originals.set(track.nodeId, structuredClone(pick(node, keys)))
    }
    return originals
  }

  function enter(instanceId: string, trigger: MotionTrigger): MotionPlayResult {
    const existing = find(instanceId, trigger)
    if (existing) {
      if (existing !== top(instanceId)) return { ...describe(existing), status: 'none' }
      return { ...describe(existing), status: startSegment(existing, 'target') }
    }
    const graph = host.getGraph()
    const instance = graph.getNode(instanceId)
    if (instance?.type !== 'INSTANCE') return { status: 'none', instanceId, trigger }
    const context = resolveMotionContext(graph, instanceId)
    const below = top(instanceId)
    const step = context
      ? resolveMotionStep(graph, below ? { ...context, variant: below.step.to } : context, trigger)
      : null
    if (!step) return { status: 'none', instanceId, trigger }
    const tracks = planVariantMotion(graph, instance, step)
    const timing = resolveMotionTiming(graph, step.transition, { nodeId: instanceId })
    const playback: Playback = {
      instanceId,
      trigger,
      graph,
      step,
      timing,
      tracks,
      originals: capture(graph, tracks),
      applied: new Map(),
      progress: 0,
      segment: null,
      release: host.beginInteractiveEdit()
    }
    stacks.set(instanceId, [...(stacks.get(instanceId) ?? []), playback])
    return { ...describe(playback), status: startSegment(playback, 'target') }
  }

  function describe(playback: Playback): MotionPlayResult {
    return {
      status: 'animating',
      instanceId: playback.instanceId,
      trigger: playback.trigger,
      transitionId: playback.step.transition.id,
      fromVariantId: playback.step.from.id,
      toVariantId: playback.step.to.id,
      timing: playback.timing
    }
  }

  function leave(instanceId: string, trigger?: MotionTrigger) {
    const playback = find(instanceId, trigger)
    if (!playback) return
    // Leaving a state with another stacked on top drops the upper one instantly.
    const stack = stacks.get(instanceId) ?? []
    for (const above of stack.slice(stack.indexOf(playback) + 1).reverse()) restore(above)
    startSegment(playback, 'origin')
  }

  function toggle(instanceId: string, trigger: MotionTrigger): MotionPlayResult {
    const playback = find(instanceId, trigger)
    const headingToTarget = playback?.segment
      ? playback.segment.toward === 'target'
      : playback?.progress === 1
    if (playback && headingToTarget) {
      leave(instanceId, trigger)
      return { ...describe(playback), status: playback.segment ? 'animating' : 'instant' }
    }
    return enter(instanceId, trigger)
  }

  function stop(instanceId?: string) {
    const ids = instanceId ? [instanceId] : [...stacks.keys()]
    for (const id of ids) {
      const first = stacks.get(id)?.[0]
      if (first) restore(first)
    }
    if (stacks.size === 0 && frame !== null) {
      clock.cancelFrame(frame)
      frame = null
    }
  }

  /** A committed edit to a node being previewed wins: keep it, then stop that playback. */
  function handleNodeUpdated(nodeId: string, changes: Partial<SceneNode>) {
    for (const playback of allPlaybacks()) {
      const original = playback.originals.get(nodeId)
      if (!original) continue
      const kept = Object.fromEntries(
        Object.entries(original).filter(([key]) => !Object.hasOwn(changes, key))
      )
      playback.originals.set(nodeId, kept)
    }
    for (const [instanceId, stack] of stacks) {
      if (stack.some((playback) => playback.originals.has(nodeId))) stop(instanceId)
    }
  }

  return {
    enter,
    leave,
    toggle,
    stop,
    handleNodeUpdated,
    isActive: (instanceId: string) => stacks.has(instanceId),
    activeIds: () => [...stacks.keys()],
    dispose: () => stop()
  }
}

export type MotionPlayback = ReturnType<typeof createMotionPlayback>
