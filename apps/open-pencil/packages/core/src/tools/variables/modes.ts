import * as v from 'valibot'

import type { VariableCollection, VariableCollectionMode } from '@open-pencil/scene-graph'

import type { FigmaAPI } from '#core/figma-api'
import { randomHex } from '#core/random'
import { defineTool } from '#core/tools/schema'

/** A collection by id, or by exact name when no id matches. */
export function findCollection(figma: FigmaAPI, idOrName: string): VariableCollection | null {
  return (
    figma.getVariableCollectionById(idOrName) ??
    figma.getLocalVariableCollections().find((collection) => collection.name === idOrName) ??
    null
  )
}

/** A mode by id, or by name (case-insensitive) when no id matches. */
export function findMode(
  collection: VariableCollection,
  idOrName: string
): VariableCollectionMode | null {
  return (
    collection.modes.find((mode) => mode.modeId === idOrName) ??
    collection.modes.find((mode) => mode.name.toLowerCase() === idOrName.toLowerCase()) ??
    null
  )
}

const collectionInput = v.pipe(v.string(), v.description('Collection ID or name'))
const modeInput = v.pipe(v.string(), v.description('Mode ID or name'))
const collectionModeInput = v.object({ collection: collectionInput, mode: modeInput })

type CollectionModeLookup =
  | { collection: VariableCollection; mode: VariableCollectionMode }
  | { error: string }

/** The collection and mode named by a tool's `collection` and `mode` arguments. */
function findCollectionMode(
  figma: FigmaAPI,
  args: { collection: string; mode: string }
): CollectionModeLookup {
  const collection = findCollection(figma, args.collection)
  if (!collection) return { error: `Collection "${args.collection}" not found` }
  const mode = findMode(collection, args.mode)
  if (!mode) return { error: `Mode "${args.mode}" not found in "${collection.name}"` }
  return { collection, mode }
}

export const addMode = defineTool({
  name: 'add_mode',
  description:
    'Add a mode to a variable collection. Every variable gets a value for the new mode, copied from source_mode (default: the collection default mode).',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.object({
    collection: collectionInput,
    name: v.pipe(v.string(), v.minLength(1), v.description('New mode name, e.g. "Dark"')),
    source_mode: v.optional(
      v.pipe(v.string(), v.description('Mode ID or name to copy values from'))
    )
  }),
  execute: (figma, args) => {
    const collection = findCollection(figma, args.collection)
    if (!collection) return { error: `Collection "${args.collection}" not found` }
    if (findMode(collection, args.name)) {
      return { error: `Collection "${collection.name}" already has a mode named "${args.name}"` }
    }
    const source = args.source_mode ? findMode(collection, args.source_mode) : null
    if (args.source_mode && !source) return { error: `Mode "${args.source_mode}" not found` }
    const modeId = `mode:${randomHex(8)}`
    figma.graph.addMode(collection.id, modeId, args.name, source?.modeId)
    return { collectionId: collection.id, modeId, name: args.name }
  }
})

export const renameMode = defineTool({
  name: 'rename_mode',
  description: 'Rename a mode of a variable collection.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.object({
    collection: collectionInput,
    mode: modeInput,
    name: v.pipe(v.string(), v.minLength(1), v.description('New mode name'))
  }),
  execute: (figma, args) => {
    const found = findCollectionMode(figma, args)
    if ('error' in found) return found
    const { collection, mode } = found
    figma.graph.renameMode(collection.id, mode.modeId, args.name)
    return { collectionId: collection.id, modeId: mode.modeId, name: args.name }
  }
})

export const removeMode = defineTool({
  name: 'remove_mode',
  description:
    "Remove a mode and every variable's value for it. A collection's last mode cannot be removed.",
  execution: { kind: 'sync', mutation: 'document' },
  input: collectionModeInput,
  execute: (figma, args) => {
    const found = findCollectionMode(figma, args)
    if ('error' in found) return found
    const { collection, mode } = found
    if (collection.modes.length <= 1) return { error: 'A collection must keep at least one mode' }
    figma.graph.removeMode(collection.id, mode.modeId)
    return { collectionId: collection.id, removed: mode.modeId }
  }
})

export const setActiveMode = defineTool({
  name: 'set_active_mode',
  description:
    'Switch the document-wide active mode of a collection (for example Light/Dark or a brand). Nodes with an explicit mode keep it.',
  execution: { kind: 'sync', mutation: 'view' },
  input: collectionModeInput,
  execute: (figma, args) => {
    const found = findCollectionMode(figma, args)
    if ('error' in found) return found
    const { collection, mode } = found
    figma.graph.setActiveMode(collection.id, mode.modeId)
    return { collectionId: collection.id, activeModeId: mode.modeId }
  }
})
