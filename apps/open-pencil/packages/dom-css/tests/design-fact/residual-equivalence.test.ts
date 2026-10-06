import { describe, expect, test } from 'bun:test'

import {
  designFactFromNode,
  designFactToAttrs,
  designFactWithAttrsFromNode,
  type OmittedGeometry
} from '#dom-css/design-fact'
import {
  BULKY_GEOMETRY_FIELDS,
  RESIDUAL_FIELDS,
  defaultsForType
} from '#dom-css/design-fact/fields'
import { encodeFactJSON } from '#dom-css/design-fact/json'
import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { serializeHTML } from '#dom-css/serialize'
import { designDocumentToSceneGraph } from '#dom-css/to-scene-graph'

import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

/**
 * The residual diff skips JSON comparisons it can settle structurally. This is the plain
 * definition it must agree with: every non-empty field whose JSON differs from the type
 * default, minus bulky geometry when geometry facts are off.
 */
function referenceResidual(node: SceneNode, includeGeometry: boolean) {
  const defaults = defaultsForType(node.type)
  const residual: Record<string, unknown> = {}
  const skipped: string[] = []
  for (const field of RESIDUAL_FIELDS) {
    const value = (node as SceneNode & Record<string, unknown>)[field]
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue
    }
    const fallback = defaults[field]
    const same =
      value === fallback ||
      (typeof value === typeof fallback &&
        !!value &&
        !!fallback &&
        typeof value === 'object' &&
        encodeFactJSON(value) === encodeFactJSON(fallback))
    if (same) continue
    if (!includeGeometry && BULKY_GEOMETRY_FIELDS.has(field)) skipped.push(field)
    else residual[field] = value
  }
  return { residual: Object.keys(residual).length ? residual : undefined, skipped }
}

const TRIANGLE = {
  vertices: [
    { x: 0, y: 0 },
    { x: 24, y: 0 },
    { x: 12, y: 24 }
  ],
  segments: [
    { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
    { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
    { start: 2, end: 0, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
  ],
  regions: []
}

function buildVariedGraph() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const collection = graph.createCollection('Theme')
  const opacity = graph.createVariable('n/opacity', 'FLOAT', collection.id, 1)
  const component = graph.createNode('COMPONENT', page.id, {
    name: 'Chip',
    componentPropertyDefinitions: [
      { id: 'label', name: 'Label', type: 'TEXT', defaultValue: 'Chip' }
    ] as SceneNode['componentPropertyDefinitions']
  })
  const instance = graph.createNode('INSTANCE', page.id, {
    name: 'Chip instance',
    componentId: component.id,
    componentPropertyValues: { label: 'Custom' } as SceneNode['componentPropertyValues']
  })
  graph.bindVariable(instance.id, 'opacity', opacity.id)
  graph.createNode('FRAME', page.id, {
    name: 'Constrained',
    horizontalConstraint: 'STRETCH',
    counterAxisSizing: 'HUG',
    dashPattern: [3, 1],
    locked: true,
    cornerSmoothing: 0.6
  })
  graph.createNode('VECTOR', page.id, {
    name: 'Logo',
    width: 24,
    height: 24,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
    vectorNetwork: TRIANGLE,
    strokeCap: 'ROUND'
  })
  graph.createNode('STAR', page.id, { name: 'Star', pointCount: 7, starInnerRadius: 0.5 })
  graph.createNode('TEXT', page.id, { name: 'Label', text: 'Hi', textAutoResize: 'HEIGHT' })
  return graph
}

describe('residual fact equivalence', () => {
  for (const includeGeometry of [true, false]) {
    test(`matches the reference diff with geometryFacts ${includeGeometry}`, () => {
      const graph = buildVariedGraph()
      for (const node of graph.getAllNodes()) {
        const omittedGeometry: OmittedGeometry[] = []
        const options = { geometryFacts: includeGeometry, omittedGeometry }
        const fact = designFactFromNode(graph, node, options)
        const reference = referenceResidual(node, includeGeometry)

        expect(fact?.residual).toEqual(reference.residual)
        expect(omittedGeometry.flatMap((entry) => entry.fields)).toEqual(reference.skipped)
        // A kept structure is a copy: the fact never aliases the scene node.
        for (const [field, value] of Object.entries(fact?.residual ?? {})) {
          if (value && typeof value === 'object') {
            expect(value).not.toBe((node as SceneNode & Record<string, unknown>)[field])
          }
        }
      }
    })
  }

  test('attributes encoded alongside the fact equal encoding the fact afterwards', () => {
    const graph = buildVariedGraph()
    for (const node of graph.getAllNodes()) {
      for (const geometryFacts of [true, false]) {
        const { fact, attrs } = designFactWithAttrsFromNode(graph, node, { geometryFacts })
        expect(attrs).toEqual(designFactToAttrs(fact))
        expect(attrs).toEqual(designFactToAttrs(designFactFromNode(graph, node, { geometryFacts })))
      }
    }
  })

  test('markupOnly emits the same HTML without building children under inline SVG', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const union = graph.createNode('BOOLEAN_OPERATION', page.id, {
      name: 'Union',
      width: 24,
      height: 24,
      booleanOperation: 'UNION',
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
      vectorNetwork: TRIANGLE
    })
    for (const name of ['A', 'B']) {
      graph.createNode('VECTOR', union.id, {
        name,
        width: 24,
        height: 24,
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
        vectorNetwork: TRIANGLE
      })
    }

    const full = sceneGraphToDesignDocument(graph, { rootId: page.id })
    const markup = sceneGraphToDesignDocument(graph, { rootId: page.id, markupOnly: true })
    expect(serializeHTML(markup)).toBe(serializeHTML(full))

    const [fullUnion] = full.children
    const [markupUnion] = markup.children
    if (fullUnion?.type !== 'element' || markupUnion?.type !== 'element') {
      throw new Error('expected element roots')
    }
    expect(fullUnion.rawHTML).toContain('<svg')
    expect(markupUnion.children).toHaveLength(0)
    // The default document still carries the operands for the in-memory round trip.
    expect(fullUnion.children).toHaveLength(2)
    const rebuilt = designDocumentToSceneGraph(full)
    expect([...rebuilt.nodes.values()].filter((node) => node.type === 'VECTOR')).toHaveLength(2)
  })

  test('attribute values escape markup characters in one pass', () => {
    const html = serializeHTML({
      type: 'document',
      children: [
        {
          type: 'element',
          tagName: 'div',
          attrs: { 'data-op-name': `a&b <c> "d" &amp; plain` },
          children: []
        }
      ]
    })
    expect(html).toBe('<div data-op-name="a&amp;b &lt;c&gt; &quot;d&quot; &amp;amp; plain"></div>')
  })
})
