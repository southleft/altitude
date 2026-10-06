import { resolveTokenImportConfig, type ResolvedTokenImportConfig } from './config'
import { matchesTokenGlob } from './paths'
import { CollectionPlacer } from './placement'
import {
  ContextResolver,
  contextKey,
  defaultContext,
  enumerateContexts,
  filesForContext,
  mergeContext,
  parseTokenFiles,
  type TokenContext
} from './resolve'
import { IssueLog, TokenState, type ResolvedContexts } from './state'
import type { TokenFiles, TokenImportPlan, TokenIssue } from './types'
import { buildPlannedVariable } from './variable'

/**
 * Tokens -> collections, modes and variables, without touching a graph.
 *
 * Placement rule: a token varies over an axis when switching only that axis changes its
 * authored value (an alias counts as its reference, not its resolved value, because the
 * variable alias keeps following the target). The token goes to the first collection, in
 * mapping order, whose axes include every axis it varies over and whose file/token
 * filters accept it.
 */

function buildResolvers(
  config: ResolvedTokenImportConfig,
  files: TokenFiles,
  issues: TokenIssue[]
): ResolvedContexts {
  const parsed = parseTokenFiles(files, issues)
  const contexts = enumerateContexts(config.axes)
  const base = defaultContext(config.axes)
  const groupDefaults = [...config.naming.dropSegments, ...(config.cssVar?.dropSegments ?? [])]
  const reported = new Set<string>()
  const resolvers = new Map<string, ContextResolver>()
  for (const context of contexts) {
    const layers = filesForContext(config, parsed.fileNames, context, issues)
    const tokens = mergeContext(layers, parsed, issues, reported)
    resolvers.set(contextKey(context), new ContextResolver(tokens, groupDefaults, issues, reported))
  }
  const baseKey = contextKey(base)
  const ordered: TokenContext[] = [base, ...contexts.filter((c) => contextKey(c) !== baseKey)]
  return { contexts, ordered, base, resolvers, fileCount: parsed.fileNames.length }
}

function collectStates(config: ResolvedTokenImportConfig, resolved: ResolvedContexts) {
  const states = new Map<string, TokenState>()
  for (const context of resolved.ordered) {
    for (const key of resolved.resolvers.get(contextKey(context))?.keys() ?? []) {
      if (states.has(key)) continue
      const path = key.split('.')
      if (config.exclude.length && matchesTokenGlob(path, config.exclude)) continue
      states.set(key, new TokenState(key, path))
    }
  }
  return states
}

export function planTokenImport(files: TokenFiles, configInput: unknown = {}): TokenImportPlan {
  const config = resolveTokenImportConfig(configInput)
  const resolverIssues: TokenIssue[] = []
  const log = new IssueLog()
  const resolved = buildResolvers(config, files, resolverIssues)
  const states = collectStates(config, resolved)

  const plannable = new Set<string>()
  for (const state of states.values()) {
    if (state.convert(resolved, config, log)) plannable.add(state.key)
  }

  const placer = new CollectionPlacer(config, resolved, states, plannable)
  for (const key of plannable) {
    const state = states.get(key)
    if (state) placer.place(state)
  }

  for (const { state, collection } of placer.placements()) {
    const variable = buildPlannedVariable(state, collection, {
      config,
      resolved,
      states,
      plannable,
      log
    })
    if (variable) collection.variables.push(variable)
  }

  const collections = placer.collections()
  return {
    source: config.name,
    collections,
    contexts: resolved.contexts,
    issues: [...resolverIssues, ...log.issues],
    stats: {
      files: resolved.fileCount,
      tokens: states.size,
      variables: collections.reduce((sum, collection) => sum + collection.variables.length, 0)
    }
  }
}
