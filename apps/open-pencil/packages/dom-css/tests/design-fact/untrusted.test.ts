import { describe, expect, test } from 'bun:test'

import { designDocumentToSceneGraph, type ImportDegradation } from '#dom-css/to-scene-graph'

describe('untrusted markup', () => {
  /**
   * The premise of this whole bridge is that the exported markup gets edited — by people
   * and by agents. Wrong `data-op-*` attributes are therefore expected input, not an
   * exotic attack. Before this was policed, a plausible-looking `data-op-props` could
   * overwrite `id`, `parentId` and `childIds`, leaving `graph.nodes` keyed by one id
   * while the node claimed another.
   */
  function hostileDocument(attrs: Record<string, string>) {
    return {
      type: 'document' as const,
      children: [{ type: 'element' as const, tagName: 'div', attrs, children: [] }]
    }
  }

  test('cannot overwrite node identity or tree structure', () => {
    const graph = designDocumentToSceneGraph(
      hostileDocument({
        'data-op-props': JSON.stringify({
          childIds: ['bogus'],
          id: 'hijacked',
          parentId: 'nowhere'
        })
      })
    )

    for (const [key, node] of graph.nodes) {
      // The map key and the node's own id must never diverge.
      expect(node.id).toBe(key)
      expect(node.id).not.toBe('hijacked')
      expect(node.childIds).not.toContain('bogus')
    }
  })

  test('an unknown node type degrades to FRAME and is named', () => {
    const degradations: ImportDegradation[] = []
    const graph = designDocumentToSceneGraph(
      hostileDocument({ 'data-op-type': 'NOT_A_REAL_TYPE' }),
      { degradations }
    )

    const node = [...graph.nodes.values()].find((n) => n.name === 'div')
    expect(node?.type).toBe('FRAME')
    expect(degradations.some((d) => d.fact.includes('NOT_A_REAL_TYPE'))).toBe(true)
  })

  test('a legitimate residual field still applies', () => {
    const graph = designDocumentToSceneGraph(
      hostileDocument({ 'data-op-props': JSON.stringify({ locked: true, pointCount: 9 }) })
    )
    const node = [...graph.nodes.values()].find((n) => n.name === 'div')
    expect(node?.locked).toBe(true)
    expect(node?.pointCount).toBe(9)
  })

  test('drops an invalid paint, keeps its valid siblings and names the rejection', () => {
    const degradations: ImportDegradation[] = []
    const graph = designDocumentToSceneGraph(
      hostileDocument({
        'data-op-name': 'Painted',
        'data-op-fills': JSON.stringify([
          { type: 'SOLID' },
          { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
        ])
      }),
      { degradations }
    )

    const node = [...graph.nodes.values()].find((n) => n.name === 'Painted')
    expect(node?.fills).toEqual([
      { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
    ])
    expect(degradations).toContainEqual(
      expect.objectContaining({ nodeName: 'Painted', fact: 'data-op-fills[0]' })
    )
  })

  test('an all-invalid paint list leaves the CSS-derived paint in place', () => {
    const graph = designDocumentToSceneGraph({
      type: 'document',
      children: [
        {
          type: 'element',
          tagName: 'div',
          attrs: {
            'data-op-name': 'Fallback',
            'data-op-strokes': JSON.stringify([{ weight: 'thick' }]),
            'data-op-effects': '{not json'
          },
          computedStyle: { width: '10px', height: '10px', 'background-color': 'rgb(0, 0, 255)' },
          children: []
        }
      ]
    })
    const node = [...graph.nodes.values()].find((n) => n.name === 'Fallback')
    expect(node?.fills[0]?.color).toMatchObject({ r: 0, g: 0, b: 1 })
    expect(node?.strokes).toEqual([])
    expect(node?.effects).toEqual([])
  })

  test('a residual value of the wrong kind is rejected and named', () => {
    const degradations: ImportDegradation[] = []
    const graph = designDocumentToSceneGraph(
      hostileDocument({
        'data-op-props': JSON.stringify({ pointCount: 'nine', locked: true })
      }),
      { degradations }
    )
    const node = [...graph.nodes.values()].find((n) => n.name === 'div')
    expect(node?.locked).toBe(true)
    expect(typeof node?.pointCount).toBe('number')
    expect(degradations).toContainEqual(
      expect.objectContaining({ fact: 'data-op-props.pointCount' })
    )
  })

  test('concurrent imports keep separate degradation reports', async () => {
    const first: ImportDegradation[] = []
    const second: ImportDegradation[] = []
    await Promise.all([
      Promise.resolve().then(() =>
        designDocumentToSceneGraph(hostileDocument({ 'data-op-type': 'FIRST_BAD' }), {
          degradations: first
        })
      ),
      Promise.resolve().then(() =>
        designDocumentToSceneGraph(hostileDocument({ 'data-op-type': 'SECOND_BAD' }), {
          degradations: second
        })
      )
    ])
    expect(first.map((d) => d.fact)).toEqual(['nodeType=FIRST_BAD'])
    expect(second.map((d) => d.fact)).toEqual(['nodeType=SECOND_BAD'])
  })
})
