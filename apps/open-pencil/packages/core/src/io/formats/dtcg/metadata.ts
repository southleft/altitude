import * as v from 'valibot'

import type {
  SceneGraph,
  Variable,
  VariableCollection,
  VariableValue
} from '@open-pencil/scene-graph'

import type { TokenCollectionMetadata, TokenVariableMetadata } from './types'
import { floatToCSS } from './values'

/** `$extensions` namespace OpenPencil writes on imported variables and collections. */
export const DTCG_EXTENSION_KEY = 'org.openpencil.dtcg'

const VariableMetadataSchema = v.object({
  source: v.string(),
  path: v.string(),
  type: v.string(),
  unit: v.optional(v.string()),
  remBase: v.optional(v.number()),
  composite: v.optional(v.unknown()),
  absentModes: v.optional(v.array(v.string())),
  file: v.optional(v.string()),
  deprecated: v.optional(v.union([v.boolean(), v.string()])),
  extensions: v.optional(v.record(v.string(), v.unknown()))
})

const CollectionMetadataSchema = v.object({
  source: v.string(),
  axes: v.array(v.string()),
  modes: v.record(v.string(), v.record(v.string(), v.string()))
})

export function readTokenMetadata(
  variable: Pick<Variable, 'extensions'>
): TokenVariableMetadata | null {
  const result = v.safeParse(VariableMetadataSchema, variable.extensions?.[DTCG_EXTENSION_KEY])
  return result.success ? result.output : null
}

export function readCollectionTokenMetadata(
  collection: Pick<VariableCollection, 'extensions'>
): TokenCollectionMetadata | null {
  const result = v.safeParse(CollectionMetadataSchema, collection.extensions?.[DTCG_EXTENSION_KEY])
  return result.success ? result.output : null
}

/**
 * The mode of each imported collection that matches an axis context, e.g.
 * `{ brand: "southleft", mode: "dark" }`. Collections without token metadata, or with no
 * mode matching the context, are left out so callers fall back to the active mode.
 */
export function tokenModeSelection(
  graph: SceneGraph,
  context: Readonly<Record<string, string>>
): Record<string, string> {
  const selection: Record<string, string> = {}
  for (const collection of graph.variableCollections.values()) {
    const metadata = readCollectionTokenMetadata(collection)
    if (!metadata) continue
    const name = Object.entries(metadata.modes).find(([, assignment]) =>
      metadata.axes.every(
        (axis) => !Object.hasOwn(context, axis) || assignment[axis] === context[axis]
      )
    )?.[0]
    const mode = collection.modes.find((candidate) => candidate.name === name)
    if (mode) selection[collection.id] = mode.modeId
  }
  return selection
}

/** `--al-space-md` from `codeSyntax.WEB`, accepting `var(--x)` or a bare `--x`. */
export function variableCSSName(variable: Pick<Variable, 'codeSyntax'>): string | null {
  const web = variable.codeSyntax?.WEB?.trim()
  if (!web) return null
  const match = /^(?:var\(\s*)?(--[A-Za-z0-9_-]+)\s*\)?$/.exec(web)
  return match ? match[1] : null
}

/** True when the token behind `variable` is not defined in the named mode. */
export function isTokenAbsentInMode(
  variable: Pick<Variable, 'extensions'>,
  modeName: string
): boolean {
  return readTokenMetadata(variable)?.absentModes?.includes(modeName) ?? false
}

/**
 * CSS text for a resolved FLOAT, using the token's authored unit when known: `1rem`,
 * `0.2s`, `50%`, `400`. Returns null when the variable carries no unit metadata.
 */
export function tokenFloatCSS(
  variable: Pick<Variable, 'extensions'>,
  value: VariableValue
): string | null {
  if (typeof value !== 'number') return null
  const metadata = readTokenMetadata(variable)
  if (metadata?.unit === undefined) return null
  return floatToCSS(value, metadata.unit, metadata.remBase)
}
