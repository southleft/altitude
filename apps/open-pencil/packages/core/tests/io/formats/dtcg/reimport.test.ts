import { describe, expect, test } from 'bun:test'

import { importDesignTokens, readTokenMetadata, DTCG_EXTENSION_KEY } from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph, type Variable } from '@open-pencil/scene-graph'

import { themedMapping, themedTokenFiles } from './fixtures'

function variableByPath(graph: SceneGraph, path: string): Variable {
  const variable = [...graph.variables.values()].find((v) => readTokenMetadata(v)?.path === path)
  if (!variable) throw new Error(`No variable for ${path}`)
  return variable
}

function withValue(path: string[], value: unknown): Record<string, unknown> {
  const files = themedTokenFiles()
  let node = files['base/primitives.json'] as Record<string, Record<string, unknown>>
  for (const segment of path.slice(0, -1)) node = node[segment] as Record<string, Record<string, unknown>>
  node[path[path.length - 1]] = { $value: value }
  return files
}

describe('DTCG re-import', () => {
  test('importing the same tokens again changes nothing and duplicates nothing', () => {
    const graph = new SceneGraph()
    const first = importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const count = graph.variables.size
    const second = importDesignTokens(graph, themedTokenFiles(), themedMapping)
    expect(graph.variables.size).toBe(count)
    expect(graph.variableCollections.size).toBe(first.collections.length)
    expect(second.created).toEqual([])
    expect(second.updated).toEqual([])
    expect(second.unchanged.length).toBe(count)
  })

  test('a changed value updates the variable in place and keeps node bindings', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const blue = variableByPath(graph, 'color.blue.500')
    const page = graph.getPages()[0].id
    const rect = graph.createNode('RECTANGLE', page, {
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true, blendMode: 'NORMAL' }]
    })
    graph.bindVariable(rect.id, 'fills/0/color', blue.id)

    const result = importDesignTokens(graph, withValue(['color', 'blue', '500'], '#000080'), themedMapping)
    expect(result.updated).toEqual(['color.blue.500'])
    expect(variableByPath(graph, 'color.blue.500').id).toBe(blue.id)
    expect(graph.getNode(rect.id)?.boundVariables['fills/0/color']).toBe(blue.id)
    expect(graph.resolveColorVariableForNode(rect.id, blue.id)).toEqual({ r: 0, g: 0, b: 128 / 255, a: 1 })
  })

  test('removed tokens are reported and kept unless pruned', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const files = themedTokenFiles()
    delete (files['density/compact.json'] as Record<string, unknown>).density
    delete (files['density/comfortable.json'] as Record<string, unknown>).density

    const kept = importDesignTokens(graph, files, themedMapping)
    expect(kept.removed).toEqual(['density.gap'])
    expect(kept.pruned).toBe(false)
    expect(variableByPath(graph, 'density.gap')).toBeDefined()

    const pruned = importDesignTokens(graph, files, themedMapping, { prune: true })
    expect(pruned.removed).toEqual(['density.gap'])
    expect([...graph.variables.values()].some((v) => readTokenMetadata(v)?.path === 'density.gap')).toBe(false)
    expect([...graph.variableCollections.values()].some((c) => c.name === 'Density')).toBe(false)
  })

  test('variables are matched by token path even after their ids change', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    // A .fig round trip reassigns ids; simulate it on one variable.
    const original = variableByPath(graph, 'space.sm')
    graph.removeVariable(original.id)
    graph.addVariable({ ...structuredClone(original), id: '12:34' })

    const result = importDesignTokens(graph, themedTokenFiles(), themedMapping)
    expect(result.created).toEqual([])
    expect(variableByPath(graph, 'space.sm').id).toBe('12:34')
  })

  test('existing variables with the same name are adopted rather than duplicated', () => {
    const graph = new SceneGraph()
    graph.addCollection({
      id: 'figma-theme',
      name: 'Theme',
      modes: [
        { modeId: 'l', name: 'Light' },
        { modeId: 'd', name: 'Dark' }
      ],
      defaultModeId: 'l',
      variableIds: []
    })
    graph.addVariable({
      id: 'figma-bg',
      name: 'theme/color/bg',
      type: 'COLOR',
      collectionId: 'figma-theme',
      valuesByMode: { l: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, d: { r: 0.5, g: 0.5, b: 0.5, a: 1 } },
      description: '',
      hiddenFromPublishing: false
    })
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const bg = variableByPath(graph, 'theme.color.bg')
    expect(bg.id).toBe('figma-bg')
    expect(bg.valuesByMode).toEqual({ l: { r: 1, g: 1, b: 1, a: 1 }, d: { r: 0, g: 0, b: 0, a: 1 } })
    expect(graph.variableCollections.get('figma-theme')?.extensions?.[DTCG_EXTENSION_KEY]).toBeDefined()
  })

  test('a token whose collection changes moves with its id', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const sm = variableByPath(graph, 'space.sm')
    const result = importDesignTokens(graph, themedTokenFiles(), {
      ...themedMapping,
      collections: [{ name: 'Spacing', tokens: ['space.**'] }, ...themedMapping.collections]
    })
    expect(result.moved).toEqual(['space.sm', 'space.md'])
    expect(variableByPath(graph, 'space.sm').id).toBe(sm.id)
    expect(graph.variableCollections.get(sm.collectionId)?.name).toBe('Spacing')
  })
})
