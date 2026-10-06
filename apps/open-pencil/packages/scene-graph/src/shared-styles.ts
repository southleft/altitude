import type { SceneGraph, SceneNode, SharedStyle, SharedStyleKind, SharedStyleType } from './index'

const STYLE_REF_KEYS = {
  fill: 'fillStyleId',
  stroke: 'strokeStyleId',
  text: 'textStyleId',
  effect: 'effectStyleId',
  grid: 'gridStyleId'
} as const satisfies Record<SharedStyleKind, keyof SceneNode>

const STYLE_TYPES = {
  fill: 'FILL',
  stroke: 'FILL',
  text: 'TEXT',
  effect: 'EFFECT',
  grid: 'GRID'
} as const satisfies Record<SharedStyleKind, SharedStyleType>

const TEXT_STYLE_KEYS = new Set<keyof SceneNode>([
  'fontFamily',
  'fontWeight',
  'italic',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'textDecoration',
  'textCase',
  'fontFeatures'
])

export function sharedStyleRefKey(kind: SharedStyleKind): (typeof STYLE_REF_KEYS)[SharedStyleKind] {
  return STYLE_REF_KEYS[kind]
}

export function sharedStyleTypeForKind(kind: SharedStyleKind): SharedStyleType {
  return STYLE_TYPES[kind]
}

const STYLE_INDEX_KEYS = new Set<string>(['sharedStyleType', 'name', 'source'])

/**
 * Style definitions grouped by type, kept current from graph events. Queries read live
 * names and source ids, so an unchanged catalog returns the same sorted array instance.
 */
class SharedStyleIndex {
  private nodesRef: Map<string, SceneNode> | null = null
  private readonly candidates = new Map<SharedStyleType, Set<string>>()
  private readonly sorted = new Map<SharedStyleType, SharedStyle[]>()
  private readonly snapshots = new Map<SharedStyleType, string[]>()

  constructor(private readonly graph: SceneGraph) {
    graph.onNodeEvents({
      created: (node) => this.track(node),
      updated: (id, changes) => {
        if (!this.nodesRef || !Object.keys(changes).some((key) => STYLE_INDEX_KEYS.has(key))) {
          return
        }
        this.untrack(id)
        const node = graph.getNode(id)
        if (node) this.track(node)
      },
      deleted: (id) => this.untrack(id)
    })
  }

  list(type: SharedStyleType): SharedStyle[] {
    if (this.nodesRef !== this.graph.nodes) this.rebuild()
    const snapshot: string[] = []
    const styles: SharedStyle[] = []
    for (const nodeId of this.candidates.get(type) ?? []) {
      const node = this.graph.getNode(nodeId)
      if (node?.sharedStyleType !== type || !node.source.id) continue
      snapshot.push(nodeId, node.source.id, node.name)
      styles.push({ id: node.source.id, nodeId, name: node.name, type })
    }
    const cached = this.sorted.get(type)
    const previous = this.snapshots.get(type)
    if (cached && previous && sameEntries(previous, snapshot)) return cached
    styles.sort((left, right) => left.name.localeCompare(right.name))
    this.sorted.set(type, styles)
    this.snapshots.set(type, snapshot)
    return styles
  }

  private rebuild(): void {
    this.nodesRef = this.graph.nodes
    this.candidates.clear()
    this.sorted.clear()
    this.snapshots.clear()
    for (const node of this.graph.getAllNodes()) this.track(node)
  }

  private track(node: SceneNode): void {
    if (!this.nodesRef || !node.sharedStyleType) return
    let set = this.candidates.get(node.sharedStyleType)
    if (!set) {
      set = new Set()
      this.candidates.set(node.sharedStyleType, set)
    }
    set.add(node.id)
  }

  private untrack(id: string): void {
    for (const set of this.candidates.values()) set.delete(id)
  }
}

function sameEntries(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false
  return true
}

const styleIndexes = new WeakMap<SceneGraph, SharedStyleIndex>()

/**
 * Sorted style definitions of one kind. The per-graph index is built on first use and
 * returns the same array until a definition is added, removed, renamed or re-identified.
 */
export function getSharedStyles(graph: SceneGraph, kind: SharedStyleKind): SharedStyle[] {
  let index = styleIndexes.get(graph)
  if (!index) {
    index = new SharedStyleIndex(graph)
    styleIndexes.set(graph, index)
  }
  return index.list(sharedStyleTypeForKind(kind))
}

export function styleDetachmentChanges(
  node: SceneNode,
  changes: Partial<SceneNode>
): Partial<SceneNode> {
  const next = { ...changes }
  if ('fills' in changes && !('fillStyleId' in changes) && node.fillStyleId) {
    next.fillStyleId = null
  }
  if ('strokes' in changes && !('strokeStyleId' in changes) && node.strokeStyleId) {
    next.strokeStyleId = null
  }
  if ('effects' in changes && !('effectStyleId' in changes) && node.effectStyleId) {
    next.effectStyleId = null
  }
  if ('layoutGrids' in changes && !('gridStyleId' in changes) && node.gridStyleId) {
    next.gridStyleId = null
  }
  const changesTextStyle = (Object.keys(changes) as (keyof SceneNode)[]).some((key) =>
    TEXT_STYLE_KEYS.has(key)
  )
  if (changesTextStyle && !('textStyleId' in changes) && node.textStyleId) {
    next.textStyleId = null
  }
  return next
}
