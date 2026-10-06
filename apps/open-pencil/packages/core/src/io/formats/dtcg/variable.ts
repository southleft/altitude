import type { VariableValue } from '@open-pencil/scene-graph'

import type { ResolvedTokenImportConfig } from './config'
import { tokenCSSName, tokenVariableId, tokenVariableName } from './naming'
import { isRecord } from './parse'
import { contextKey } from './resolve'
import { liveAliasTarget, type IssueLog, type ResolvedContexts, type TokenState } from './state'
import type {
  PlannedCollection,
  PlannedVariable,
  TokenDefinition,
  TokenVariableMetadata
} from './types'
import type { ConvertedValue } from './values'

export interface VariableBuildContext {
  config: ResolvedTokenImportConfig
  resolved: ResolvedContexts
  states: ReadonlyMap<string, TokenState>
  plannable: ReadonlySet<string>
  log: IssueLog
}

interface ModeValues {
  valuesByMode: Record<string, VariableValue>
  absentModes: string[]
  cssOmittedModes: string[]
  sample?: ConvertedValue
}

function modeValues(
  state: TokenState,
  collection: PlannedCollection,
  build: VariableBuildContext
): ModeValues {
  const result: ModeValues = { valuesByMode: {}, absentModes: [], cssOmittedModes: [] }
  for (const mode of collection.modes) {
    const ctxKey = contextKey({ ...build.resolved.base, ...mode.context })
    const token = state.byContext.get(ctxKey)
    const converted = state.converted.get(ctxKey)
    if (!token || !converted) {
      result.absentModes.push(mode.name)
      continue
    }
    result.sample ??= converted
    if (omittedFromCSS(token.def, build.config)) result.cssOmittedModes.push(mode.name)
    const alias = liveAliasTarget(state, token, build.states, build.plannable)
    if (alias) {
      result.valuesByMode[mode.name] = { aliasId: tokenVariableId(build.config.name, alias) }
      continue
    }
    if (token.aliasOf) {
      build.log.add(
        'alias-flattened',
        state.key,
        `Alias {${token.aliasOf}} has no matching variable; imported as its resolved value`
      )
    }
    result.valuesByMode[mode.name] = structuredClone(converted.value)
  }
  return result
}

function omittedFromCSS(def: TokenDefinition, config: ResolvedTokenImportConfig): boolean {
  const rule = config.omitFromCSSWhen
  if (!rule) return false
  const namespace = def.extensions?.[rule.extension]
  if (!isRecord(namespace)) return false
  const value = namespace[rule.property]
  return typeof value === 'string' && rule.values.includes(value)
}

function pickExtensions(
  def: TokenDefinition | undefined,
  keep: readonly string[]
): Record<string, unknown> | undefined {
  if (!def?.extensions || keep.length === 0) return undefined
  const picked = Object.fromEntries(
    Object.entries(def.extensions).filter(([namespace]) => keep.includes(namespace))
  )
  return Object.keys(picked).length ? picked : undefined
}

function buildMetadata(
  state: TokenState,
  values: ModeValues,
  sample: ConvertedValue,
  build: VariableBuildContext
): TokenVariableMetadata {
  const origin = state.origin
  const metadata: TokenVariableMetadata = {
    source: build.config.name,
    path: state.key,
    type: state.byContext.get(contextKey(build.resolved.base))?.type ?? origin?.type ?? 'untyped'
  }
  if (sample.unit !== undefined) metadata.unit = sample.unit
  if (sample.remBase !== undefined) metadata.remBase = sample.remBase
  if (sample.composite !== undefined) metadata.composite = sample.composite
  if (values.absentModes.length) metadata.absentModes = values.absentModes
  if (values.cssOmittedModes.length) metadata.cssOmittedModes = values.cssOmittedModes
  if (origin?.file) metadata.file = origin.file
  if (origin?.deprecated !== undefined) metadata.deprecated = origin.deprecated
  const extensions = pickExtensions(origin, build.config.keepExtensions)
  if (extensions) metadata.extensions = extensions
  return metadata
}

/** The planned variable for a placed token, or null when no mode has a value. */
export function buildPlannedVariable(
  state: TokenState,
  collection: PlannedCollection,
  build: VariableBuildContext
): PlannedVariable | null {
  if (!state.type) return null
  const values = modeValues(state, collection, build)
  const present = Object.values(values.valuesByMode).at(0)
  if (present === undefined || !values.sample) return null
  if (values.absentModes.length) {
    build.log.add(
      'mode-absent',
      state.key,
      `Not defined in ${values.absentModes.join(', ')}; filled from another mode and left out of CSS for those modes`
    )
    for (const mode of values.absentModes) values.valuesByMode[mode] = structuredClone(present)
  }
  if (state.compositeKind) {
    build.log.add(
      'composite-as-string',
      state.key,
      `${state.compositeKind} composite carried as a CSS string variable; structured value kept in metadata`
    )
  }
  if (state.lossy) build.log.add('lossy-value', state.key, state.lossy)

  const variable: PlannedVariable = {
    id: tokenVariableId(build.config.name, state.key),
    key: state.key,
    name: tokenVariableName(state.path, build.config.naming),
    type: state.type,
    description: state.origin?.description ?? '',
    valuesByMode: values.valuesByMode,
    metadata: buildMetadata(state, values, values.sample, build)
  }
  if (build.config.cssVar) {
    variable.codeSyntax = { WEB: `var(${tokenCSSName(state.path, build.config.cssVar)})` }
  }
  return variable
}
