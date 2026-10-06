import type { CodeBindingProp } from '@open-pencil/scene-graph'

import type { CodeContract, ContractProp } from '../contract'
import {
  asRecord,
  codeAttribute,
  codeType,
  kebab,
  normKey,
  parseCase,
  strippedKey,
  stripQuotes,
  titleize
} from './names'
import type { AxisCode, PlanAxis } from './types'

/** Mirrors plan.mjs `BEHAVIOURAL`: props whose values have no pixels, never variant axes. */
export const BEHAVIOURAL = new Set([
  'type',
  'target',
  'href',
  'name',
  'value',
  'label',
  'tagName',
  'dateFormat',
  'ariaControls',
  'id',
  'for',
  'src',
  'alt',
  'placeholder',
  'autoClose',
  'isDynamic',
  'isInteractive',
  'resetDates',
  'resetTime',
  'is24HourFormat',
  'isDayShortHand',
  'startOnMonday',
  'showMonthPopup',
  'isTruncated'
])

/** Mirrors conventions.mjs `STATE_ORDER`. */
export const STATE_ORDER = ['Default', 'Hover', 'Active', 'Focus', 'Disabled']

/** Upper bound on variants per set; uncurated axes beyond it are skipped by name. */
export const MAX_VARIANTS = 256

const DEFAULTISH = ['default', 'primary', 'md', 'medium', 'no', 'off', 'false', 'shown']
const TRUTHY = ['yes', 'on', 'true']

/** Which option of a boolean-backed axis means `true` for this prop. */
export function booleanTrueOption(prop: ContractProp, options: readonly string[]): string | null {
  const byKey = (keys: readonly string[]) =>
    options.find((option) => keys.includes(normKey(option)))
  if (/^hide[A-Z]/.test(prop.name)) return byKey(['hidden', 'no', 'off']) ?? null
  if (/^show[A-Z]/.test(prop.name)) return byKey(['shown', 'yes', 'on']) ?? null
  const key = strippedKey(prop.name)
  const exact = options.find((option) => normKey(option) === key)
  if (exact) return exact
  const contained = options
    .filter((option) => normKey(option).length >= 3 && key.includes(normKey(option)))
    .sort((a, b) => normKey(b).length - normKey(a).length)[0]
  if (contained) return contained
  const truthy = byKey(TRUTHY)
  if (truthy) return truthy
  if (options.length === 2) return options.find((o) => !DEFAULTISH.includes(normKey(o))) ?? null
  return null
}

/** Canvas option label → code value for one prop backing an axis. */
export function optionValues(
  prop: ContractProp,
  options: readonly string[]
): Record<string, string> {
  const values: Record<string, string> = {}
  if (prop.type === 'boolean') {
    const option = booleanTrueOption(prop, options)
    if (option) values[option] = 'true'
    return values
  }
  if (prop.type === 'enum') {
    for (const option of options) {
      const match = (prop.values ?? []).find((value) => normKey(value) === normKey(option))
      if (match !== undefined) values[option] = match
    }
    return values
  }
  for (const option of options) {
    if (normKey(option) !== 'default') values[option] = kebab(option)
  }
  return values
}

function axisCode(prop: ContractProp, property: string, options: readonly string[]): AxisCode {
  const binding: CodeBindingProp = {
    property,
    attribute: codeAttribute(prop),
    type: codeType(prop),
    values: optionValues(prop, options)
  }
  return { prop, binding }
}

function orderStates(values: Iterable<string>): string[] {
  const unique = [...new Set(values)]
  const known = STATE_ORDER.filter((state) => unique.some((v) => normKey(v) === normKey(state)))
  const rest = unique.filter((v) => !STATE_ORDER.some((s) => normKey(s) === normKey(v))).sort()
  return [...known, ...rest]
}

/** buildOps' default rule (code default, then "Primary"), extended to boolean-backed axes. */
export function axisDefault(options: readonly string[], code: readonly AxisCode[]): string {
  for (const { prop, binding } of code) {
    if (prop.type === 'boolean') continue
    const wanted = stripQuotes(prop.default)
    if (!wanted) continue
    const match = Object.entries(binding.values ?? {}).find(
      ([, value]) => normKey(value) === normKey(wanted)
    )
    if (match) return match[0]
  }
  const booleans = code.filter(({ prop }) => prop.type === 'boolean')
  if (booleans.length) {
    const truthy = booleans.find(({ prop }) => prop.default === true || prop.default === 'true')
    const truthyOption = truthy ? Object.keys(truthy.binding.values ?? {})[0] : undefined
    if (truthyOption) return truthyOption
    const claimed = new Set(booleans.flatMap(({ binding }) => Object.keys(binding.values ?? {})))
    const unclaimed = options.filter((option) => !claimed.has(option))
    const preferred = unclaimed.find((o) => DEFAULTISH.includes(normKey(o))) ?? unclaimed[0]
    if (preferred) return preferred
  }
  for (const key of DEFAULTISH) {
    const match = options.find((option) => normKey(option) === key)
    if (match) return match
  }
  return options[0] ?? ''
}

/** States some fact distinguishes, per buildOps: conditionalBindings or stateOverrides. */
function styledStates(contract: CodeContract): Set<string> {
  const keys = new Set<string>()
  const cb = asRecord(contract.conditionalBindings)
  for (const key of Object.keys(asRecord(cb.state))) keys.add(normKey(key))
  for (const [prop, byValue] of Object.entries(cb)) {
    if (prop === 'state') continue
    for (const binding of Object.values(asRecord(byValue))) {
      for (const key of Object.keys(asRecord(asRecord(binding).state))) keys.add(normKey(key))
    }
  }
  for (const key of Object.keys(contract.anatomy?.stateOverrides ?? {})) keys.add(normKey(key))
  return keys
}

/** Measured case dimension → its distinct values, sorted by dimension. */
function caseDimensions(contract: CodeContract): Array<[string, string[]]> {
  const dims = new Map<string, Set<string>>()
  for (const item of contract.anatomy?.cases ?? []) {
    for (const [dim, raw] of Object.entries(parseCase(item.case))) {
      const values = dims.get(dim) ?? new Set<string>()
      values.add(raw)
      dims.set(dim, values)
    }
  }
  return [...dims]
    .map(([dim, values]): [string, string[]] => [dim, [...values].sort()])
    .sort(([a], [b]) => a.localeCompare(b))
}

export function axisForDimension(axes: readonly PlanAxis[], dim: string): PlanAxis | undefined {
  const key = normKey(dim)
  return axes.find(
    (axis) =>
      normKey(axis.dimension ?? axis.name) === key ||
      normKey(axis.name) === key ||
      axis.code.some(({ prop }) => strippedKey(prop.name) === key)
  )
}

function curatedGroups(
  contract: CodeContract
): Map<string, { options: string[]; props: ContractProp[] }> {
  const groups = new Map<string, { options: string[]; props: ContractProp[] }>()
  for (const prop of contract.props) {
    const figma = prop.bindings?.figma
    if (!figma || figma.omit || figma.kind !== 'VARIANT' || !figma.options?.length) continue
    const name = figma.pairWith ?? figma.property ?? titleize(prop.name)
    const group = groups.get(name) ?? { options: [], props: [] }
    for (const option of figma.options)
      if (!group.options.includes(option)) group.options.push(option)
    group.props.push(prop)
    groups.set(name, group)
  }
  return groups
}

function stateAxis(
  contract: CodeContract,
  group: { options: string[]; props: ContractProp[] } | undefined,
  degradations: string[]
): PlanAxis | null {
  const declared = new Set(contract.states.map((state) => normKey(state)))
  const styled = styledStates(contract)
  const facts = STATE_ORDER.filter(
    (state) => state === 'Default' || (declared.has(normKey(state)) && styled.has(normKey(state)))
  )
  const dropped = STATE_ORDER.filter(
    (state) => state !== 'Default' && declared.has(normKey(state)) && !styled.has(normKey(state))
  )
  const values = orderStates([...facts, ...(group?.options ?? [])])
  const missing = dropped.filter((state) => !values.includes(state))
  if (missing.length) {
    degradations.push(
      `declared state(s) ${missing.join(', ')} carry no distinguishing fact (no conditionalBindings, no stateOverrides) — omitted from the State axis rather than fanning out identical variants, as buildOps does.`
    )
  }
  if (values.length < 2) return null
  const code = (group?.props ?? []).map((prop) => axisCode(prop, 'State', values))
  return { name: 'State', values, default: 'Default', kind: 'state', code }
}

/** Admits an axis of `size` values only while the fan-out stays within MAX_VARIANTS. */
type VariantBudget = (size: number, what: string) => boolean

function variantBudget(axes: readonly PlanAxis[], degradations: string[]): VariantBudget {
  let count = axes.reduce((n, axis) => n * axis.values.length, 1)
  return (size, what) => {
    if (count * size <= MAX_VARIANTS) {
      count *= size
      return true
    }
    degradations.push(
      `${what} would exceed ${MAX_VARIANTS} variants — not expressed on the canvas.`
    )
    return false
  }
}

const AXIS_ORDER: Record<PlanAxis['kind'], number> = { state: 0, prop: 2, case: 2 }
const axisOrder = (axis: PlanAxis): number => (axis.name === 'Variant' ? 1 : AXIS_ORDER[axis.kind])

function curatedAxes(contract: CodeContract, degradations: string[]): PlanAxis[] {
  const groups = curatedGroups(contract)
  const axes: PlanAxis[] = []
  const stateGroup = [...groups].find(([name]) => normKey(name) === 'state')?.[1]
  const state = stateAxis(contract, stateGroup, degradations)
  if (state) axes.push(state)
  for (const [name, group] of groups) {
    if (normKey(name) === 'state') continue
    const options = [...group.options].sort()
    const hasNonString = group.props.some((prop) => prop.type !== 'string')
    const code = group.props
      .filter((prop) => prop.type !== 'string' || !hasNonString)
      .map((prop) => axisCode(prop, name, options))
    axes.push({ name, values: options, default: axisDefault(options, code), kind: 'prop', code })
  }
  return axes.sort((a, b) => axisOrder(a) - axisOrder(b))
}

/** buildOps case axes: a measured dimension that pairs with a BOOLEAN prop by name. */
function caseAxes(
  contract: CodeContract,
  axes: readonly PlanAxis[],
  fits: VariantBudget,
  degradations: string[]
): PlanAxis[] {
  const base = parseCase(contract.anatomyCase)
  const added: PlanAxis[] = []
  for (const [dim, raws] of caseDimensions(contract)) {
    if (raws.length < 2 || axisForDimension([...axes, ...added], dim)) continue
    const key = normKey(dim)
    const prop = contract.props.find((p) => p.type === 'boolean' && strippedKey(p.name) === key)
    if (!prop || prop.bindings?.figma?.omit) {
      if (!contract.props.some((p) => strippedKey(p.name) === key)) {
        degradations.push(
          `measured case dimension "${dim}" (${raws.join('/')}) pairs with no code prop by name — not fanned out; its cases' structure and tokens appear only where the base case matches.`
        )
      }
      continue
    }
    const options = raws.map(titleize).sort()
    if (!fits(options.length, `case dimension "${dim}" (prop "${prop.name}")`)) continue
    // contract-diff pairs names after stripping an `is` prefix only, so `hasBadge` keeps its own name.
    const name = [key, `is${key}`].includes(normKey(prop.name))
      ? titleize(dim)
      : titleize(prop.name)
    const code = [axisCode(prop, name, options)]
    const defaultValue = titleize(base[dim] ?? raws[0])
    added.push({ name, values: options, default: defaultValue, kind: 'case', code, dimension: dim })
  }
  return added
}

/** Uncurated enum props (`bindings.figma: null`) that are not behavioural. */
function uncuratedEnumAxes(
  contract: CodeContract,
  axes: readonly PlanAxis[],
  fits: VariantBudget,
  degradations: string[]
): PlanAxis[] {
  const added: PlanAxis[] = []
  for (const prop of contract.props) {
    if (prop.type !== 'enum' || prop.bindings?.figma !== null || !prop.values?.length) continue
    const name = titleize(prop.name)
    const taken = [...axes, ...added].some((axis) => normKey(axis.name) === normKey(name))
    if (BEHAVIOURAL.has(prop.name) || taken) continue
    const options = prop.values.map(titleize).sort()
    if (!fits(options.length, `uncurated enum prop "${prop.name}"`)) continue
    if (!hasValueFacts(contract, prop)) {
      degradations.push(
        `enum prop "${prop.name}" has no per-value token facts (no conditionalBindings, no measured case dimension) — its ${options.length} variants carry the API but render identically.`
      )
    }
    const code = [axisCode(prop, name, options)]
    added.push({ name, values: options, default: axisDefault(options, code), kind: 'prop', code })
  }
  return added
}

/**
 * Variant axes for a contract, in buildOps order (State, the enum axis, the rest):
 *   1. every VARIANT-kind Figma binding, grouped by `pairWith` (State merges into the
 *      fact-driven State axis);
 *   2. buildOps case axes: a measured case dimension that pairs with a boolean prop by name
 *      (Dismissible ↔ isDismissible), so each value builds from its own measured tree;
 *   3. uncurated enum props (`bindings.figma: null`) that are not behavioural, while the
 *      fan-out stays within MAX_VARIANTS.
 */
export function buildAxes(contract: CodeContract, degradations: string[]): PlanAxis[] {
  const axes = curatedAxes(contract, degradations)
  const fits = variantBudget(axes, degradations)
  axes.push(...caseAxes(contract, axes, fits, degradations))
  axes.push(...uncuratedEnumAxes(contract, axes, fits, degradations))
  return axes
}

function hasValueFacts(contract: CodeContract, prop: ContractProp): boolean {
  if (Object.keys(asRecord(asRecord(contract.conditionalBindings)[prop.name])).length) return true
  return caseDimensions(contract).some(
    ([dim, values]) => normKey(dim) === strippedKey(prop.name) && values.length > 1
  )
}
