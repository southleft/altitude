import { describe, expect, test } from 'bun:test'

import { importNodeChanges } from '@open-pencil/core'
import type { NodeChange } from '@open-pencil/core'
import { createEditor } from '@open-pencil/core/editor'

import { expectDefined } from '#tests/helpers/assert'

import { canvas, doc, node } from './helpers'

const guid = (localID: number) => ({ sessionID: 1, localID })
const mode = (localID: number) => ({ sessionID: 10, localID })

function collection(localID: number, name: string, fields: Record<string, unknown> = {}) {
  return {
    ...node('VARIABLE_SET', localID, 1),
    name,
    variableSetModes: [{ id: mode(localID * 10), name: 'Default', sortPosition: '!' }],
    ...fields
  } as NodeChange
}

function floatVariable(
  localID: number,
  name: string,
  setLocalID: number,
  value: number,
  fields: Record<string, unknown> = {}
) {
  return {
    ...node('VARIABLE', localID, 1),
    name,
    variableSetID: { guid: guid(setLocalID) },
    variableResolvedType: 'FLOAT',
    variableDataValues: {
      entries: [
        {
          modeID: mode(setLocalID * 10),
          variableData: {
            dataType: 'FLOAT',
            resolvedDataType: 'FLOAT',
            value: { floatValue: value }
          }
        }
      ]
    },
    ...fields
  } as NodeChange
}

function aliasEntry(variableField: string, alias: Record<string, unknown>) {
  return {
    variableField,
    variableData: { dataType: 'ALIAS', resolvedDataType: 'FLOAT', value: { alias } }
  }
}

describe('fig-import: variable sources', () => {
  test('orders collections, modes and variables by sort position', () => {
    const graph = importNodeChanges([
      doc(),
      canvas(),
      collection(20, 'Second', { sortPosition: '"' }),
      {
        ...collection(21, 'First', { sortPosition: '!' }),
        variableSetModes: [
          { id: mode(1), name: 'Light', sortPosition: '#' },
          { id: mode(2), name: 'Dark', sortPosition: ' ~' }
        ]
      } as NodeChange,
      floatVariable(30, 'b', 20, 1, { sortPosition: '#' }),
      floatVariable(31, 'a', 20, 2, { sortPosition: '!' })
    ])

    const collections = [...graph.variableCollections.values()]
    expect(collections.map((c) => c.name)).toEqual(['First', 'Second'])
    // Figma's default mode is the first in sort order, not the first stored.
    expect(collections[0].modes.map((m) => m.name)).toEqual(['Dark', 'Light'])
    expect(collections[0].defaultModeId).toBe('10:2')
    expect(graph.getVariablesForCollection('1:20').map((v) => v.name)).toEqual(['a', 'b'])
  })

  test('keeps soft-deleted and library collections out of the local list', () => {
    const graph = importNodeChanges([
      doc(),
      canvas(),
      collection(20, 'Local', { sortPosition: '!' }),
      collection(21, 'Deleted', { sortPosition: '"', isSoftDeleted: true }),
      collection(22, 'Library', { key: 'lib-set', sourceLibraryKey: 'lk-1' }),
      floatVariable(30, 'space/md', 20, 16),
      floatVariable(31, 'space/old', 20, 4, { isSoftDeleted: true }),
      floatVariable(32, 'space/sm', 21, 12),
      floatVariable(33, 'radius', 22, 8, { key: 'lib-var', sourceLibraryKey: 'lk-1' })
    ])
    const editor = createEditor({ graph })

    expect(editor.getCollections().map((c) => c.name)).toEqual(['Local'])
    expect(editor.getLibraryCollections().map((c) => c.name)).toEqual(['Library'])
    expect(editor.getVariablesForCollection('1:20').map((v) => v.name)).toEqual(['space/md'])
    expect(editor.getCollectionCount()).toBe(1)
    expect(editor.getVariableCount()).toBe(1)
    expect(editor.getVariablesByType('FLOAT').map((v) => v.name)).toEqual(['space/md', 'radius'])

    // Data needed for round-trip stays in the graph, flagged.
    expect(graph.variableCollections.get('1:21')?.deleted).toBe(true)
    expect(graph.variables.get('1:31')?.deleted).toBe(true)
    expect(graph.variableCollections.get('1:22')?.libraryKey).toBe('lk-1')
    expect(graph.variables.get('1:33')?.libraryKey).toBe('lk-1')
  })

  test('nodes bound to deleted variables keep their stored values', () => {
    const graph = importNodeChanges([
      doc(),
      canvas(),
      collection(20, 'Deleted', { isSoftDeleted: true }),
      floatVariable(30, 'space/sm', 20, 12),
      node('FRAME', 40, 1, {
        name: 'Button',
        stackMode: 'HORIZONTAL',
        stackHorizontalPadding: 16,
        stackPaddingRight: 16,
        variableConsumptionMap: {
          entries: [aliasEntry('STACK_PADDING_LEFT', { guid: guid(30) })]
        }
      } as Partial<NodeChange>)
    ])

    const button = expectDefined(
      [...graph.getAllNodes()].find((n) => n.name === 'Button'),
      'Button frame'
    )
    expect(button.boundVariables.paddingLeft).toBe('1:30')
    expect(graph.resolveNumberVariableForNode(button.id, '1:30')).toBeUndefined()
    expect(button.paddingLeft).toBe(16)
  })

  test('binds library variables referenced by asset key, including typography fields', () => {
    const graph = importNodeChanges([
      doc(),
      canvas(),
      {
        ...collection(20, 'text semantic', { key: 'set-key', sourceLibraryKey: 'lk-1' }),
        variableSetModes: [
          { id: mode(1), name: 'Default', sortPosition: '!' },
          { id: mode(2), name: 'Secondary', sortPosition: '"' }
        ]
      } as NodeChange,
      {
        ...floatVariable(30, 'label/font-size', 20, 14, {
          key: 'size-key',
          version: '1:2',
          sourceLibraryKey: 'lk-1'
        }),
        variableDataValues: {
          entries: [1, 2].map((localID) => ({
            modeID: mode(localID),
            variableData: {
              dataType: 'FLOAT',
              resolvedDataType: 'FLOAT',
              value: { floatValue: localID === 1 ? 14 : 18 }
            }
          }))
        }
      } as NodeChange,
      {
        ...node('VARIABLE', 31, 1),
        name: 'label/font-style',
        key: 'style-key',
        sourceLibraryKey: 'lk-1',
        variableSetID: { guid: guid(20) },
        variableResolvedType: 'STRING',
        variableDataValues: {
          entries: [
            {
              modeID: mode(1),
              variableData: {
                dataType: 'STRING',
                resolvedDataType: 'STRING',
                value: { textValue: 'Semi Bold' }
              }
            }
          ]
        }
      } as NodeChange,
      node('TEXT', 40, 1, {
        name: 'Label',
        fontSize: 18,
        fontName: { family: 'Inter', style: 'Semi Bold', postscript: '' },
        textData: { characters: 'Label' },
        variableConsumptionMap: {
          entries: [
            aliasEntry('FONT_SIZE', { assetRef: { key: 'size-key', version: '1:2' } }),
            {
              variableField: 'FONT_STYLE',
              variableData: {
                dataType: 'FONT_STYLE',
                resolvedDataType: 'FONT_STYLE',
                value: {
                  fontStyleValue: {
                    asString: {
                      dataType: 'ALIAS',
                      resolvedDataType: 'STRING',
                      value: { alias: { assetRef: { key: 'style-key' } } }
                    }
                  }
                }
              }
            }
          ]
        }
      } as Partial<NodeChange>)
    ])
    const label = expectDefined(
      [...graph.getAllNodes()].find((n) => n.name === 'Label'),
      'Label text'
    )
    expect(label.boundVariables).toEqual({ fontSize: '1:30', fontStyle: '1:31' })
    expect(graph.resolveNumberVariableForNode(label.id, '1:30')).toBe(14)
  })

  test('applies explicit modes that reference a library collection by asset key', () => {
    const graph = importNodeChanges([
      doc(),
      {
        ...canvas(),
        variableModeBySetMap: {
          entries: [{ variableSetID: { assetRef: { key: 'set-key' } }, variableModeID: mode(2) }]
        }
      } as NodeChange,
      {
        ...collection(20, 'Semantic', { key: 'set-key', sourceLibraryKey: 'lk-1' }),
        variableSetModes: [
          { id: mode(1), name: 'Dark', sortPosition: '!' },
          { id: mode(2), name: 'Light', sortPosition: '"' }
        ]
      } as NodeChange,
      {
        ...floatVariable(30, 'gap', 20, 0, { key: 'gap-key', sourceLibraryKey: 'lk-1' }),
        variableDataValues: {
          entries: [1, 2].map((localID) => ({
            modeID: mode(localID),
            variableData: {
              dataType: 'FLOAT',
              resolvedDataType: 'FLOAT',
              value: { floatValue: localID * 4 }
            }
          }))
        }
      } as NodeChange,
      node('FRAME', 40, 1, {
        name: 'Row',
        stackMode: 'HORIZONTAL',
        stackSpacing: 8,
        variableConsumptionMap: {
          entries: [aliasEntry('STACK_SPACING', { assetRef: { key: 'gap-key' } })]
        }
      } as Partial<NodeChange>)
    ])

    const page = expectDefined(graph.getPages()[0], 'page')
    expect(page.variableModes).toEqual({ '1:20': '10:2' })
    const row = expectDefined(
      [...graph.getAllNodes()].find((n) => n.name === 'Row'),
      'Row frame'
    )
    expect(row.boundVariables.itemSpacing).toBe('1:30')
    expect(row.itemSpacing).toBe(8)
  })
})
