import type { SceneGraph, Variable, VariableCollection } from '@open-pencil/scene-graph'

import {
  importDesignTokens as importTokensIntoGraph,
  type ApplyTokenImportOptions,
  type TokenFiles,
  type TokenImportResult
} from '#core/io/formats/dtcg/index'

import type { EditorContext } from './types'

interface VariableStateSnapshot {
  variables: Variable[]
  collections: VariableCollection[]
  activeMode: Array<[string, string]>
  bindings: Array<[string, Record<string, string>]>
}

function snapshot(graph: SceneGraph): VariableStateSnapshot {
  const bindings: Array<[string, Record<string, string>]> = []
  for (const node of graph.nodes.values()) {
    if (Object.keys(node.boundVariables).length)
      bindings.push([node.id, { ...node.boundVariables }])
  }
  return {
    variables: structuredClone([...graph.variables.values()]),
    collections: structuredClone([...graph.variableCollections.values()]),
    activeMode: [...graph.activeMode],
    bindings
  }
}

function restore(graph: SceneGraph, state: VariableStateSnapshot): void {
  graph.variables.clear()
  for (const variable of structuredClone(state.variables))
    graph.variables.set(variable.id, variable)
  graph.variableCollections.clear()
  for (const collection of structuredClone(state.collections)) {
    graph.variableCollections.set(collection.id, collection)
  }
  graph.activeMode.clear()
  for (const [collectionId, modeId] of state.activeMode) graph.activeMode.set(collectionId, modeId)
  for (const [nodeId, bound] of state.bindings) {
    const node = graph.nodes.get(nodeId)
    if (node) node.boundVariables = { ...bound }
  }
}

/**
 * Design-token import as one undoable step. The import touches many variables at once
 * (and, with prune, node bindings), so history stores whole before/after snapshots of
 * the variable state rather than per-variable inverses.
 */
export function createTokenImportActions(ctx: EditorContext) {
  function importDesignTokens(
    files: TokenFiles,
    mapping: unknown = {},
    options: ApplyTokenImportOptions = {}
  ): TokenImportResult {
    const before = snapshot(ctx.graph)
    const result = importTokensIntoGraph(ctx.graph, files, mapping, options)
    const after = snapshot(ctx.graph)
    ctx.undo.push({
      label: 'Import design tokens',
      forward: () => {
        restore(ctx.graph, after)
        ctx.requestRender()
      },
      inverse: () => {
        restore(ctx.graph, before)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
    return result
  }

  return { importDesignTokens }
}
