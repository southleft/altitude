import type { CodeBindingProp } from '@open-pencil/scene-graph'

import type { AnatomyNode, CodeContract, ContractProp } from '../contract'
import { axisForDimension } from './axes'
import { asRecord, normKey, parseCase } from './names'
import { layerTokens, partTokenNames, tokenNames } from './tokens'
import type { CSSTokens, PlanAxis, PlanVariant } from './types'

function dimensionMatches(axis: PlanAxis, raw: string, option: string): boolean {
  if (normKey(raw) === normKey(option)) return true
  if (normKey(raw) === 'default') return option === axis.default
  return axis.code.some(({ binding }) => normKey(binding.values?.[option]) === normKey(raw))
}

/** The measured case that best matches a variant: most axis dimensions, base values elsewhere. */
function chooseCase(
  contract: CodeContract,
  axes: readonly PlanAxis[],
  values: Record<string, string>
): { tree: AnatomyNode; caseName: string | null } {
  const anatomy = contract.anatomy
  if (!anatomy) throw new Error(`${contract.id} has no anatomy`)
  const base = parseCase(contract.anatomyCase)
  let best: { score: number; tree: AnatomyNode; caseName: string } | null = null
  for (const candidate of anatomy.cases ?? []) {
    let score = 0
    for (const [dim, raw] of Object.entries(parseCase(candidate.case))) {
      const axis = axisForDimension(axes, dim)
      if (axis) {
        if (dimensionMatches(axis, raw, values[axis.name] ?? axis.default)) score += 2
      } else if (base[dim] === raw) {
        score += 1
      }
    }
    if (!best || score > best.score)
      best = { score, tree: candidate.root, caseName: candidate.case }
  }
  return best
    ? { tree: best.tree, caseName: best.caseName }
    : { tree: anatomy.root, caseName: null }
}

function conditionalFor(
  contract: CodeContract,
  prop: ContractProp,
  option: string,
  binding: CodeBindingProp
): Record<string, unknown> | null {
  const byValue = asRecord(asRecord(contract.conditionalBindings)[prop.name])
  const wanted = [binding.values?.[option], option].filter(
    (value): value is string => value !== undefined
  )
  const entry = Object.entries(byValue).find(([key]) =>
    wanted.some((w) => normKey(w) === normKey(key))
  )
  return entry ? asRecord(entry[1]) : null
}

function layerParts(target: Record<string, CSSTokens>, parts: Record<string, CSSTokens>): void {
  for (const [part, names] of Object.entries(parts)) {
    const tokens = target[part] ?? {}
    layerTokens(tokens, names)
    target[part] = tokens
  }
}

/**
 * Tokens for one variant, layered as buildOps does: the measured case root, then each
 * axis prop's conditionalBindings entry, then for a non-Default state the compound
 * variant+state entry (else the generic state entry) and measured stateOverrides.
 */
function variantTokens(
  contract: CodeContract,
  axes: readonly PlanAxis[],
  values: Record<string, string>,
  state: string,
  tree: AnatomyNode
): Pick<PlanVariant, 'rootTokens' | 'pathTokens' | 'partTokens'> {
  const rootTokens: CSSTokens = { ...tokenNames(tree.tokens) }
  const partTokens: Record<string, CSSTokens> = {}
  let compound: Record<string, unknown> | null = null
  for (const axis of axes) {
    if (axis.kind === 'state') continue
    const option = values[axis.name] ?? axis.default
    for (const { prop, binding } of axis.code) {
      const layer = conditionalFor(contract, prop, option, binding)
      if (!layer) continue
      layerTokens(rootTokens, tokenNames(layer))
      layerParts(partTokens, partTokenNames(layer))
      if (state === 'Default' || compound) continue
      const nested = Object.entries(asRecord(layer.state)).find(
        ([key]) => normKey(key) === normKey(state)
      )
      if (nested) compound = asRecord(nested[1])
    }
  }
  const pathTokens: Record<string, CSSTokens> = {}
  if (state !== 'Default') {
    const generic = Object.entries(asRecord(asRecord(contract.conditionalBindings).state)).find(
      ([key]) => normKey(key) === normKey(state)
    )
    const stateLayer = compound ?? asRecord(generic?.[1])
    layerTokens(rootTokens, tokenNames(stateLayer))
    layerParts(partTokens, partTokenNames(stateLayer))
    const overrides = Object.entries(contract.anatomy?.stateOverrides ?? {}).find(
      ([key]) => normKey(key) === normKey(state)
    )
    for (const [path, props] of Object.entries(overrides?.[1] ?? {})) {
      const names = tokenNames(props)
      if (path === '0') layerTokens(rootTokens, names)
      else pathTokens[path] = names
    }
  }
  return { rootTokens, pathTokens, partTokens }
}

function cartesian(axes: readonly PlanAxis[]): Array<Record<string, string>> {
  return axes.reduce<Array<Record<string, string>>>(
    (rows, axis) =>
      rows.flatMap((row) => axis.values.map((value) => ({ ...row, [axis.name]: value }))),
    [{}]
  )
}

export const variantName = (axes: readonly PlanAxis[], values: Record<string, string>): string =>
  axes.length ? axes.map((axis) => `${axis.name}=${values[axis.name]}`).join(', ') : 'State=Default'

/** The cross-product of every axis, each resolved to its anatomy tree and tokens. */
export function buildVariants(contract: CodeContract, axes: readonly PlanAxis[]): PlanVariant[] {
  const stateAxis = axes.find((axis) => axis.kind === 'state')
  const variants = cartesian(axes).map((values): PlanVariant => {
    const state = stateAxis ? values[stateAxis.name] : 'Default'
    const { tree, caseName } = chooseCase(contract, axes, values)
    return {
      name: variantName(axes, values),
      values,
      state,
      tree,
      caseName,
      ...variantTokens(contract, axes, values, state, tree)
    }
  })
  return variants.sort((a, b) => a.name.localeCompare(b.name))
}
