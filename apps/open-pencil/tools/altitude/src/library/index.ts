import { importDesignTokens } from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph } from '@open-pencil/scene-graph'

import { altitudePaths, readAltitudePreset, readTokenTree } from '../tree'
import { buildComponentSet, createBindContext, type BuildContext } from './build'
import {
  readContracts,
  readCustomElements,
  readReactComponents,
  type CodeContract,
  type ContractIssue
} from './contract'
import { planComponent, type ComponentPlan } from './plan/index'

export { arrangeLibraryPage, componentSetKey, iconKey } from './build'
export { emitCanvasContracts, type CanvasContract } from './canvas-contract'
export { planComponent, type ComponentPlan } from './plan/index'

/**
 * Altitude → OpenPencil component library.
 *
 * Imports the Altitude DTCG tokens as variables, then builds one COMPONENT_SET per code
 * contract that carries measured anatomy: variant axes from the contract's bindings,
 * auto-layout from the anatomy, and every fill, stroke, radius, padding and gap bound to the
 * imported variables. Contracts without measured anatomy are reported as named skips.
 */

export const LIBRARY_PAGE_NAME = 'Altitude components'

export interface LibraryBuildOptions {
  project?: string
  /** Build only these tags (and the components they nest). */
  only?: readonly string[]
}

export interface SkippedComponent {
  tag: string
  reason: string
}

export interface BuiltComponentReport {
  tag: string
  name: string
  setId: string
  variants: number
  axes: Array<{ name: string; values: string[] }>
  properties: string[]
  degradations: string[]
  /** Variable name → why it is not bound anywhere on the canvas. */
  unbound: Record<string, string>
}

export interface LibraryBuildResult {
  graph: SceneGraph
  pageId: string
  built: BuiltComponentReport[]
  skipped: SkippedComponent[]
  contractIssues: ContractIssue[]
  tokenIssues: number
}

function boundVariableNames(graph: SceneGraph, rootId: string): Set<string> {
  const names = new Set<string>()
  const pending = [rootId]
  while (pending.length) {
    const node = graph.getNode(pending.pop() ?? '')
    if (!node) continue
    for (const id of Object.values(node.boundVariables)) {
      const name = graph.variables.get(id)?.name
      if (name) names.add(name)
    }
    pending.push(...node.childIds)
  }
  return names
}

function buildOrder(plans: ComponentPlan[]): ComponentPlan[] {
  const byTag = new Map(plans.map((plan) => [plan.tag, plan]))
  const ordered: ComponentPlan[] = []
  const visiting = new Set<string>()
  const done = new Set<string>()
  const visit = (plan: ComponentPlan) => {
    if (done.has(plan.tag) || visiting.has(plan.tag)) return
    visiting.add(plan.tag)
    for (const tag of plan.nestedTags) {
      const nested = byTag.get(tag)
      if (nested) visit(nested)
    }
    visiting.delete(plan.tag)
    done.add(plan.tag)
    ordered.push(plan)
  }
  for (const plan of plans) visit(plan)
  return ordered
}

function withNested(
  contracts: CodeContract[],
  only: readonly string[] | undefined
): Set<string> | null {
  if (!only?.length) return null
  const byTag = new Map(contracts.map((contract) => [contract.id, contract]))
  const wanted = new Set<string>()
  const pending = [...only]
  while (pending.length) {
    const tag = pending.pop()
    if (!tag || wanted.has(tag)) continue
    wanted.add(tag)
    const contract = byTag.get(tag)
    const json = JSON.stringify(contract?.anatomy ?? {})
    for (const match of json.matchAll(/"component":"(al-[a-z0-9-]+)"/g)) pending.push(match[1])
  }
  return wanted
}

export async function buildAltitudeLibrary(
  altitudeRoot: string,
  options: LibraryBuildOptions = {}
): Promise<LibraryBuildResult> {
  const paths = altitudePaths(altitudeRoot)
  const graph = new SceneGraph()
  const tokens = importDesignTokens(
    graph,
    await readTokenTree(paths.tokens),
    await readAltitudePreset()
  )
  const page = graph.getPages()[0]
  graph.updateNode(page.id, { name: LIBRARY_PAGE_NAME })

  const { contracts, issues } = await readContracts(paths.root, options.project)
  const elements = await readCustomElements(paths.root)
  const reactComponents = await readReactComponents(paths.root)
  const variableNames = new Set([...graph.variables.values()].map((variable) => variable.name))
  const selected = withNested(contracts, options.only)

  const skipped: SkippedComponent[] = []
  const plans: ComponentPlan[] = []
  for (const contract of contracts) {
    if (selected && !selected.has(contract.id)) continue
    if (contract.anatomySource !== 'measured' || !contract.anatomy) {
      skipped.push({
        tag: contract.id,
        reason: `anatomySource "${contract.anatomySource ?? 'none'}": no measured anatomy to build from (run measure-components.mjs, then contracts --refresh)`
      })
      continue
    }
    try {
      plans.push(
        planComponent(contract, { cem: elements.get(contract.id), reactComponents, variableNames })
      )
    } catch (error) {
      skipped.push({
        tag: contract.id,
        reason: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const ctx: BuildContext = createBindContext(graph, page.id)
  const built: BuiltComponentReport[] = []
  for (const plan of buildOrder(plans)) {
    ctx.unbound = new Map()
    const set = buildComponentSet(ctx, plan)
    // A token one CSS property could not carry may still be bound through another.
    for (const name of boundVariableNames(graph, set.setId)) ctx.unbound.delete(name)
    built.push({
      tag: plan.tag,
      name: plan.name,
      setId: set.setId,
      variants: set.variantCount,
      axes: plan.axes.map((axis) => ({ name: axis.name, values: [...axis.values] })),
      properties: plan.properties.map((property) => `${property.name} (${property.type})`),
      degradations: [...plan.degradations],
      unbound: Object.fromEntries([...ctx.unbound].sort(([a], [b]) => a.localeCompare(b)))
    })
  }
  built.sort((a, b) => a.tag.localeCompare(b.tag))
  skipped.sort((a, b) => a.tag.localeCompare(b.tag))
  return {
    graph,
    pageId: page.id,
    built,
    skipped,
    contractIssues: issues,
    tokenIssues: tokens.issues.length
  }
}
