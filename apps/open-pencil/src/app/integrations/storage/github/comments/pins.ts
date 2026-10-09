import type { SceneGraph } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { CommentAnchor } from './anchor'

export type CommentPinPlacement = {
  /** Absolute canvas position of the pin's tip. */
  point: Vector
  /** The anchor node no longer exists (or moved to another page): stored coordinates. */
  orphaned: boolean
}

export type CommentViewport = { panX: number; panY: number; zoom: number }

/** The page a node is on, walking up to the CANVAS ancestor. */
export function pageOfNode(graph: SceneGraph, nodeId: string): string | null {
  let node = graph.getNode(nodeId)
  for (let depth = 0; node && depth < 10_000; depth++) {
    if (node.type === 'CANVAS') return node.id
    node = node.parentId ? graph.getNode(node.parentId) : undefined
  }
  return null
}

/**
 * Where a comment's pin goes now: at its node's current absolute position plus the stored
 * offset, so it follows moves; at the stored coordinates when there is no such node.
 */
export function placeCommentPin(graph: SceneGraph, anchor: CommentAnchor): CommentPinPlacement {
  if (anchor.node) {
    const node = graph.getNode(anchor.node)
    if (node && pageOfNode(graph, node.id) === anchor.page) {
      const origin = graph.getAbsolutePosition(node.id)
      return { point: { x: origin.x + anchor.dx, y: origin.y + anchor.dy }, orphaned: false }
    }
    return { point: { x: anchor.x, y: anchor.y }, orphaned: true }
  }
  return { point: { x: anchor.x, y: anchor.y }, orphaned: false }
}

/** Canvas to screen (CSS pixels within the canvas element). Pins keep a constant size. */
export function canvasToScreen(point: Vector, viewport: CommentViewport): Vector {
  return { x: point.x * viewport.zoom + viewport.panX, y: point.y * viewport.zoom + viewport.panY }
}

export function screenToCanvas(point: Vector, viewport: CommentViewport): Vector {
  return {
    x: (point.x - viewport.panX) / viewport.zoom,
    y: (point.y - viewport.panY) / viewport.zoom
  }
}

/** The anchor for a click at `point` on `pageId`, attached to `nodeId` when there is one. */
export function anchorAt(
  graph: SceneGraph,
  input: {
    doc: string
    page: string
    nodeId: string | null
    point: Vector
    branch: string
    commit: string
  }
): CommentAnchor {
  const node = input.nodeId ? graph.getNode(input.nodeId) : undefined
  const origin = node ? graph.getAbsolutePosition(node.id) : null
  return {
    doc: input.doc,
    page: input.page,
    node: node?.id ?? null,
    x: input.point.x,
    y: input.point.y,
    dx: origin ? input.point.x - origin.x : 0,
    dy: origin ? input.point.y - origin.y : 0,
    branch: input.branch,
    commit: input.commit
  }
}

/** A thread placed on the current page. */
export type CommentPin<Thread> = { thread: Thread; point: Vector; orphaned: boolean }

export type CommentPanelSections<Thread = CommentThreadLike> = {
  /** Threads with a pin on the current page. */
  page: Thread[]
  /** Threads whose layer is gone, or without a readable anchor. */
  orphaned: Thread[]
  /** Threads on other pages, with the page name. */
  otherPages: Array<{ thread: Thread; pageName: string }>
}

type CommentThreadLike = { number: number; anchor: CommentAnchor | null }

/**
 * Pins for the current page and the panel's sections. Orphaned threads still get a pin at
 * their stored position when it was on this page.
 */
export function arrangeComments<Thread extends CommentThreadLike>(
  graph: SceneGraph,
  threads: readonly Thread[],
  currentPageId: string
): { pins: Array<CommentPin<Thread>>; sections: CommentPanelSections<Thread> } {
  const pins: Array<CommentPin<Thread>> = []
  const sections: CommentPanelSections<Thread> = { page: [], orphaned: [], otherPages: [] }
  for (const thread of threads) {
    const anchor = thread.anchor
    if (!anchor) {
      sections.orphaned.push(thread)
      continue
    }
    const placement = placeCommentPin(graph, anchor)
    if (placement.orphaned) sections.orphaned.push(thread)
    if (anchor.page !== currentPageId) {
      if (!placement.orphaned) {
        const page = graph.getNode(anchor.page)
        sections.otherPages.push({ thread, pageName: page?.name ?? anchor.page })
      }
      continue
    }
    if (!placement.orphaned) sections.page.push(thread)
    pins.push({ thread, point: placement.point, orphaned: placement.orphaned })
  }
  return { pins, sections }
}
