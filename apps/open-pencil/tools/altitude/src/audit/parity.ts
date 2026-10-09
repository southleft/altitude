import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import * as v from 'valibot'

import { codeBindingOwner, type SceneGraph } from '@open-pencil/scene-graph'

import { canvasContractForSet } from '../library/canvas-contract'
import type { AltitudeFacts } from './facts'

/**
 * Code ↔ canvas parity for the Altitude components a document uses.
 *
 * A document carries its own copy of every library component it places (materialized on an
 * internal page), so the canvas side is read from the document itself: one canvas contract
 * per code-bound component set that has an instance on a designer-visible page. Each is
 * scored by Altitude's own `scoreComponent()` (`scripts/lib/canvas-parity.mjs`, which runs
 * the unchanged `diffContracts()`) against the code contract of the target Altitude
 * version. Comparing base and head separates disagreements the change introduced from
 * those it inherited or resolved.
 */

export const PARITY_MODULE = 'scripts/lib/canvas-parity.mjs'

const DisagreementSchema = v.looseObject({
  dimension: v.string(),
  key: v.string(),
  kind: v.string(),
  detail: v.optional(v.string())
})
const TallySchema = v.object({ matched: v.number(), total: v.number(), percent: v.number() })
const ScoreSchema = v.looseObject({
  api: TallySchema,
  token: TallySchema,
  disagreements: v.array(DisagreementSchema)
})

export type ParityDisagreement = v.InferOutput<typeof DisagreementSchema>
type Score = v.InferOutput<typeof ScoreSchema>
type ScoreComponent = (input: { codeContract: unknown; canvasContract: unknown }) => unknown

export interface ComponentParity {
  tag: string
  /** Component set name in the document. */
  name: string
  api: Score['api']
  token: Score['token']
  disagreements: ParityDisagreement[]
}

export interface ComponentParityChange {
  tag: string
  name: string
  api: Score['api']
  token: Score['token']
  introduced: ParityDisagreement[]
  resolved: ParityDisagreement[]
  /** Disagreements present before and after the change. */
  unchanged: number
}

export interface DocumentParity {
  components: ComponentParityChange[]
  /** Tags placed in the document that have no code contract at the target version. */
  missingContracts: string[]
}

export async function loadScoreComponent(altitudeRoot: string): Promise<ScoreComponent> {
  const path = join(altitudeRoot, PARITY_MODULE)
  if (!existsSync(path)) throw new Error(`Altitude parity module not found: ${path}`)
  const module: unknown = await import(pathToFileURL(path).href)
  const score: unknown =
    module && typeof module === 'object' ? Reflect.get(module, 'scoreComponent') : null
  if (typeof score !== 'function') throw new Error(`${PARITY_MODULE} has no scoreComponent()`)
  return (input) => Reflect.apply(score, undefined, [input])
}

/** Ids of code-bound component sets with at least one instance on a visible page. */
function usedComponentSets(graph: SceneGraph): string[] {
  const sets = new Set<string>()
  for (const page of graph.getPages()) {
    const stack = [...page.childIds]
    while (stack.length > 0) {
      const node = graph.getNode(stack.pop() ?? '')
      if (!node) continue
      if (node.type === 'INSTANCE') {
        const owner = codeBindingOwner(graph, node)
        if (owner?.type === 'COMPONENT_SET' && owner.codeBinding?.tagName.startsWith('al-'))
          sets.add(owner.id)
      }
      stack.push(...node.childIds)
    }
  }
  return [...sets]
}

export function componentParity(
  graph: SceneGraph,
  facts: AltitudeFacts,
  score: ScoreComponent
): { components: ComponentParity[]; missingContracts: string[] } {
  const components = new Map<string, ComponentParity>()
  const missing = new Set<string>()
  for (const setId of usedComponentSets(graph)) {
    const set = graph.getNode(setId)
    const canvasContract = set ? canvasContractForSet(graph, set) : null
    if (!set || !canvasContract || components.has(canvasContract.component)) continue
    const codeContract = facts.contracts.get(canvasContract.component)
    if (!codeContract) {
      missing.add(canvasContract.component)
      continue
    }
    const result = v.parse(ScoreSchema, score({ codeContract, canvasContract }))
    components.set(canvasContract.component, {
      tag: canvasContract.component,
      name: set.name,
      api: result.api,
      token: result.token,
      disagreements: result.disagreements
    })
  }
  return {
    components: [...components.values()].sort((a, b) => a.tag.localeCompare(b.tag)),
    missingContracts: [...missing].sort()
  }
}

const disagreementKey = (d: ParityDisagreement) => `${d.dimension}\u0000${d.kind}\u0000${d.key}`

/** Head parity, with the disagreements the change introduced and resolved relative to base. */
export function parityChange(
  base: SceneGraph | null,
  head: SceneGraph | null,
  facts: AltitudeFacts,
  score: ScoreComponent
): DocumentParity {
  const before = base ? componentParity(base, facts, score) : null
  const after = head ? componentParity(head, facts, score) : null
  const previous = new Map(before?.components.map((row) => [row.tag, row]))
  const components = (after?.components ?? []).map((row) => {
    const old = new Set(previous.get(row.tag)?.disagreements.map(disagreementKey))
    const now = new Set(row.disagreements.map(disagreementKey))
    return {
      tag: row.tag,
      name: row.name,
      api: row.api,
      token: row.token,
      introduced: row.disagreements.filter((d) => !old.has(disagreementKey(d))),
      resolved: (previous.get(row.tag)?.disagreements ?? []).filter(
        (d) => !now.has(disagreementKey(d))
      ),
      unchanged: row.disagreements.filter((d) => old.has(disagreementKey(d))).length
    }
  })
  return { components, missingContracts: after?.missingContracts ?? [] }
}
