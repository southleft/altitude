import { describe, expect, test } from 'bun:test'

import { buildComponentSet, createBindContext } from '#altitude/library/build'
import { canvasContractForSet } from '#altitude/library/canvas-contract'
import { planComponent } from '#altitude/library/plan/index'

import { resolveInstanceCodeElement } from '@open-pencil/scene-graph'

import { buttonContract, fixtureGraph } from '../helpers/button-contract'

function build() {
  const graph = fixtureGraph()
  const page = graph.getPages()[0]
  const ctx = createBindContext(graph, page.id)
  const plan = planComponent(buttonContract())
  const built = buildComponentSet(ctx, plan)
  const set = graph.getNode(built.setId)
  if (!set) throw new Error('set missing')
  const name = (id: string) => graph.variables.get(id)?.name
  return { graph, ctx, plan, built, set, name }
}

describe('buildComponentSet', () => {
  test('one component set named after the contract, carrying its code binding', () => {
    const { graph, set } = build()
    expect(set.type).toBe('COMPONENT_SET')
    expect(set.name).toBe('Button')
    expect(set.componentKey).toBe('altitude/al-button')
    expect(set.codeBinding?.tagName).toBe('al-button')
    expect(graph.getChildren(set.id)).toHaveLength(12)
    expect(set.componentPropertyDefinitions.map((d) => `${d.name}:${d.type}`)).toEqual([
      'State:VARIANT',
      'Variant:VARIANT',
      'Size:VARIANT',
      'Text:TEXT',
      'Slot Before:BOOLEAN',
      'Icon Before:INSTANCE_SWAP',
      'Label:TEXT'
    ])
  })

  test('binds fills, radius, padding and gap to variables, per variant and state', () => {
    const { graph, set, name } = build()
    const variant = (variantName: string) =>
      graph.getChildren(set.id).find((child) => child.name === variantName)
    const secondary = variant('State=Default, Variant=Secondary, Size=Md')
    expect(secondary?.layoutMode).toBe('HORIZONTAL')
    expect(name(secondary?.boundVariables['fills/0/color'] ?? '')).toBe(
      'theme/color/background/secondary'
    )
    expect(name(secondary?.boundVariables.cornerRadius ?? '')).toBe('theme/border/radius')
    expect(name(secondary?.boundVariables.paddingLeft ?? '')).toBe('theme/space/md')
    expect(secondary?.paddingLeft).toBe(16)
    expect(name(secondary?.boundVariables.itemSpacing ?? '')).toBe('theme/space/xs')
    const disabled = variant('State=Disabled, Variant=Primary, Size=Md')
    expect(disabled?.opacity).toBeCloseTo(0.4)
    expect(name(disabled?.boundVariables.opacity ?? '')).toBe('theme/opacity/disabled')
  })

  test('the label is a TEXT layer bound to the Text property, coloured by the variant', () => {
    const { graph, set, name } = build()
    const secondary = graph.getChildren(set.id).find((c) => c.name.includes('Variant=Secondary'))
    const text = graph.getChildren(secondary?.id ?? '').find((child) => child.type === 'TEXT')
    expect(text?.name).toBe('Text')
    expect(text?.text).toBe('Button')
    expect(text?.componentPropertyReferences).toEqual([
      { propertyId: 'al-button:text', field: 'TEXT' }
    ])
    expect(name(text?.boundVariables['fills/0/color'] ?? '')).toBe('theme/color/content/neutral')
  })

  test('the before slot is a hidden icon instance toggled and swapped by properties', () => {
    const { graph, set } = build()
    const first = graph.getChildren(set.id)[0]
    const icon = graph.getChildren(first.id)[0]
    expect(icon.type).toBe('INSTANCE')
    expect(icon.name).toBe('Icon Before')
    expect(icon.visible).toBe(false)
    expect(icon.componentPropertyReferences.map((r) => r.field)).toEqual([
      'VISIBLE',
      'INSTANCE_SWAP'
    ])
  })

  test('instances resolve to the element and attribute values the variant stands for', () => {
    const { graph, set } = build()
    const variant = graph
      .getChildren(set.id)
      .find((child) => child.name === 'State=Disabled, Variant=Secondary, Size=Sm')
    const page = graph.getPages()[0]
    const instance = graph.createInstance(variant?.id ?? '', page.id)
    if (!instance) throw new Error('instance missing')
    const element = resolveInstanceCodeElement(graph, instance)
    expect(element?.binding.tagName).toBe('al-button')
    expect(element?.attributes).toEqual([
      ['isDisabled', 'true'],
      ['variant', 'secondary'],
      ['size', 'sm']
    ])
    expect(element?.slots).toEqual([{ slot: '', text: 'Button' }])
  })
})

describe('canvasContractForSet', () => {
  test('emits the canvas contract shape with variable names, all variants unioned', () => {
    const { graph, set } = build()
    const contract = canvasContractForSet(graph, set)
    expect(contract?.component).toBe('al-button')
    expect(contract?.figma).toEqual({
      name: 'Button',
      nodeId: 'altitude/al-button',
      fileKey: 'open-pencil:altitude'
    })
    expect(contract?.states).toEqual(['hover', 'disabled'])
    expect(contract?.variantAxes.find((axis) => axis.name === 'Size')?.values).toEqual(['Md', 'Sm'])
    expect(contract?.tokensOwn).toContain('theme/opacity/disabled')
    expect(contract?.tokensOwn).toContain('theme/color/background/primary-strong')
    expect(contract?.tokens).not.toContain('theme/opacity/disabled')
    expect(contract?.anatomySource).toBe('observed')
    expect(contract?.anatomyCase).toBe('State=Default, Variant=Primary, Size=Md')
    expect(contract?.anatomy?.boundVariables['fills[0].color']).toBe(
      'theme/color/background/primary'
    )
    expect(contract?.bindings.code?.tagName).toBe('al-button')
  })
})
