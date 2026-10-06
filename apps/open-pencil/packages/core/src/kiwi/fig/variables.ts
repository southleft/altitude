import {
  guidToString,
  resolveVariableConsumptionEntry,
  variableMetadataFromKiwi
} from '@open-pencil/fig/node-change'
import type { NodeChange, VariableDataValuesEntry, Color, GUID } from '@open-pencil/kiwi/fig/codec'
import type { SceneGraph, VariableType, VariableValue } from '@open-pencil/scene-graph'

import { BLACK } from '#core/constants'

type AssetRef = { key: string; version?: string }
type AliasRef = { guid?: GUID; assetRef?: AssetRef }

function assetRefKey(assetRef: AssetRef): string {
  return assetRef.version ? `${assetRef.key}@${assetRef.version}` : assetRef.key
}

export function buildAssetRefMap(changeMap: Map<string, NodeChange>): Map<string, string> {
  const refs = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (typeof nc.key !== 'string') continue
    if (typeof nc.version !== 'string' || !refs.has(nc.key)) refs.set(nc.key, id)
    if (typeof nc.version === 'string')
      refs.set(assetRefKey({ key: nc.key, version: nc.version }), id)
    if (typeof nc.userFacingVersion === 'string') {
      refs.set(assetRefKey({ key: nc.key, version: nc.userFacingVersion }), id)
    }
  }
  return refs
}

function resolveAliasId(alias: AliasRef, assetRefs: Map<string, string>): string | undefined {
  if (alias.guid) return guidToString(alias.guid)
  if (!alias.assetRef) return undefined
  return assetRefs.get(assetRefKey(alias.assetRef)) ?? assetRefs.get(alias.assetRef.key)
}

export function buildVariableColorResolver(
  changeMap: Map<string, NodeChange>,
  assetRefs: Map<string, string>
): (alias: AliasRef) => Color | null {
  // Collect variable data: GUID → entries
  const varEntries = new Map<string, VariableDataValuesEntry[]>()
  const varSetId = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE') continue
    varEntries.set(id, nc.variableDataValues?.entries ?? [])
    const setGuid = nc.variableSetID?.guid ? guidToString(nc.variableSetID.guid) : undefined
    const parentGuid = nc.parentIndex?.guid ? guidToString(nc.parentIndex.guid) : undefined
    if (setGuid) varSetId.set(id, setGuid)
    else if (parentGuid) varSetId.set(id, parentGuid)
  }

  // Collection default modes
  const defaultModes = new Map<string, string>()
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE_SET') continue
    const modes = nc.variableSetModes ?? []
    if (modes.length > 0) defaultModes.set(id, guidToString(modes[0].id))
  }

  function resolveById(
    id: string,
    preferredModeId: string | undefined,
    depth: number
  ): Color | null {
    if (depth > 10) return null
    const entries = varEntries.get(id)
    if (!entries?.length) return null

    const setId = varSetId.get(id)
    const defaultMode = setId ? defaultModes.get(setId) : undefined
    let entry = preferredModeId
      ? entries.find((e) => guidToString(e.modeID) === preferredModeId)
      : undefined
    if (!entry && defaultMode) entry = entries.find((e) => guidToString(e.modeID) === defaultMode)
    if (!entry) entry = entries[0]

    const val = entry.variableData.value
    if (!val) return null
    if (val.colorValue) return val.colorValue
    if (val.alias) {
      const aliasId = resolveAliasId(val.alias, assetRefs)
      if (aliasId) return resolveById(aliasId, guidToString(entry.modeID), depth + 1)
    }
    return null
  }

  return function resolve(alias: AliasRef): Color | null {
    const id = resolveAliasId(alias, assetRefs)
    return id ? resolveById(id, undefined, 0) : null
  }
}

function resolveVariableType(resolvedType: string | undefined): VariableType {
  if (resolvedType === 'COLOR') return 'COLOR'
  if (resolvedType === 'BOOLEAN') return 'BOOLEAN'
  if (resolvedType === 'STRING') return 'STRING'
  return 'FLOAT'
}

function resolveVariableValue(
  entry: VariableDataValuesEntry,
  assetRefs: Map<string, string>
): VariableValue | undefined {
  const vd = entry.variableData
  if (!vd.value) return undefined

  const dt = vd.dataType ?? vd.resolvedDataType
  if (dt === 'COLOR' && vd.value.colorValue) {
    const c = vd.value.colorValue
    return { r: c.r, g: c.g, b: c.b, a: c.a }
  }
  if (dt === 'BOOLEAN') return vd.value.boolValue ?? false
  if (dt === 'STRING') return vd.value.textValue ?? ''
  if (dt === 'ALIAS' && vd.value.alias) {
    const aliasId = resolveAliasId(vd.value.alias, assetRefs)
    if (aliasId) return { aliasId }
    return undefined
  }
  return vd.value.floatValue ?? 0
}

function resolveDefaultValue(type: VariableType): VariableValue {
  if (type === 'BOOLEAN') return false
  if (type === 'STRING') return ''
  if (type === 'COLOR') return { ...BLACK }
  return 0
}

export function importCollections(changeMap: Map<string, NodeChange>, graph: SceneGraph): void {
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE_SET') continue

    const modes = (nc.variableSetModes ?? []).map((m) => {
      const modeId = guidToString(m.id)
      return { modeId, name: m.name }
    })
    if (modes.length === 0) modes.push({ modeId: 'default', name: 'Default' })

    graph.addCollection({
      id,
      name: nc.name ?? 'Variables',
      modes,
      defaultModeId: modes[0].modeId,
      variableIds: [],
      ...variableMetadataFromKiwi(nc)
    })
  }
}

function resolveVariableCollectionId(
  nc: NodeChange,
  id: string,
  parentMap: Map<string, string>,
  assetRefs: Map<string, string>
): string {
  if (nc.variableSetID?.guid) return guidToString(nc.variableSetID.guid)
  const assetRef = nc.variableSetID?.assetRef
  if (assetRef) return assetRefs.get(assetRefKey(assetRef)) ?? assetRefs.get(assetRef.key) ?? ''
  return parentMap.get(id) ?? ''
}

function addFallbackCollection(
  changeMap: Map<string, NodeChange>,
  graph: SceneGraph,
  collectionId: string
): void {
  if (graph.variableCollections.has(collectionId)) return
  const parentNc = changeMap.get(collectionId)
  graph.addCollection({
    id: collectionId,
    name: parentNc?.name ?? 'Variables',
    modes: [{ modeId: 'default', name: 'Default' }],
    defaultModeId: 'default',
    variableIds: []
  })
}

export function importVariableEntries(
  changeMap: Map<string, NodeChange>,
  parentMap: Map<string, string>,
  graph: SceneGraph,
  assetRefs: Map<string, string>
): void {
  for (const [id, nc] of changeMap) {
    if (nc.type !== 'VARIABLE') continue

    const collectionId = resolveVariableCollectionId(nc, id, parentMap, assetRefs)
    addFallbackCollection(changeMap, graph, collectionId)

    const type = resolveVariableType(nc.variableResolvedType)
    const valuesByMode: Record<string, VariableValue> = {}

    if (nc.variableDataValues?.entries) {
      for (const entry of nc.variableDataValues.entries) {
        const val = resolveVariableValue(entry, assetRefs)
        if (val !== undefined) {
          valuesByMode[guidToString(entry.modeID)] = val
        }
      }
    }

    if (Object.keys(valuesByMode).length === 0) {
      const col = graph.variableCollections.get(collectionId)
      const defaultMode = col?.defaultModeId ?? 'default'
      valuesByMode[defaultMode] = resolveDefaultValue(type)
    }

    graph.addVariable({
      id,
      name: nc.name ?? 'Variable',
      type,
      collectionId,
      valuesByMode,
      description: '',
      hiddenFromPublishing: false,
      key: typeof nc.key === 'string' ? nc.key : undefined,
      version: typeof nc.version === 'string' ? nc.version : undefined,
      ...variableMetadataFromKiwi(nc)
    })
  }
}

export function importVariableBindings(
  changeMap: Map<string, NodeChange>,
  guidToNodeId: Map<string, string>,
  graph: SceneGraph
): void {
  for (const [ncId, nc] of changeMap) {
    if (!nc.variableConsumptionMap?.entries?.length) continue
    const nodeId = guidToNodeId.get(ncId)
    if (!nodeId) continue
    for (const entry of nc.variableConsumptionMap.entries) {
      const binding = resolveVariableConsumptionEntry(entry)
      if (binding) graph.bindVariable(nodeId, binding.field, binding.variableId)
    }
  }
}
