import { RELAY_KEY_PATTERN } from './protocol'

/** The connection key from `Authorization: Bearer <key>`, or null when absent or malformed. */
export function bearerKey(header: string | null): string | null {
  if (!header) return null
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header)
  const key = match?.[1]
  return key && RELAY_KEY_PATTERN.test(key) ? key : null
}

/**
 * The relay never stores or logs keys. It addresses the Durable Object and
 * compares tabs against agents by this SHA-256 digest instead.
 */
export async function hashKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Compare two digests without an early exit, so timing reveals nothing about either. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a)
  const right = new TextEncoder().encode(b)
  let difference = left.length ^ right.length
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index++) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}
