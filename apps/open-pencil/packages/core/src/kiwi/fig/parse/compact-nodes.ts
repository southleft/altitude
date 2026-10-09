import { isEqual } from 'es-toolkit/predicate'

import type { NodeType, SceneNode, SourceMetadata } from '@open-pencil/scene-graph'
import {
  createDefaultNode,
  createDefaultSourceMetadata
} from '@open-pencil/scene-graph/node-defaults'

/**
 * A scene node as the fields that differ from `createDefaultNode` for its type.
 *
 * Structured clone costs roughly one step per property and object, and a `.fig` node carries
 * ~140 fields of which ~15 differ from the defaults, plus about 20 empty arrays and objects.
 * Sending only the differences cuts a large document's worker transfer several-fold.
 */
export interface CompactSceneNode {
  /** Node ID. */
  i: string
  /** Node type. */
  t: NodeType
  /** Non-default fields, except `source` and lazily decoded fields. */
  d: Record<string, unknown>
  /** Fields the node lacks although its defaults have them. */
  x?: string[]
  /** Non-default `source` fields, except `fig`. */
  s?: Record<string, unknown>
  /** Non-default `source.fig` fields. */
  f?: Record<string, unknown>
}

type DefaultKind = 'value' | 'empty-array' | 'empty-object' | 'empty-maps' | 'deep'

/** One default field and the cheapest exact test for "still default". */
interface DefaultField {
  key: string
  value: unknown
  kind: DefaultKind
}

/** The fields of a defaults object, minus skipped ones, with their comparison kind. */
interface DefaultPlan {
  fields: DefaultField[]
  keys: ReadonlySet<string>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function hasNoKeys(value: Record<string, unknown>): boolean {
  for (const key in value) if (Object.hasOwn(value, key)) return false
  return true
}

/** A plain object with exactly `keys`, each an empty Map (instance override state). */
function isEmptyMapRecord(value: unknown, keys: readonly string[]): boolean {
  if (!isPlainObject(value) || keys.length === 0) return false
  let count = 0
  for (const key in value) {
    if (!Object.hasOwn(value, key)) continue
    count++
    const entry = value[key]
    if (!(entry instanceof Map) || entry.size > 0 || !keys.includes(key)) return false
  }
  return count === keys.length
}

function planDefaults(defaults: object, skip: readonly string[]): DefaultPlan {
  const fields: DefaultField[] = []
  for (const [key, value] of Object.entries(defaults)) {
    if (skip.includes(key)) continue
    let kind: DefaultKind = 'deep'
    if (!value || typeof value !== 'object') kind = 'value'
    else if (Array.isArray(value) && value.length === 0) kind = 'empty-array'
    else if (isPlainObject(value) && hasNoKeys(value)) kind = 'empty-object'
    else if (isEmptyMapRecord(value, Object.keys(value))) kind = 'empty-maps'
    fields.push({ key, value, kind })
  }
  return { fields, keys: new Set([...fields.map((field) => field.key), ...skip]) }
}

function isDefault(value: unknown, field: DefaultField): boolean {
  switch (field.kind) {
    case 'value':
      return Object.is(value, field.value)
    case 'empty-array':
      return Array.isArray(value) && value.length === 0
    case 'empty-object':
      return isPlainObject(value) && hasNoKeys(value)
    case 'empty-maps':
      return isEmptyMapRecord(value, Object.keys(field.value as object))
    case 'deep':
      break
  }
  return isEqual(value, field.value)
}

/** Fields of `value` that differ from the planned defaults, and planned fields it lacks. */
function diffFields(
  value: object,
  plan: DefaultPlan
): { changed: Record<string, unknown>; absent: string[] } {
  const changed: Record<string, unknown> = {}
  const absent: string[] = []
  let present = 0
  for (const field of plan.fields) {
    if (!(field.key in value)) {
      absent.push(field.key)
      continue
    }
    present++
    const current: unknown = Reflect.get(value, field.key)
    if (!isDefault(current, field)) changed[field.key] = current
  }
  // Fields outside the defaults (rare) keep their place after the default ones.
  let total = 0
  for (const key in value) if (Object.hasOwn(value, key)) total++
  if (total > present) {
    for (const key of Object.keys(value)) {
      if (!plan.keys.has(key)) changed[key] = Reflect.get(value, key)
    }
  }
  return { changed, absent }
}

const NODE_SKIP = ['id', 'type', 'source']
const defaultSource = createDefaultSourceMetadata()
const SOURCE_PLAN = planDefaults(defaultSource, ['fig'])
const FIG_PLAN = planDefaults(defaultSource.fig, [])
const nodePlans = new Map<string, DefaultPlan>()

function nodePlan(type: NodeType): DefaultPlan {
  let plan = nodePlans.get(type)
  if (!plan) {
    plan = planDefaults(
      createDefaultNode(() => '', type),
      NODE_SKIP
    )
    nodePlans.set(type, plan)
  }
  return plan
}

export function encodeCompactSceneNode(node: SceneNode): CompactSceneNode {
  const { changed, absent } = diffFields(node, nodePlan(node.type))
  const compact: CompactSceneNode = { i: node.id, t: node.type, d: changed }
  if (absent.length > 0) compact.x = absent

  const source = node.source as SourceMetadata | undefined
  const sourceDiff = source && isPlainObject(source.fig) ? diffFields(source, SOURCE_PLAN) : null
  const figDiff = source && sourceDiff ? diffFields(source.fig, FIG_PLAN) : null
  if (!source || !sourceDiff || !figDiff || sourceDiff.absent.length || figDiff.absent.length) {
    // Unusual source metadata travels whole instead of as a difference.
    compact.d.source = source
    return compact
  }
  if (Object.keys(sourceDiff.changed).length > 0) compact.s = sourceDiff.changed
  if (Object.keys(figDiff.changed).length > 0) compact.f = figDiff.changed
  return compact
}

function storedOverrides(compact: CompactSceneNode): Partial<SceneNode> {
  if (!compact.s && !compact.f) return compact.d as Partial<SceneNode>
  const source = createDefaultSourceMetadata()
  if (compact.s) Object.assign(source, compact.s)
  if (compact.f) Object.assign(source.fig, compact.f)
  return { ...(compact.d as Partial<SceneNode>), source }
}

/** Every field that differs from `createDefaultNode`, for creating the node through the graph. */
export function compactSceneNodeOverrides(compact: CompactSceneNode): Partial<SceneNode> {
  return storedOverrides(compact)
}

/** Remove the fields a compact node lacks although its defaults have them. */
export function removeAbsentCompactFields(node: SceneNode, compact: CompactSceneNode): void {
  if (!compact.x) return
  for (const key of compact.x) Reflect.deleteProperty(node, key)
}

/** Rebuild a node that is not in any graph yet. */
export function decodeCompactSceneNode(compact: CompactSceneNode): SceneNode {
  const node = createDefaultNode(() => compact.i, compact.t, storedOverrides(compact))
  removeAbsentCompactFields(node, compact)
  return node
}
