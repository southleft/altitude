import type { SceneGraph } from '@open-pencil/scene-graph'

import { computeAllLayouts } from '#core/layout'

type ComputeLayouts = (graph: SceneGraph, scopeId?: string) => void

/** Pages are `CANVAS` nodes; layout recomputation is scoped to them. */
function pageIdOf(graph: SceneGraph, nodeId: string): string | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.type === 'CANVAS') return current.id
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

/**
 * Only the pages that actually changed need layout work: the edited subtrees, the components
 * they belong to, and every instance of those components, which may sit on another page.
 */
function affectedPageIds(
  graph: SceneGraph,
  editedIds: Iterable<string>,
  componentIds: Iterable<string>
): Set<string> {
  const pageIds = new Set<string>()
  const addPageOf = (nodeId: string) => {
    const pageId = pageIdOf(graph, nodeId)
    if (pageId) pageIds.add(pageId)
  }

  for (const id of editedIds) addPageOf(id)
  for (const componentId of componentIds) {
    addPageOf(componentId)
    for (const instance of graph.getInstances(componentId)) addPageOf(instance.id)
  }
  return pageIds
}

export function createComponentSyncScheduler(
  getGraph: () => SceneGraph,
  requestRender: () => void,
  computeLayouts: ComputeLayouts = computeAllLayouts
) {
  let pendingComponentSync: Set<string> | null = null
  let isFlushingComponentSync = false
  /** Whether every pending ID came from a derived mutation (layout, page population). */
  let pendingDerivedOnly = true

  function flushComponentSync() {
    const ids = pendingComponentSync
    if (!ids) return
    const derived = pendingDerivedOnly
    pendingComponentSync = null
    pendingDerivedOnly = true
    const graph = getGraph()
    if (derived) graph.withDerivedMutations(() => syncComponents(graph, ids))
    else syncComponents(graph, ids)
  }

  function syncComponents(graph: SceneGraph, ids: Set<string>) {
    isFlushingComponentSync = true
    try {
      const componentIds = new Set<string>()
      for (const id of ids) {
        let current = graph.getNode(id)
        while (current) {
          if (current.type === 'COMPONENT') {
            componentIds.add(current.id)
            break
          }
          current = current.parentId ? graph.getNode(current.parentId) : undefined
        }
      }
      for (const compId of componentIds) {
        graph.syncInstances(compId)
      }
      if (componentIds.size > 0) {
        const pageIds = affectedPageIds(graph, ids, componentIds)
        if (pageIds.size === 0) computeLayouts(graph)
        else for (const pageId of pageIds) computeLayouts(graph, pageId)
        requestRender()
      }
    } finally {
      isFlushingComponentSync = false
    }
  }

  function scheduleComponentSync(nodeId: string) {
    if (isFlushingComponentSync) return
    if (!pendingComponentSync) {
      pendingComponentSync = new Set()
      queueMicrotask(flushComponentSync)
    }
    pendingComponentSync.add(nodeId)
    const graph = getGraph()
    if (!graph.isApplyingLayout && !graph.isApplyingDerivedMutations) pendingDerivedOnly = false
  }

  return { scheduleComponentSync }
}
