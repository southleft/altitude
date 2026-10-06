import type { VariableType, VariableValue } from '@open-pencil/scene-graph'

/** Parsed JSON documents keyed by path relative to the token root (`tier-1/colors.json`). */
export type TokenFiles = Readonly<Record<string, unknown>>

/** One authored token definition in one file. */
export interface TokenDefinition {
  path: string[]
  key: string
  file: string
  /** Explicit or inherited `$type`. Undefined for aliases that inherit their target's. */
  type?: string
  value: unknown
  description?: string
  extensions?: Record<string, unknown>
  deprecated?: boolean | string
}

/**
 * Why a token did not arrive as an exact variable. Every code is a named degradation:
 * the importer never drops a token without recording one of these against its path.
 */
export type TokenIssueCode =
  | 'invalid-document'
  | 'invalid-name'
  | 'unsupported-feature'
  | 'unresolved-alias'
  | 'circular-alias'
  | 'invalid-value'
  | 'unsupported-type'
  | 'type-conflict'
  | 'composite-as-string'
  | 'composite-skipped'
  | 'lossy-value'
  | 'alias-flattened'
  | 'mode-absent'
  | 'conflicting-definition'

export interface TokenIssue {
  code: TokenIssueCode
  token?: string
  file?: string
  message: string
}

/** Variable metadata stored under `extensions["org.openpencil.dtcg"]`. */
export interface TokenVariableMetadata {
  source: string
  path: string
  /** Resolved DTCG `$type` (or the authored non-standard type). */
  type: string
  /** CSS unit the value was authored in: `px`, `rem`, `s`, `ms`, `%`, `` (unitless) … */
  unit?: string
  /** Pixels per rem when `unit` is `rem`. */
  remBase?: number
  /** Resolved structured value for composite tokens carried as CSS strings. */
  composite?: unknown
  /** Collection mode names in which the token is not defined. */
  absentModes?: string[]
  /** Mode names where the value is kept but left out of CSS (see `omitFromCSSWhen`). */
  cssOmittedModes?: string[]
  file?: string
  deprecated?: boolean | string
  /** Kept `$extensions` namespaces from the source token. */
  extensions?: Record<string, unknown>
}

/** Collection metadata stored under `extensions["org.openpencil.dtcg"]`. */
export interface TokenCollectionMetadata {
  source: string
  axes: string[]
  /** Mode name -> axis assignment, e.g. `{ "Southleft / Dark": { brand: "southleft", mode: "dark" } }`. */
  modes: Record<string, Record<string, string>>
}

export interface PlannedVariable {
  id: string
  key: string
  name: string
  type: VariableType
  description: string
  /** Mode name -> value. Alias values reference planned variable ids. */
  valuesByMode: Record<string, VariableValue>
  codeSyntax?: { WEB: string }
  metadata: TokenVariableMetadata
}

export interface PlannedCollection {
  id: string
  name: string
  axes: string[]
  modes: Array<{ id: string; name: string; context: Record<string, string> }>
  hiddenFromPublishing: boolean
  variables: PlannedVariable[]
}

export interface TokenImportPlan {
  source: string
  collections: PlannedCollection[]
  /** Every axis combination, for parity checks and mode selection. */
  contexts: Array<Record<string, string>>
  issues: TokenIssue[]
  stats: { files: number; tokens: number; variables: number }
}

export interface TokenImportResult {
  source: string
  collections: Array<{ id: string; name: string; modes: string[]; variables: number }>
  created: string[]
  updated: string[]
  unchanged: string[]
  moved: string[]
  /** Variables from an earlier import of this source that the tokens no longer define. */
  removed: string[]
  /** True when `removed` variables were deleted (`prune`), false when they were kept. */
  pruned: boolean
  issues: TokenIssue[]
  stats: TokenImportPlan['stats']
}
