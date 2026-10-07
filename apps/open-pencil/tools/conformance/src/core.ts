import type { DesignDocument, DesignNode } from '@open-pencil/dom-css'
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'

/**
 * Shared round-trip measurement.
 *
 * The deep dive on a real `.fig` and the CI gate on a synthetic fixture both need the same
 * three things: an absent-value test, a tolerant equality test, and a way to pair original
 * nodes with rebuilt ones. Keeping one copy means a measurement bug gets fixed once — the
 * alternative already bit us when an `isEmpty` that ignored the empty string reported 31% of
 * componentId as lost.
 */

/**
 * Absent-value test.
 *
 * The empty string matters: scene nodes default `componentId`/`componentKey` to `null` but the
 * .fig importer yields `''` for nodes that have none. Counting `''` as present made
 * componentId look badly broken when nothing was wrong.
 */
export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (value instanceof Map || value instanceof Set) return value.size === 0
  return typeof value === 'object' && Object.keys(value).length === 0
}

/**
 * Canonical JSON: Maps and Sets survive, and object keys are SORTED.
 *
 * Sorting is the point. The scene graph's copy helpers rebuild objects with their fields in a
 * different order — `copyGradientStop` emits `{color, position}` where the importer produced
 * `{position, color}` — and an order-sensitive compare called that a lost fill.
 */
function canonical(value: unknown): unknown {
  if (value instanceof Map) {
    return { __map__: [...value.entries()].map(([key, entry]) => [key, canonical(entry)]) }
  }
  if (value instanceof Set) return { __set__: [...value.values()].map(canonical) }
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonical(entry)])
    )
  }
  return value
}

/** Structural equality, tolerant of float noise from layout recomputation. */
export function same(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true
    return Math.abs(a - b) < 0.01
  }
  if (isEmpty(a) && isEmpty(b)) return true
  if (typeof a !== typeof b) return false
  if (a && b && typeof a === 'object') {
    try {
      return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
    } catch {
      return false
    }
  }
  return false
}

/** Identity and bookkeeping fields that are not expected to survive as-is. */
export const IGNORED_PROPERTIES: ReadonlySet<string> = new Set([
  'id',
  'parentId',
  'childIds',
  'autoRename',
  'expanded',
  'internalOnly',
  'pluginData',
  'pluginRelaunchData',
  'source',
  'librarySource',
  'sourceLibraryKey',
  'publishId',
  'publishedVersion',
  'derivedLayout',
  'derivedTextGlyphs',
  'textPicture',
  'guides',
  'exportSettings'
])

export type NodePair = [original: SceneNode, rebuilt: SceneNode]

/**
 * Pair original nodes with rebuilt ones.
 *
 * The DesignDocument keeps `sourceSceneNodeId`, and the importer builds children in document
 * order, so walking both in lockstep gives a reliable pairing without relying on node ids
 * surviving — they do not.
 */
export function pairNodes(
  original: SceneGraph,
  doc: DesignDocument,
  rebuilt: SceneGraph
): { pairs: NodePair[]; dropped: string[] } {
  const pairs: NodePair[] = []
  const dropped: string[] = []

  const rebuiltPage = rebuilt.getPages().find((page) => page.type === 'CANVAS')
  if (!rebuiltPage) return { pairs, dropped }

  const walk = (designNodes: DesignNode[], rebuiltParentId: string): void => {
    const parent = rebuilt.getNode(rebuiltParentId)
    const kids = (parent?.childIds ?? [])
      .map((id) => rebuilt.getNode(id))
      .filter((node): node is SceneNode => node !== undefined)

    let index = 0
    for (const designNode of designNodes) {
      if (designNode.type !== 'element') continue
      const mate = kids[index++]
      const sourceId = designNode.sourceSceneNodeId
      const source = sourceId ? original.getNode(sourceId) : undefined
      if (source && sourceId) {
        if (mate) pairs.push([source, mate])
        else dropped.push(sourceId)
      }
      if (mate) walk(designNode.children, mate.id)
    }
  }
  walk(doc.children, rebuiltPage.id)

  return { pairs, dropped }
}

export interface PropertyRow {
  prop: string
  present: number
  survived: number
  lost: number
  rate: number
}

/** Read a property generically, for per-property comparison. */
export function nodeField(node: SceneNode, prop: string): unknown {
  return (node as SceneNode & Record<string, unknown>)[prop]
}

/** Per-property survival counts over a set of node pairs. */
export function propertyStats(pairs: readonly NodePair[]): {
  rows: PropertyRow[]
  typeChanges: Map<string, number>
} {
  const stats = new Map<string, { present: number; survived: number }>()
  const typeChanges = new Map<string, number>()

  for (const [source, out] of pairs) {
    if (source.type !== out.type) {
      const key = `${source.type} -> ${out.type}`
      typeChanges.set(key, (typeChanges.get(key) ?? 0) + 1)
    }
    for (const [prop, value] of Object.entries(source)) {
      if (IGNORED_PROPERTIES.has(prop) || isEmpty(value)) continue
      let entry = stats.get(prop)
      if (!entry) {
        entry = { present: 0, survived: 0 }
        stats.set(prop, entry)
      }
      entry.present++
      if (same(value, nodeField(out, prop))) entry.survived++
    }
  }

  const rows = [...stats.entries()]
    .map(([prop, entry]) => ({
      prop,
      present: entry.present,
      survived: entry.survived,
      lost: entry.present - entry.survived,
      rate: entry.survived / entry.present
    }))
    .sort((a, b) => b.lost - a.lost || a.prop.localeCompare(b.prop))

  return { rows, typeChanges }
}

/** Overall survived/present across all properties. */
export function overall(rows: readonly PropertyRow[]): {
  present: number
  survived: number
  rate: number
} {
  const present = rows.reduce((sum, row) => sum + row.present, 0)
  const survived = rows.reduce((sum, row) => sum + row.survived, 0)
  return { present, survived, rate: present === 0 ? 1 : survived / present }
}
