import { describe, expect, test } from 'bun:test'

import type { OmittedGeometry } from '#dom-css/design-fact'
import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { serializeHTML } from '#dom-css/serialize'
import { designDocumentToSceneGraph } from '#dom-css/to-scene-graph'

import { SceneGraph } from '@open-pencil/scene-graph'

describe('SVG escape hatch', () => {
  /** A vector rendered as an empty div is a lie; the artwork has to be in the markup. */
  test('a vector node exports as inline SVG', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('VECTOR', page.id, {
      name: 'Logo',
      width: 24,
      height: 24,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
      vectorNetwork: {
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
    })

    const html = serializeHTML(sceneGraphToDesignDocument(graph))
    expect(html).toContain('<svg')
    // Not escaped — escaped markup would render the SVG source as visible text.
    expect(html).not.toContain('&lt;svg')
  })

  test('geometry still round-trips losslessly alongside the SVG', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const node = graph.createNode('STAR', page.id, {
      name: 'Star',
      width: 20,
      height: 20,
      pointCount: 7,
      starInnerRadius: 0.5
    })

    const out = [
      ...designDocumentToSceneGraph(sceneGraphToDesignDocument(graph)).nodes.values()
    ].find((n) => n.name === 'Star')
    expect(out?.type).toBe('STAR')
    expect(out?.pointCount).toBe(7)
    expect(out?.starInnerRadius).toBe(graph.getNode(node.id)?.starInnerRadius ?? -1)
  })

  /**
   * Carrying raw geometry is exact but enormous — 114MB of HTML on a real design system,
   * 95% of it `data-op-*`. Legible markup is the whole point of putting facts there, so
   * the trade has to be available, and the omission has to be named.
   */
  test('geometryFacts:false drops the bulky fields and names what it dropped', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('VECTOR', page.id, {
      name: 'Heavy',
      width: 24,
      height: 24,
      // A fill and closed geometry, or there is nothing for the SVG exporter to draw.
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
      vectorNetwork: {
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
    })

    const withFacts = serializeHTML(sceneGraphToDesignDocument(graph))
    expect(withFacts).toContain('vectorNetwork')

    const omitted: OmittedGeometry[] = []
    const without = serializeHTML(
      sceneGraphToDesignDocument(graph, { geometryFacts: false, omittedGeometry: omitted })
    )
    expect(without).not.toContain('vectorNetwork')
    // The artwork is still in the markup as SVG, so nothing visible was lost.
    expect(without).toContain('<svg')
    expect(without.length).toBeLessThan(withFacts.length)

    expect(omitted.some((o) => o.nodeName === 'Heavy' && o.fields.includes('vectorNetwork'))).toBe(
      true
    )
  })

  test('opting out leaves vectors as plain boxes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('VECTOR', page.id, { name: 'Plain', width: 8, height: 8 })

    const html = serializeHTML(sceneGraphToDesignDocument(graph, { inlineVectorSVG: false }))
    expect(html).not.toContain('<svg')
  })
})
