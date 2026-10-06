import { SceneGraph } from '@open-pencil/scene-graph'

/**
 * Design-fact carrier fixtures.
 *
 * These tests exist because a source-level scan claimed the bridge covered properties it was
 * silently destroying. Measured on a real design system, 17,196 token bindings went in and 0
 * came out, and every node type flattened to FRAME. Each test pins one fact that used to be
 * lost, so a regression fails in milliseconds instead of months later in a 98,645-node file.
 */

/** A graph with one themed button-ish frame containing a text node. */
export function fixture() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]

  const collection = graph.createCollection('Theme')
  const primary = graph.createVariable('color/primary/default', 'COLOR', collection.id, {
    r: 0.2,
    g: 0.4,
    b: 0.9,
    a: 1
  })
  const gap = graph.createVariable('space/inline/md', 'FLOAT', collection.id, 12)

  const frame = graph.createNode('INSTANCE', page.id, {
    name: 'Button',
    width: 120,
    height: 40,
    layoutMode: 'HORIZONTAL',
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9, a: 1 }, visible: true, opacity: 1 }],
    componentId: 'component-42',
    componentKey: 'key-42'
  })
  graph.bindVariable(frame.id, 'fills/0/color', primary.id)
  graph.bindVariable(frame.id, 'itemSpacing', gap.id)

  const label = graph.createNode('TEXT', frame.id, {
    name: 'Label',
    text: 'Save',
    width: 40,
    height: 20
  })

  return { graph, page, frame, label, collection, primary, gap }
}
