import type { SceneGraph } from '@open-pencil/scene-graph'

import { applyTokenImportPlan, type ApplyTokenImportOptions } from './apply'
import { planTokenImport } from './plan'
import type { TokenFiles, TokenImportResult } from './types'

/**
 * Import DTCG design tokens into a graph's variables.
 *
 * `files` maps paths relative to the token root to parsed JSON; a single document can be
 * passed as `{ "tokens.json": json }`. `mapping` is a `TokenImportConfig` (see
 * `config.ts`). Re-importing the same source updates variables in place.
 */
export function importDesignTokens(
  graph: SceneGraph,
  files: TokenFiles,
  mapping: unknown = {},
  options: ApplyTokenImportOptions = {}
): TokenImportResult {
  return applyTokenImportPlan(graph, planTokenImport(files, mapping), options)
}

export { applyTokenImportPlan, type ApplyTokenImportOptions } from './apply'
export {
  resolveTokenImportConfig,
  TokenImportConfigSchema,
  type CompositeStrategy,
  type ResolvedTokenImportConfig,
  type TokenAxisConfig,
  type TokenCollectionConfig,
  type TokenImportConfig,
  type TokenLayerConfig
} from './config'
export {
  DTCG_EXTENSION_KEY,
  isTokenAbsentInMode,
  readCollectionTokenMetadata,
  readTokenMetadata,
  tokenFloatCSS,
  tokenModeSelection,
  variableCSSName
} from './metadata'
export { tokenCSSName, tokenVariableName } from './naming'
export { parseTokenDocument } from './parse'
export { planTokenImport } from './plan'
export {
  convertTokenValue,
  floatToCSS,
  parseFontWeight,
  parseMeasure,
  parseTokenColor
} from './values'
export type {
  PlannedCollection,
  PlannedVariable,
  TokenCollectionMetadata,
  TokenDefinition,
  TokenFiles,
  TokenImportPlan,
  TokenImportResult,
  TokenIssue,
  TokenIssueCode,
  TokenVariableMetadata
} from './types'
