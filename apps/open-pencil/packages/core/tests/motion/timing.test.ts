import { describe, expect, test } from 'bun:test'

import {
  findMotionRoleVariable,
  motionSpecForStates,
  motionSpecTransitionCSS,
  resolveMotionTiming,
  sampleMotion
} from '@open-pencil/core/motion'
import {
  MOTION_SPEC_VERSION,
  motionPluginData,
  type MotionSpec,
  type MotionTransition
} from '@open-pencil/scene-graph'

import { buttonSet, modeId, motionCollection, motionGraph } from './fixtures'

const hover: MotionTransition = {
  id: 'hover',
  trigger: 'hover',
  use: 'hover',
  properties: ['background-color']
}

describe('motion timing resolution', () => {
  test('finds role tokens by their DTCG path', () => {
    const graph = motionGraph()
    expect(findMotionRoleVariable(graph, 'duration', 'fast')?.name).toBe(
      'theme/animation/duration/role/fast'
    )
    expect(findMotionRoleVariable(graph, 'easing', 'emphasized')?.type).toBe('STRING')
  })

  test('resolves per Motion mode: full, reduced (instant) and expressive (spring)', () => {
    const graph = motionGraph()
    const collection = motionCollection(graph)
    const at = (mode: string) =>
      resolveMotionTiming(graph, hover, { modes: { [collection.id]: modeId(graph, mode) } })

    expect(at('full')).toMatchObject({ durationMs: 200, easing: [0.15, 0.99, 0.18, 0.99] })
    expect(at('reduced').durationMs).toBe(0)
    expect(at('expressive')).toMatchObject({ durationMs: 300, easing: [0.34, 1.56, 0.64, 1] })
    expect(
      resolveMotionTiming(
        graph,
        { ...hover, use: 'overlay' },
        {
          modes: { [collection.id]: modeId(graph, 'expressive') }
        }
      ).durationMs
    ).toBe(800)
  })

  test('follows the active mode when no context is given', () => {
    const graph = motionGraph()
    const collection = motionCollection(graph)
    graph.setActiveMode(collection.id, modeId(graph, 'reduced'))
    expect(resolveMotionTiming(graph, hover).durationMs).toBe(0)
  })

  test('explicit timing wins over the use case and composites are never read', () => {
    const graph = motionGraph()
    expect(
      resolveMotionTiming(graph, { ...hover, duration: { ms: 120 }, easing: { keyword: 'linear' } })
    ).toMatchObject({ durationMs: 120, easing: [0, 0, 1, 1] })
    const composite = [...graph.variables.values()].find((v) => v.name.endsWith('transition/hover'))
    if (!composite) throw new Error('composite missing')
    expect(
      resolveMotionTiming(graph, { ...hover, duration: { variableId: composite.id } }).durationMs
    ).toBe(200)
  })

  test('falls back to built-in full-mode values without tokens', () => {
    const graph = motionGraph()
    for (const id of [...graph.variables.keys()]) graph.removeVariable(id)
    expect(resolveMotionTiming(graph, { ...hover, use: 'overlay' }).durationMs).toBe(400)
  })
})

describe('motion CSS', () => {
  test("emits Altitude's role-with-fallback pattern, never the composite", () => {
    const graph = motionGraph()
    const spec: MotionSpec = {
      version: MOTION_SPEC_VERSION,
      transitions: [
        { ...hover, properties: ['background-color', 'color'] },
        { id: 'overlay', trigger: 'enter', use: 'overlay', properties: ['opacity'] },
        { id: 'emphasis', trigger: 'variant-change', use: 'emphasis', properties: ['color'] }
      ]
    }
    const css = motionSpecTransitionCSS(graph, spec)
    expect(css).toBe(
      [
        'background-color var(--al-theme-animation-duration-role-fast, var(--al-theme-animation-duration)) var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing))',
        'color var(--al-theme-animation-duration-role-fast, var(--al-theme-animation-duration)) var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing))',
        'opacity var(--al-theme-animation-duration-role-slow, var(--al-theme-animation-duration-long)) var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing))'
      ].join(', ')
    )
    expect(css).not.toContain('transition-hover')
  })

  test('writes literal timing for explicit values and delays', () => {
    const graph = motionGraph()
    const css = motionSpecTransitionCSS(graph, {
      version: MOTION_SPEC_VERSION,
      transitions: [
        {
          ...hover,
          properties: ['opacity'],
          duration: { ms: 150 },
          easing: { cubicBezier: [0.2, 0, 0, 1] },
          delay: 50
        }
      ]
    })
    expect(css).toBe('opacity 150ms cubic-bezier(0.2, 0, 0, 1) 50ms')
  })
})

describe('defaults from states', () => {
  test('maps hover / active / focus to the hover use case and overlays to overlay', () => {
    const spec = motionSpecForStates({
      states: ['hover', 'focus', 'disabled'],
      properties: { hover: ['background-color', 'color'] }
    })
    expect(spec?.transitions.map((t) => [t.trigger, t.use, t.properties])).toEqual([
      ['hover', 'hover', ['background-color', 'color']],
      ['focus', 'hover', ['box-shadow', 'border-color']]
    ])
    const overlay = motionSpecForStates({ states: ['focus'], kind: 'overlay' })
    expect(overlay?.transitions.map((t) => `${t.trigger}:${t.use}`)).toEqual([
      'focus:hover',
      'enter:overlay',
      'exit:overlay'
    ])
    expect(motionSpecForStates({ states: ['disabled'] })).toBeNull()
  })
})

describe('headless sampling', () => {
  test('samples a hover between variants and goes instant in reduced mode', () => {
    const graph = motionGraph()
    const { set, instance } = buttonSet(graph)
    graph.updateNode(set.id, {
      pluginData: motionPluginData(set, { version: MOTION_SPEC_VERSION, transitions: [hover] })
    })
    const sample = sampleMotion(graph, instance.id, 'hover', { samples: 3 })
    if ('error' in sample) throw new Error(sample.error)
    expect(sample.toVariant.name).toBe('State=Hover')
    expect(sample.timing.durationMs).toBe(200)
    expect(sample.frames.map((frame) => frame.time)).toEqual([0, 100, 200])
    const root = (index: number) => sample.frames[index].nodes.find((n) => n.nodeId === instance.id)
    expect(root(0)?.values.fills?.[0].color).toMatchObject({ r: 0, b: 1 })
    expect(root(2)?.values.fills?.[0].color).toMatchObject({ r: 1, b: 0 })
    // corner radius is not transitioned: it jumps on the first frame.
    expect(root(0)?.values.cornerRadius).toBe(8)

    const collection = motionCollection(graph)
    graph.setActiveMode(collection.id, modeId(graph, 'reduced'))
    const reduced = sampleMotion(graph, instance.id, 'hover')
    if ('error' in reduced) throw new Error(reduced.error)
    expect(reduced.instant).toBe(true)
    expect(reduced.frames).toHaveLength(1)
  })
})
