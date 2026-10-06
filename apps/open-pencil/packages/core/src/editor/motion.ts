import {
  MOTION_NODE_TYPES,
  motionPluginData,
  parseMotionSpec,
  readMotionSpec,
  type MotionSpec,
  type MotionTrigger,
  type SceneNode
} from '@open-pencil/scene-graph'

import {
  createMotionPlayback,
  resolveMotionContext,
  type MotionContext,
  type MotionPlayResult
} from '#core/motion'

import type { EditorContext } from './types'

function systemPrefersReducedMotion(): boolean {
  return (
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Component motion: authoring specs (undoable plugin-data edits) and the Motion preview
 * mode, which plays transitions on instances as preview patches that never reach history.
 */
export function createMotionActions(ctx: EditorContext) {
  let previewEnabled = false
  let prefersReducedMotion = systemPrefersReducedMotion

  const playback = createMotionPlayback({
    getGraph: () => ctx.graph,
    requestRepaint: ctx.requestRepaint,
    requestRender: ctx.requestRender,
    beginInteractiveEdit: ctx.beginInteractiveEdit,
    prefersReducedMotion: () => prefersReducedMotion()
  })

  const subscriptions = [
    ctx.onEditorEvent('graph:replaced', () => playback.stop()),
    ctx.onEditorEvent('page:changed', () => playback.stop()),
    ctx.onEditorEvent('node:updated', (id, changes) => playback.handleNodeUpdated(id, changes)),
    ctx.onEditorEvent('node:deleted', () => playback.stop())
  ]

  /** The node's own spec, or null. */
  function getMotionSpec(nodeId: string): MotionSpec | null {
    const node = ctx.graph.getNode(nodeId)
    return node ? readMotionSpec(node) : null
  }

  /** The spec that governs a node: its own, its variant's, or its component set's. */
  function getNodeMotion(nodeId: string): MotionContext | null {
    return resolveMotionContext(ctx.graph, nodeId)
  }

  function canHaveMotion(node: SceneNode | undefined): node is SceneNode {
    return node !== undefined && MOTION_NODE_TYPES.has(node.type)
  }

  /** Replace (or clear, with null) a node's spec as one undo step. False when not allowed. */
  function setMotionSpec(nodeId: string, spec: MotionSpec | null, label = 'Set motion'): boolean {
    const node = ctx.graph.getNode(nodeId)
    if (!canHaveMotion(node)) return false
    const valid = spec ? parseMotionSpec(spec) : null
    if (spec && !valid) return false
    playback.stop()
    const before = structuredClone(node.pluginData)
    const after = motionPluginData(node, valid)
    const apply = (pluginData: SceneNode['pluginData']) => {
      ctx.graph.updateNode(nodeId, { pluginData: structuredClone(pluginData) })
      ctx.requestRender()
    }
    apply(after)
    ctx.undo.push({ label, forward: () => apply(after), inverse: () => apply(before) })
    return true
  }

  function isMotionPreviewEnabled(): boolean {
    return previewEnabled
  }

  function setMotionPreviewEnabled(enabled: boolean) {
    if (previewEnabled === enabled) return
    previewEnabled = enabled
    if (!enabled) playback.stop()
    ctx.emitEditorEvent('motion:preview-changed', enabled)
  }

  /** Supply the app's effective reduced-motion policy; defaults to the OS media query. */
  function setMotionReducedMotionSource(source: () => boolean) {
    prefersReducedMotion = source
  }

  /**
   * The instance a pointer over `nodeId` would move: the innermost INSTANCE ancestor (or
   * self) that a motion spec governs. Null when nothing there can move.
   */
  function findMotionTarget(nodeId: string | null): string | null {
    let current = nodeId ? ctx.graph.getNode(nodeId) : undefined
    while (current) {
      if (current.type === 'INSTANCE' && resolveMotionContext(ctx.graph, current.id)) {
        return current.id
      }
      current = current.parentId ? ctx.graph.getNode(current.parentId) : undefined
    }
    return null
  }

  function playMotion(nodeId: string, trigger: MotionTrigger): MotionPlayResult {
    return playback.enter(nodeId, trigger)
  }

  function reverseMotion(nodeId: string, trigger?: MotionTrigger) {
    playback.leave(nodeId, trigger)
  }

  function toggleMotion(nodeId: string, trigger: MotionTrigger): MotionPlayResult {
    return playback.toggle(nodeId, trigger)
  }

  function stopMotion(nodeId?: string) {
    playback.stop(nodeId)
  }

  function disposeMotion() {
    playback.dispose()
    for (const stop of subscriptions) stop()
  }

  return {
    getMotionSpec,
    getNodeMotion,
    setMotionSpec,
    isMotionPreviewEnabled,
    setMotionPreviewEnabled,
    setMotionReducedMotionSource,
    findMotionTarget,
    playMotion,
    reverseMotion,
    toggleMotion,
    stopMotion,
    isMotionPlaying: playback.isActive,
    disposeMotion
  }
}
