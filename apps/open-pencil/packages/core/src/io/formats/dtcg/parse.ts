import type { TokenDefinition, TokenIssue } from './types'

/**
 * DTCG document flattening (Format Module 2025.10).
 *
 * A node with `$value` is a token; any other object is a group. Groups pass `$type` and
 * `$deprecated` down to descendants. `$root` is an ordinary child token name (the
 * group's default value). `$extends` and JSON-pointer `$ref` values are reported rather
 * than guessed at.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const INVALID_NAME = /[{}.]/

interface GroupState {
  type?: string
  deprecated?: boolean | string
}

function readDeprecated(value: unknown): boolean | string | undefined {
  return typeof value === 'boolean' || typeof value === 'string' ? value : undefined
}

function containsRef(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRef)
  if (!isRecord(value)) return false
  if ('$ref' in value) return true
  return Object.values(value).some(containsRef)
}

export function parseTokenDocument(
  file: string,
  json: unknown,
  issues: TokenIssue[]
): TokenDefinition[] {
  if (!isRecord(json)) {
    issues.push({ code: 'invalid-document', file, message: `${file} is not a JSON object` })
    return []
  }
  const tokens: TokenDefinition[] = []

  function visit(node: Record<string, unknown>, path: string[], inherited: GroupState): void {
    const state: GroupState = {
      type: typeof node.$type === 'string' ? node.$type : inherited.type,
      deprecated: readDeprecated(node.$deprecated) ?? inherited.deprecated
    }
    if ('$extends' in node) {
      issues.push({
        code: 'unsupported-feature',
        token: path.join('.') || undefined,
        file,
        message: `Group $extends is not supported; members inherited from ${String(node.$extends)} are not imported`
      })
    }
    for (const [name, child] of Object.entries(node)) {
      if (name.startsWith('$') && name !== '$root') continue
      const childPath = [...path, name]
      const key = childPath.join('.')
      if (INVALID_NAME.test(name)) {
        issues.push({
          code: 'invalid-name',
          token: key,
          file,
          message: `Token or group name "${name}" contains a reserved character ({, } or .)`
        })
        continue
      }
      if (!isRecord(child)) continue
      if (!('$value' in child)) {
        visit(child, childPath, state)
        continue
      }
      if (containsRef(child.$value)) {
        issues.push({
          code: 'unsupported-feature',
          token: key,
          file,
          message: 'JSON-pointer $ref values are not supported; use {curly.brace} aliases'
        })
        continue
      }
      const extensions = isRecord(child.$extensions) ? child.$extensions : undefined
      tokens.push({
        path: childPath,
        key,
        file,
        type: typeof child.$type === 'string' ? child.$type : state.type,
        value: child.$value,
        description: typeof child.$description === 'string' ? child.$description : undefined,
        extensions,
        deprecated: readDeprecated(child.$deprecated) ?? state.deprecated
      })
    }
  }

  visit(json, [], {})
  return tokens
}

/** `{a.b.c}` exactly. */
export function aliasTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = /^\{([^{}]+)\}$/.exec(value.trim())
  return match ? match[1] : null
}

export function hasEmbeddedAlias(value: unknown): boolean {
  if (typeof value === 'string') return /\{[^{}]+\}/.test(value)
  if (Array.isArray(value)) return value.some(hasEmbeddedAlias)
  if (isRecord(value)) return Object.values(value).some(hasEmbeddedAlias)
  return false
}

export { isRecord }
