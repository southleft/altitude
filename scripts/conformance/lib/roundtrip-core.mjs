/**
 * Shared round-trip measurement.
 *
 * `roundtrip.mjs` (deep dive on a real .fig) and `gate.mjs` (CI floor on a synthetic
 * fixture) both need the same three things: an absent-value test, a tolerant equality
 * test, and a way to pair original nodes with rebuilt ones. Keeping one copy means a
 * measurement bug gets fixed once — the alternative already bit us when an `isEmpty`
 * that ignored the empty string reported 31% of componentId as lost.
 */

/**
 * Absent-value test.
 *
 * The empty string matters: scene nodes default `componentId`/`componentKey` to `null`
 * but the .fig importer yields `''` for nodes that have none. Counting `''` as present
 * made componentId look badly broken when nothing was wrong.
 */
export function isEmpty(v) {
  return (
    v === undefined ||
    v === null ||
    v === '' ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
  )
}

/** Structural equality, tolerant of float noise from layout recomputation. */
export function same(a, b) {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true
    return Math.abs(a - b) < 0.01
  }
  if (isEmpty(a) && isEmpty(b)) return true
  if (typeof a !== typeof b) return false
  if (a && b && typeof a === 'object') {
    try {
      return stableStringify(a) === stableStringify(b)
    } catch {
      return false
    }
  }
  return false
}

/**
 * Canonical JSON: Maps and Sets survive, and object keys are SORTED.
 *
 * Sorting is the point. The scene graph's own copy helpers rebuild objects with their
 * fields in a different order — `copyGradientStop` emits `{color, position}` where the
 * importer produced `{position, color}` — and an order-sensitive compare called that a
 * lost fill. Identical values in a different order are still identical values; anything
 * else makes the gate cry wolf, which is worse than no gate.
 */
function stableStringify(value) {
  const canonical = (v) => {
    if (v instanceof Map) return { __map__: [...v.entries()].map(([k, val]) => [k, canonical(val)]) }
    if (v instanceof Set) return { __set__: [...v.values()].map(canonical) }
    if (Array.isArray(v)) return v.map(canonical)
    if (v && typeof v === 'object') {
      const out = {}
      for (const key of Object.keys(v).sort()) out[key] = canonical(v[key])
      return out
    }
    return v
  }
  return JSON.stringify(canonical(value))
}

/** Identity and bookkeeping fields that are not expected to survive as-is. */
export const IGNORED_PROPERTIES = new Set([
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

/**
 * Pair original nodes with rebuilt ones.
 *
 * The DesignDocument keeps `sourceSceneNodeId`, and the importer builds children in
 * document order, so walking both in lockstep gives a reliable pairing without relying
 * on node ids surviving — they do not.
 */
export function pairNodes(original, doc, rebuilt) {
  const pairs = []
  const dropped = []

  const rebuiltPage = rebuilt.getPages().find((p) => p.type === 'CANVAS')
  if (!rebuiltPage) return { pairs, dropped }

  const walk = (designNodes, rebuiltParentId) => {
    const parent = rebuilt.getNode(rebuiltParentId)
    const kids = (parent?.childIds ?? []).map((id) => rebuilt.getNode(id)).filter(Boolean)

    let i = 0
    for (const dn of designNodes) {
      if (dn.type !== 'element') continue
      const mate = kids[i++]
      const src = dn.sourceSceneNodeId ? original.getNode(dn.sourceSceneNodeId) : null
      if (src) {
        if (mate) pairs.push([src, mate])
        else dropped.push(dn.sourceSceneNodeId)
      }
      if (mate) walk(dn.children ?? [], mate.id)
    }
  }
  walk(doc.children, rebuiltPage.id)

  return { pairs, dropped }
}

/** Per-property survival counts over a set of node pairs. */
export function propertyStats(pairs) {
  const stats = new Map()
  const typeChanges = new Map()

  for (const [src, out] of pairs) {
    if (src.type !== out.type) {
      const key = `${src.type} -> ${out.type}`
      typeChanges.set(key, (typeChanges.get(key) ?? 0) + 1)
    }
    for (const [prop, value] of Object.entries(src)) {
      if (IGNORED_PROPERTIES.has(prop) || isEmpty(value)) continue
      let entry = stats.get(prop)
      if (!entry) stats.set(prop, (entry = { present: 0, survived: 0 }))
      entry.present++
      if (same(value, out[prop])) entry.survived++
    }
  }

  const rows = [...stats.entries()]
    .map(([prop, s]) => ({
      prop,
      present: s.present,
      survived: s.survived,
      lost: s.present - s.survived,
      rate: s.survived / s.present
    }))
    .sort((a, b) => b.lost - a.lost || a.prop.localeCompare(b.prop))

  return { rows, typeChanges }
}

/** Overall survived/present across all properties. */
export function overall(rows) {
  const present = rows.reduce((sum, r) => sum + r.present, 0)
  const survived = rows.reduce((sum, r) => sum + r.survived, 0)
  return { present, survived, rate: present === 0 ? 1 : survived / present }
}
