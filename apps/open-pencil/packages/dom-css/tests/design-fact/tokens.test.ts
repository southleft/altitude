import { describe, expect, test } from 'bun:test'

import { unwrapCSSVar } from '#dom-css/css-values'
import { applyVariableCSS, cssVarName, variableCollectionsToCSS } from '#dom-css/design-tokens'
import { sceneGraphToDesignDocument } from '#dom-css/from-scene-graph'
import { createHeadlessCSSRuntime } from '#dom-css/runtime'
import { serializeHTML } from '#dom-css/serialize'
import { designDocumentToSceneGraph, type ImportDegradation } from '#dom-css/to-scene-graph'
import { variableTypeForField } from '#dom-css/variable-recovery'

import { fixture } from './fixture'

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

describe('variables recovered from markup', () => {
  /**
   * The Code panel's HTML path never has a source graph, so this is how every round trip
   * through it rebuilds variables. They used to come back as empty COLOR variables, even
   * when bound to spacing.
   */
  test('infer the type from the bound field and the value from the CSS fallback', async () => {
    const { graph, frame, primary, gap } = fixture()
    graph.updateNode(frame.id, { itemSpacing: 12 })
    const html = serializeHTML(sceneGraphToDesignDocument(graph))
    const document = await createHeadlessCSSRuntime().computeStyles(
      createHeadlessCSSRuntime().parseHTML(html)
    )

    const rebuilt = designDocumentToSceneGraph(document)
    const color = rebuilt.variables.get(primary.id)
    const space = rebuilt.variables.get(gap.id)

    expect(color?.type).toBe('COLOR')
    // The CSS literal is 8-bit, so the recovered colour is quantised.
    const value = rebuilt.resolveColorVariable(primary.id)
    expect(value?.r).toBeCloseTo(0.2, 2)
    expect(value?.g).toBeCloseTo(0.4, 2)
    expect(value?.b).toBeCloseTo(0.9, 2)
    expect(space?.type).toBe('FLOAT')
    expect(rebuilt.resolveNumberVariable(gap.id)).toBe(12)
  })

  test('maps field families onto variable types', () => {
    expect(variableTypeForField('fills/0/color')).toBe('COLOR')
    expect(variableTypeForField('strokes/1/color')).toBe('COLOR')
    expect(variableTypeForField('itemSpacing')).toBe('FLOAT')
    expect(variableTypeForField('paddingLeft')).toBe('FLOAT')
    expect(variableTypeForField('cornerRadius')).toBe('FLOAT')
    expect(variableTypeForField('fontSize')).toBe('FLOAT')
    expect(variableTypeForField('fontFamily')).toBe('STRING')
    expect(variableTypeForField('visible')).toBe('BOOLEAN')
  })

  test('a binding without a fallback keeps its type and is named as a degradation', () => {
    const degradations: ImportDegradation[] = []
    const rebuilt = designDocumentToSceneGraph(
      {
        type: 'document',
        children: [
          {
            type: 'element',
            tagName: 'div',
            attrs: {
              'data-op-vars': JSON.stringify({
                paddingLeft: { id: 'v-pad', name: 'space/pad', cssVar: '--space-pad' }
              })
            },
            inlineStyle: { 'padding-left': 'var(--space-pad)' },
            children: []
          }
        ]
      },
      { degradations }
    )

    expect(rebuilt.variables.get('v-pad')?.type).toBe('FLOAT')
    expect(rebuilt.variables.get('v-pad')?.valuesByMode).toEqual({})
    expect(degradations.some((d) => d.reason.includes('without a CSS fallback'))).toBe(true)
  })
})
