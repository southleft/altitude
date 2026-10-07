import { omit, omitBy } from 'es-toolkit/object'

import { BLACK } from './constants'
import type { SceneGraph } from './index'
import { setInstanceOverride } from './instance-overrides'
import type { Color } from './primitives'
import type { Variable, VariableCollection, VariableType, VariableValue } from './types'

export function addVariable(graph: SceneGraph, variable: Variable): void {
  graph.variables.set(variable.id, variable)
  const collection = graph.variableCollections.get(variable.collectionId)
  if (collection && !collection.variableIds.includes(variable.id)) {
    collection.variableIds.push(variable.id)
  }
}

export function removeVariable(graph: SceneGraph, id: string): void {
  const variable = graph.variables.get(id)
  if (!variable) return
  graph.variables.delete(id)
  const collection = graph.variableCollections.get(variable.collectionId)
  if (collection) {
    collection.variableIds = collection.variableIds.filter((vid) => vid !== id)
  }
  for (const node of graph.nodes.values()) {
    const hadBinding = Object.values(node.boundVariables).includes(id)
    if (!hadBinding) continue
    node.boundVariables = omitBy(node.boundVariables, (varId) => varId === id) as Record<
      string,
      string
    >
    graph.emitter.emit('node:updated', node.id, { boundVariables: { ...node.boundVariables } })
    markBoundVariablesOverrideOnInstance(graph, node.id)
  }
}

export function addCollection(graph: SceneGraph, collection: VariableCollection): void {
  graph.variableCollections.set(collection.id, collection)
  if (!graph.activeMode.has(collection.id)) {
    graph.activeMode.set(collection.id, collection.defaultModeId)
  }
}

function defaultVariableValue(type: VariableType, value?: VariableValue): VariableValue {
  if (value !== undefined) return value
  if (type === 'COLOR') return { ...BLACK }
  if (type === 'FLOAT') return 0
  if (type === 'BOOLEAN') return false
  return ''
}

export function createVariable(
  graph: SceneGraph,
  generateId: () => string,
  name: string,
  type: VariableType,
  collectionId: string,
  value?: VariableValue
): Variable {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) throw new Error(`Collection "${collectionId}" not found`)
  const id = generateId()
  const defaultValue = defaultVariableValue(type, value)
  const valuesByMode: Record<string, VariableValue> = {}
  for (const mode of collection.modes) {
    valuesByMode[mode.modeId] = structuredClone(defaultValue)
  }
  const variable: Variable = {
    id,
    name,
    type,
    collectionId,
    valuesByMode,
    description: '',
    hiddenFromPublishing: false
  }
  addVariable(graph, variable)
  return variable
}

export function createCollection(
  graph: SceneGraph,
  generateId: () => string,
  name: string
): VariableCollection {
  const id = generateId()
  const modeId = generateId()
  const collection: VariableCollection = {
    id,
    name,
    modes: [{ modeId, name: 'Mode 1' }],
    defaultModeId: modeId,
    variableIds: []
  }
  addCollection(graph, collection)
  return collection
}

export function removeCollection(graph: SceneGraph, id: string): void {
  const collection = graph.variableCollections.get(id)
  if (collection) {
    for (const varId of Array.from(collection.variableIds)) {
      removeVariable(graph, varId)
    }
  }
  graph.variableCollections.delete(id)
  graph.activeMode.delete(id)
}

export function getActiveModeId(graph: SceneGraph, collectionId: string): string {
  const mode = graph.activeMode.get(collectionId)
  if (mode) return mode
  const collection = graph.variableCollections.get(collectionId)
  return collection?.defaultModeId ?? ''
}

export function getNodeVariableModeId(
  graph: SceneGraph,
  nodeId: string,
  collectionId: string
): string {
  let node = graph.nodes.get(nodeId)
  while (node) {
    const modeId = node.variableModes[collectionId]
    if (modeId) return modeId
    node = node.parentId ? graph.nodes.get(node.parentId) : undefined
  }
  return getActiveModeId(graph, collectionId)
}

export function setActiveMode(graph: SceneGraph, collectionId: string, modeId: string): void {
  graph.activeMode.set(collectionId, modeId)
}

export function addMode(
  graph: SceneGraph,
  collectionId: string,
  modeId: string,
  name: string,
  sourceMode?: string
): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return
  collection.modes.push({ modeId, name })
  const sourceModeId = sourceMode ?? collection.defaultModeId
  for (const varId of collection.variableIds) {
    const variable = graph.variables.get(varId)
    if (!variable) continue
    variable.valuesByMode[modeId] = structuredClone(
      variable.valuesByMode[sourceModeId] ?? Object.values(variable.valuesByMode)[0]
    )
  }
}

export function removeMode(graph: SceneGraph, collectionId: string, modeId: string): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection || collection.modes.length <= 1) return
  collection.modes = collection.modes.filter((m) => m.modeId !== modeId)
  if (collection.defaultModeId === modeId) {
    collection.defaultModeId = collection.modes[0].modeId
  }
  for (const varId of collection.variableIds) {
    const variable = graph.variables.get(varId)
    if (variable) variable.valuesByMode = omit(variable.valuesByMode, [modeId])
  }
  if (graph.activeMode.get(collectionId) === modeId) {
    graph.activeMode.set(collectionId, collection.defaultModeId)
  }
}

export function renameMode(
  graph: SceneGraph,
  collectionId: string,
  modeId: string,
  name: string
): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return
  const mode = collection.modes.find((m) => m.modeId === modeId)
  if (mode) mode.name = name
}

export function setDefaultMode(graph: SceneGraph, collectionId: string, modeId: string): void {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return
  if (!collection.modes.some((m) => m.modeId === modeId)) return
  collection.defaultModeId = modeId
}

/** Picks the mode to read for a collection while following an alias chain. */
type ModeForCollection = (collectionId: string) => string | undefined

function resolveVariableWith(
  graph: SceneGraph,
  variableId: string,
  modeFor: ModeForCollection,
  visited: Set<string>
): VariableValue | undefined {
  if (visited.has(variableId)) return undefined
  const variable = graph.variables.get(variableId)
  if (!variable || isVariableDeleted(graph, variable)) return undefined
  const collection = graph.variableCollections.get(variable.collectionId)
  const preferredModeId =
    modeFor(variable.collectionId) ?? getActiveModeId(graph, variable.collectionId)
  const fallbackModeId = collection?.defaultModeId
  let value = Object.hasOwn(variable.valuesByMode, preferredModeId)
    ? variable.valuesByMode[preferredModeId]
    : undefined
  if (
    value === undefined &&
    fallbackModeId &&
    Object.hasOwn(variable.valuesByMode, fallbackModeId)
  ) {
    value = variable.valuesByMode[fallbackModeId]
  }
  value ??= Object.values(variable.valuesByMode)[0]
  if (value && typeof value === 'object' && 'aliasId' in value) {
    visited.add(variableId)
    return resolveVariableWith(graph, value.aliasId, modeFor, visited)
  }
  return value
}

/**
 * Resolve a variable, following aliases.
 *
 * `modeId` applies to the variable's own collection. An alias into another collection
 * resolves in that collection's active mode, as Figma does, rather than forcing a mode id
 * that collection does not have back onto its default.
 */
export function resolveVariable(
  graph: SceneGraph,
  variableId: string,
  modeId?: string,
  visited?: Set<string>
): VariableValue | undefined {
  const ownCollectionId = graph.variables.get(variableId)?.collectionId
  return resolveVariableWith(
    graph,
    variableId,
    (collectionId) =>
      collectionId === ownCollectionId && modeId ? modeId : getActiveModeId(graph, collectionId),
    visited ?? new Set<string>()
  )
}

/**
 * Resolve a variable with an explicit mode per collection. Collections missing from
 * `modes` use their active mode. Used to evaluate one combination of modes (for example
 * one brand × theme pair) without touching the document's active modes.
 */
export function resolveVariableInModes(
  graph: SceneGraph,
  variableId: string,
  modes: Readonly<Record<string, string>>
): VariableValue | undefined {
  return resolveVariableWith(
    graph,
    variableId,
    (collectionId) => modes[collectionId] ?? getActiveModeId(graph, collectionId),
    new Set<string>()
  )
}

export function resolveColorVariable(graph: SceneGraph, variableId: string): Color | undefined {
  const value = resolveVariable(graph, variableId)
  if (value && typeof value === 'object' && 'r' in value) return value
  return undefined
}

export function resolveNumberVariable(graph: SceneGraph, variableId: string): number | undefined {
  const value = resolveVariable(graph, variableId)
  return typeof value === 'number' ? value : undefined
}

/** Resolve for a node: every collection on the alias chain uses the node's mode for it. */
export function resolveVariableForNode(
  graph: SceneGraph,
  nodeId: string,
  variableId: string
): VariableValue | undefined {
  return resolveVariableWith(
    graph,
    variableId,
    (collectionId) => getNodeVariableModeId(graph, nodeId, collectionId),
    new Set<string>()
  )
}

export function resolveColorVariableForNode(
  graph: SceneGraph,
  nodeId: string,
  variableId: string
): Color | undefined {
  const value = resolveVariableForNode(graph, nodeId, variableId)
  if (value && typeof value === 'object' && 'r' in value) return value
  return undefined
}

export function resolveNumberVariableForNode(
  graph: SceneGraph,
  nodeId: string,
  variableId: string
): number | undefined {
  const value = resolveVariableForNode(graph, nodeId, variableId)
  return typeof value === 'number' ? value : undefined
}

export function getVariablesForCollection(graph: SceneGraph, collectionId: string): Variable[] {
  const collection = graph.variableCollections.get(collectionId)
  if (!collection) return []
  return collection.variableIds
    .map((id) => graph.variables.get(id))
    .filter((v): v is Variable => v !== undefined)
}

export function getVariablesByType(graph: SceneGraph, type: VariableType): Variable[] {
  return [...graph.variables.values()].filter((v) => v.type === type)
}

/**
 * Soft-deleted variables, and variables of a soft-deleted collection, stay in the graph for
 * round-trip but behave as Figma treats them: not listed and not resolved.
 */
export function isVariableDeleted(graph: SceneGraph, variable: Variable): boolean {
  return (
    variable.deleted === true ||
    graph.variableCollections.get(variable.collectionId)?.deleted === true
  )
}

/** A collection authored in this document: neither copied from a library nor soft-deleted. */
export function isLocalVariableCollection(collection: VariableCollection): boolean {
  return !collection.libraryKey && collection.deleted !== true
}

/** Collections copied from subscribed libraries that are still live. */
export function isLibraryVariableCollection(collection: VariableCollection): boolean {
  return !!collection.libraryKey && collection.deleted !== true
}

const SCALAR_BINDING_FIELDS: ReadonlySet<string> = new Set([
  'opacity',
  'width',
  'height',
  'cornerRadius',
  'fontSize',
  'letterSpacing',
  'lineHeight',
  'itemSpacing',
  'strokeWeight',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'counterAxisSpacing',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'rotation',
  'x',
  'y',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'borderTopWeight',
  'borderBottomWeight',
  'borderLeftWeight',
  'borderRightWeight',
  'gridRowGap',
  'gridColumnGap'
])

const STRING_BINDING_FIELDS: ReadonlySet<string> = new Set(['fontFamily', 'fontStyle'])

const BOOLEAN_BINDING_FIELDS: ReadonlySet<string> = new Set(['visible'])

export function bindVariable(
  graph: SceneGraph,
  nodeId: string,
  field: string,
  variableId: string
): void {
  const node = graph.nodes.get(nodeId)
  if (!node) return

  // Validate variable exists
  const variable = graph.variables.get(variableId)
  if (!variable) {
    throw new Error(`Variable "${variableId}" not found`)
  }

  // Color fields require COLOR variable type
  const colorFieldMatch = field.match(/^(fills|strokes)\/(\d+)\/color$/)
  if (colorFieldMatch) {
    if (variable.type !== 'COLOR') {
      throw new Error(`Cannot bind ${variable.type} variable to color field "${field}"`)
    }
    // Validate index is within current array bounds
    const arrayKey = colorFieldMatch[1] as 'fills' | 'strokes'
    const index = Number.parseInt(colorFieldMatch[2], 10)
    const currentLength = (node[arrayKey] as unknown[] | undefined)?.length ?? 0
    if (index >= currentLength) {
      throw new Error(`Index ${index} out of range for ${arrayKey} (length ${currentLength})`)
    }
    // Auto-remove top-level dead binding (e.g. 'fills') when setting indexed binding
    const topLevelKey = colorFieldMatch[1]
    if (topLevelKey in node.boundVariables) {
      node.boundVariables = omit(node.boundVariables, [topLevelKey])
    }
  }

  if (SCALAR_BINDING_FIELDS.has(field) && variable.type !== 'FLOAT') {
    throw new Error(`Cannot bind ${variable.type} variable to scalar field "${field}"`)
  }

  if (STRING_BINDING_FIELDS.has(field) && variable.type !== 'STRING') {
    throw new Error(`Cannot bind ${variable.type} variable to string field "${field}"`)
  }

  if (BOOLEAN_BINDING_FIELDS.has(field) && variable.type !== 'BOOLEAN') {
    throw new Error(`Cannot bind ${variable.type} variable to boolean field "${field}"`)
  }

  const isKnownField =
    SCALAR_BINDING_FIELDS.has(field) ||
    STRING_BINDING_FIELDS.has(field) ||
    BOOLEAN_BINDING_FIELDS.has(field) ||
    colorFieldMatch

  if (!isKnownField) {
    throw new Error(`Unknown binding field "${field}"`)
  }

  node.boundVariables = { ...node.boundVariables, [field]: variableId }
  graph.emitter.emit('node:updated', nodeId, { boundVariables: { ...node.boundVariables } })
  markBoundVariablesOverrideOnInstance(graph, nodeId)
}

export function unbindVariable(graph: SceneGraph, nodeId: string, field: string): void {
  const node = graph.nodes.get(nodeId)
  if (!node) return
  if (!(field in node.boundVariables)) return
  node.boundVariables = omit(node.boundVariables, [field])
  graph.emitter.emit('node:updated', nodeId, { boundVariables: { ...node.boundVariables } })
  markBoundVariablesOverrideOnInstance(graph, nodeId)
}

function markBoundVariablesOverrideOnInstance(graph: SceneGraph, nodeId: string): void {
  const node = graph.nodes.get(nodeId)
  if (!node) return

  // Mark the field on the canonical structured state.
  if (node.type === 'INSTANCE') {
    setInstanceOverride(node.instanceOverrides, node.id, node.id, 'boundVariables')
    return
  }

  // Walk up to the owning instance for descendant fields.
  let current = node
  while (current.parentId) {
    const parent = graph.nodes.get(current.parentId)
    if (!parent) break
    if (parent.type === 'INSTANCE') {
      setInstanceOverride(parent.instanceOverrides, parent.id, nodeId, 'boundVariables')
      break
    }
    current = parent
  }
}
