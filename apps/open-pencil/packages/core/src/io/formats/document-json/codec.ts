import { decodeBase64, encodeBase64 } from '#core/bytes/base64'

/**
 * Lossless JSON for scene-graph values.
 *
 * Plain JSON cannot hold binary data, `undefined`, non-finite numbers, negative zero,
 * bigints, maps or sets. Each of those becomes a single-key object whose key starts with
 * `$` (for example `{ "$bytes": "iVBORw0…" }`). Real object keys that start with `$` are
 * escaped with one more `$`, so a tag can never be confused with data.
 */

type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue }

const TYPED_ARRAYS = {
  Int8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  Float32Array,
  Float64Array
} as const
type TypedArrayName = keyof typeof TYPED_ARRAYS

const TAGS = new Set([
  '$undefined',
  '$number',
  '$bigint',
  '$bytes',
  '$typedArray',
  '$arrayBuffer',
  '$map',
  '$set',
  '$date'
])

function escapeKey(key: string): string {
  return key.startsWith('$') ? `$${key}` : key
}

function unescapeKey(key: string): string {
  return key.startsWith('$$') ? key.slice(1) : key
}

function encodeNumber(value: number): JSONValue {
  if (Number.isNaN(value)) return { $number: 'NaN' }
  if (value === Infinity) return { $number: 'Infinity' }
  if (value === -Infinity) return { $number: '-Infinity' }
  if (Object.is(value, -0)) return { $number: '-0' }
  return value
}

function typedArrayName(value: ArrayBufferView): TypedArrayName | null {
  for (const name of Object.keys(TYPED_ARRAYS) as TypedArrayName[]) {
    if (value instanceof TYPED_ARRAYS[name]) return name
  }
  return null
}

function viewBytes(value: ArrayBufferView): Uint8Array {
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype: unknown = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Convert a value into tagged JSON. Object keys are emitted in sorted order. */
export function encodeValue(value: unknown, path = '$'): JSONValue {
  if (value === null) return null
  if (value === undefined) return { $undefined: true }
  switch (typeof value) {
    case 'boolean':
    case 'string':
      return value
    case 'number':
      return encodeNumber(value)
    case 'bigint':
      return { $bigint: value.toString() }
    case 'object':
      break
    default:
      throw new TypeError(`Cannot encode ${typeof value} at ${path}`)
  }
  if (value instanceof Uint8Array) return { $bytes: encodeBase64(value) }
  if (ArrayBuffer.isView(value)) {
    const name = typedArrayName(value)
    if (!name) throw new TypeError(`Cannot encode ${value.constructor.name} at ${path}`)
    return { $typedArray: { data: encodeBase64(viewBytes(value)), type: name } }
  }
  if (value instanceof ArrayBuffer) return { $arrayBuffer: encodeBase64(new Uint8Array(value)) }
  if (value instanceof Map) {
    return {
      $map: [...value].map(([key, item], index) => [
        encodeValue(key, `${path}<key ${index}>`),
        encodeValue(item, `${path}<${index}>`)
      ])
    }
  }
  if (value instanceof Set) {
    return { $set: [...value].map((item, index) => encodeValue(item, `${path}<${index}>`)) }
  }
  if (value instanceof Date) return { $date: value.toISOString() }
  if (Array.isArray(value)) {
    const items: JSONValue[] = []
    for (let index = 0; index < value.length; index++) {
      items.push(encodeValue(value[index], `${path}[${index}]`))
    }
    return items
  }
  if (!isPlainObject(value)) {
    throw new TypeError(`Cannot encode ${value.constructor.name} at ${path}`)
  }
  const result: Record<string, JSONValue> = {}
  for (const key of Object.keys(value).sort()) {
    result[escapeKey(key)] = encodeValue(value[key], `${path}.${key}`)
  }
  return result
}

function decodeNumber(value: JSONValue): number {
  switch (value) {
    case 'NaN':
      return Number.NaN
    case 'Infinity':
      return Number.POSITIVE_INFINITY
    case '-Infinity':
      return Number.NEGATIVE_INFINITY
    case '-0':
      return -0
    default:
      throw new TypeError(`Invalid $number tag: ${JSON.stringify(value)}`)
  }
}

function expectString(value: JSONValue, tag: string): string {
  if (typeof value !== 'string') throw new TypeError(`Invalid ${tag} tag`)
  return value
}

function expectArray(value: JSONValue, tag: string): JSONValue[] {
  if (!Array.isArray(value)) throw new TypeError(`Invalid ${tag} tag`)
  return value
}

function decodeTypedArray(value: JSONValue): ArrayBufferView {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Invalid $typedArray tag')
  }
  const type = expectString(value.type, '$typedArray')
  if (!(type in TYPED_ARRAYS)) throw new TypeError(`Unknown typed array: ${type}`)
  const bytes = decodeBase64(expectString(value.data, '$typedArray'))
  const buffer = bytes.slice().buffer
  return new TYPED_ARRAYS[type as TypedArrayName](buffer)
}

function decodeTag(tag: string, value: JSONValue): unknown {
  switch (tag) {
    case '$undefined':
      return undefined
    case '$number':
      return decodeNumber(value)
    case '$bigint':
      return BigInt(expectString(value, tag))
    case '$bytes':
      return decodeBase64(expectString(value, tag))
    case '$typedArray':
      return decodeTypedArray(value)
    case '$arrayBuffer':
      return decodeBase64(expectString(value, tag)).slice().buffer
    case '$map':
      return new Map(
        expectArray(value, tag).map((entry) => {
          const pair = expectArray(entry, tag)
          if (pair.length !== 2) throw new TypeError('Invalid $map entry')
          return [decodeValue(pair[0]), decodeValue(pair[1])]
        })
      )
    case '$set':
      return new Set(expectArray(value, tag).map((item) => decodeValue(item)))
    case '$date':
      return new Date(expectString(value, tag))
    default:
      throw new TypeError(`Unknown tag: ${tag}`)
  }
}

/** Inverse of {@link encodeValue}. */
export function decodeValue(value: JSONValue): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => decodeValue(item))
  const keys = Object.keys(value)
  if (keys.length === 1 && TAGS.has(keys[0])) return decodeTag(keys[0], value[keys[0]])
  const result: Record<string, unknown> = {}
  for (const key of keys) result[unescapeKey(key)] = decodeValue(value[key])
  return result
}

/** Containers whose one-line form fits this width stay on one line. */
const LINE_WIDTH = 100

interface Formatted {
  /** One-line form, or null once it is longer than a line (never built for large values). */
  compact: string | null
  pretty: string
}

function formatValue(value: JSONValue, indent: string): Formatted {
  if (value === null || typeof value !== 'object') {
    const text = JSON.stringify(value)
    return { compact: text.length <= LINE_WIDTH ? text : null, pretty: text }
  }
  const inner = `${indent}  `
  const entries = Array.isArray(value)
    ? value.map((item) => ({ key: '', formatted: formatValue(item, inner) }))
    : Object.keys(value).map((key) => ({
        key: `${JSON.stringify(key)}:`,
        formatted: formatValue(value[key], inner)
      }))
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}']
  if (entries.length === 0) return { compact: `${open}${close}`, pretty: `${open}${close}` }
  let compact: string | null = null
  let length = indent.length + 2 + entries.length - 1
  for (const entry of entries) {
    if (entry.formatted.compact === null) {
      length = Infinity
      break
    }
    length += entry.key.length + entry.formatted.compact.length
  }
  if (length <= LINE_WIDTH) {
    compact = `${open}${entries.map((entry) => `${entry.key}${entry.formatted.compact ?? ''}`).join(',')}${close}`
    return { compact, pretty: compact }
  }
  const lines = entries.map(
    (entry) => `${inner}${entry.key}${entry.key ? ' ' : ''}${entry.formatted.pretty}`
  )
  return { compact: null, pretty: `${open}\n${lines.join(',\n')}\n${indent}${close}` }
}

/**
 * Diff-friendly JSON text: 2-space indentation, keys in encoded (sorted) order, short
 * containers on one line, and a trailing newline. Output depends only on the value.
 */
export function stringifyDocumentJSON(value: JSONValue): string {
  return `${formatValue(value, '').pretty}\n`
}

export function parseDocumentJSON(text: string): JSONValue {
  return JSON.parse(text) as JSONValue
}

export type { JSONValue }
