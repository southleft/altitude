import { beforeAll, describe, expect, test } from 'bun:test'

import { exportFigFile, initCodec } from '@open-pencil/core'
import { parseFigBuffer } from '@open-pencil/fig'
import { SceneGraph, type CodeBinding } from '@open-pencil/scene-graph'

import { importNodeChanges } from '#core/kiwi/fig/import'

const binding: CodeBinding = {
  tagName: 'al-button',
  package: '@southleft/al-web-components',
  react: { importPath: '@southleft/al-react', component: 'ALButton' },
  props: [{ property: 'Size', attribute: 'size', type: 'enum', values: { Md: 'md', Sm: 'sm' } }],
  slots: [{ slot: '', property: 'Text', layer: 'Text' }],
  parts: ['button']
}

async function roundTrip(graph: SceneGraph): Promise<SceneGraph> {
  const bytes = await exportFigFile(graph)
  const parsed = parseFigBuffer(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  )
  return importNodeChanges(parsed.nodeChanges, parsed.blobs, undefined, { populate: 'all' })
}

describe('code binding in .fig', () => {
  beforeAll(async () => {
    await initCodec()
  })

  test('survives export and import on a component set', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const set = graph.createNode('COMPONENT_SET', page.id, { name: 'Button', codeBinding: binding })
    graph.createNode('COMPONENT', set.id, {
      name: 'Size=Md',
      componentPropertyValues: { Size: 'Md' }
    })

    const imported = await roundTrip(graph)
    const restored = [...imported.getAllNodes()].find((node) => node.name === 'Button')
    expect(restored?.codeBinding).toEqual(binding)
  })

  test('removing a binding removes its plugin data on the next export', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const component = graph.createNode('COMPONENT', page.id, { name: 'Chip', codeBinding: binding })

    const once = await roundTrip(graph)
    const restored = [...once.getAllNodes()].find((node) => node.name === 'Chip')
    if (!restored) throw new Error('component missing')
    once.updateNode(restored.id, { codeBinding: null })
    const twice = await roundTrip(once)
    expect([...twice.getAllNodes()].find((node) => node.name === 'Chip')?.codeBinding).toBeNull()
    expect(component.codeBinding).toEqual(binding)
  })
})
