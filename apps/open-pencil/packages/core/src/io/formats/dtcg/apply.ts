import { isEqual } from 'es-toolkit/predicate'

import type {
  SceneGraph,
  Variable,
  VariableCollection,
  VariableValue
} from '@open-pencil/scene-graph'

import { DTCG_EXTENSION_KEY, readCollectionTokenMetadata, readTokenMetadata } from './metadata'
import type {
  PlannedCollection,
  PlannedVariable,
  TokenCollectionMetadata,
  TokenImportPlan,
  TokenImportResult
} from './types'

/**
 * Write a plan into a graph, updating what an earlier import created.
 *
 * Identity is the token path, not the variable id: a `.fig` round trip reassigns ids, so
 * a variable is matched by its `org.openpencil.dtcg` source + path first, then by the
 * stable id, then by name inside the target collection (which adopts variables a design
 * file already had). Matched variables keep their id, so node bindings survive updates
 * and moves between collections. Variables of this source that the tokens no longer
 * define are reported; `prune` deletes them.
 */

export interface ApplyTokenImportOptions {
  /** Delete variables of this source that the tokens no longer define. Default false. */
  prune?: boolean
}

class IdAllocator {
  private readonly taken = new Set<string>()

  constructor(private readonly graph: SceneGraph) {}

  allocate(preferred: string): string {
    let id = preferred
    let counter = 2
    while (
      this.graph.variables.has(id) ||
      this.graph.variableCollections.has(id) ||
      this.taken.has(id)
    ) {
      id = `${preferred}#${counter++}`
    }
    this.taken.add(id)
    return id
  }
}

function collectionMetadata(source: string, planned: PlannedCollection): TokenCollectionMetadata {
  return {
    source,
    axes: planned.axes,
    modes: Object.fromEntries(planned.modes.map((mode) => [mode.name, mode.context]))
  }
}

function findCollection(
  graph: SceneGraph,
  source: string,
  planned: PlannedCollection
): VariableCollection | undefined {
  const all = [...graph.variableCollections.values()]
  return (
    all.find(
      (collection) =>
        readCollectionTokenMetadata(collection)?.source === source &&
        collection.name === planned.name
    ) ??
    graph.variableCollections.get(planned.id) ??
    all.find((collection) => collection.name === planned.name)
  )
}

function createCollection(
  graph: SceneGraph,
  planned: PlannedCollection,
  metadata: TokenCollectionMetadata,
  ids: IdAllocator
): VariableCollection {
  const modes = planned.modes.map((mode) => ({ modeId: ids.allocate(mode.id), name: mode.name }))
  const collection: VariableCollection = {
    id: ids.allocate(planned.id),
    name: planned.name,
    modes,
    defaultModeId: modes[0].modeId,
    variableIds: [],
    extensions: { [DTCG_EXTENSION_KEY]: metadata }
  }
  graph.addCollection(collection)
  return collection
}

/** Add planned modes an existing collection lacks; keep modes added by hand. */
function syncModes(
  graph: SceneGraph,
  collection: VariableCollection,
  planned: PlannedCollection,
  ids: IdAllocator
): void {
  const plannedNames = new Set(planned.modes.map((mode) => mode.name))
  for (const mode of planned.modes) {
    const existing = collection.modes.find(
      (candidate) => candidate.name.toLowerCase() === mode.name.toLowerCase()
    )
    if (existing) {
      existing.name = mode.name
      continue
    }
    // An empty single-mode collection renames its placeholder ("Mode 1") instead of
    // keeping an unused mode beside the planned ones.
    const placeholder = collection.modes.length === 1 && collection.variableIds.length === 0
    if (placeholder && !plannedNames.has(collection.modes[0].name)) {
      collection.modes[0].name = mode.name
      continue
    }
    graph.addMode(collection.id, ids.allocate(mode.id), mode.name)
  }
}

function syncCollection(
  graph: SceneGraph,
  source: string,
  planned: PlannedCollection,
  ids: IdAllocator
): { collection: VariableCollection; modeIds: Map<string, string> } {
  const metadata = collectionMetadata(source, planned)
  let collection = findCollection(graph, source, planned)
  if (collection) {
    collection.extensions = { ...collection.extensions, [DTCG_EXTENSION_KEY]: metadata }
    syncModes(graph, collection, planned, ids)
  } else {
    collection = createCollection(graph, planned, metadata, ids)
  }
  return { collection, modeIds: new Map(collection.modes.map((mode) => [mode.name, mode.modeId])) }
}

function moveVariable(graph: SceneGraph, variable: Variable, collection: VariableCollection): void {
  const previous = graph.variableCollections.get(variable.collectionId)
  if (previous) previous.variableIds = previous.variableIds.filter((id) => id !== variable.id)
  variable.collectionId = collection.id
  if (!collection.variableIds.includes(variable.id)) collection.variableIds.push(variable.id)
}

function variableSnapshot(variable: Variable) {
  return structuredClone({
    name: variable.name,
    type: variable.type,
    values: variable.valuesByMode,
    description: variable.description,
    codeSyntax: variable.codeSyntax,
    extensions: variable.extensions,
    collectionId: variable.collectionId
  })
}

interface SyncedCollection {
  planned: PlannedCollection
  collection: VariableCollection
  modeIds: Map<string, string>
}

class PlanWriter {
  private readonly ids: IdAllocator
  private readonly byPath = new Map<string, Variable>()
  private readonly actualIds = new Map<string, string>()
  private readonly matches = new Map<PlannedVariable, Variable | undefined>()

  constructor(
    private readonly graph: SceneGraph,
    private readonly plan: TokenImportPlan,
    private readonly result: TokenImportResult
  ) {
    this.ids = new IdAllocator(graph)
    for (const variable of graph.variables.values()) {
      const metadata = readTokenMetadata(variable)
      if (metadata?.source === plan.source) this.byPath.set(metadata.path, variable)
    }
  }

  syncCollections(): SyncedCollection[] {
    return this.plan.collections.map((planned) => ({
      planned,
      ...syncCollection(this.graph, this.plan.source, planned, this.ids)
    }))
  }

  /** Decide the id each planned variable will have before writing any alias. */
  matchVariables(synced: readonly SyncedCollection[]): void {
    for (const { planned, collection } of synced) {
      for (const variable of planned.variables) {
        const existing =
          this.byPath.get(variable.key) ??
          this.graph.variables.get(variable.id) ??
          collection.variableIds
            .map((id) => this.graph.variables.get(id))
            .find((candidate) => candidate?.name === variable.name && !readTokenMetadata(candidate))
        this.matches.set(variable, existing)
        this.actualIds.set(variable.id, existing?.id ?? this.ids.allocate(variable.id))
      }
    }
  }

  private remap(value: VariableValue): VariableValue {
    if (typeof value === 'object' && 'aliasId' in value) {
      return { aliasId: this.actualIds.get(value.aliasId) ?? value.aliasId }
    }
    return value
  }

  private valuesFor(variable: PlannedVariable, modeIds: Map<string, string>) {
    const valuesByMode: Record<string, VariableValue> = {}
    for (const [modeName, value] of Object.entries(variable.valuesByMode)) {
      const modeId = modeIds.get(modeName)
      if (modeId) valuesByMode[modeId] = this.remap(value)
    }
    return valuesByMode
  }

  write({ planned, collection, modeIds }: SyncedCollection, variable: PlannedVariable): void {
    const existing = this.matches.get(variable)
    const valuesByMode = this.valuesFor(variable, modeIds)
    const extensions = { ...existing?.extensions, [DTCG_EXTENSION_KEY]: variable.metadata }
    if (!existing) {
      const created: Variable = {
        id: this.actualIds.get(variable.id) ?? variable.id,
        name: variable.name,
        type: variable.type,
        collectionId: collection.id,
        valuesByMode,
        description: variable.description,
        hiddenFromPublishing: planned.hiddenFromPublishing,
        extensions
      }
      if (variable.codeSyntax) created.codeSyntax = { ...variable.codeSyntax }
      this.graph.addVariable(created)
      this.result.created.push(variable.key)
      return
    }
    this.update(existing, variable, collection, valuesByMode, extensions)
  }

  private update(
    existing: Variable,
    variable: PlannedVariable,
    collection: VariableCollection,
    valuesByMode: Record<string, VariableValue>,
    extensions: Record<string, unknown>
  ): void {
    const before = variableSnapshot(existing)
    if (existing.collectionId !== collection.id) {
      moveVariable(this.graph, existing, collection)
      this.result.moved.push(variable.key)
    }
    if (existing.type !== variable.type) {
      this.result.issues.push({
        code: 'type-conflict',
        token: variable.key,
        message: `Variable type changed from ${existing.type} to ${variable.type}; existing bindings may no longer apply`
      })
    }
    existing.name = variable.name
    existing.type = variable.type
    // Modes the tokens do not define (added by hand) keep their values.
    existing.valuesByMode = { ...existing.valuesByMode, ...valuesByMode }
    const fallback = Object.values(valuesByMode).at(0)
    for (const mode of collection.modes) {
      if (!Object.hasOwn(existing.valuesByMode, mode.modeId) && fallback !== undefined) {
        existing.valuesByMode[mode.modeId] = structuredClone(fallback)
      }
    }
    existing.description = variable.description
    if (variable.codeSyntax)
      existing.codeSyntax = { ...existing.codeSyntax, ...variable.codeSyntax }
    existing.extensions = extensions
    const changed = !isEqual(before, variableSnapshot(existing))
    ;(changed ? this.result.updated : this.result.unchanged).push(variable.key)
  }

  removeStale(seen: ReadonlySet<string>, prune: boolean): void {
    for (const [path, variable] of this.byPath) {
      if (seen.has(path)) continue
      this.result.removed.push(path)
      if (prune) this.graph.removeVariable(variable.id)
    }
    if (!prune) return
    for (const collection of this.graph.variableCollections.values()) {
      const ours = readCollectionTokenMetadata(collection)?.source === this.plan.source
      if (ours && collection.variableIds.length === 0) this.graph.removeCollection(collection.id)
    }
  }
}

export function applyTokenImportPlan(
  graph: SceneGraph,
  plan: TokenImportPlan,
  options: ApplyTokenImportOptions = {}
): TokenImportResult {
  const result: TokenImportResult = {
    source: plan.source,
    collections: [],
    created: [],
    updated: [],
    unchanged: [],
    moved: [],
    removed: [],
    pruned: options.prune ?? false,
    issues: [...plan.issues],
    stats: plan.stats
  }
  const writer = new PlanWriter(graph, plan, result)
  const synced = writer.syncCollections()
  writer.matchVariables(synced)
  const seen = new Set<string>()
  for (const entry of synced) {
    for (const variable of entry.planned.variables) {
      seen.add(variable.key)
      writer.write(entry, variable)
    }
  }
  writer.removeStale(seen, result.pruned)

  result.collections = synced
    .filter(({ collection }) => graph.variableCollections.has(collection.id))
    .map(({ collection }) => ({
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map((mode) => mode.name),
      variables: collection.variableIds.length
    }))
  return result
}
