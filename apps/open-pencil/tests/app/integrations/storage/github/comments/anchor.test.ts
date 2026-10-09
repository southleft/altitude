import { describe, expect, test } from 'bun:test'

import {
  anchorBlock,
  commentBody,
  commentTitle,
  documentLabel,
  parseAnchor,
  stripAnchor,
  type CommentAnchor
} from '@/app/integrations/storage/github/comments/anchor'

const anchor: CommentAnchor = {
  doc: 'documents/landing-page',
  page: '0:1',
  node: '12:34',
  x: 120.5,
  y: -40,
  dx: 8,
  dy: 4,
  branch: 'design/hero',
  commit: 'a'.repeat(40)
}

describe('anchor block', () => {
  test('round-trips through an issue body', () => {
    const body = commentBody({
      text: 'Tighten the spacing\nunder the title',
      anchor,
      pageName: 'Cover',
      nodeName: 'Hero',
      pullRequest: 12
    })
    expect(body).toContain('Related to #12')
    expect(body).toContain('<!-- openpencil:anchor {')
    expect(parseAnchor(body)).toEqual(anchor)
    expect(stripAnchor(body)).not.toContain('openpencil:anchor')
    expect(stripAnchor(body).startsWith('Tighten the spacing')).toBe(true)
  })

  test('escapes sequences that could end the HTML comment early', () => {
    const tricky = { ...anchor, branch: 'design/a-->b<script>' }
    const block = anchorBlock(tricky)
    expect(block.indexOf('-->')).toBe(block.length - 3)
    expect(block).not.toContain('<script>')
    expect(parseAnchor(`text\n\n${block}`)).toEqual(tricky)
  })

  test('the last block wins', () => {
    const first = anchorBlock({ ...anchor, x: 1 })
    const last = anchorBlock({ ...anchor, x: 2 })
    expect(parseAnchor(`${first}\n${last}`)?.x).toBe(2)
  })

  test.each([
    ['no block', 'Just a comment'],
    ['malformed JSON', '<!-- openpencil:anchor {"doc": -->'],
    ['wrong types', '<!-- openpencil:anchor {"doc":"d","page":"p","x":"1","y":2} -->'],
    ['missing doc', '<!-- openpencil:anchor {"page":"p","x":1,"y":2} -->'],
    ['infinite coordinate', '<!-- openpencil:anchor {"doc":"d","page":"p","x":1e400,"y":2} -->'],
    ['huge coordinate', '<!-- openpencil:anchor {"doc":"d","page":"p","x":1e12,"y":2} -->'],
    [
      'markup in ids',
      '<!-- openpencil:anchor {"doc":"d","page":"p\\" onload=\\"x","x":1,"y":2} -->'
    ],
    [
      'non-hex commit',
      '<!-- openpencil:anchor {"doc":"d","page":"p","x":1,"y":2,"commit":"zz"} -->'
    ],
    ['prototype pollution', '<!-- openpencil:anchor {"__proto__":{"x":1},"page":"p","y":2} -->']
  ])('ignores a hostile or malformed body: %s', (_name, body) => {
    expect(parseAnchor(body)).toBeNull()
  })

  test('ignores oversized bodies without scanning them', () => {
    const huge = `${'x'.repeat(70_000)}${anchorBlock(anchor)}`
    expect(parseAnchor(huge)).toBeNull()
  })

  test('fills optional fields with defaults', () => {
    expect(parseAnchor('<!-- openpencil:anchor {"doc":"d","page":"p","x":1,"y":2} -->')).toEqual({
      doc: 'd',
      page: 'p',
      node: null,
      x: 1,
      y: 2,
      dx: 0,
      dy: 0,
      branch: '',
      commit: ''
    })
  })
})

describe('titles and labels', () => {
  test('the title is the first non-empty line, truncated', () => {
    expect(commentTitle('\n  Fix the logo  \nmore', 'Design comment')).toBe('Fix the logo')
    expect(commentTitle('   ', 'Design comment')).toBe('Design comment')
    const long = commentTitle('a'.repeat(200), 'x')
    expect(long.length).toBe(80)
    expect(long.endsWith('…')).toBe(true)
  })

  test('document labels stay within GitHub’s 50 characters', () => {
    expect(documentLabel('landing-page')).toBe('doc:landing-page')
    expect(documentLabel('x'.repeat(80))).toHaveLength(50)
  })
})
