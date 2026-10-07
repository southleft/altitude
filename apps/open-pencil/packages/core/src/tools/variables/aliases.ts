import * as v from 'valibot'

import type { Variable } from '@open-pencil/scene-graph'

import type { FigmaAPI } from '#core/figma-api'
import { defineTool } from '#core/tools/schema'

import { findMode } from './modes'

function findVariable(figma: FigmaAPI, idOrName: string): Variable | null {
  return (
    figma.getVariableById(idOrName) ??
    figma.getLocalVariables().find((variable) => variable.name === idOrName) ??
    null
  )
}

/** True when following `targetId`'s aliases in any mode reaches `sourceId`. */
function createsCycle(figma: FigmaAPI, sourceId: string, targetId: string): boolean {
  const pending = [targetId]
  const seen = new Set<string>()
  while (pending.length) {
    const id = pending.pop()
    if (id === undefined || seen.has(id)) continue
    if (id === sourceId) return true
    seen.add(id)
    for (const value of Object.values(figma.getVariableById(id)?.valuesByMode ?? {})) {
      if (typeof value === 'object' && 'aliasId' in value) pending.push(value.aliasId)
    }
  }
  return false
}

export const setVariableAlias = defineTool({
  name: 'set_variable_alias',
  description:
    'Make a variable reference another variable of the same type (a design-token alias), in one mode or every mode. The target may live in another collection; it then resolves in that collection’s active mode.',
  execution: { kind: 'sync', mutation: 'properties' },
  input: v.object({
    id: v.pipe(v.string(), v.description('Variable ID or name to change')),
    target: v.pipe(v.string(), v.description('Variable ID or name to reference')),
    mode: v.optional(v.pipe(v.string(), v.description('Mode ID or name; omit for every mode')))
  }),
  execute: (figma, args) => {
    const variable = findVariable(figma, args.id)
    if (!variable) return { error: `Variable "${args.id}" not found` }
    const target = findVariable(figma, args.target)
    if (!target) return { error: `Variable "${args.target}" not found` }
    if (target.type !== variable.type) {
      return { error: `Cannot alias ${variable.type} variable to ${target.type} variable` }
    }
    if (createsCycle(figma, variable.id, target.id)) {
      return { error: `Aliasing "${variable.name}" to "${target.name}" would create a cycle` }
    }
    const collection = figma.getVariableCollectionById(variable.collectionId)
    if (!collection) return { error: `Collection "${variable.collectionId}" not found` }
    const mode = args.mode ? findMode(collection, args.mode) : null
    if (args.mode && !mode)
      return { error: `Mode "${args.mode}" not found in "${collection.name}"` }
    const modeIds = mode ? [mode.modeId] : collection.modes.map((m) => m.modeId)
    for (const modeId of modeIds)
      figma.setVariableValue(variable.id, modeId, { aliasId: target.id })
    return { id: variable.id, aliasId: target.id, modes: modeIds }
  }
})
