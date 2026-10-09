import { expect, test } from 'bun:test'

import { SceneGraph } from '@open-pencil/scene-graph'

import type { CommentAnchor } from '@/app/integrations/storage/github/comments/anchor'
import {
  anchorAt,
  arrangeComments,
  canvasToScreen,
  placeCommentPin,
  screenToCanvas
} from '@/app/integrations/storage/github/comments/pins'

function scene() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const other = graph.addPage('Other')
  const frame = graph.createNode('FRAME', page.id, {
    name: 'Card',
    x: 100,
    y: 50,
    width: 200,
    height: 100
  })
  const button = graph.createNode('RECTANGLE', frame.id, {
    name: 'Button',
    x: 20,
    y: 30,
    width: 40,
    height: 20
  })
  return { graph, page, other, frame, button }
}

function anchorFor(graph: SceneGraph, page: string, nodeId: string | null, x: number, y: number) {
  return anchorAt(graph, {
    doc: 'documents/a',
    page,
    nodeId,
    point: { x, y },
    branch: 'main',
    commit: ''
  })
}

test('an anchor stores the offset from its node, so the pin follows moves', () => {
  const { graph, page, frame, button } = scene()
  // The button sits at (120, 80) in absolute coordinates; the click is 5px inside it.
  const anchor = anchorFor(graph, page.id, button.id, 125, 85)
  expect(anchor).toMatchObject({ node: button.id, x: 125, y: 85, dx: 5, dy: 5 })

  graph.updateNode(frame.id, { x: 300, y: 250 })
  expect(placeCommentPin(graph, anchor)).toEqual({ point: { x: 325, y: 285 }, orphaned: false })
})

test('a deleted node falls back to the stored coordinates and is orphaned', () => {
  const { graph, page, button } = scene()
  const anchor = anchorFor(graph, page.id, button.id, 125, 85)
  graph.deleteNode(button.id)
  expect(placeCommentPin(graph, anchor)).toEqual({ point: { x: 125, y: 85 }, orphaned: true })
})

test('an empty-canvas comment uses its coordinates and is never orphaned', () => {
  const { graph, page } = scene()
  const anchor = anchorFor(graph, page.id, null, -10, 900)
  expect(anchor.node).toBeNull()
  expect(placeCommentPin(graph, anchor)).toEqual({ point: { x: -10, y: 900 }, orphaned: false })
})

test('screen mapping keeps pins at constant size: only the position scales', () => {
  const viewport = { panX: 40, panY: -20, zoom: 2 }
  const screen = canvasToScreen({ x: 125, y: 85 }, viewport)
  expect(screen).toEqual({ x: 290, y: 150 })
  expect(screenToCanvas(screen, viewport)).toEqual({ x: 125, y: 85 })
})

test('arranging splits threads into this page, orphaned and other pages', () => {
  const { graph, page, other, button } = scene()
  const onPage = { number: 1, anchor: anchorFor(graph, page.id, button.id, 125, 85) }
  const gone: { number: number; anchor: CommentAnchor | null } = {
    number: 2,
    anchor: { ...anchorFor(graph, page.id, null, 5, 5), node: 'missing:1' }
  }
  const elsewhere = { number: 3, anchor: anchorFor(graph, other.id, null, 0, 0) }
  const unreadable = { number: 4, anchor: null }
  const { pins, sections } = arrangeComments(graph, [onPage, gone, elsewhere, unreadable], page.id)
  expect(pins.map((pin) => [pin.thread.number, pin.orphaned])).toEqual([
    [1, false],
    [2, true]
  ])
  expect(sections.page.map((thread) => thread.number)).toEqual([1])
  expect(sections.orphaned.map((thread) => thread.number)).toEqual([2, 4])
  expect(sections.otherPages).toEqual([{ thread: elsewhere, pageName: 'Other' }])
})
