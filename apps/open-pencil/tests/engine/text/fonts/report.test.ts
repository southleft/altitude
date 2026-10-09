import { describe, expect, test } from 'bun:test'

import {
  buildDocumentFontReport,
  fontCategoryFromName,
  fontFamiliesFromVariables,
  FontManager,
  primaryFontFamily,
  suggestFontReplacements
} from '@open-pencil/core/text'
import { SceneGraph, type Variable } from '@open-pencil/scene-graph'

function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const manager = new FontManager()
  manager.markLoaded('Inter', 'Regular', new ArrayBuffer(8), 'bundled')
  manager.markLoaded('Public Sans', 'Regular', new ArrayBuffer(8), 'fontsource')
  manager.markLoaded('Agrandir', 'Bold', new ArrayBuffer(8), 'team')
  const text = (name: string, fontFamily: string, fontWeight = 400) =>
    graph.createNode('TEXT', pageId, { name, text: name, fontFamily, fontWeight })
  return { graph, pageId, manager, text }
}

describe('buildDocumentFontReport', () => {
  test('reports origin, usage and sanctioning per family, problems first', () => {
    const { graph, manager, text } = setup()
    const heading = text('Heading', 'Agrandir', 700)
    const body = text('Body', 'Public Sans')
    const caption = text('Caption', 'Public Sans')
    const legacy = text('Legacy', 'Source Sans Pro')

    const report = buildDocumentFontReport(graph, {
      manager,
      sanctionedFamilies: ['Public Sans', 'agrandir']
    })

    expect(report.faceCount).toBe(3)
    expect(report.missingFaceCount).toBe(1)
    expect(
      report.families.map((family) => ({
        family: family.family,
        sanctioned: family.sanctioned,
        usageCount: family.usageCount,
        missing: family.missing,
        origins: family.faces.map((face) => `${face.style}:${face.origin}`)
      }))
    ).toEqual([
      {
        family: 'Source Sans Pro',
        sanctioned: false,
        usageCount: 1,
        missing: true,
        origins: ['Regular:substituted']
      },
      {
        family: 'Agrandir',
        sanctioned: true,
        usageCount: 1,
        missing: false,
        origins: ['Bold:team']
      },
      {
        family: 'Public Sans',
        sanctioned: true,
        usageCount: 2,
        missing: false,
        origins: ['Regular:web']
      }
    ])
    expect(report.families[0].faces[0]).toMatchObject({
      substituteFamily: 'Inter',
      nodeIds: [legacy.id]
    })
    expect(report.families[2].faces[0].nodeIds.toSorted()).toEqual([body.id, caption.id].toSorted())
    expect(report.families[1].faces[0].nodeIds).toEqual([heading.id])
  })

  test('covers every page and leaves sanctioning unknown without a list', () => {
    const { graph, manager } = setup()
    const second = graph.createNode('CANVAS', graph.rootId, { name: 'Page 2' })
    graph.createNode('TEXT', second.id, { name: 'Far', text: 'Far', fontFamily: 'Missing Mono' })

    const report = buildDocumentFontReport(graph, { manager })
    expect(report.pageIds).toContain(second.id)
    expect(report.families).toHaveLength(1)
    expect(report.families[0]).toMatchObject({ family: 'Missing Mono', sanctioned: null })
  })

  test('marks faces missing when not even the default family is loaded', () => {
    const graph = new SceneGraph()
    graph.createNode('TEXT', graph.getPages()[0].id, { text: 'x', fontFamily: 'Agrandir' })
    const report = buildDocumentFontReport(graph, { manager: new FontManager() })
    expect(report.families[0].faces[0].origin).toBe('missing')
  })
})

describe('sanctioned families from variables', () => {
  function variable(id: string, name: string, value: Variable['valuesByMode'][string]): Variable {
    return {
      id,
      name,
      type: 'STRING',
      collectionId: 'typography',
      valuesByMode: { mode: value },
      description: '',
      hiddenFromPublishing: false
    }
  }

  test('reads the first family of each matching stack, following aliases', () => {
    const graph = new SceneGraph()
    graph.variables.set('a', variable('a', 'typography/font-family/primary', 'Public Sans'))
    graph.variables.set(
      'b',
      variable('b', 'typography/font-family/mono', '"IBM Plex Mono", ui-monospace, monospace')
    )
    graph.variables.set('c', variable('c', 'brand/font-family/heading', { aliasId: 'd' }))
    graph.variables.set('d', variable('d', 'primitives/agrandir', 'Agrandir, sans-serif'))
    graph.variables.set('e', variable('e', 'copy/greeting', 'Hello'))

    expect(fontFamiliesFromVariables(graph, (item) => item.name.includes('font-family'))).toEqual([
      'Public Sans',
      'IBM Plex Mono',
      'Agrandir'
    ])
  })

  test('skips generic families in a stack', () => {
    expect(primaryFontFamily('ui-monospace, "SF Mono", monospace')).toBe('SF Mono')
    expect(primaryFontFamily('serif')).toBeNull()
  })
})

describe('suggestFontReplacements', () => {
  test('ranks sanctioned families, then same category and shared name words', () => {
    const suggestions = suggestFontReplacements(
      'Source Sans Pro',
      [
        { family: 'Source Sans 3', source: 'fontsource' },
        { family: 'Public Sans', source: 'fontsource' },
        { family: 'IBM Plex Mono', source: 'fontsource' },
        { family: 'Merriweather', source: 'fontsource' },
        'Source Sans Pro'
      ],
      { sanctionedFamilies: ['Public Sans', 'IBM Plex Mono'] }
    )
    expect(suggestions.map((suggestion) => suggestion.family)).toEqual([
      'Public Sans',
      'IBM Plex Mono',
      'Source Sans 3'
    ])
    expect(suggestions[0].sanctioned).toBe(true)
  })

  test('prefers monospace families for a monospace font', () => {
    const [first] = suggestFontReplacements('Operator Mono', ['Inter', 'Roboto Mono'])
    expect(first.family).toBe('Roboto Mono')
    expect(fontCategoryFromName('Georgia')).toBe('serif')
    expect(fontCategoryFromName('Noto Sans Display')).toBe('display')
    expect(fontCategoryFromName('Open Sans')).toBe('sans')
  })
})
