import type { ResolvedTokenImportConfig } from './config'
import { tokenCollectionId, tokenModeId } from './naming'
import { matchesFileGlob, matchesTokenGlob } from './paths'
import { contextKey, type TokenContext } from './resolve'
import { liveAliasTarget, stableStringify, type ResolvedContexts, type TokenState } from './state'
import type { PlannedCollection } from './types'

/** Collection modes for a set of axes: their cartesian product, labelled `A / B`. */
function collectionModes(
  config: ResolvedTokenImportConfig,
  axes: readonly string[]
): Array<{ name: string; context: TokenContext }> {
  let combos: Array<{ labels: string[]; context: TokenContext }> = [{ labels: [], context: {} }]
  for (const axisName of axes) {
    const axis = config.axes.find((candidate) => candidate.name === axisName)
    if (!axis) continue
    combos = combos.flatMap((combo) =>
      axis.modes.map((mode) => ({
        labels: [...combo.labels, mode.label],
        context: { ...combo.context, [axis.name]: mode.name }
      }))
    )
  }
  return combos.map((combo) => ({
    name: combo.labels.length ? combo.labels.join(' / ') : 'Default',
    context: combo.context
  }))
}

interface CollectionEntry {
  collection: PlannedCollection
  order: number
}

export class CollectionPlacer {
  private readonly entries = new Map<string, CollectionEntry>()
  private readonly placed: Array<{ state: TokenState; collection: PlannedCollection }> = []

  constructor(
    private readonly config: ResolvedTokenImportConfig,
    private readonly resolved: ResolvedContexts,
    private readonly states: ReadonlyMap<string, TokenState>,
    private readonly plannable: ReadonlySet<string>
  ) {}

  private signature(state: TokenState, context: TokenContext): string {
    const token = state.byContext.get(contextKey(context))
    if (!token) return 'absent'
    const alias = liveAliasTarget(state, token, this.states, this.plannable)
    return alias ? `alias:${alias}` : `value:${stableStringify(token.value)}`
  }

  /** Axes where switching only that axis changes the token's authored value or presence. */
  varyingAxes(state: TokenState): string[] {
    return this.config.axes
      .filter((axis) =>
        this.resolved.contexts.some(
          (context) =>
            context[axis.name] !== axis.defaultMode &&
            this.signature(state, context) !==
              this.signature(state, { ...context, [axis.name]: axis.defaultMode })
        )
      )
      .map((axis) => axis.name)
  }

  private ensure(name: string, axes: string[], hidden: boolean, order: number): PlannedCollection {
    const existing = this.entries.get(name)
    if (existing) return existing.collection
    const collection: PlannedCollection = {
      id: tokenCollectionId(this.config.name, name),
      name,
      axes,
      hiddenFromPublishing: hidden,
      modes: collectionModes(this.config, axes).map((mode) => ({
        id: tokenModeId(this.config.name, name, mode.name),
        name: mode.name,
        context: mode.context
      })),
      variables: []
    }
    this.entries.set(name, { collection, order })
    return collection
  }

  place(state: TokenState): void {
    const varying = this.varyingAxes(state)
    const originFile = state.origin?.file ?? ''
    const index = this.config.collections.findIndex(
      (candidate) =>
        varying.every((axis) => candidate.axes.includes(axis)) &&
        (!candidate.files || matchesFileGlob(originFile, candidate.files)) &&
        (!candidate.tokens || matchesTokenGlob(state.path, candidate.tokens))
    )
    if (index !== -1) {
      const chosen = this.config.collections[index]
      const collection = this.ensure(
        chosen.name,
        chosen.axes,
        chosen.hiddenFromPublishing ?? false,
        index
      )
      this.placed.push({ state, collection })
      return
    }
    // No configured collection covers these axes: create one rather than drop the token.
    const labels = this.config.axes
      .filter((axis) => varying.includes(axis.name))
      .map((axis) => axis.label)
    const name = labels.length ? `Tokens · ${labels.join(' × ')}` : 'Tokens'
    const collection = this.ensure(name, varying, false, this.config.collections.length)
    this.placed.push({ state, collection })
  }

  placements(): ReadonlyArray<{ state: TokenState; collection: PlannedCollection }> {
    return this.placed
  }

  collections(): PlannedCollection[] {
    return [...this.entries.values()]
      .filter((entry) => entry.collection.variables.length > 0)
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.collection)
  }
}
