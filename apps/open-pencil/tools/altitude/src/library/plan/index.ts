import type { CodeBinding, CodeBindingReact } from '@open-pencil/scene-graph'

import type { AnatomyNode, CodeContract } from '../contract'
import { buildAxes } from './axes'
import { titleize } from './names'
import { buildProperties } from './properties'
import type { ComponentPlan, PlanAxis, PlanContext, PlanVariant } from './types'
import { buildVariants, variantName } from './variants'

/**
 * Contract → component plan: which variant axes, component properties and variants a
 * component set gets, which anatomy tree each variant builds from, and which variable each
 * CSS property binds to per variant and state.
 *
 * Pure and deterministic. It mirrors Altitude's `scripts/contracts/figma/derive-ops.mjs`
 * `buildOps()` conventions (State axis from styled states, Title Case options, case axes,
 * `Text` / `Slot Before` / `Icon Before` properties, conditionalBindings layered over measured
 * anatomy) and `scripts/figma-atoms/plan.mjs` curation (omitted and BEHAVIOURAL props never
 * fan out). Unlike `buildOps()`, every VARIANT-kind binding becomes an axis, not only one enum.
 */

export { BEHAVIOURAL, booleanTrueOption, MAX_VARIANTS, STATE_ORDER } from './axes'
export { normKey } from './names'
export { layerTokens, tokenNames } from './tokens'
export type * from './types'

export function firstAnatomyText(node: AnatomyNode | undefined): string | null {
  if (!node) return null
  if (node.text) return node.text
  for (const child of node.children ?? []) {
    const text = firstAnatomyText(child)
    if (text) return text
  }
  return null
}

function collectNestedTags(node: AnatomyNode | undefined, out: Set<string>, isRoot = true): void {
  if (!node) return
  if (!isRoot && node.component) out.add(node.component)
  for (const child of node.children ?? []) collectNestedTags(child, out, false)
}

function reactBinding(tag: string, components?: ReadonlySet<string>): CodeBindingReact | undefined {
  const component = `AL${titleize(tag.replace(/^al-/, '')).replace(/\s+/g, '')}`
  return components?.has(component) ? { importPath: '@southleft/al-react', component } : undefined
}

function unknownVariables(
  plan: Pick<ComponentPlan, 'variants'>,
  known: ReadonlySet<string>
): string[] {
  const missing = new Set<string>()
  for (const variant of plan.variants) {
    const maps = [
      variant.rootTokens,
      ...Object.values(variant.pathTokens),
      ...Object.values(variant.partTokens)
    ]
    for (const name of maps.flatMap((map) => Object.values(map)))
      if (!known.has(name)) missing.add(name)
  }
  return [...missing].sort()
}

function codeBindingFor(
  contract: CodeContract,
  context: PlanContext,
  props: CodeBinding['props'],
  slots: CodeBinding['slots']
): CodeBinding {
  const code = contract.bindings?.code
  const binding: CodeBinding = { tagName: code?.tagName ?? contract.id, props, slots }
  if (code?.workspace) binding.package = code.workspace
  if (code?.importPath) binding.importPath = code.importPath
  const react = reactBinding(contract.id, context.reactComponents)
  if (react) binding.react = react
  if (context.cem?.events.length) binding.events = [...context.cem.events]
  if (context.cem?.parts.length) binding.parts = [...context.cem.parts]
  return binding
}

function planDegradations(
  contract: CodeContract,
  axes: readonly PlanAxis[],
  variants: PlanVariant[],
  context: PlanContext
): string[] {
  const degradations: string[] = []
  const unknown = context.variableNames ? unknownVariables({ variants }, context.variableNames) : []
  if (unknown.length) {
    degradations.push(
      `variable(s) ${unknown.join(', ')} named by the contract are not in the imported tokens — left unbound.`
    )
  }
  const perVariantFacts =
    Boolean(contract.conditionalBindings) || Boolean(contract.anatomy?.cases?.length)
  if (axes.some((axis) => axis.kind !== 'state') && !perVariantFacts) {
    degradations.push(
      'no per-variant token facts (no conditionalBindings, one measured case) — every variant renders with the same root tokens.'
    )
  }
  return degradations
}

export function planComponent(contract: CodeContract, context: PlanContext = {}): ComponentPlan {
  if (!contract.anatomy) throw new Error(`${contract.id} has no anatomy to build from`)
  const degradations: string[] = []
  const axes = buildAxes(contract, degradations)
  const textDefault = firstAnatomyText(contract.anatomy.root)
  const { properties, codeProps, slots } = buildProperties(
    contract,
    axes,
    textDefault,
    degradations
  )
  const variants = buildVariants(contract, axes)
  degradations.push(...planDegradations(contract, axes, variants, context))

  const nested = new Set<string>()
  collectNestedTags(contract.anatomy.root, nested)
  for (const item of contract.anatomy.cases ?? []) collectNestedTags(item.root, nested)
  const axisProps = axes.flatMap((axis) => axis.code.map(({ binding }) => binding))

  const defaults = Object.fromEntries(axes.map((axis) => [axis.name, axis.default]))
  return {
    tag: contract.id,
    name: contract.name,
    axes,
    properties,
    variants,
    defaultVariant: variantName(axes, defaults),
    textDefault,
    nestedTags: [...nested].sort(),
    codeBinding: codeBindingFor(contract, context, [...axisProps, ...codeProps], slots),
    degradations
  }
}
