import type { SceneGraph } from '@open-pencil/scene-graph'

/** The page (`CANVAS` node) a node sits on, or null when it is not on a page. */
export function pageIdOfNode(graph: Pick<SceneGraph, 'getNode'>, nodeId: string): string | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.type === 'CANVAS') return current.id
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}
