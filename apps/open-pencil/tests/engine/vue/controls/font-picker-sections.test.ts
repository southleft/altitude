import { describe, expect, test } from 'bun:test'

import { groupFontOptions } from '@open-pencil/vue'

const options = [
  { family: 'Agrandir', source: 'team' as const },
  { family: 'Inter', source: 'bundled' as const },
  { family: 'Public Sans', source: 'fontsource' as const },
  { family: 'Sora', source: 'team' as const }
]

describe('groupFontOptions', () => {
  test('pins section families first and marks where each group starts', () => {
    const grouped = groupFontOptions(
      options,
      [{ source: 'team', label: 'Team fonts' }],
      'All fonts'
    )
    expect(grouped.options.map((option) => option.family)).toEqual([
      'Agrandir',
      'Sora',
      'Inter',
      'Public Sans'
    ])
    expect([...grouped.headings]).toEqual([
      [0, 'Team fonts'],
      [2, 'All fonts']
    ])
  })

  test('shows no headings without sections or matching families', () => {
    expect(groupFontOptions(options).headings.size).toBe(0)
    const noTeam = groupFontOptions(
      options.filter((option) => option.source !== 'team'),
      [{ source: 'team', label: 'Team fonts' }],
      'All fonts'
    )
    expect(noTeam.headings.size).toBe(0)
    expect(noTeam.options).toHaveLength(2)
  })
})
