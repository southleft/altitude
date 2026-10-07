import { describe, expect, test } from 'bun:test'

import { designFactFromAttrs, designFactFromNode, designFactToAttrs } from '#dom-css/design-fact'
import type { FactIssue } from '#dom-css/design-fact/schema'
import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { serializeHTML } from '#dom-css/serialize'
import { designDocumentToSceneGraph } from '#dom-css/to-scene-graph'

import { SceneGraph, type CodeBinding } from '@open-pencil/scene-graph'

const binding: CodeBinding = {
  tagName: 'al-button',
  props: [
    { property: 'Size', attribute: 'size', type: 'enum', values: { Md: 'md', Sm: 'sm' } },
    { property: 'Pill', attribute: 'isPill', type: 'boolean' }
  ],
  slots: [
    { slot: '', property: 'Text', layer: 'Text' },
    { slot: 'before', property: 'Slot Before', layer: 'Icon Before' },
    { slot: 'before', property: 'Icon Before', layer: 'Icon Before' }
  ]
}

function graphWithInstance() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('COMPONENT', page.id, {
    name: 'Icon/check',
    componentKey: 'icon/check',
    visible: false,
    codeBinding: { tagName: 'al-icon', attributes: { name: 'check' }, props: [], slots: [] }
  })
  const set = graph.createNode('COMPONENT_SET', page.id, {
    name: 'Button',
    visible: false,
    codeBinding: binding,
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
    componentPropertyValues: { Size: 'Sm' },
    layoutMode: 'HORIZONTAL',
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }]
  })
  graph.createNode('TEXT', variant.id, {
    name: 'Text',
    text: 'Save',
    componentPropertyReferences: [{ propertyId: 'text', field: 'TEXT' }]
  })
  const instance = graph.createInstance(variant.id, page.id, { name: 'Save button' })
  if (!instance) throw new Error('instance missing')
  graph.updateNode(instance.id, {
    componentPropertyAssignments: { text: 'Send', pill: 'true', slot: 'true' }
  })
  return { graph, set, instance }
}

describe('code-bound instances in HTML', () => {
  test('export as their element with attributes and slot content, design facts kept', () => {
    const { graph, instance } = graphWithInstance()
    const html = serializeHTML(
      sceneGraphToDesignDocument(graph, { rootId: graph.getPages()[0].id })
    )
    expect(html).toContain('<al-button size="sm" isPill="true"')
    expect(html).toContain('data-op-type="INSTANCE"')
    expect(html).toContain(`data-open-pencil-node-id="${instance.id}"`)
    expect(html).toContain('>Send<al-icon name="check" slot="before"></al-icon></al-button>')
    expect(html).not.toContain('background-color')
  })

  test('re-import keeps the instance identity and the set binding', () => {
    const { graph, set, instance } = graphWithInstance()
    graph.updateNode(set.id, { visible: true })
    const rebuilt = designDocumentToSceneGraph(
      sceneGraphToDesignDocument(graph, { rootId: graph.getPages()[0].id })
    )
    const nodes = [...rebuilt.nodes.values()]
    expect(nodes.find((n) => n.type === 'INSTANCE')?.componentId).toBe(instance.componentId)
    expect(nodes.find((n) => n.type === 'COMPONENT_SET')?.codeBinding).toEqual(binding)
  })

  test('without a binding an instance is still a box', () => {
    const { graph, set } = graphWithInstance()
    graph.updateNode(set.id, { codeBinding: null })
    const html = serializeHTML(
      sceneGraphToDesignDocument(graph, { rootId: graph.getPages()[0].id })
    )
    expect(html).not.toContain('<al-button')
    expect(html).toContain('<div')
  })
})

describe('code binding fact', () => {
  test('travels on the component set through data-op-code and back', () => {
    const { graph, set } = graphWithInstance()
    const attrs = designFactToAttrs(designFactFromNode(graph, set))
    expect(JSON.parse(attrs['data-op-code'])).toEqual(binding)
    expect(designFactFromAttrs(attrs)?.codeBinding).toEqual(binding)
  })

  test('a malformed binding is dropped and named, never half-read', () => {
    const issues: FactIssue[] = []
    const fact = designFactFromAttrs(
      {
        'data-op-type': 'COMPONENT_SET',
        'data-op-code': JSON.stringify({ tagName: 'al-x', props: [{}], slots: [] })
      },
      (issue) => issues.push(issue)
    )
    expect(fact?.codeBinding).toBeUndefined()
    expect(issues).toEqual([{ fact: 'data-op-code', reason: 'not a valid code binding' }])
  })
})
