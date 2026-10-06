import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@open-pencil/core'
import { ALL_TOOLS, isAtomicTool } from '@open-pencil/core/tools'
import { readMotionSpec } from '@open-pencil/scene-graph'

import { buttonSet, motionGraph } from './fixtures'

function tool(name: string) {
  const found = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!found) throw new Error(`tool ${name} missing`)
  return found
}

function setup() {
  const graph = motionGraph()
  const fixture = buttonSet(graph)
  return { graph, figma: new FigmaAPI(graph), ...fixture }
}

type Result = Record<string, unknown> & { error?: string }

describe('motion tools', () => {
  test('declare their contracts: set is an atomic property edit, read and preview mutate nothing', () => {
    expect(isAtomicTool(tool('set_motion'))).toBe(true)
    expect(tool('get_motion').mutates).toBe(false)
    expect(tool('preview_motion').mutates).toBe(false)
    expect(() => tool('set_motion').execute(new FigmaAPI(motionGraph()), { id: 'x' })).toThrow()
    expect(() =>
      tool('set_motion').execute(new FigmaAPI(motionGraph()), {
        id: 'x',
        transitions: [{ trigger: 'wiggle' }]
      })
    ).toThrow()
  })

  test('set_motion stores a use-case transition and reports its CSS', () => {
    const { graph, figma, set, instance } = setup()
    const result = tool('set_motion').execute(figma, {
      id: set.id,
      transitions: [{ trigger: 'hover', use: 'hover', properties: ['background-color'] }]
    }) as Result
    expect(result.error).toBeUndefined()
    expect(result.css).toBe(
      'background-color var(--al-theme-animation-duration-role-fast, var(--al-theme-animation-duration)) var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing))'
    )
    expect(readMotionSpec(graph.getNode(set.id) ?? set)?.transitions[0]?.use).toBe('hover')

    const read = tool('get_motion').execute(figma, { id: instance.id }) as Result
    expect(read.ownerId).toBe(set.id)
    expect(read.variants).toEqual({ State: ['Default', 'Hover'] })
    expect(
      (read.transitions as Array<{ resolved: { durationMs: number } }>)[0].resolved.durationMs
    ).toBe(200)
  })

  test('a transition composite becomes its use case and is rejected as a duration', () => {
    const { figma, set } = setup()
    const asUse = tool('set_motion').execute(figma, {
      id: set.id,
      transitions: [{ trigger: 'hover', use: 'theme/animation/transition/hover' }]
    }) as Result
    expect(asUse.error).toBeUndefined()
    expect(String(asUse.css)).not.toContain('transition-hover')
    const asDuration = tool('set_motion').execute(figma, {
      id: set.id,
      transitions: [{ trigger: 'hover', duration: 'theme/animation/transition/hover' }]
    }) as Result
    expect(asDuration.error).toContain('composite')
  })

  test('explicit overrides accept literals and CSS custom property names; merge keeps others', () => {
    const { graph, figma, set } = setup()
    tool('set_motion').execute(figma, {
      id: set.id,
      transitions: [{ trigger: 'hover', use: 'hover' }]
    })
    const merged = tool('set_motion').execute(figma, {
      id: set.id,
      mode: 'merge',
      transitions: [
        {
          trigger: 'press',
          duration: '--al-theme-animation-duration-role-slow',
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
          delay: 20
        }
      ]
    }) as Result
    expect(merged.error).toBeUndefined()
    const spec = readMotionSpec(graph.getNode(set.id) ?? set)
    expect(spec?.transitions.map((t) => t.id)).toEqual(['hover', 'press'])
    expect(spec?.transitions[1]).toMatchObject({
      easing: { cubicBezier: [0.2, 0, 0, 1] },
      delay: 20
    })
    expect(
      (
        tool('set_motion').execute(figma, {
          id: set.id,
          transitions: [{ trigger: 'hover', duration: '0.15s' }]
        }) as Result
      ).css
    ).toContain('150ms')
    expect(
      (tool('set_motion').execute(figma, { id: set.id, transitions: [] }) as Result).css
    ).toBeNull()
    expect(readMotionSpec(graph.getNode(set.id) ?? set)).toBeNull()
  })

  test('preview_motion samples frames and honours the reduced Motion mode', () => {
    const { figma, set, instance } = setup()
    tool('set_motion').execute(figma, {
      id: set.id,
      transitions: [{ trigger: 'hover', use: 'hover', properties: ['background-color'] }]
    })
    const full = tool('preview_motion').execute(figma, {
      id: instance.id,
      trigger: 'hover',
      samples: 3
    }) as Result & { frames: unknown[]; timing: { durationMs: number } }
    expect(full.timing.durationMs).toBe(200)
    expect(full.frames).toHaveLength(3)
    const reduced = tool('preview_motion').execute(figma, {
      id: instance.id,
      trigger: 'hover',
      motion_mode: 'Reduced'
    }) as Result & { instant: boolean }
    expect(reduced.instant).toBe(true)
    const expressive = tool('preview_motion').execute(figma, {
      id: set.id,
      trigger: 'hover',
      motion_mode: 'expressive'
    }) as Result & { timing: { durationMs: number } }
    expect(expressive.timing.durationMs).toBe(300)
    expect(
      (tool('preview_motion').execute(figma, { id: instance.id, trigger: 'expand' }) as Result)
        .error
    ).toContain('expand')
  })

  test('refuses nodes that cannot carry motion', () => {
    const { figma, instance } = setup()
    expect(
      (
        tool('set_motion').execute(figma, {
          id: instance.id,
          transitions: [{ trigger: 'hover' }]
        }) as Result
      ).error
    ).toContain('INSTANCE')
  })
})
