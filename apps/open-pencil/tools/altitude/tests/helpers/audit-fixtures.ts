import { createAltitudeFacts, literalOptions, type AltitudeFacts } from '#altitude/audit/facts'

import { SceneGraph, type Color, type SceneNode } from '@open-pencil/scene-graph'

export const hex = (value: string): Color => ({
  r: Number.parseInt(value.slice(1, 3), 16) / 255,
  g: Number.parseInt(value.slice(3, 5), 16) / 255,
  b: Number.parseInt(value.slice(5, 7), 16) / 255,
  a: 1
})

export const solid = (value: string) => [
  { type: 'SOLID' as const, color: hex(value), opacity: 1, visible: true }
]

/** A few Altitude-shaped tokens, a Button contract and its CEM attributes. */
export function syntheticFacts(): AltitudeFacts {
  const variables = new SceneGraph()
  const collection = variables.createCollection('Tokens')
  const add = (
    name: string,
    type: 'COLOR' | 'FLOAT' | 'STRING',
    value: Color | number | string
  ) => {
    const variable = variables.createVariable(name, type, collection.id, value)
    variable.codeSyntax = { WEB: `var(--al-${name.replace(/\//g, '-')})` }
    return variable
  }
  add('theme/color/background/primary-default', 'COLOR', hex('#2e5ce6'))
  add('color/primary/500', 'COLOR', hex('#2e5ce6'))
  add('theme/color/content/neutral-default', 'COLOR', hex('#1d1d1a'))
  add('theme/space/md', 'FLOAT', 12)
  add('theme/border/radius/md', 'FLOAT', 8)
  add('typography/font-size/16', 'FLOAT', 16)
  add('typography/line-height/24', 'FLOAT', 24)
  add('typography/font-family/primary', 'STRING', '"Public Sans", sans-serif')
  return createAltitudeFacts({
    root: '/altitude',
    variables,
    contracts: new Map([['al-button', { id: 'al-button', name: 'Button' }]]),
    attributes: new Map([
      [
        'al-button',
        new Map([
          ['size', { name: 'size', type: "'sm' | 'md'", values: literalOptions("'sm' | 'md'") }],
          ['isPill', { name: 'isPill', type: 'boolean', values: null }]
        ])
      ]
    ])
  })
}

/** A code-bound Button set (Size Md/Lg; Lg maps to an attribute value the CEM lacks). */
export function buttonSet(graph: SceneGraph, parentId: string) {
  const set = graph.createNode('COMPONENT_SET', parentId, {
    name: 'Button',
    componentPropertyDefinitions: [
      {
        id: 'size',
        name: 'Size',
        type: 'VARIANT',
        defaultValue: 'Md',
        variantOptions: ['Md', 'Lg']
      }
    ],
    codeBinding: {
      tagName: 'al-button',
      props: [
        { property: 'Size', attribute: 'size', type: 'enum', values: { Md: 'md', Lg: 'xl' } }
      ],
      slots: []
    }
  })
  const variant = (size: string): SceneNode =>
    graph.createNode('COMPONENT', set.id, {
      name: `Size=${size}`,
      width: 80,
      height: 32,
      componentPropertyValues: { Size: size }
    })
  return { set, md: variant('Md'), lg: variant('Lg') }
}
