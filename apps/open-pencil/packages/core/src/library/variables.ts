import type { SceneGraph, Variable, VariableValue } from '@open-pencil/scene-graph'

function aliasTarget(value: VariableValue): string | null {
  return typeof value === 'object' && 'aliasId' in value ? value.aliasId : null
}

/** Every variable the nodes bind, plus everything those variables alias, transitively. */
function boundVariableClosure(source: SceneGraph, nodeIds: Iterable<string>): Variable[] {
  const pending: string[] = []
  for (const id of nodeIds) {
    const node = source.getNode(id)
    if (node) pending.push(...Object.values(node.boundVariables))
  }
  const found = new Map<string, Variable>()
  while (pending.length > 0) {
    const id = pending.pop()
    if (!id || found.has(id)) continue
    const variable = source.variables.get(id)
    if (!variable) continue
    found.set(id, variable)
    for (const value of Object.values(variable.valuesByMode)) {
      const target = aliasTarget(value)
      if (target) pending.push(target)
    }
  }
  return [...found.values()].sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Copy the variables bound by `nodeIds` (with their alias targets and collections) into
 * `target`, so a library revision carries the tokens its components are bound to and a
 * consumer that materializes an asset can resolve them. Variables the target already has,
 * by id, are left untouched: the consumer's own values win.
 */
export function copyBoundVariables(
  source: SceneGraph,
  target: SceneGraph,
  nodeIds: Iterable<string>
): number {
  let copied = 0
  for (const variable of boundVariableClosure(source, nodeIds)) {
    if (target.variables.has(variable.id)) continue
    const collection = source.variableCollections.get(variable.collectionId)
    if (collection && !target.variableCollections.has(collection.id)) {
      target.addCollection({
        ...structuredClone(collection),
        variableIds: []
      })
    }
    target.addVariable(structuredClone(variable))
    copied++
  }
  return copied
}
