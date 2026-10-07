import { describe, expect, test } from 'bun:test'

import type { ContractProp } from '#altitude/library/contract'
import { booleanTrueOption, layerTokens, planComponent } from '#altitude/library/plan/index'

import { buttonContract } from '../helpers/button-contract'

const prop = (name: string): ContractProp => ({ name, type: 'boolean' })

describe('planComponent', () => {
  test('fans out every VARIANT binding, merging pairWith State into the styled states', () => {
    const plan = planComponent(buttonContract())
    expect(plan.axes.map((axis) => [axis.name, axis.values, axis.default])).toEqual([
      ['State', ['Default', 'Hover', 'Disabled'], 'Default'],
      ['Variant', ['Primary', 'Secondary'], 'Primary'],
      ['Size', ['Md', 'Sm'], 'Md']
    ])
    expect(plan.variants).toHaveLength(12)
    expect(plan.defaultVariant).toBe('State=Default, Variant=Primary, Size=Md')
  })

  test('maps canvas options to code values in the code binding', () => {
    const { codeBinding } = planComponent(buttonContract(), {
      reactComponents: new Set(['ALButton'])
    })
    expect(codeBinding.tagName).toBe('al-button')
    expect(codeBinding.react).toEqual({ importPath: '@southleft/al-react', component: 'ALButton' })
    expect(codeBinding.props).toContainEqual({
      property: 'State',
      attribute: 'isDisabled',
      type: 'boolean',
      values: { Disabled: 'true' }
    })
    expect(codeBinding.props).toContainEqual({
      property: 'Size',
      attribute: 'size',
      type: 'enum',
      values: { Md: 'md', Sm: 'sm' }
    })
    expect(codeBinding.props).toContainEqual({
      property: 'Label',
      attribute: 'label',
      type: 'string'
    })
    expect(codeBinding.slots).toEqual([
      { slot: '', property: 'Text', layer: 'Text' },
      { slot: 'before', property: 'Slot Before', layer: 'Icon Before' },
      { slot: 'before', property: 'Icon Before', layer: 'Icon Before' }
    ])
  })

  test('creates buildOps component properties and never exposes omitted props', () => {
    const plan = planComponent(buttonContract())
    expect(plan.properties.map((p) => `${p.name}:${p.type}`)).toEqual([
      'Text:TEXT',
      'Slot Before:BOOLEAN',
      'Icon Before:INSTANCE_SWAP',
      'Label:TEXT'
    ])
    expect(plan.properties.find((p) => p.name === 'Text')?.default).toBe('Button')
    expect(plan.degradations.some((d) => d.includes('"type" is behavioural'))).toBe(true)
  })

  test('layers conditionalBindings per variant and per state', () => {
    const plan = planComponent(buttonContract())
    const variant = (name: string) => plan.variants.find((v) => v.name === name)
    expect(
      variant('State=Default, Variant=Secondary, Size=Md')?.rootTokens['background-color']
    ).toBe('theme/color/background/secondary')
    expect(variant('State=Hover, Variant=Primary, Size=Md')?.rootTokens['background-color']).toBe(
      'theme/color/background/primary-strong'
    )
    expect(variant('State=Disabled, Variant=Primary, Size=Sm')?.rootTokens.opacity).toBe(
      'theme/opacity/disabled'
    )
    expect(variant('State=Default, Variant=Primary, Size=Md')?.rootTokens.opacity).toBeUndefined()
  })

  test('is deterministic', () => {
    expect(JSON.stringify(planComponent(buttonContract()))).toBe(
      JSON.stringify(planComponent(buttonContract()))
    )
  })
})

describe('booleanTrueOption', () => {
  test.each<[string, string[], string | null]>([
    ['isDisabled', ['Default', 'Disabled', 'Hover'], 'Disabled'],
    ['isPill', ['Default', 'Pill'], 'Pill'],
    ['hideLabel', ['Hidden', 'Shown'], 'Hidden'],
    ['showLabel', ['Hidden', 'Shown'], 'Shown'],
    ['hasSeparator', ['No', 'Yes'], 'Yes'],
    ['isChecked', ['Indeterminate', 'Off', 'On'], 'On'],
    ['isFocused', ['Default', 'Disabled', 'Focus'], 'Focus'],
    ['isExpandableHeader', ['Expandable', 'Header', 'Item'], 'Expandable'],
    ['isBold', ['Default'], null]
  ])('%s over %p → %p', (name, options, expected) => {
    expect(booleanTrueOption(prop(name), options)).toBe(expected)
  })
})

describe('layerTokens', () => {
  test('a later shorthand replaces the longhands it covers, in cascade order', () => {
    const tokens = { 'border-top-color': 'a', 'background-color': 'b' }
    layerTokens(tokens, { 'border-color': 'c' })
    expect(tokens).toEqual({ 'background-color': 'b', 'border-color': 'c' })
    expect(Object.keys(tokens)).toEqual(['background-color', 'border-color'])
  })
})
