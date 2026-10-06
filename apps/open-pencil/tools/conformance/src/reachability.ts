import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

/** Guard against malformed parent cycles in imported files. */
const MAX_DEPTH = 200

export type RefusalReason =
  | 'self-hidden'
  | 'ancestor-hidden'
  | 'self-internal'
  | 'ancestor-internal'

/**
 * The first reason the CSS bridge would refuse `node`: it, or an ancestor, is hidden or
 * internal-only. The bridge skips those deliberately, so they are not defects.
 */
export function refusalReason(graph: SceneGraph, node: SceneNode): RefusalReason | null {
  let current: SceneNode | undefined = node
  let depth = 0
  while (current && depth++ < MAX_DEPTH) {
    if (!current.visible) return current === node ? 'self-hidden' : 'ancestor-hidden'
    if (current.internalOnly) return current === node ? 'self-internal' : 'ancestor-internal'
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

/**
 * TEXT nodes return before recursing, so their element descendants are unreachable even when
 * everything on the path is visible. That one is a real structural drop.
 */
export function isUnderText(graph: SceneGraph, node: SceneNode): boolean {
  let current = node.parentId ? graph.getNode(node.parentId) : undefined
  let depth = 0
  while (current && depth++ < MAX_DEPTH) {
    if (current.type === 'TEXT') return true
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return false
}

/** Number of nodes in the subtree rooted at `node`, including itself. */
export function subtreeSize(graph: SceneGraph, node: SceneNode): number {
  let count = 0
  const stack = [node.id]
  while (stack.length) {
    const id = stack.pop()
    const current = id ? graph.getNode(id) : undefined
    if (!current) continue
    count++
    stack.push(...current.childIds)
  }
  return count
}
