import { describe, expect, test } from 'bun:test'

import { designFactFromAttrs, designFactFromNode, designFactToAttrs } from '#dom-css/design-fact'
import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { createHeadlessCSSRuntime } from '#dom-css/runtime'
import { serializeHTML } from '#dom-css/serialize'
import { designDocumentToSceneGraph, type ImportDegradation } from '#dom-css/to-scene-graph'
import type { DesignFact, DesignNode } from '#dom-css/types'

import { fixture } from './fixture'

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

  test('ignores malformed JSON without throwing and reports it', () => {
    const issues: string[] = []
    const fact = designFactFromAttrs(
      { 'data-op-type': 'FRAME', 'data-op-vars': '{not json' },
      (issue) => issues.push(`${issue.fact}: ${issue.reason}`)
    )
    expect(fact?.nodeType).toBe('FRAME')
    expect(fact?.boundVariables).toBeUndefined()
    expect(issues).toEqual(['data-op-vars: malformed JSON'])
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
    const degradations: ImportDegradation[] = []
    designDocumentToSceneGraph(sceneGraphToDesignDocument(graph), { degradations })
    const canvasDegradations = degradations.filter((d) => d.fact.includes('nodeType=CANVAS'))
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

    const degradations: ImportDegradation[] = []
    const rebuilt = designDocumentToSceneGraph(detached, { degradations })
    expect(rebuilt.variables.get(primary.id)?.name).toBe('color/primary/default')
    expect(degradations.some((d) => d.fact.includes('variable definitions'))).toBe(true)
  })
})
