import type { CodeBinding, CodeBindingProp } from '../code-binding'
import type { SceneGraph } from '../index'
import type { ComponentPropertyDefinition, SceneNode } from '../types'
import { resolveComponentPropertyValue } from './properties'

/**
 * Resolving a component's code binding for instances: which element an instance renders as
 * and with which attribute values and slot content, from its current property values.
 */

/** The component (or its set) that owns the code binding for a component or instance node. */
export function codeBindingOwner(graph: SceneGraph, node: SceneNode): SceneNode | null {
  const component =
    node.type === 'INSTANCE' && node.componentId ? graph.getNode(node.componentId) : node
  if (!component || (component.type !== 'COMPONENT' && component.type !== 'COMPONENT_SET')) {
    return null
  }
  if (component.codeBinding) return component
  const parent = component.parentId ? graph.getNode(component.parentId) : undefined
  return parent?.type === 'COMPONENT_SET' && parent.codeBinding ? parent : null
}

export interface ResolvedCodeSlot {
  slot: string
  /** Text content for a slot filled by a TEXT property. */
  text?: string
  /** The component placed in the slot, for INSTANCE_SWAP slots; its own binding renders it. */
  component?: SceneNode
}

export interface ResolvedCodeElement {
  binding: CodeBinding
  /** Attribute name → value in binding order. `"true"` marks a boolean attribute. */
  attributes: Array<[string, string]>
  slots: ResolvedCodeSlot[]
}

function definitionsByName(
  graph: SceneGraph,
  instance: SceneNode
): Map<string, ComponentPropertyDefinition> {
  const owners: SceneNode[] = []
  const component = instance.componentId ? graph.getNode(instance.componentId) : undefined
  if (component) {
    const parent = component.parentId ? graph.getNode(component.parentId) : undefined
    if (parent?.type === 'COMPONENT_SET') owners.push(parent)
    owners.push(component)
  }
  const map = new Map<string, ComponentPropertyDefinition>()
  for (const owner of owners) {
    for (const definition of owner.componentPropertyDefinitions) {
      if (!map.has(definition.name)) map.set(definition.name, definition)
    }
  }
  return map
}

/** Current value of a named component property on an instance, or undefined. */
export function instancePropertyValue(
  graph: SceneGraph,
  instance: SceneNode,
  property: string
): string | undefined {
  const component = instance.componentId ? graph.getNode(instance.componentId) : undefined
  const definition = definitionsByName(graph, instance).get(property)
  if (!definition) return undefined
  if (definition.type === 'VARIANT') {
    return component?.componentPropertyValues[property] ?? definition.defaultValue
  }
  return instance.componentPropertyAssignments[definition.id] ?? definition.defaultValue
}

function attributeValue(prop: CodeBindingProp, value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  if (prop.values) return prop.values[value]
  if (prop.type === 'boolean') return value === 'true' ? 'true' : undefined
  return value === '' ? undefined : value
}

/**
 * The element an instance renders as in code: its tag, attribute values derived from the
 * current component property values, and what fills each slot. Null when the instance's
 * component carries no code binding.
 */
export function resolveInstanceCodeElement(
  graph: SceneGraph,
  instance: SceneNode
): ResolvedCodeElement | null {
  if (instance.type !== 'INSTANCE') return null
  const owner = codeBindingOwner(graph, instance)
  const binding = owner?.codeBinding
  if (!binding) return null
  const attributes: Array<[string, string]> = Object.entries(binding.attributes ?? {})
  const seen = new Set(attributes.map(([name]) => name))
  for (const prop of binding.props) {
    if (seen.has(prop.attribute)) continue
    const value = attributeValue(prop, instancePropertyValue(graph, instance, prop.property))
    if (value === undefined) continue
    attributes.push([prop.attribute, value])
    seen.add(prop.attribute)
  }
  const definitions = definitionsByName(graph, instance)
  const slots: ResolvedCodeSlot[] = []
  for (const slot of binding.slots) {
    if (!slot.property) continue
    const definition = definitions.get(slot.property)
    const value = instancePropertyValue(graph, instance, slot.property)
    if (!definition || value === undefined) continue
    if (definition.type === 'TEXT') {
      if (value) slots.push({ slot: slot.slot, text: value })
      continue
    }
    if (definition.type === 'BOOLEAN') {
      if (value !== 'true') continue
      const swap = binding.slots.find(
        (candidate) =>
          candidate.slot === slot.slot &&
          candidate.property &&
          definitions.get(candidate.property)?.type === 'INSTANCE_SWAP'
      )
      const swapValue = swap?.property
        ? instancePropertyValue(graph, instance, swap.property)
        : undefined
      const component = swapValue ? resolveComponentPropertyValue(graph, swapValue) : null
      slots.push({ slot: slot.slot, component: component ?? undefined })
    }
  }
  return { binding, attributes, slots }
}
