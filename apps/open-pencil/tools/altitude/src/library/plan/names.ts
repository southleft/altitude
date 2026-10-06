import type { CodeBindingPropType } from '@open-pencil/scene-graph'

import type { ContractProp } from '../contract'

/** Same as Altitude's contract-diff `normKey`: case- and separator-insensitive. */
/** Strings, numbers and booleans as text; anything else as empty. */
export const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : ''

export const normKey = (value: unknown): string =>
  text(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

/** `isCurrent` / `hasSeparator` → `current` / `separator`, as buildOps pairs case dimensions. */
export const strippedKey = (name: string): string => normKey(name.replace(/^(is|has)(?=[A-Z])/, ''))

export const titleize = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')

export const kebab = (value: string): string =>
  value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

export const stripQuotes = (value: unknown): string =>
  text(value)
    .replace(/^['"]|['"]$/g, '')
    .trim()

export const codeAttribute = (prop: ContractProp): string =>
  prop.bindings?.code?.attribute ?? prop.name

export function codeType(prop: ContractProp): CodeBindingPropType {
  if (prop.type === 'enum' || prop.type === 'boolean' || prop.type === 'number') return prop.type
  return 'string'
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value))
}

/** `"Variant=bare,Size=default"` → `{ Variant: 'bare', Size: 'default' }`, keys trimmed. */
export function parseCase(value: string | null | undefined): Record<string, string> {
  const dims: Record<string, string> = {}
  for (const part of String(value ?? '').split(',')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    dims[part.slice(0, index).trim()] = part.slice(index + 1).trim()
  }
  return dims
}
