import { describe, expect, test } from 'bun:test'

import {
  codeBindingOwner,
  copyCodeBinding,
  parseCodeBinding,
  resolveInstanceCodeElement,
  SceneGraph,
  UndoManager,
  type CodeBinding
} from '@open-pencil/scene-graph'

const binding: CodeBinding = {
  tagName: 'al-button',
  react: { importPath: '@southleft/al-react', component: 'ALButton' },
  props: [
    { property: 'Size', attribute: 'size', type: 'enum', values: { Md: 'md', Sm: 'sm' } },
    { property: 'State', attribute: 'isDisabled', type: 'boolean', values: { Disabled: 'true' } },
    { property: 'Label', attribute: 'label', type: 'string' },
    { property: 'Full Width', attribute: 'fullWidth', type: 'boolean' }
  ],
  slots: [
    { slot: '', property: 'Text', layer: 'Text' },
    { slot: 'before', property: 'Slot Before', layer: 'Icon Before' },
    { slot: 'before', property: 'Icon Before', layer: 'Icon Before' }
  ]
}

function buttonSet() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const icon = graph.createNode('COMPONENT', page.id, {
    name: 'Icon/check',
    componentKey: 'icon/check',
    codeBinding: { tagName: 'al-icon', attributes: { name: 'check' }, props: [], slots: [] }
  })
  const set = graph.createNode('COMPONENT_SET', page.id, {
    name: 'Button',
    codeBinding: binding,
    componentPropertyDefinitions: [
      {
        id: 'size',
        name: 'Size',
        type: 'VARIANT',
        defaultValue: 'Md',
        variantOptions: ['Md', 'Sm']
      },
      {
        id: 'state',
        name: 'State',
        type: 'VARIANT',
        defaultValue: 'Default',
        variantOptions: ['Default', 'Disabled']
      },
      { id: 'text', name: 'Text', type: 'TEXT', defaultValue: 'Save' },
      { id: 'label', name: 'Label', type: 'TEXT', defaultValue: '' },
      { id: 'full', name: 'Full Width', type: 'BOOLEAN', defaultValue: 'false' },
      { id: 'slot', name: 'Slot Before', type: 'BOOLEAN', defaultValue: 'false' },
      { id: 'icon', name: 'Icon Before', type: 'INSTANCE_SWAP', defaultValue: 'icon/check' }
    ]
  })
  const variant = graph.createNode('COMPONENT', set.id, {
    name: 'Size=Sm, State=Disabled',
    componentPropertyValues: { Size: 'Sm', State: 'Disabled' }
  })
  graph.createNode('TEXT', variant.id, {
    name: 'Text',
    text: 'Save',
    componentPropertyReferences: [{ propertyId: 'text', field: 'TEXT' }]
  })
  return { graph, page, icon, set, variant }
}

describe('code binding', () => {
  test('parses valid bindings and rejects malformed ones whole', () => {
    expect(parseCodeBinding(structuredClone(binding))).toEqual(binding)
    expect(parseCodeBinding({ tagName: 'al-x', props: [{ property: 'A' }], slots: [] })).toBeNull()
    expect(parseCodeBinding({ tagName: '', props: [], slots: [] })).toBeNull()
    expect(parseCodeBinding({ tagName: 'al-x', props: [], slots: [], events: [1] })).toBeNull()
    expect(parseCodeBinding('al-button')).toBeNull()
  })

  test('copies deeply and survives a tree clone', () => {
    const copy = copyCodeBinding(binding)
    expect(copy).toEqual(binding)
    expect(copy?.props[0].values).not.toBe(binding.props[0].values)
    const { graph, page, set } = buttonSet()
    const clone = graph.cloneTree(set.id, page.id)
    expect(clone?.codeBinding).toEqual(binding)
    expect(clone?.codeBinding).not.toBe(set.codeBinding)
  })

  test('an edit to it is undoable as a whole value', () => {
    const { graph, set } = buttonSet()
    const undo = new UndoManager()
    const previous = set.codeBinding
    const next = { ...binding, tagName: 'al-chip' }
    graph.updateNode(set.id, { codeBinding: next })
    undo.push({
      label: 'Edit code binding',
      forward: () => graph.updateNode(set.id, { codeBinding: next }),
      inverse: () => graph.updateNode(set.id, { codeBinding: previous })
    })
    undo.undo()
    expect(graph.getNode(set.id)?.codeBinding).toEqual(binding)
    undo.redo()
    expect(graph.getNode(set.id)?.codeBinding?.tagName).toBe('al-chip')
  })

  test('instances resolve it through their component set without copying it', () => {
    const { graph, page, set, variant } = buttonSet()
    const instance = graph.createInstance(variant.id, page.id)
    if (!instance) throw new Error('instance missing')
    expect(instance.codeBinding).toBeNull()
    expect(codeBindingOwner(graph, instance)?.id).toBe(set.id)
    expect(codeBindingOwner(graph, variant)?.id).toBe(set.id)
  })

  test('derives attributes and slot content from the instance property values', () => {
    const { graph, page, icon, variant } = buttonSet()
    const instance = graph.createInstance(variant.id, page.id)
    if (!instance) throw new Error('instance missing')
    graph.updateNode(instance.id, {
      componentPropertyAssignments: {
        text: 'Delete',
        label: 'Delete item',
        full: 'true',
        slot: 'true'
      }
    })
    const element = resolveInstanceCodeElement(graph, instance)
    expect(element?.attributes).toEqual([
      ['size', 'sm'],
      ['isDisabled', 'true'],
      ['label', 'Delete item'],
      ['fullWidth', 'true']
    ])
    expect(element?.slots).toEqual([
      { slot: '', text: 'Delete' },
      { slot: 'before', component: icon }
    ])
  })

  test('omits attributes whose canvas value has no code value', () => {
    const { graph, page, set } = buttonSet()
    const variant = graph.createNode('COMPONENT', set.id, {
      name: 'Size=Md, State=Default',
      componentPropertyValues: { Size: 'Md', State: 'Default' }
    })
    const instance = graph.createInstance(variant.id, page.id)
    if (!instance) throw new Error('instance missing')
    expect(resolveInstanceCodeElement(graph, instance)?.attributes).toEqual([['size', 'md']])
  })
})
