import { isEqualWith } from 'es-toolkit'

import type { NodeType, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { createDefaultNode } from '@open-pencil/scene-graph/node-defaults'

import { decodeValue, encodeValue, type JSONValue } from './codec'

/**
 * Node records store only the fields that differ from a base node, so a 100k-node document
 * stays reviewable. `id` and `type` are always present.
 *
 * The base is a new node of the same type, or — for an instance and its sublayers — the
 * component node it was cloned from (`componentId`), named by `$base`. Instance internals
 * then cost only their overrides, and a component edit that propagates to its instances
 * leaves the instance records unchanged.
 *
 * `textPicture` is a renderer cache (a Skia paragraph snapshot that is cleared whenever
 * fonts resolve), so it is never written and loads as `null`.
 */
export const EXCLUDED_NODE_FIELDS: ReadonlySet<string> = new Set(['textPicture'])

/** Base fields that a node does not have (rare); restored by deleting them on load. */
const ABSENT_KEY = '$absent'
/** Id of the node this record is a diff against; absent means type defaults. */
const BASE_KEY = '$base'
/** Fields that identify a node and are never inherited from a base. */
const OWN_FIELDS = new Set(['id', 'type', 'parentId', 'childIds'])

type NodeFields = Record<string, unknown>

const defaultsByType = new Map<NodeType, NodeFields>()

function fieldsOf(node: SceneNode): NodeFields {
  return Object.fromEntries(Object.entries(node) as Array<[string, unknown]>)
}

function defaultsFor(type: NodeType): NodeFields {
  let defaults = defaultsByType.get(type)
  if (!defaults) {
    defaults = fieldsOf(createDefaultNode(() => '', type))
    defaultsByType.set(type, defaults)
  }
  return defaults
}

function isSceneNode(fields: NodeFields): fields is NodeFields & SceneNode {
  return typeof fields.id === 'string' && typeof fields.type === 'string'
}

function withoutKeys(fields: NodeFields, keys: Iterable<unknown>): NodeFields {
  const removed = new Set(keys)
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !removed.has(key)))
}

/** Deep equality that tells `-0` from `0`, so a negative zero is never dropped. */
function sameValue(value: unknown, base: unknown): boolean {
  return isEqualWith(value, base, (first, second) =>
    typeof first === 'number' && typeof second === 'number' ? Object.is(first, second) : undefined
  )
}

/** The component node a record diffs against, unless that chain loops. */
export function componentBase(graph: SceneGraph, node: SceneNode): SceneNode | null {
  if (!node.componentId || node.componentId === node.id) return null
  const base = graph.nodes.get(node.componentId)
  if (!base) return null
  const seen = new Set([node.id])
  for (let current: SceneNode | undefined = base; current?.componentId;) {
    if (seen.has(current.id)) return null
    seen.add(current.id)
    current = graph.nodes.get(current.componentId)
  }
  return base
}

export function encodeNodeRecord(node: SceneNode, base: SceneNode | null = null): JSONValue {
  const baseFields = base ? fieldsOf(base) : defaultsFor(node.type)
  const fields = fieldsOf(node)
  const diff: NodeFields = { id: node.id, type: node.type }
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'id' || key === 'type' || EXCLUDED_NODE_FIELDS.has(key)) continue
    if (!OWN_FIELDS.has(key) && key in baseFields && sameValue(value, baseFields[key])) continue
    diff[key] = value
  }
  const absent = Object.keys(baseFields).filter(
    (key) => !(key in fields) && !EXCLUDED_NODE_FIELDS.has(key) && !OWN_FIELDS.has(key)
  )
  const encoded = encodeValue(diff, `node ${node.id}`) as Record<string, JSONValue>
  if (absent.length > 0) encoded[ABSENT_KEY] = absent.sort()
  if (base) encoded[BASE_KEY] = base.id
  return encoded
}

function isRecord(value: unknown): value is Record<string, JSONValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Decodes node records whose bases may appear later or in other files. */
export class NodeRecordDecoder {
  readonly #records = new Map<string, Record<string, JSONValue>>()
  readonly #decoded = new Map<string, SceneNode>()
  readonly #resolving = new Set<string>()

  add(record: JSONValue, file: string): string {
    if (!isRecord(record) || typeof record.id !== 'string' || typeof record.type !== 'string') {
      throw new TypeError(`Invalid node record in ${file}: id and type are required`)
    }
    if (this.#records.has(record.id)) throw new Error(`Duplicate node ${record.id} in ${file}`)
    this.#records.set(record.id, record)
    return record.id
  }

  decode(id: string): SceneNode {
    const done = this.#decoded.get(id)
    if (done) return done
    const record = this.#records.get(id)
    if (!record) throw new Error(`Missing base node ${id}`)
    if (this.#resolving.has(id)) throw new Error(`Node base cycle at ${id}`)
    this.#resolving.add(id)
    const { [ABSENT_KEY]: absent, [BASE_KEY]: baseId, ...rest } = record
    const type = record.type as NodeType
    const defaults = fieldsOf(createDefaultNode(() => id, type))
    const base =
      typeof baseId === 'string'
        ? {
            ...defaults,
            ...withoutKeys(fieldsOf(structuredClone(this.decode(baseId))), OWN_FIELDS)
          }
        : defaults
    const merged: NodeFields = { ...base, ...(decodeValue(rest) as NodeFields) }
    const node = Array.isArray(absent) ? withoutKeys(merged, absent) : merged
    if (!Array.isArray(node.guides)) node.guides = []
    node.textPicture = null
    this.#resolving.delete(id)
    if (!isSceneNode(node)) throw new TypeError(`Invalid node record ${id}`)
    this.#decoded.set(id, node)
    return node
  }
}
