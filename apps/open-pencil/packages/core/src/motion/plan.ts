import { isEqual } from 'es-toolkit'

import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

import {
  MOTION_FIELDS,
  motionFieldsForProperties,
  type MotionField,
  type MotionSnapshot
} from './interpolate'
import type { MotionStep } from './variants'

/**
 * A motion plan: for every node of an instance, the state it shows now and the state the
 * destination variant would give it, with colour bindings already resolved in the
 * instance's variable modes.
 *
 * Fields the instance overrides (its value differs from its current variant's) keep the
 * instance's value, as a real variant swap would. Instance children pair with destination
 * variant children by name path, the way Figma swaps variants.
 */
export interface MotionTrack {
  nodeId: string
  from: MotionSnapshot
  to: MotionSnapshot
  animated: Set<MotionField>
}

function childrenOf(graph: SceneGraph, node: SceneNode): SceneNode[] {
  return node.childIds
    .map((id) => graph.getNode(id))
    .filter((child): child is SceneNode => child !== undefined)
}

/** Index a variant's descendants by name path, with a counter for repeated sibling names. */
function indexByPath(graph: SceneGraph, root: SceneNode): Map<string, SceneNode> {
  const index = new Map<string, SceneNode>()
  function walk(node: SceneNode, prefix: string) {
    const seen = new Map<string, number>()
    for (const child of childrenOf(graph, node)) {
      const count = seen.get(child.name) ?? 0
      seen.set(child.name, count + 1)
      const path = `${prefix}/${child.name}#${count}`
      index.set(path, child)
      walk(child, path)
    }
  }
  walk(root, '')
  return index
}

function pathOf(graph: SceneGraph, root: SceneNode, node: SceneNode): string | null {
  const parts: string[] = []
  let current: SceneNode = node
  while (current.id !== root.id) {
    const parent = current.parentId ? graph.getNode(current.parentId) : undefined
    if (!parent) return null
    const { id, name } = current
    const position = childrenOf(graph, parent)
      .filter((sibling) => sibling.name === name)
      .findIndex((sibling) => sibling.id === id)
    parts.unshift(`${name}#${position}`)
    current = parent
  }
  return `/${parts.join('/')}`
}

/**
 * The visual state of `node` as seen from `contextId`: bound colours resolve in the context
 * node's modes, so a hover colour bound to a token shows the token's current mode value.
 */
export function motionSnapshot(
  graph: SceneGraph,
  node: SceneNode,
  contextId: string
): MotionSnapshot {
  const snapshot: Record<string, unknown> = {}
  for (const field of MOTION_FIELDS) snapshot[field] = structuredClone(node[field])
  const resolve = (key: string) => {
    const variableId = node.boundVariables[key]
    return variableId ? graph.resolveColorVariableForNode(contextId, variableId) : undefined
  }
  const result = snapshot as MotionSnapshot
  result.fills = (result.fills ?? []).map((fill, index) => {
    const color = resolve(`fills/${index}/color`)
    return color ? { ...fill, color } : fill
  })
  result.strokes = (result.strokes ?? []).map((stroke, index) => {
    const color = resolve(`strokes/${index}/color`)
    return color ? { ...stroke, color } : stroke
  })
  return result
}

function isRoot(node: SceneNode, instance: SceneNode): boolean {
  return node.id === instance.id
}

/**
 * Build the per-node tracks that move `instance` from its variant to `step.to`. Passing the
 * source variant itself as `instance` plans the variant-to-variant motion with no instance.
 */
export function planVariantMotion(
  graph: SceneGraph,
  instance: SceneNode,
  step: MotionStep
): MotionTrack[] {
  const sourceIndex = indexByPath(graph, step.from)
  const targetIndex = indexByPath(graph, step.to)
  const tracks: MotionTrack[] = []
  // Sampling a variant directly (no instance): its own nodes are the source nodes.
  const subjectIsVariant = instance.id === step.from.id

  function visit(node: SceneNode) {
    let source: SceneNode | undefined
    let target: SceneNode | undefined
    if (isRoot(node, instance)) {
      source = step.from
      target = step.to
    } else {
      if (subjectIsVariant) source = node
      else if (node.componentId) source = graph.getNode(node.componentId)
      const path = source ? pathOf(graph, step.from, source) : null
      if (path && !sourceIndex.has(path)) source = undefined
      target = path ? targetIndex.get(path) : undefined
    }
    if (source && target) {
      const current = motionSnapshot(graph, node, node.id)
      const original = motionSnapshot(graph, source, node.id)
      const destination = motionSnapshot(graph, target, node.id)
      const from: MotionSnapshot = {}
      const to: MotionSnapshot = {}
      for (const field of MOTION_FIELDS) {
        // Root placement belongs to the instance, never to the variant.
        if (isRoot(node, instance) && (field === 'x' || field === 'y')) continue
        const overridden = !isEqual(current[field], original[field])
        if (overridden || isEqual(current[field], destination[field])) continue
        Object.assign(from, { [field]: current[field] })
        Object.assign(to, { [field]: destination[field] })
      }
      if (Object.keys(to).length) {
        tracks.push({
          nodeId: node.id,
          from,
          to,
          animated: motionFieldsForProperties(step.transition.properties, node.type)
        })
      }
    }
    for (const child of childrenOf(graph, node)) visit(child)
  }

  visit(instance)
  return tracks
}
