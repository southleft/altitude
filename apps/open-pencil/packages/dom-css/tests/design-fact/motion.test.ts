import { describe, expect, test } from 'bun:test'

import { designFactFromAttrs } from '#dom-css/design-fact'
import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { createHeadlessCSSRuntime } from '#dom-css/runtime'
import { serializeHTML } from '#dom-css/serialize'
import { designDocumentToSceneGraph } from '#dom-css/to-scene-graph'
import type { DesignNode } from '#dom-css/types'

import { importDesignTokens } from '@open-pencil/core/io/formats/dtcg'
import {
  MOTION_SPEC_VERSION,
  SceneGraph,
  motionPluginData,
  readMotionSpec,
  type MotionSpec
} from '@open-pencil/scene-graph'

import { motionMapping, motionTokenFiles } from './motion-fixture'

const ROLE_FAST = 'var(--al-theme-animation-duration-role-fast, var(--al-theme-animation-duration))'
const ROLE_STANDARD =
  'var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing))'

const spec: MotionSpec = {
  version: MOTION_SPEC_VERSION,
  transitions: [
    {
      id: 'hover',
      trigger: 'hover',
      to: { State: 'Hover' },
      use: 'hover',
      properties: ['background-color', 'border-color']
    }
  ]
}

function motionDocument() {
  const graph = new SceneGraph()
  importDesignTokens(graph, motionTokenFiles, motionMapping)
  const page = graph.getPages()[0]
  const set = graph.createNode('COMPONENT_SET', page.id, { name: 'Button' })
  const base = graph.createNode('COMPONENT', set.id, {
    name: 'State=Default',
    componentPropertyValues: { State: 'Default' }
  })
  graph.createNode('COMPONENT', set.id, {
    name: 'State=Hover',
    componentPropertyValues: { State: 'Hover' }
  })
  graph.updateNode(set.id, { pluginData: motionPluginData(set, spec) })
  const instance = graph.createInstance(base.id, page.id)
  if (!instance) throw new Error('instance missing')
  return { graph, set, base, instance, page }
}

function walk(
  nodes: DesignNode[],
  visit: (node: Extract<DesignNode, { type: 'element' }>) => void
) {
  for (const node of nodes) {
    if (node.type !== 'element') continue
    visit(node)
    walk(node.children, visit)
  }
}

describe('motion across the HTML bridge', () => {
  test('variants and instances export a role-token transition; the set does not', () => {
    const { graph, set, base, instance, page } = motionDocument()
    const doc = sceneGraphToDesignDocument(graph, { rootId: page.id })
    const styles = new Map<string, Record<string, string> | undefined>()
    walk(doc.children, (node) => {
      if (node.sourceSceneNodeId) styles.set(node.sourceSceneNodeId, node.inlineStyle)
    })
    const expected = `background-color ${ROLE_FAST} ${ROLE_STANDARD}, border-color ${ROLE_FAST} ${ROLE_STANDARD}`
    expect(styles.get(instance.id)?.transition).toBe(expected)
    expect(styles.get(base.id)?.transition).toBe(expected)
    expect(styles.get(set.id)?.transition).toBeUndefined()
    expect(serializeHTML(doc)).not.toContain('--al-theme-animation-transition')
  })

  test('the spec survives serialised HTML through the data-op-motion fact', () => {
    const { graph, page } = motionDocument()
    const html = serializeHTML(sceneGraphToDesignDocument(graph, { rootId: page.id }))
    expect(html).toContain('data-op-motion=')

    const reparsed = createHeadlessCSSRuntime().parseHTML(html)
    const rebuilt = designDocumentToSceneGraph(reparsed)
    const set = [...rebuilt.nodes.values()].find((node) => node.type === 'COMPONENT_SET')
    expect(set && readMotionSpec(set)).toEqual(spec)
  })

  test('drops a tampered motion attribute and names it', () => {
    const issues: string[] = []
    const fact = designFactFromAttrs(
      { 'data-op-type': 'COMPONENT_SET', 'data-op-motion': '{"transitions":[{"trigger":"x"}]}' },
      (issue) => issues.push(`${issue.fact}: ${issue.reason}`)
    )
    expect(fact?.motion).toBeUndefined()
    expect(issues).toEqual(['data-op-motion: no valid transitions'])
  })
})
