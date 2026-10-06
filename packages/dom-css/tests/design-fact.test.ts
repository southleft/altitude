import { describe, expect, test } from 'bun:test'

import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

import {
  designFactFromAttrs,
  designFactFromNode,
  designFactToAttrs,
  lastOmittedGeometry
} from '../src/design-fact'
import { applyVariableCSS, cssVarName, variableCollectionsToCSS } from '../src/design-tokens'
import { unwrapCSSVar } from '../src/css-values'
import { sceneGraphToDesignDocument } from '../src/from-scene-graph'
import { serializeHTML } from '../src/serialize'
import { createHeadlessCSSRuntime } from '../src/runtime'
import { DEFAULT_COMPUTED_PROPERTIES } from '../src/runtime/browser'
import { designDocumentToSceneGraph, lastImportDegradations } from '../src/to-scene-graph'
import type { DesignFact, DesignNode } from '../src/types'

/**
 * Design-fact carrier tests.
 *
 * These exist because a source-level scan claimed the bridge covered properties it was
 * silently destroying. Measured on a real design system, 17,196 token bindings went in
 * and 0 came out, and every node type flattened to FRAME. Each test below pins one fact
 * that used to be lost, so a regression fails here in milliseconds instead of being
 * found months later in a 98,645-node file.
 */

/** A graph with one themed button-ish frame containing a text node. */
function fixture() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]

  const collection = graph.createCollection('Theme')
  const primary = graph.createVariable('color/primary/default', 'COLOR', collection.id, {
    r: 0.2,
    g: 0.4,
    b: 0.9,
    a: 1
  })
  const gap = graph.createVariable('space/inline/md', 'FLOAT', collection.id, 12)

  const frame = graph.createNode('INSTANCE', page.id, {
    name: 'Button',
    width: 120,
    height: 40,
    layoutMode: 'HORIZONTAL',
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
    componentId: 'component-42',
    componentKey: 'key-42'
  })
  graph.bindVariable(frame.id, 'fills/0/color', primary.id)
  graph.bindVariable(frame.id, 'itemSpacing', gap.id)

  const label = graph.createNode('TEXT', frame.id, {
    name: 'Label',
    text: 'Save',
    width: 40,
    height: 20
  })

  return { graph, page, frame, label, collection, primary, gap }
}

describe('cssVarName', () => {
  test('flattens a slash hierarchy into a legal custom property', () => {
    expect(cssVarName('color/primary/default')).toBe('--color-primary-default')
  })

  test('applies a prefix', () => {
    expect(cssVarName('color/primary', 'al')).toBe('--al-color-primary')
  })

  test('collapses punctuation and trims stray separators', () => {
    expect(cssVarName('  Color / Primary (Default)!  ')).toBe('--color-primary-default')
  })
})

describe('designFactFromNode', () => {
  test('captures node type, component identity and bindings', () => {
    const { graph, frame, primary, gap } = fixture()
    const fact = designFactFromNode(graph, frame)

    expect(fact?.nodeType).toBe('INSTANCE')
    expect(fact?.componentId).toBe('component-42')
    expect(fact?.componentKey).toBe('key-42')
    expect(fact?.boundVariables?.['fills/0/color']).toEqual({
      id: primary.id,
      name: 'color/primary/default',
      cssVar: '--color-primary-default'
    })
    expect(fact?.boundVariables?.itemSpacing?.id).toBe(gap.id)
  })

  test('records a dangling binding by id rather than dropping it', () => {
    const { graph, frame, primary } = fixture()
    // Remove the variable definition but leave the binding in place.
    graph.variables.delete(primary.id)

    const fact = designFactFromNode(graph, frame)
    expect(fact?.boundVariables?.['fills/0/color']).toEqual({ id: primary.id })
  })
})

describe('attribute serialisation', () => {
  test('survives a string round trip', () => {
    const { graph, frame } = fixture()
    const fact = designFactFromNode(graph, frame)
    const attrs = designFactToAttrs(fact)

    expect(attrs['data-op-type']).toBe('INSTANCE')
    expect(attrs['data-op-component-id']).toBe('component-42')

    expect(fact).toBeDefined()
    expect(designFactFromAttrs(attrs)).toEqual(fact as DesignFact)
  })

  test('returns undefined when no design attributes are present', () => {
    expect(designFactFromAttrs({ class: 'btn' })).toBeUndefined()
  })

  test('ignores malformed JSON without throwing', () => {
    const fact = designFactFromAttrs({ 'data-op-type': 'FRAME', 'data-op-vars': '{not json' })
    expect(fact?.nodeType).toBe('FRAME')
    expect(fact?.boundVariables).toBeUndefined()
  })
})

describe('model round trip', () => {
  test('preserves node type, component identity and bindings', () => {
    const { graph, frame } = fixture()
    const doc = sceneGraphToDesignDocument(graph)
    const rebuilt = designDocumentToSceneGraph(doc)

    const nodes = [...rebuilt.nodes.values()]
    const instance = nodes.find((n) => n.type === 'INSTANCE')

    expect(instance).toBeDefined()
    expect(instance?.componentId).toBe('component-42')
    expect(instance?.componentKey).toBe('key-42')
    expect(instance?.boundVariables['fills/0/color']).toBe(
      graph.getNode(frame.id)?.boundVariables['fills/0/color'] ?? ''
    )
  })

  test('carries the variable tables so bindings still resolve', () => {
    const { graph, primary } = fixture()
    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))

    expect(rebuilt.variables.get(primary.id)?.name).toBe('color/primary/default')
    expect(rebuilt.resolveColorVariable(primary.id)).toEqual({ r: 0.2, g: 0.4, b: 0.9, a: 1 })
  })

  test('preserves the TEXT node type', () => {
    const { graph } = fixture()
    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    expect([...rebuilt.nodes.values()].some((n) => n.type === 'TEXT')).toBe(true)
  })

  test('records a CANVAS as a named degradation instead of silently flattening', () => {
    const { graph } = fixture()
    // sceneGraphToDesignDocument emits pages as <main>; re-importing cannot nest a canvas.
    designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const canvasDegradations = lastImportDegradations().filter((d) =>
      d.fact.includes('nodeType=CANVAS')
    )
    expect(canvasDegradations.length).toBeGreaterThan(0)
    expect(canvasDegradations[0].reason).toContain('cannot be nested')
  })

  test('opting out of design facts restores the old lossy behaviour', () => {
    const { graph } = fixture()
    const doc = sceneGraphToDesignDocument(graph, { includeDesignFacts: false })
    const rebuilt = designDocumentToSceneGraph(doc)

    expect([...rebuilt.nodes.values()].some((n) => n.type === 'INSTANCE')).toBe(false)
  })
})

describe('HTML text round trip', () => {
  test('recovers design facts from data-op-* attributes alone', async () => {
    const { graph } = fixture()
    const doc = sceneGraphToDesignDocument(graph)
    const html = serializeHTML(doc)

    expect(html).toContain('data-op-type="INSTANCE"')
    expect(html).toContain('data-op-component-id="component-42"')

    // Parsing HTML yields elements with attrs but no `design` field, which is exactly
    // the path that must fall back to attribute parsing.
    const runtime = createHeadlessCSSRuntime()
    const reparsed = runtime.parseHTML(html)

    const found: string[] = []
    const walk = (node: DesignNode) => {
      if (node.type === 'element') {
        expect(node.design).toBeUndefined()
        const fact = designFactFromAttrs(node.attrs)
        if (fact?.nodeType) found.push(fact.nodeType)
        for (const child of node.children) walk(child)
      }
    }
    for (const child of reparsed.children) walk(child)

    expect(found).toContain('INSTANCE')
  })

  test('rebuilds variable identity from markup when no source graph exists', () => {
    const { graph, primary } = fixture()
    const doc = sceneGraphToDesignDocument(graph)
    // Drop the source graph to simulate a document that only came from HTML.
    const detached = { ...doc, sourceGraph: undefined }

    const rebuilt = designDocumentToSceneGraph(detached)
    expect(rebuilt.variables.get(primary.id)?.name).toBe('color/primary/default')
    expect(lastImportDegradations().some((d) => d.fact.includes('variable definitions'))).toBe(true)
  })
})

describe('token bindings as CSS', () => {
  test('rewrites a bound declaration to var() with the literal as fallback', () => {
    const style = { 'background-color': 'rgb(51 102 230)' }
    const rewritten = applyVariableCSS(style, {
      nodeType: 'FRAME',
      boundVariables: {
        'fills/0/color': { id: 'v1', name: 'color/primary', cssVar: '--color-primary' }
      }
    })

    expect(rewritten).toBe(1)
    expect(style['background-color']).toBe('var(--color-primary, rgb(51 102 230))')
  })

  test('a fill on a TEXT node paints the glyphs, not a background', () => {
    const style: Record<string, string> = { color: 'rgb(0 0 0)' }
    applyVariableCSS(style, {
      nodeType: 'TEXT',
      boundVariables: {
        'fills/0/color': { id: 'v1', name: 'color/ink', cssVar: '--color-ink' }
      }
    })

    expect(style.color).toBe('var(--color-ink, rgb(0 0 0))')
    expect(style['background-color']).toBeUndefined()
  })

  test('emits var() with no fallback when the literal is absent', () => {
    const style: Record<string, string> = {}
    applyVariableCSS(style, {
      nodeType: 'FRAME',
      boundVariables: { itemSpacing: { id: 'v', name: 'space/md', cssVar: '--space-md' } }
    })
    expect(style.gap).toBe('var(--space-md)')
  })

  test('leaves bindings with no CSS equivalent alone and reports the count', () => {
    const style: Record<string, string> = {}
    const rewritten = applyVariableCSS(style, {
      nodeType: 'FRAME',
      boundVariables: { rotation: { id: 'v', name: 'angle/tilt', cssVar: '--angle-tilt' } }
    })
    expect(rewritten).toBe(0)
    expect(Object.keys(style)).toHaveLength(0)
  })

  test('the exported document carries var() references', () => {
    const { graph } = fixture()
    const doc = sceneGraphToDesignDocument(graph)
    const html = serializeHTML(doc)
    expect(html).toContain('var(--color-primary-default')
  })
})

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

    const out = [...designDocumentToSceneGraph(doc).nodes.values()].find(
      (n) => n.name === 'Tilted'
    )
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

    const out = [...designDocumentToSceneGraph(sceneGraphToDesignDocument(graph)).nodes.values()].find(
      (n) => n.name === 'Bordered'
    )
    expect(out?.borderTopWeight).toBe(4)
    expect(out?.borderLeftWeight).toBe(4)
  })
})

describe('residual facts', () => {
  test('carries facts CSS cannot express', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Card',
      width: 10,
      height: 10,
      horizontalConstraint: 'STRETCH',
      counterAxisSizing: 'AUTO',
      isMask: true,
      dashPattern: [3, 1]
    })

    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.name === 'Card')

    expect(out?.horizontalConstraint).toBe('STRETCH')
    expect(out?.counterAxisSizing).toBe('AUTO')
    expect(out?.isMask).toBe(true)
    expect(out?.dashPattern).toEqual([3, 1])
  })

  /**
   * `JSON.stringify(new Map())` is `{}` — silent, not an error. This pins the tagged
   * encoding, because the failure mode is an attribute that looks correct while the
   * fact inside it has been destroyed.
   */
  test('Map-valued facts survive the attribute encoding', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const instance = graph.createNode('INSTANCE', page.id, {
      name: 'Chip',
      width: 10,
      height: 10,
      componentId: 'c1'
    })
    const collection = graph.createCollection('T')
    const v = graph.createVariable('color/x', 'COLOR', collection.id, { r: 1, g: 1, b: 1, a: 1 })
    // bindVariable populates instanceOverrides, which is built from nested Maps.
    graph.bindVariable(instance.id, 'opacity', graph.createVariable('n/x', 'FLOAT', collection.id, 1).id)
    expect(graph.getNode(instance.id)?.instanceOverrides.self.size ?? 0).toBeGreaterThan(0)

    const created = graph.getNode(instance.id)
    expect(created).toBeDefined()
    const fact = designFactFromNode(graph, created as SceneNode)
    const attrs = designFactToAttrs(fact)
    expect(attrs['data-op-props']).toContain('__map__')

    const recovered = designFactFromAttrs(attrs)
    const overrides = recovered?.residual?.instanceOverrides as {
      self: Map<string, unknown>
    }
    expect(overrides.self).toBeInstanceOf(Map)
    expect(overrides.self.size).toBeGreaterThan(0)
    expect(v.id).toBeTruthy()
  })

  test('a CSS-expressible property is NOT carried as a residual fact', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const node = graph.createNode('FRAME', page.id, {
      name: 'Padded',
      width: 10,
      height: 10,
      paddingLeft: 12
    })

    const created = graph.getNode(node.id)
    expect(created).toBeDefined()
    const fact = designFactFromNode(graph, created as SceneNode)
    // padding-left is editable in the markup; carrying it would clobber that edit.
    expect(fact?.residual?.paddingLeft).toBeUndefined()
  })
})

describe('var() unwrapping', () => {
  test('recovers the fallback literal', () => {
    expect(unwrapCSSVar('var(--gap, 12px)')).toBe('12px')
  })

  test('recovers through a nested fallback chain', () => {
    expect(unwrapCSSVar('var(--a, var(--b, 10px))')).toBe('10px')
  })

  test('returns undefined when there is no fallback to recover', () => {
    expect(unwrapCSSVar('var(--gap)')).toBeUndefined()
  })

  test('leaves ordinary values untouched', () => {
    expect(unwrapCSSVar('12px')).toBe('12px')
    expect(unwrapCSSVar('rgb(1 2 3)')).toBe('rgb(1 2 3)')
  })

  test('a token-bound gap still round-trips as a number', () => {
    const { graph, frame } = fixture()
    const rebuilt = designDocumentToSceneGraph(sceneGraphToDesignDocument(graph))
    const out = [...rebuilt.nodes.values()].find((n) => n.name === 'Button')

    // The CSS says var(--space-inline-md, 12px); the scene graph must still see 12.
    expect(out?.itemSpacing).toBe(graph.getNode(frame.id)?.itemSpacing ?? -1)
  })
})

describe('browser runtime collects what the mappings need', () => {
  /**
   * `DEFAULT_COMPUTED_PROPERTIES` is the list `getComputedStyle` is actually asked for.
   * A property missing there can never reach its mapping however complete that mapping
   * is — verified the hard way in the running app, where a rotated, multiplied badge
   * came back with neither, and a grid frame came back with no tracks, because the
   * transform/blend/grid code was reading values nobody had collected.
   */
  test('every property the mappings read is collected', () => {
    const required = [
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
                transform: 'rotate(12deg)',
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
    expect(badge?.rotation).toBe(12)
    expect(badge?.blendMode).toBe('MULTIPLY')
  })
})

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
      children: [
        { type: 'element' as const, tagName: 'div', attrs, children: [] }
      ]
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
    const graph = designDocumentToSceneGraph(
      hostileDocument({ 'data-op-type': 'NOT_A_REAL_TYPE' })
    )

    const node = [...graph.nodes.values()].find((n) => n.name === 'div')
    expect(node?.type).toBe('FRAME')
    expect(
      lastImportDegradations().some((d) => d.fact.includes('NOT_A_REAL_TYPE'))
    ).toBe(true)
  })

  test('a legitimate residual field still applies', () => {
    const graph = designDocumentToSceneGraph(
      hostileDocument({ 'data-op-props': JSON.stringify({ locked: true, pointCount: 9 }) })
    )
    const node = [...graph.nodes.values()].find((n) => n.name === 'div')
    expect(node?.locked).toBe(true)
    expect(node?.pointCount).toBe(9)
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

    const out = [...designDocumentToSceneGraph(sceneGraphToDesignDocument(graph)).nodes.values()].find(
      (n) => n.name === 'Star'
    )
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

    const without = serializeHTML(sceneGraphToDesignDocument(graph, { geometryFacts: false }))
    expect(without).not.toContain('vectorNetwork')
    // The artwork is still in the markup as SVG, so nothing visible was lost.
    expect(without).toContain('<svg')
    expect(without.length).toBeLessThan(withFacts.length)

    const omitted = lastOmittedGeometry()
    expect(omitted.some((o) => o.nodeName === 'Heavy' && o.fields.includes('vectorNetwork'))).toBe(
      true
    )
  })

  test('opting out leaves vectors as plain boxes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('VECTOR', page.id, { name: 'Plain', width: 8, height: 8 })

    const html = serializeHTML(
      sceneGraphToDesignDocument(graph, { inlineVectorSVG: false })
    )
    expect(html).not.toContain('<svg')
  })
})

describe('variableCollectionsToCSS', () => {
  test('emits a :root block with resolved values', () => {
    const { graph } = fixture()
    const css = variableCollectionsToCSS(graph)

    expect(css).toContain(':root {')
    expect(css).toContain('--color-primary-default: rgb(51, 102, 230);')
    expect(css).toContain('--space-inline-md: 12px;')
  })

  test('honours a prefix so it can match an existing token namespace', () => {
    const { graph } = fixture()
    expect(variableCollectionsToCSS(graph, { cssVarPrefix: 'al' })).toContain(
      '--al-color-primary-default:'
    )
  })
})
