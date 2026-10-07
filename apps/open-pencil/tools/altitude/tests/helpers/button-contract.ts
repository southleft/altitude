import type { CodeContract } from '#altitude/library/contract'

import { SceneGraph } from '@open-pencil/scene-graph'

const token = (name: string) => ({ code: `--al-${name.replace(/\//g, '-')}`, figma: name })

/** A small Button-shaped code contract exercising every planning rule the builder applies. */
export function buttonContract(): CodeContract {
  return {
    id: 'al-button',
    name: 'Button',
    props: [
      {
        name: 'variant',
        type: 'enum',
        values: ['primary', 'secondary'],
        bindings: {
          code: { attribute: 'variant' },
          figma: { kind: 'VARIANT', property: 'Variant', options: ['Primary', 'Secondary'] }
        }
      },
      {
        name: 'size',
        type: 'enum',
        values: ['md', 'sm'],
        bindings: {
          code: { attribute: 'size' },
          figma: { kind: 'VARIANT', property: 'Size', options: ['Md', 'Sm'] }
        }
      },
      {
        name: 'isDisabled',
        type: 'boolean',
        bindings: {
          code: { attribute: 'isDisabled' },
          figma: {
            kind: 'VARIANT',
            property: 'State',
            options: ['Default', 'Disabled'],
            pairWith: 'State'
          }
        }
      },
      {
        name: 'href',
        type: 'string',
        bindings: { code: { attribute: 'href' }, figma: { omit: true } }
      },
      { name: 'label', type: 'string', bindings: { code: { attribute: 'label' }, figma: null } },
      { name: 'type', type: 'enum', values: ['button', 'submit'], bindings: { figma: null } }
    ],
    slots: [{ name: '' }, { name: 'before', figmaPlaceholder: 'check-circle' }],
    events: [],
    states: ['hover', 'disabled'],
    anatomySource: 'measured',
    anatomyCase: 'Variant=default,Size=default',
    anatomy: {
      root: {
        tag: 'button',
        cls: 'al-c-button',
        layout: { display: 'inline-flex', direction: 'row', align: 'center', justify: 'center' },
        tokens: {
          'background-color': token('theme/color/background/primary'),
          'border-radius': token('theme/border/radius'),
          gap: token('theme/space/xs'),
          'padding-left': token('theme/space/md'),
          'padding-right': token('theme/space/md'),
          color: token('theme/color/content/inverse')
        },
        children: [
          {
            tag: 'span',
            cls: 'al-c-button__text',
            text: 'Button',
            fsPx: 14,
            tokens: { color: token('theme/color/content/inverse') }
          }
        ]
      },
      stateOverrides: {
        hover: { '0': { 'background-color': token('theme/color/background/primary-strong') } }
      }
    },
    conditionalBindings: {
      variant: {
        secondary: {
          'background-color': token('theme/color/background/secondary'),
          color: token('theme/color/content/neutral')
        }
      },
      state: { disabled: { opacity: token('theme/opacity/disabled') } }
    },
    bindings: {
      code: {
        tagName: 'al-button',
        importPath: '@southleft/al-web-components/components/button/button.ts',
        workspace: '@southleft/al-web-components'
      }
    }
  }
}

export const FIXTURE_COLORS: Record<string, [number, number, number]> = {
  'theme/color/background/primary': [0.1, 0.3, 0.9],
  'theme/color/background/primary-strong': [0.05, 0.2, 0.7],
  'theme/color/background/secondary': [0.9, 0.9, 0.95],
  'theme/color/content/inverse': [1, 1, 1],
  'theme/color/content/neutral': [0.1, 0.1, 0.1]
}

export const FIXTURE_NUMBERS: Record<string, number> = {
  'theme/border/radius': 6,
  'theme/space/xs': 4,
  'theme/space/md': 16,
  'theme/opacity/disabled': 0.4
}

/** A graph whose variables carry the fixture's token names, one collection, one mode. */
export function fixtureGraph(): SceneGraph {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Theme')
  for (const [name, [r, g, b]] of Object.entries(FIXTURE_COLORS)) {
    graph.createVariable(name, 'COLOR', collection.id, { r, g, b, a: 1 })
  }
  for (const [name, value] of Object.entries(FIXTURE_NUMBERS)) {
    graph.createVariable(name, 'FLOAT', collection.id, value)
  }
  return graph
}
