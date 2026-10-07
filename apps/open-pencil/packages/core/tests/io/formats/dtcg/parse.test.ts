import { describe, expect, test } from 'bun:test'

import { parseTokenDocument, planTokenImport, type TokenIssue } from '@open-pencil/core/io/formats/dtcg'

describe('DTCG parsing', () => {
  test('groups pass $type and $deprecated to descendants; tokens may override', () => {
    const issues: TokenIssue[] = []
    const tokens = parseTokenDocument(
      'tokens.json',
      {
        space: {
          $type: 'dimension',
          $deprecated: 'use size',
          sm: { $value: '4px' },
          ratio: { $value: 1.5, $type: 'number', $deprecated: false }
        }
      },
      issues
    )
    expect(issues).toEqual([])
    expect(tokens.map((t) => [t.key, t.type, t.deprecated])).toEqual([
      ['space.sm', 'dimension', 'use size'],
      ['space.ratio', 'number', false]
    ])
  })

  test('$root is the group default token', () => {
    const tokens = parseTokenDocument(
      'tokens.json',
      { radius: { $type: 'dimension', $root: { $value: '4px' }, lg: { $value: '8px' } } },
      []
    )
    expect(tokens.map((t) => t.key)).toEqual(['radius.$root', 'radius.lg'])
  })

  test('reports reserved characters, $extends and $ref instead of guessing', () => {
    const issues: TokenIssue[] = []
    parseTokenDocument(
      'tokens.json',
      {
        'bad.name': { $value: '#fff', $type: 'color' },
        group: { $extends: '{other}', a: { $value: 1, $type: 'number' } },
        pointer: { $value: { $ref: '#/group/a/$value' }, $type: 'number' }
      },
      issues
    )
    expect(issues.map((issue) => issue.code)).toEqual([
      'invalid-name',
      'unsupported-feature',
      'unsupported-feature'
    ])
  })

  test('a non-object file is a named invalid document', () => {
    const plan = planTokenImport({ 'broken.json': [1, 2, 3] })
    expect(plan.issues).toContainEqual(expect.objectContaining({ code: 'invalid-document', file: 'broken.json' }))
    expect(plan.stats.variables).toBe(0)
  })

  test('aliases to groups resolve through $root', () => {
    const plan = planTokenImport({
      'tokens.json': {
        radius: { $type: 'dimension', $root: { $value: '4px' } },
        button: { $type: 'dimension', radius: { $value: '{radius}' } }
      }
    })
    const button = plan.collections[0].variables.find((v) => v.key === 'button.radius')
    expect(button?.valuesByMode.Default).toEqual({ aliasId: 'dtcg:tokens:radius.$root' })
  })
})
