/**
 * Map-aware JSON.
 *
 * `JSON.stringify(new Map([['a', 1]]))` is `{}` — it does not throw, it just quietly
 * returns nothing. `instanceOverrides` is built from nested Maps, so a plain stringify
 * carried an attribute that *looked* like the fact was preserved while having destroyed
 * it. A value that silently becomes empty is worse than one that is openly missing, so
 * Maps get an explicit tagged encoding both ways.
 */
const MAP_TAG = '__map__'

function mapAwareReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) return { [MAP_TAG]: [...value.entries()] }
  if (value instanceof Set) return { __set__: [...value.values()] }
  return value
}

/** The shape the replacer above emits for a Map or a Set. */
interface TaggedCollection {
  [MAP_TAG]?: [unknown, unknown][]
  __set__?: unknown[]
}

export function mapAwareReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const tagged = value as TaggedCollection
    if (Array.isArray(tagged[MAP_TAG])) return new Map(tagged[MAP_TAG])
    if (Array.isArray(tagged.__set__)) return new Set(tagged.__set__)
  }
  return value
}

export function encodeFactJSON(value: unknown): string {
  return JSON.stringify(value, mapAwareReplacer)
}
