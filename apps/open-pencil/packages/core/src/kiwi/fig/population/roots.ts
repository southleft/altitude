import type { InstanceNodeChange } from '@open-pencil/fig/instance-overrides'
import { guidToString } from '@open-pencil/fig/node-change'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import type { GUID } from '@open-pencil/scene-graph/primitives'

/** The parts of a lazy `.fig` context that population roots are planned from. */
export interface LazyPopulationSource {
  changeMap: Map<string, InstanceNodeChange>
  guidToNodeId: Map<string, string>
  populatedRootIds: ReadonlySet<string>
}

/** Source-change fields that can name another component: swaps, instance-swap props, symbols. */
const COMPONENT_REFERENCE_FIELDS = [
  'symbolData',
  'componentPropAssignments',
  'componentPropDefs',
  'overriddenSymbolID'
] as const

const nodeIdToGuidCache = new WeakMap<Map<string, string>, Map<string, string>>()

function nodeIdToGuid(guidToNodeId: Map<string, string>): Map<string, string> {
  const cached = nodeIdToGuidCache.get(guidToNodeId)
  if (cached?.size === guidToNodeId.size) return cached
  const reversed = new Map<string, string>()
  for (const [guid, nodeId] of guidToNodeId) reversed.set(nodeId, guid)
  nodeIdToGuidCache.set(guidToNodeId, reversed)
  return reversed
}

function isGuid(value: object): value is GUID {
  return (
    'sessionID' in value &&
    'localID' in value &&
    typeof value.sessionID === 'number' &&
    typeof value.localID === 'number'
  )
}

/** Every GUID nested anywhere in a source-change value, as graph node IDs. */
function collectGuidReferences(
  value: unknown,
  guidToNodeId: Map<string, string>,
  into: string[]
): void {
  if (!value || typeof value !== 'object' || value instanceof Uint8Array) return
  if (Array.isArray(value)) {
    for (const item of value) collectGuidReferences(item, guidToNodeId, into)
    return
  }
  if (isGuid(value)) {
    const nodeId = guidToNodeId.get(guidToString(value))
    if (nodeId) into.push(nodeId)
    return
  }
  for (const child of Object.values(value)) collectGuidReferences(child, guidToNodeId, into)
}

/** Node IDs a node's instance population can read from: its component and any swap target. */
function componentReferences(
  node: SceneNode,
  source: LazyPopulationSource,
  guids: Map<string, string>,
  into: string[]
): void {
  if (node.componentId) into.push(node.componentId)
  for (const value of Object.values(node.componentPropertyAssignments)) into.push(value)
  for (const def of node.componentPropertyDefinitions) {
    if (def.type === 'INSTANCE_SWAP' && def.defaultValue) into.push(def.defaultValue)
  }
  const guid = guids.get(node.id)
  const change = guid ? source.changeMap.get(guid) : undefined
  if (!change) return
  for (const field of COMPONENT_REFERENCE_FIELDS) {
    collectGuidReferences(change[field as keyof InstanceNodeChange], source.guidToNodeId, into)
  }
}

function pageOf(graph: SceneGraph, nodeId: string): string | undefined {
  let current = graph.getNode(nodeId)
  while (current && current.type !== 'CANVAS') {
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return current?.id
}

/**
 * Plan the roots of one lazy population pass so the requested pages come out as they did
 * when every component page was populated at open.
 *
 * Each requested page is scanned for the components its instances can clone — direct
 * components, symbol-override swaps, and instance-swap properties — and any unpopulated page
 * holding one joins the pass, transitively. Nested instances inside those components then
 * get their own overrides in the same pass, before the requested page's clones copy them.
 * Pages no requested instance can reach, component pages included, wait until viewed.
 *
 * Whole pages are planned, in document order after the requested ones: override resolution
 * walks the active roots in order, so this keeps a pass identical to the eager one whenever
 * it covers the same pages.
 */
export function planLazyPopulationRoots(
  graph: SceneGraph,
  source: LazyPopulationSource,
  requestedIds: Iterable<string>
): string[] {
  const populated = source.populatedRootIds
  const guids = nodeIdToGuid(source.guidToNodeId)
  const requested: string[] = []
  const planned = new Set<string>()
  const queue: string[] = []

  const plan = (rootId: string) => {
    if (planned.has(rootId) || populated.has(rootId)) return false
    planned.add(rootId)
    queue.push(rootId)
    return true
  }

  for (const id of requestedIds) {
    if (!id || !graph.getNode(id)) continue
    const pageId = pageOf(graph, id)
    if (pageId && pageId !== id && populated.has(pageId)) continue
    if (plan(id)) requested.push(id)
  }

  const references: string[] = []
  while (queue.length > 0) {
    const rootId = queue.pop()
    if (!rootId) break
    const stack = [rootId]
    while (stack.length > 0) {
      const nodeId = stack.pop()
      const node = nodeId ? graph.getNode(nodeId) : undefined
      if (!node) continue
      componentReferences(node, source, guids, references)
      for (const childId of node.childIds) stack.push(childId)
    }
    for (const referenceId of references) {
      const pageId = pageOf(graph, referenceId)
      if (pageId) plan(pageId)
    }
    references.length = 0
  }

  const dependencies = graph
    .getPages(true)
    .map((page) => page.id)
    .filter((pageId) => planned.has(pageId) && !requested.includes(pageId))
  return [...requested, ...dependencies]
}
