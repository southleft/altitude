import { describe, expect, test } from 'bun:test'

import {
  importDesignTokens,
  planTokenImport,
  readTokenMetadata,
  tokenModeSelection
} from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph, type Variable } from '@open-pencil/scene-graph'

import { themedMapping, themedTokenFiles } from './fixtures'

function variableByPath(graph: SceneGraph, path: string): Variable {
  const variable = [...graph.variables.values()].find((v) => readTokenMetadata(v)?.path === path)
  if (!variable) throw new Error(`No variable for ${path}`)
  return variable
}

function collectionOf(graph: SceneGraph, path: string): string | undefined {
  return graph.variableCollections.get(variableByPath(graph, path).collectionId)?.name
}

describe('DTCG import: mode mapping and placement', () => {
  test('every axis becomes a collection whose modes are its values', () => {
    const graph = new SceneGraph()
    const result = importDesignTokens(graph, themedTokenFiles(), themedMapping)
    expect(result.collections.map((c) => [c.name, c.modes])).toEqual([
      ['Primitives', ['Default']],
      ['Theme', ['Light', 'Dark']],
      ['Brand', ['Brand A', 'Brand B']],
      ['Density', ['Comfortable', 'Compact']]
    ])
    expect(collectionOf(graph, 'color.blue.500')).toBe('Primitives')
    expect(collectionOf(graph, 'theme.color.bg')).toBe('Theme')
    expect(collectionOf(graph, 'brand.accent')).toBe('Brand')
    expect(collectionOf(graph, 'density.gap')).toBe('Density')
  })

  test('an alias whose reference never changes stays in the collection its filters pick', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const accent = variableByPath(graph, 'theme.color.accent')
    expect(collectionOf(graph, 'theme.color.accent')).toBe('Theme')
    const brandAccent = variableByPath(graph, 'brand.accent')
    expect(Object.values(accent.valuesByMode)).toEqual([
      { aliasId: brandAccent.id },
      { aliasId: brandAccent.id }
    ])
  })

  test('cross-collection aliases resolve per axis context', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const accent = variableByPath(graph, 'theme.color.accent').id
    const red = graph.resolveVariableInModes(accent, tokenModeSelection(graph, { mode: 'dark', brand: 'b' }))
    const blue = graph.resolveVariableInModes(accent, tokenModeSelection(graph, { mode: 'light', brand: 'a' }))
    expect(red).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(blue).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  })

  test('variables carry code syntax, unit and path metadata', () => {
    const graph = new SceneGraph()
    importDesignTokens(graph, themedTokenFiles(), themedMapping)
    const md = variableByPath(graph, 'space.md')
    expect(md.name).toBe('space/md')
    expect(md.codeSyntax).toEqual({ WEB: 'var(--ds-space-md)' })
    expect(Object.values(md.valuesByMode)).toEqual([8])
    expect(readTokenMetadata(md)).toMatchObject({ source: 'fixture', path: 'space.md', type: 'dimension', unit: 'rem' })
    expect(variableByPath(graph, 'theme.color.bg').description).toBe('Page background')
  })

  test('a token missing from some modes is filled, flagged and named', () => {
    const graph = new SceneGraph()
    const result = importDesignTokens(graph, themedTokenFiles(), themedMapping)
    expect(readTokenMetadata(variableByPath(graph, 'brand.only'))?.absentModes).toEqual(['Brand A'])
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'mode-absent', token: 'brand.only' }))
  })

  test('tokens no collection covers get a named fallback collection', () => {
    const plan = planTokenImport(themedTokenFiles(), {
      ...themedMapping,
      collections: [{ name: 'Primitives', files: ['base/**'] }]
    })
    expect(plan.collections.map((c) => c.name)).toEqual([
      'Primitives',
      'Tokens · Mode',
      'Tokens',
      'Tokens · Brand',
      'Tokens · Density'
    ])
  })

  test('unresolved and circular aliases are reported by token name', () => {
    const plan = planTokenImport({
      'tokens.json': {
        a: { $type: 'number', $value: '{b}' },
        b: { $type: 'number', $value: '{a}' },
        c: { $type: 'number', $value: '{missing.token}' },
        d: { $type: 'number', $value: 3 }
      }
    })
    const codes = plan.issues.map((issue) => `${issue.code}:${issue.token}`)
    expect(codes).toContain('unresolved-alias:c')
    expect(codes.some((code) => code.startsWith('circular-alias:'))).toBe(true)
    expect(plan.collections[0].variables.map((v) => v.key)).toEqual(['d'])
  })

  test('an alias to an excluded token is flattened, placed by its resolved values, and named', () => {
    const plan = planTokenImport(themedTokenFiles(), { ...themedMapping, exclude: ['brand.**'] })
    const brand = plan.collections.find((c) => c.name === 'Brand')
    const accent = brand?.variables.find((v) => v.key === 'theme.color.accent')
    // The flattened value differs per brand, so it can no longer live in Theme.
    expect(accent?.valuesByMode).toEqual({
      'Brand A': { r: 0, g: 0, b: 1, a: 1 },
      'Brand B': { r: 1, g: 0, b: 0, a: 1 }
    })
    expect(plan.issues).toContainEqual(expect.objectContaining({ code: 'alias-flattened', token: 'theme.color.accent' }))
  })

  test('a single file without a mapping lands in one collection; overrides in one layer are named', () => {
    const plan = planTokenImport({
      'a.json': { size: { $type: 'dimension', $value: '1px' } },
      'b.json': { size: { $type: 'dimension', $value: '2px' } }
    })
    expect(plan.collections.map((c) => c.name)).toEqual(['Tokens'])
    expect(plan.issues).toContainEqual(expect.objectContaining({ code: 'conflicting-definition', token: 'size' }))
  })

  test('invalid mappings fail with the offending field', () => {
    expect(() => planTokenImport({}, { collections: [{ name: 'X', axes: ['nope'] }] })).toThrow(
      'unknown axis "nope"'
    )
    expect(() => planTokenImport({}, { axes: [{ name: 'mode', modes: [] }] })).toThrow('axes.0.modes')
  })
})
