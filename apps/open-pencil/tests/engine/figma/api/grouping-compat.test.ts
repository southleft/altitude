import { describe, expect, test } from 'bun:test'

import { createAPI } from './helpers'

describe('FigmaAPI grouping compatibility', () => {
  test('group accepts parent and index and returns a group node', () => {
    const api = createAPI()
    const page = api.currentPage
    const before = api.createRectangle()
    const first = api.createRectangle()
    const second = api.createRectangle()

    const group = api.group([first, second], page, 1)

    expect(group.type).toBe('GROUP')
    expect(group.children.map((child) => child.id)).toEqual([first.id, second.id])
    expect(page.children.map((child) => child.id)).toEqual([before.id, group.id])
  })

  test('ungroup returns moved children', () => {
    const api = createAPI()
    const page = api.currentPage
    const first = api.createRectangle()
    const second = api.createRectangle()
    const group = api.group([first, second], page)

    const children = api.ungroup(group)

    expect(children.map((child) => child.id)).toEqual([first.id, second.id])
    expect(api.getNodeById(group.id)).toBeNull()
    expect(page.children.map((child) => child.id)).toEqual([first.id, second.id])
  })

  test('flatten accepts proxy nodes and optional parent/index', () => {
    const api = createAPI()
    const page = api.currentPage
    const before = api.createRectangle()
    const first = api.createRectangle()
    const second = api.createRectangle()

    const vector = api.flatten([first, second], page, 1)

    expect(vector.type).toBe('VECTOR')
    expect(api.getNodeById(first.id)).toBeNull()
    expect(api.getNodeById(second.id)).toBeNull()
    expect(page.children.map((child) => child.id)).toEqual([before.id, vector.id])
  })

  test('boolean wrappers create boolean operation containers', () => {
    const api = createAPI()
    const page = api.currentPage
    const before = api.createRectangle()
    const first = api.createRectangle()
    const second = api.createRectangle()

    const booleanNode = api.union([first, second], page, 1)

    expect(booleanNode.type).toBe('BOOLEAN_OPERATION')
    expect(booleanNode.children.map((child) => child.id)).toEqual([first.id, second.id])
    expect(page.children.map((child) => child.id)).toEqual([before.id, booleanNode.id])
  })
})
