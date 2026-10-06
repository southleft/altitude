import { describe, expect, test } from 'bun:test'

import { importDesignTokens, tokenModeSelection } from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph } from '@open-pencil/scene-graph'

import { cssVarNameForVariable, variableCollectionsToCSS } from '../src/index'

const files = {
  'base.json': {
    space: { $type: 'dimension', md: { $value: '1rem' }, group: { '@': { $value: '4px' } } },
    motion: { $type: 'duration', fast: { $value: '0.2s' } },
    weight: { $type: 'fontWeight', bold: { $value: 'bold' } },
    opacity: { $type: 'number', half: { $value: 0.5 } },
    tracking: { $type: 'letterSpacing', wide: { $value: '1%' } }
  },
  'theme/light.json': { surface: { $type: 'color', $value: '#ffffff' } },
  'theme/dark.json': { surface: { $type: 'color', $value: '#000000' } },
  'brand/b.json': { only: { $type: 'dimension', $value: '2px' } }
}

const mapping = {
  layers: [{ files: ['base.json'] }, { files: ['theme/{mode}.json'] }, { files: ['brand/{brand}.json'] }],
  axes: [
    { name: 'mode', modes: ['light', 'dark'] },
    { name: 'brand', modes: ['a', 'b'] }
  ],
  collections: [{ name: 'Base' }, { name: 'Theme', axes: ['mode'] }, { name: 'Brand', axes: ['brand'] }],
  naming: { dropSegments: [] },
  cssVar: { prefix: 'al', dropSegments: ['@'] }
}

function declarations(css: string): Record<string, string> {
  return Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]))
}

describe('variableCollectionsToCSS with imported tokens', () => {
  test('uses code-syntax names and authored units for one mode selection', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, files, mapping)
    const css = variableCollectionsToCSS(graph, {
      cssVarPrefix: 'al',
      modes: tokenModeSelection(graph, { mode: 'dark', brand: 'a' })
    })
    expect(declarations(css)).toEqual({
      '--al-space-md': '1rem',
      '--al-space-group': '4px',
      '--al-motion-fast': '0.2s',
      '--al-weight-bold': '700',
      '--al-opacity-half': '0.5',
      '--al-tracking-wide': '1%',
      '--al-surface': 'rgb(0, 0, 0)'
    })
  })

  test('leaves a token out of modes its source does not define', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, files, mapping)
    const inB = variableCollectionsToCSS(graph, { modes: tokenModeSelection(graph, { brand: 'b' }) })
    expect(declarations(inB)['--al-only']).toBe('2px')
    const all = variableCollectionsToCSS(graph)
    expect(all.match(/--al-only/g)).toHaveLength(1)
    expect(all).toContain(':root[data-mode="b"]')
  })

  test('variables without code syntax keep the slug of their name', () => {
    expect(cssVarNameForVariable({ name: 'color/primary' }, 'al')).toBe('--al-color-primary')
    expect(cssVarNameForVariable({ name: 'x', codeSyntax: { WEB: 'var(--ds-y)' } }, 'al')).toBe('--ds-y')
  })
})
