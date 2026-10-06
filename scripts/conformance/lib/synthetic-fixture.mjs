import { SceneGraph } from '@open-pencil/scene-graph'
import { BLACK } from '@open-pencil/scene-graph/constants'

/**
 * A scene graph that exercises every fact the bridge is supposed to carry, built in code
 * so the gate needs no binary fixture.
 *
 * The real `.fig` is 12.5MB of someone's design system: it cannot be committed, it takes
 * two minutes to parse, and it is not available to CI at all. This stands in for it —
 * deliberately broad rather than large, so one pass touches each node type, both paint
 * kinds, token bindings, component identity, variant metadata, vector geometry and the
 * typography that CSS cannot express.
 *
 * Add a case here whenever a new fact starts travelling; the gate then guards it forever.
 */
export function buildSyntheticFixture() {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]

  const theme = graph.createCollection('Theme')
  const primary = graph.createVariable('color/primary/default', 'COLOR', theme.id, {
    r: 0.123,
    g: 0.456,
    b: 0.789,
    a: 1
  })
  const gap = graph.createVariable('space/inline/md', 'FLOAT', theme.id, 12)
  const radius = graph.createVariable('radius/sm', 'FLOAT', theme.id, 4)

  // A component set with two variants, so variant metadata and component identity travel.
  const set = graph.createNode('COMPONENT_SET', page.id, {
    name: 'Button',
    width: 200,
    height: 100,
    variantPropSpecs: { Size: ['sm', 'lg'] }
  })

  for (const [index, size] of ['sm', 'lg'].entries()) {
    const component = graph.createNode('COMPONENT', set.id, {
      name: `Size=${size}`,
      x: 0,
      y: index * 50,
      width: 120,
      height: 40,
      layoutMode: 'HORIZONTAL',
      itemSpacing: 8,
      paddingLeft: 12,
      paddingRight: 12,
      counterAxisSizing: 'AUTO',
      primaryAxisSizing: 'AUTO',
      horizontalConstraint: 'STRETCH',
      topLeftRadius: 4,
      topRightRadius: 4,
      bottomLeftRadius: 4,
      bottomRightRadius: 4,
      independentCorners: false,
      // A float colour channel that 8-bit CSS rgb() cannot represent exactly.
      fills: [
        {
          type: 'SOLID',
          color: { r: 0.123, g: 0.456, b: 0.789, a: 1 },
          opacity: 1,
          visible: true
        }
      ],
      componentPropertyDefinitions: { label: { type: 'TEXT', defaultValue: 'Save' } }
    })
    graph.bindVariable(component.id, 'fills/0/color', primary.id)
    graph.bindVariable(component.id, 'itemSpacing', gap.id)
    graph.bindVariable(component.id, 'topLeftRadius', radius.id)

    graph.createNode('TEXT', component.id, {
      name: 'Label',
      text: size === 'sm' ? 'Save' : 'Save changes',
      width: 60,
      height: 20,
      fontSize: size === 'sm' ? 13 : 16,
      lineHeight: size === 'sm' ? 18 : 24,
      letterSpacing: 0.25,
      fontFamily: 'Inter',
      fontWeight: 600,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      textAlignVertical: 'CENTER',
      textTruncation: 'ENDING'
    })
  }

  // An instance, so componentId/componentKey and instance overrides travel.
  const instance = graph.createNode('INSTANCE', page.id, {
    name: 'Button instance',
    x: 300,
    y: 10,
    width: 120,
    height: 40,
    componentId: set.id,
    componentKey: 'published-key-1'
  })
  graph.bindVariable(instance.id, 'opacity', graph.createVariable('opacity/muted', 'FLOAT', theme.id, 0.5).id)

  // Gradient + multi-layer paint, per-layer flags, dashed stroke, blend mode, rotation.
  graph.createNode('FRAME', page.id, {
    name: 'Hero',
    x: 0,
    y: 200,
    width: 400,
    height: 200,
    rotation: 12,
    flipX: true,
    blendMode: 'MULTIPLY',
    clipsContent: true,
    fills: [
      {
        type: 'GRADIENT_LINEAR',
        color: { ...BLACK },
        opacity: 0.8,
        visible: true,
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 0.5 } }
        ]
      },
      { type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 0.25, visible: false }
    ],
    strokes: [
      {
        color: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
        weight: 2,
        opacity: 1,
        visible: true,
        align: 'OUTSIDE',
        dashPattern: [6, 3]
      }
    ],
    dashPattern: [6, 3],
    borderTopWeight: 5,
    borderRightWeight: 2,
    borderBottomWeight: 5,
    borderLeftWeight: 2,
    independentStrokeWeights: true,
    effects: [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.25 },
        offset: { x: 0, y: 2 },
        radius: 8,
        visible: true,
        spread: 0
      }
    ]
  })

  // Vector family — geometry that only SVG can show and only facts can preserve.
  graph.createNode('VECTOR', page.id, {
    name: 'Logo',
    x: 450,
    y: 200,
    width: 24,
    height: 24,
    fills: [{ type: 'SOLID', color: { ...BLACK }, opacity: 1, visible: true }],
    vectorNetwork: {
      vertices: [
        { x: 0, y: 0 },
        { x: 24, y: 0 },
        { x: 12, y: 24 }
      ],
      segments: [
        { start: 0, end: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 1, end: 2, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } },
        { start: 2, end: 0, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }
      ],
      regions: []
    }
  })

  graph.createNode('STAR', page.id, {
    name: 'Star',
    x: 500,
    y: 200,
    width: 20,
    height: 20,
    pointCount: 7,
    starInnerRadius: 0.5
  })

  graph.createNode('ELLIPSE', page.id, {
    name: 'Pie',
    x: 540,
    y: 200,
    width: 30,
    height: 30,
    arcData: { startingAngle: 0, endingAngle: 3.14, innerRadius: 0.4 }
  })

  graph.createNode('GROUP', page.id, { name: 'Cluster', x: 600, y: 200, width: 50, height: 50 })

  graph.createNode('ROUNDED_RECTANGLE', page.id, {
    name: 'Masked',
    x: 660,
    y: 200,
    width: 40,
    height: 40,
    isMask: true,
    maskType: 'LUMINANCE',
    cornerRadius: 6,
    locked: true
  })

  return graph
}
