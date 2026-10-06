import { describe, expect, test } from 'bun:test'

import { renderJSX, SceneGraph, sceneNodeToJSX } from '@open-pencil/core'

function graphWithInstance(react = true) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('COMPONENT', page.id, {
    name: 'Icon/check',
    componentKey: 'icon/check',
    codeBinding: { tagName: 'al-icon', attributes: { name: 'check' }, props: [], slots: [] }
  })
  const set = graph.createNode('COMPONENT_SET', page.id, {
    name: 'Button',
    codeBinding: {
      tagName: 'al-button',
      ...(react ? { react: { importPath: '@southleft/al-react', component: 'ALButton' } } : {}),
      props: [
        { property: 'Size', attribute: 'size', type: 'enum', values: { Md: 'md', Sm: 'sm' } },
        { property: 'Pill', attribute: 'isPill', type: 'boolean' }
      ],
      slots: [
        { slot: '', property: 'Text' },
        { slot: 'before', property: 'Slot Before' },
        { slot: 'before', property: 'Icon Before' }
      ]
    },
    componentPropertyDefinitions: [
      {
        id: 'size',
        name: 'Size',
        type: 'VARIANT',
        defaultValue: 'Md',
        variantOptions: ['Md', 'Sm']
      },
      { id: 'text', name: 'Text', type: 'TEXT', defaultValue: 'Save' },
      { id: 'pill', name: 'Pill', type: 'BOOLEAN', defaultValue: 'false' },
      { id: 'slot', name: 'Slot Before', type: 'BOOLEAN', defaultValue: 'false' },
      { id: 'icon', name: 'Icon Before', type: 'INSTANCE_SWAP', defaultValue: 'icon/check' }
    ]
  })
  const variant = graph.createNode('COMPONENT', set.id, {
    name: 'Size=Sm',
    componentPropertyValues: { Size: 'Sm' }
  })
  const instance = graph.createInstance(variant.id, page.id)
  if (!instance) throw new Error('instance missing')
  graph.updateNode(instance.id, { componentPropertyAssignments: { pill: 'true', slot: 'true' } })
  return { graph, instance }
}

describe('code-bound instances in JSX', () => {
  test('React output uses the wrapper component with attributes and slots', () => {
    const { graph, instance } = graphWithInstance()
    expect(sceneNodeToJSX(instance.id, graph, 'tailwind')).toBe(
      [
        '<ALButton size="sm" isPill>',
        '  Save',
        '  <al-icon name="check" slot="before" />',
        '</ALButton>'
      ].join('\n')
    )
  })

  test('without a React binding the custom element tag is used', () => {
    const { graph, instance } = graphWithInstance(false)
    expect(sceneNodeToJSX(instance.id, graph, 'tailwind').split('\n')[0]).toBe(
      '<al-button size="sm" isPill>'
    )
  })

  test('design-JSX keeps a re-renderable Instance of the right variant', async () => {
    const { graph, instance } = graphWithInstance()
    const jsx = sceneNodeToJSX(instance.id, graph)
    expect(jsx).toBe('<Instance component="Button" Size="Sm" />')
    const before = new Set(graph.nodes.keys())
    await renderJSX(graph, jsx)
    const rendered = [...graph.nodes.values()].find(
      (node) => !before.has(node.id) && node.type === 'INSTANCE'
    )
    expect(rendered?.componentId).toBe(instance.componentId)
  })
})
