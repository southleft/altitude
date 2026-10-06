import { importDesignTokens } from '@open-pencil/core/io/formats/dtcg'
import { SceneGraph, type SceneNode } from '@open-pencil/scene-graph'

/**
 * A compact copy of Altitude's motion tokens: tier-1 primitives, the semantic easing, and
 * the motion axis (full / reduced / expressive) whose role tokens are CSS-omitted in `full`.
 */
const AXIS_INITIAL = { 'org.altitude.axis': { css: 'initial' } }

function motionMode(mode: 'full' | 'reduced' | 'expressive') {
  const roleDuration = {
    full: {
      fast: '{theme.animation.duration.@}',
      base: '{theme.animation.duration.@}',
      slow: '{theme.animation.duration.long}'
    },
    reduced: { fast: '0s', base: '0s', slow: '0s' },
    expressive: {
      fast: '{animation.duration.3}',
      base: '{animation.duration.6}',
      slow: '{animation.duration.8}'
    }
  }[mode]
  const easing = mode === 'expressive' ? '{animation.timing.spring}' : '{theme.animation.timing.@}'
  const omit = mode === 'expressive' ? undefined : AXIS_INITIAL
  const role = (value: string, type: string, extensions?: object) => ({
    $value: value,
    $type: type,
    ...(extensions ? { $extensions: extensions } : {})
  })
  return {
    theme: {
      animation: {
        duration: {
          '@': role(mode === 'reduced' ? '0s' : '{animation.duration.2}', 'duration'),
          long: role(mode === 'reduced' ? '0s' : '{animation.duration.4}', 'duration'),
          role: {
            fast: role(roleDuration.fast, 'duration', mode === 'full' ? AXIS_INITIAL : undefined),
            base: role(roleDuration.base, 'duration', mode === 'full' ? AXIS_INITIAL : undefined),
            slow: role(roleDuration.slow, 'duration', mode === 'full' ? AXIS_INITIAL : undefined)
          }
        },
        timing: {
          role: {
            standard: role(easing, 'cubicBezier', omit),
            emphasized: role(easing, 'cubicBezier', omit)
          }
        },
        transition: {
          hover: {
            $type: 'transition',
            $value: {
              duration: '{theme.animation.duration.role.fast}',
              delay: '0s',
              timingFunction: '{theme.animation.timing.role.standard}'
            },
            $extensions: { 'org.altitude.axis': { css: 'omit' } }
          }
        }
      }
    }
  }
}

export function motionTokenFiles(): Record<string, unknown> {
  return {
    'tier-1/animations.json': {
      animation: {
        duration: {
          $type: 'duration',
          2: { $value: '0.2s' },
          3: { $value: '0.3s' },
          4: { $value: '0.4s' },
          6: { $value: '0.6s' },
          8: { $value: '0.8s' }
        },
        timing: {
          $type: 'cubicBezier',
          'cubic-bezier': { $value: [0.15, 0.99, 0.18, 0.99] },
          spring: { $value: [0.34, 1.56, 0.64, 1] }
        }
      }
    },
    'tier-2/animations.json': {
      theme: {
        animation: {
          timing: { '@': { $type: 'cubicBezier', $value: '{animation.timing.cubic-bezier}' } }
        }
      }
    },
    'tier-2/axis/motion/full.json': motionMode('full'),
    'tier-2/axis/motion/reduced.json': motionMode('reduced'),
    'tier-2/axis/motion/expressive.json': motionMode('expressive')
  }
}

export const motionMapping = {
  name: 'motion-fixture',
  layers: [
    { files: ['tier-1/*.json', 'tier-2/*.json'] },
    { files: ['tier-2/axis/motion/{motion}.json'] }
  ],
  axes: [{ name: 'motion', modes: ['full', 'reduced', 'expressive'], default: 'full' }],
  collections: [
    { name: 'Primitive', files: ['tier-1/**'] },
    { name: 'Semantic', files: ['tier-2/*.json'] },
    { name: 'Motion', axes: ['motion'] }
  ],
  cssVar: { prefix: 'al', dropSegments: ['@'] },
  omitFromCSSWhen: { extension: 'org.altitude.axis', property: 'css', values: ['initial', 'omit'] }
}

export function motionGraph(): SceneGraph {
  const graph = new SceneGraph()
  importDesignTokens(graph, motionTokenFiles(), motionMapping)
  return graph
}

export function motionCollection(graph: SceneGraph) {
  const collection = [...graph.variableCollections.values()].find((c) => c.name === 'Motion')
  if (!collection) throw new Error('Motion collection missing')
  return collection
}

export function modeId(graph: SceneGraph, name: string): string {
  const mode = motionCollection(graph).modes.find((m) => m.name.toLowerCase() === name)
  if (!mode) throw new Error(`Mode ${name} missing`)
  return mode.modeId
}

/** A Button set with Default and Hover variants, each with a Label text child. */
export function buttonSet(graph: SceneGraph) {
  const pageId = graph.getPages()[0]?.id ?? graph.rootId
  const set = graph.createNode('COMPONENT_SET', pageId, {
    name: 'Button',
    componentPropertyDefinitions: [
      {
        id: 'variant:state',
        name: 'State',
        type: 'VARIANT',
        defaultValue: 'Default',
        variantOptions: ['Default', 'Hover']
      }
    ]
  })
  const variant = (state: string, color: { r: number; g: number; b: number }, radius: number) => {
    const node = graph.createNode('COMPONENT', set.id, {
      name: `State=${state}`,
      width: 120,
      height: 40,
      cornerRadius: radius,
      fills: [{ type: 'SOLID', color: { ...color, a: 1 }, opacity: 1, visible: true }],
      componentPropertyValues: { State: state }
    })
    graph.createNode('TEXT', node.id, {
      name: 'Label',
      text: 'Go',
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }]
    })
    return node
  }
  const base = variant('Default', { r: 0, g: 0, b: 1 }, 4)
  const hover = variant('Hover', { r: 1, g: 0, b: 0 }, 8)
  const instance = graph.createInstance(base.id, pageId) as SceneNode
  return { set, base, hover, instance, pageId }
}
