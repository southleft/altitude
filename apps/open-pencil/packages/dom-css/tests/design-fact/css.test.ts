import { describe, expect, test } from 'bun:test'

import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { DEFAULT_COMPUTED_PROPERTIES } from '#dom-css/runtime/browser'
import { serializeHTML } from '#dom-css/serialize'
import { designDocumentToSceneGraph } from '#dom-css/to-scene-graph'
import { transformFactsFromCSS } from '#dom-css/transform'

import { SceneGraph } from '@open-pencil/scene-graph'

describe('paint structure', () => {
  /** A `Fill` carries ~20 fields; CSS can express about four. */
  test('a gradient fill survives exactly', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const fills = [
      {
        type: 'GRADIENT_LINEAR' as const,
        color: { r: 0, g: 0, b: 0, a: 1 },
        opacity: 0.8,
        visible: true,
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
        ]
      }
    ]
    const node = graph.createNode('FRAME', page.id, { name: 'Hero', width: 100, height: 50, fills })

    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.name === 'Hero')

    expect(out?.fills).toEqual(graph.getNode(node.id)?.fills ?? [])
  })

  test('a multi-fill stack keeps every layer and its flags', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const fills = [
      { type: 'SOLID' as const, color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true },
      { type: 'SOLID' as const, color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 0.5, visible: false }
    ]
    graph.createNode('FRAME', page.id, { name: 'Stack', width: 10, height: 10, fills })

    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.name === 'Stack')

    expect(out?.fills).toHaveLength(2)
    expect(out?.fills[1].visible).toBe(false)
    expect(out?.fills[1].opacity).toBe(0.5)
  })

  test('stroke weight, alignment and dash pattern survive', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const strokes = [
      {
        color: { r: 0, g: 0, b: 0, a: 1 },
        weight: 3,
        opacity: 1,
        visible: true,
        align: 'OUTSIDE' as const,
        dashPattern: [4, 2]
      }
    ]
    graph.createNode('FRAME', page.id, { name: 'Dashed', width: 10, height: 10, strokes })

    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.name === 'Dashed')

    expect(out?.strokes).toEqual(strokes)
  })
})

describe('text detail', () => {
  test('lineHeight survives a round trip', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('TEXT', page.id, {
      name: 'Body',
      text: 'Hello',
      width: 80,
      height: 24,
      fontSize: 16,
      lineHeight: 24,
      letterSpacing: 0.5
    })

    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.type === 'TEXT')

    expect(out?.lineHeight).toBe(24)
    expect(out?.fontSize).toBe(16)
    expect(out?.letterSpacing).toBeCloseTo(0.5, 5)
  })
})

describe('geometry', () => {
  test('an absolutely positioned node keeps its coordinates', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Pinned',
      x: 137,
      y: 42,
      width: 60,
      height: 30,
      layoutPositioning: 'ABSOLUTE'
    })

    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.name === 'Pinned')

    expect(out?.x).toBe(137)
    expect(out?.y).toBe(42)
  })
})

describe('CSS-expressible properties stay in CSS', () => {
  test('rotation and flips travel as a transform', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Tilted',
      width: 20,
      height: 20,
      rotation: 45,
      flipX: true
    })

    const doc = sceneGraphToDesignDocument(graph)
    expect(serializeHTML(doc)).toContain('rotate(45deg)')

    const out = [...designDocumentToSceneGraph(doc).nodes.values()].find((n) => n.name === 'Tilted')
    expect(out?.rotation).toBe(45)
    expect(out?.flipX).toBe(true)
  })

  test('blend mode travels as mix-blend-mode', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Blended',
      width: 10,
      height: 10,
      blendMode: 'MULTIPLY'
    })

    const doc = sceneGraphToDesignDocument(graph)
    expect(serializeHTML(doc)).toContain('mix-blend-mode: multiply')

    const out = [...designDocumentToSceneGraph(doc).nodes.values()].find(
      (n) => n.name === 'Blended'
    )
    expect(out?.blendMode).toBe('MULTIPLY')
  })

  test('uniform border weights survive even without independent strokes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Bordered',
      width: 10,
      height: 10,
      strokes: [
        {
          color: { r: 0, g: 0, b: 0, a: 1 },
          weight: 1,
          opacity: 1,
          visible: true,
          align: 'INSIDE' as const
        }
      ],
      borderTopWeight: 4,
      borderRightWeight: 4,
      borderBottomWeight: 4,
      borderLeftWeight: 4,
      independentStrokeWeights: false
    })

    const out = [
      ...designDocumentToSceneGraph(sceneGraphToDesignDocument(graph)).nodes.values()
    ].find((n) => n.name === 'Bordered')
    expect(out?.borderTopWeight).toBe(4)
    expect(out?.borderLeftWeight).toBe(4)
  })
})

const TWELVE_DEG = (12 * Math.PI) / 180

describe('browser runtime collects what the mappings need', () => {
  /**
   * `DEFAULT_COMPUTED_PROPERTIES` is the list `getComputedStyle` is actually asked for.
   * A property missing there can never reach its mapping however complete that mapping
   * is — verified the hard way in the running app, where a rotated, multiplied badge
   * came back with neither, and a grid frame came back with no tracks, because the
   * transform/blend/grid code was reading values nobody had collected.
   */
  test('every property the mappings read is collected', () => {
    const required: (typeof DEFAULT_COMPUTED_PROPERTIES)[number][] = [
      'transform',
      'mix-blend-mode',
      'grid-template-columns',
      'grid-template-rows',
      'column-gap',
      'row-gap',
      'display'
    ]
    for (const property of required) {
      expect(DEFAULT_COMPUTED_PROPERTIES).toContain(property)
    }
  })

  test('a computed style carrying them produces the right node', () => {
    const doc = {
      type: 'document' as const,
      children: [
        {
          type: 'element' as const,
          tagName: 'div',
          attrs: { 'data-op-type': 'FRAME', 'data-op-name': 'Toolbar' },
          computedStyle: {
            display: 'grid',
            'grid-template-columns': '160px 1fr auto',
            'column-gap': '16px',
            'row-gap': '8px'
          },
          children: [
            {
              type: 'element' as const,
              tagName: 'div',
              attrs: { 'data-op-type': 'ELLIPSE', 'data-op-name': 'Badge' },
              computedStyle: {
                width: '72px',
                height: '72px',
                // What getComputedStyle really returns for rotate(12deg): always a matrix.
                transform: `matrix(${Math.cos(TWELVE_DEG)}, ${Math.sin(TWELVE_DEG)}, ${-Math.sin(TWELVE_DEG)}, ${Math.cos(TWELVE_DEG)}, 0, 0)`,
                'mix-blend-mode': 'multiply'
              },
              children: []
            }
          ]
        }
      ]
    }

    const graph = designDocumentToSceneGraph(doc)
    const nodes = [...graph.nodes.values()]
    const toolbar = nodes.find((n) => n.name === 'Toolbar')
    const badge = nodes.find((n) => n.name === 'Badge')

    expect(toolbar?.layoutMode).toBe('GRID')
    expect(toolbar?.gridTemplateColumns).toEqual([
      { sizing: 'FIXED', value: 160 },
      { sizing: 'FR', value: 1 },
      { sizing: 'AUTO', value: 0 }
    ])
    expect(toolbar?.gridColumnGap).toBe(16)
    expect(toolbar?.gridRowGap).toBe(8)

    expect(badge?.type).toBe('ELLIPSE')
    expect(badge?.rotation).toBeCloseTo(12, 4)
    expect(badge?.flipX).toBe(false)
    expect(badge?.blendMode).toBe('MULTIPLY')
  })
})

describe('CSS Grid', () => {
  /** The layout engine shipped grid long before the bridge could read or write it. */
  test('grid tracks and gaps round-trip through CSS', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Grid',
      width: 300,
      height: 200,
      layoutMode: 'GRID',
      gridTemplateColumns: [
        { sizing: 'FIXED', value: 100 },
        { sizing: 'FR', value: 1 },
        { sizing: 'AUTO', value: 0 }
      ],
      gridTemplateRows: [{ sizing: 'FR', value: 2 }],
      gridColumnGap: 16,
      gridRowGap: 8
    })

    const doc = sceneGraphToDesignDocument(graph)
    const html = serializeHTML(doc)
    expect(html).toContain('display: grid')
    expect(html).toContain('grid-template-columns: 100px 1fr auto')

    const out = [...designDocumentToSceneGraph(doc).nodes.values()].find((n) => n.name === 'Grid')
    expect(out?.layoutMode).toBe('GRID')
    expect(out?.gridTemplateColumns).toEqual([
      { sizing: 'FIXED', value: 100 },
      { sizing: 'FR', value: 1 },
      { sizing: 'AUTO', value: 0 }
    ])
    expect(out?.gridColumnGap).toBe(16)
    expect(out?.gridRowGap).toBe(8)
  })
})

describe('CSS transform decomposition', () => {
  test('reads rotation from a computed matrix', () => {
    expect(transformFactsFromCSS('matrix(0, 1, -1, 0, 10, 20)')).toEqual({
      rotation: 90,
      flipX: false,
      flipY: false
    })
  })

  test('reads a reflected matrix as a flip with the matching rotation', () => {
    // rotate(30deg) scaleX(-1)
    const cos = Math.cos(Math.PI / 6)
    const sin = Math.sin(Math.PI / 6)
    const facts = transformFactsFromCSS(`matrix(${-cos}, ${-sin}, ${-sin}, ${cos}, 0, 0)`)
    expect(facts?.flipX).toBe(true)
    expect(facts?.rotation).toBeCloseTo(30, 4)
  })

  test('reads a flat matrix3d and refuses one with depth', () => {
    expect(
      transformFactsFromCSS('matrix3d(0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 5, 5, 0, 1)')?.rotation
    ).toBe(90)
    expect(
      transformFactsFromCSS('matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0.01, 0, 0, 0, 1)')
    ).toBeNull()
  })

  test('ignores none and keeps the functional form the exporter writes', () => {
    expect(transformFactsFromCSS('none')).toBeNull()
    expect(transformFactsFromCSS('rotate(45deg) scaleY(-1)')).toEqual({
      rotation: 45,
      flipX: false,
      flipY: true
    })
  })

  test('prefers the authored inline transform over the computed matrix', () => {
    // A flip on Y and a 180° turn with a flip on X are the same matrix; only the inline
    // value says which one was meant.
    const graph = designDocumentToSceneGraph({
      type: 'document',
      children: [
        {
          type: 'element',
          tagName: 'div',
          attrs: { 'data-op-name': 'Mirrored' },
          inlineStyle: { transform: 'rotate(20deg) scaleY(-1)' },
          computedStyle: { width: '10px', height: '10px', transform: 'matrix(1, 0, 0, -1, 0, 0)' },
          children: []
        }
      ]
    })
    const node = [...graph.nodes.values()].find((n) => n.name === 'Mirrored')
    expect(node?.rotation).toBe(20)
    expect(node?.flipY).toBe(true)
    expect(node?.flipX).toBe(false)
  })
})
