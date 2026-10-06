import { describe, expect, test } from 'bun:test'

import { getTool, setupToolTest, type ToolResult } from '#tests/helpers/tools'

function run(
  name: string,
  figma: ReturnType<typeof setupToolTest>['figma'],
  args: Record<string, unknown>
) {
  return getTool(name).execute(figma, args) as ToolResult
}

describe('variable mode tools', () => {
  test('add, rename, switch and remove modes by name', () => {
    const { figma, graph } = setupToolTest()
    const collection = figma.createVariableCollection('Theme')
    const variable = figma.createVariable('surface', 'FLOAT', collection.id, 4)

    const added = run('add_mode', figma, { collection: 'Theme', name: 'Dark' })
    expect(added.error).toBeUndefined()
    expect(variable.valuesByMode[String(added.modeId)]).toBe(4)
    expect(run('add_mode', figma, { collection: 'Theme', name: 'dark' }).error).toContain(
      'already has'
    )

    run('rename_mode', figma, { collection: collection.id, mode: 'Mode 1', name: 'Light' })
    expect(collection.modes.map((m) => m.name)).toEqual(['Light', 'Dark'])

    run('set_variable', figma, { id: variable.id, mode: 'Dark', value: '8' })
    run('set_active_mode', figma, { collection: 'Theme', mode: 'Dark' })
    expect(graph.resolveVariable(variable.id)).toBe(8)

    run('remove_mode', figma, { collection: 'Theme', mode: 'Dark' })
    expect(collection.modes.map((m) => m.name)).toEqual(['Light'])
    expect(run('remove_mode', figma, { collection: 'Theme', mode: 'Light' }).error).toContain(
      'at least one'
    )
  })
})

describe('set_variable_alias', () => {
  test('aliases across collections, checks type and refuses cycles', () => {
    const { figma, graph } = setupToolTest()
    const primitives = figma.createVariableCollection('Primitives')
    const theme = figma.createVariableCollection('Theme')
    const blue = figma.createVariable('blue', 'COLOR', primitives.id, { r: 0, g: 0, b: 1, a: 1 })
    const accent = figma.createVariable('accent', 'COLOR', theme.id)
    const size = figma.createVariable('size', 'FLOAT', theme.id, 1)

    expect(run('set_variable_alias', figma, { id: 'accent', target: 'blue' }).error).toBeUndefined()
    expect(graph.resolveVariable(accent.id)).toEqual({ r: 0, g: 0, b: 1, a: 1 })
    expect(run('set_variable_alias', figma, { id: size.id, target: blue.id }).error).toContain(
      'Cannot alias'
    )
    expect(run('set_variable_alias', figma, { id: 'blue', target: 'accent' }).error).toContain(
      'cycle'
    )
  })
})

describe('import_design_tokens', () => {
  const mapping = {
    name: 'demo',
    layers: [{ files: ['base.json'] }, { files: ['{mode}.json'] }],
    axes: [{ name: 'mode', modes: ['light', 'dark'] }],
    collections: [{ name: 'Base' }, { name: 'Theme', axes: ['mode'] }],
    cssVar: { prefix: 'ds' }
  }
  const files = {
    'base.json': { space: { $type: 'dimension', md: { $value: '8px' } } },
    'light.json': { bg: { $type: 'color', $value: '#ffffff' } },
    'dark.json': { bg: { $type: 'color', $value: '#000000' } }
  }

  test('imports files with a mapping, then updates in place', () => {
    const { figma, graph } = setupToolTest()
    const first = run('import_design_tokens', figma, { files, mapping })
    expect(first.created).toBe(2)
    expect(first.collections).toEqual([
      expect.objectContaining({ name: 'Base', modes: ['Default'] }),
      expect.objectContaining({ name: 'Theme', modes: ['Light', 'Dark'] })
    ])
    const again = run('import_design_tokens', figma, { files, mapping })
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 2 })
    expect(graph.variables.size).toBe(2)
  })

  test('a single document needs no mapping, and problems are named', () => {
    const { figma } = setupToolTest()
    const result = run('import_design_tokens', figma, {
      tokens: { ok: { $type: 'number', $value: 1 }, broken: { $type: 'number', $value: '{nope}' } }
    })
    expect(result.created).toBe(1)
    expect(result.issueCounts).toEqual({ 'unresolved-alias': 1 })
    expect(run('import_design_tokens', figma, {}).error).toContain('tokens')
    expect(
      run('import_design_tokens', figma, { tokens: {}, mapping: { axes: 'x' } }).error
    ).toContain('Invalid token import mapping')
  })
})
