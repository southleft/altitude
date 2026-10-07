import type { CodeBinding, CodeBindingProp } from '@open-pencil/scene-graph'

import type { CodeContract, ContractProp } from '../contract'
import { BEHAVIOURAL } from './axes'
import { codeAttribute, codeType, normKey, stripQuotes, titleize } from './names'
import type { PlanAxis, PlanProperty } from './types'

export interface PropertyPlan {
  properties: PlanProperty[]
  codeProps: CodeBindingProp[]
  slots: CodeBinding['slots']
}

interface Collector extends PropertyPlan {
  /** Props already expressed (as an axis or a property). */
  handled: Set<string>
  /** Claims a property name, unique after normalising; false when taken. */
  claim: (name: string) => boolean
}

function collector(axes: readonly PlanAxis[]): Collector {
  const taken = new Set(axes.map((axis) => normKey(axis.name)))
  const handled = new Set(axes.flatMap((axis) => axis.code.map(({ prop }) => prop.name)))
  return {
    properties: [],
    codeProps: [],
    slots: [],
    handled,
    claim(name) {
      if (taken.has(normKey(name))) return false
      taken.add(normKey(name))
      return true
    }
  }
}

/** contract-diff pairs a canvas `Text` with the `label` prop, else with the default slot. */
function textProperty(contract: CodeContract, out: Collector, textDefault: string | null): void {
  const hasDefaultSlot = contract.slots.some((slot) => slot.name === '')
  const labelProp = contract.props.find((p) => p.name === 'label' && !p.bindings?.figma?.omit)
  if (!(hasDefaultSlot || labelProp) || !out.claim('Text')) return
  const property: PlanProperty = {
    name: 'Text',
    type: 'TEXT',
    default: textDefault ?? contract.name,
    role: 'text'
  }
  if (hasDefaultSlot) {
    property.slot = ''
    out.slots.push({ slot: '', property: 'Text', layer: 'Text' })
  } else if (labelProp) {
    out.codeProps.push({ property: 'Text', attribute: codeAttribute(labelProp), type: 'string' })
    out.handled.add(labelProp.name)
  }
  out.properties.push(property)
}

/** buildOps' `Slot Before`/`Slot After` toggles and `Icon Before`/`Icon After` swaps. */
function slotProperties(contract: CodeContract, out: Collector, degradations: string[]): void {
  for (const side of ['before', 'after'] as const) {
    const slot = contract.slots.find((candidate) => candidate.name === side)
    if (!slot || slot.figmaOmit) continue
    const label = side === 'before' ? 'Before' : 'After'
    if (slot.figmaAxis) {
      degradations.push(
        `slot "${side}" is curated figmaAxis: true; the library builder keeps it a BOOLEAN property.`
      )
    }
    if (out.claim(`Slot ${label}`)) {
      out.properties.push({
        name: `Slot ${label}`,
        type: 'BOOLEAN',
        default: 'false',
        role: 'slot-toggle',
        slot: side
      })
      out.slots.push({ slot: side, property: `Slot ${label}`, layer: `Icon ${label}` })
    }
    if (slot.figmaPlaceholder && out.claim(`Icon ${label}`)) {
      out.properties.push({
        name: `Icon ${label}`,
        type: 'INSTANCE_SWAP',
        default: slot.figmaPlaceholder,
        role: 'slot-icon',
        slot: side,
        icon: slot.figmaPlaceholder
      })
      out.slots.push({ slot: side, property: `Icon ${label}`, layer: `Icon ${label}` })
    }
  }
}

/** One non-axis prop: booleans as BOOLEAN, strings and numbers as TEXT. */
function apiProperty(prop: ContractProp, out: Collector, degradations: string[]): void {
  const name = titleize(prop.name)
  if (prop.type === 'boolean') {
    if (!out.claim(name)) return
    const fallback = prop.default === true ? 'true' : 'false'
    out.properties.push({ name, type: 'BOOLEAN', default: fallback, role: 'prop' })
    out.codeProps.push({ property: name, attribute: codeAttribute(prop), type: 'boolean' })
    return
  }
  if (prop.type === 'string' || prop.type === 'number') {
    if (!out.claim(name)) {
      degradations.push(`prop "${prop.name}" collides with the canvas property "${name}".`)
      return
    }
    out.properties.push({ name, type: 'TEXT', default: stripQuotes(prop.default), role: 'prop' })
    out.codeProps.push({ property: name, attribute: codeAttribute(prop), type: codeType(prop) })
    return
  }
  if (prop.type === 'enum' && BEHAVIOURAL.has(prop.name)) {
    degradations.push(
      `enum prop "${prop.name}" is behavioural (plan.mjs BEHAVIOURAL) — it renders no pixels, so it is not a variant axis.`
    )
  }
}

/**
 * Non-variant component properties, per buildOps conventions:
 *   - `Text` (TEXT) fills the default slot, or the `label` attribute when there is no
 *     default slot; its default is the measured copy;
 *   - `Slot Before`/`Slot After` (BOOLEAN) toggle the icon slots, `Icon Before`/`Icon After`
 *     (INSTANCE_SWAP) choose the icon when the slot names a `figmaPlaceholder`;
 *   - every other non-omitted prop that is not an axis: booleans as BOOLEAN, strings and
 *     numbers as TEXT, so the canvas carries the whole API and codegen can emit it.
 */
export function buildProperties(
  contract: CodeContract,
  axes: readonly PlanAxis[],
  textDefault: string | null,
  degradations: string[]
): PropertyPlan {
  const out = collector(axes)
  for (const prop of contract.props) {
    if (prop.bindings?.figma?.kind === 'VARIANT') out.handled.add(prop.name)
  }
  textProperty(contract, out, textDefault)
  slotProperties(contract, out, degradations)
  for (const prop of contract.props) {
    if (prop.bindings?.figma?.omit || out.handled.has(prop.name)) continue
    apiProperty(prop, out, degradations)
  }
  return { properties: out.properties, codeProps: out.codeProps, slots: out.slots }
}
