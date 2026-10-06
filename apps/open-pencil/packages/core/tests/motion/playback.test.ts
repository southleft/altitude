import { describe, expect, test } from 'bun:test'

import { createMotionPlayback, type MotionClock } from '@open-pencil/core/motion'
import {
  MOTION_SPEC_VERSION,
  motionPluginData,
  type MotionTransition,
  type SceneGraph
} from '@open-pencil/scene-graph'

import { buttonSet, modeId, motionCollection, motionGraph } from './fixtures'

function fakeClock() {
  let time = 0
  const callbacks: Array<() => void> = []
  const clock: MotionClock = {
    now: () => time,
    requestFrame: (callback) => {
      callbacks.push(callback)
      return callbacks.length
    },
    cancelFrame: () => {
      callbacks.length = 0
    }
  }
  return {
    clock,
    advance(ms: number) {
      time += ms
      const pending = callbacks.splice(0)
      for (const callback of pending) callback()
    }
  }
}

function setup(transition: Partial<MotionTransition> = {}, reduced = false) {
  const graph = motionGraph()
  const fixture = buttonSet(graph)
  graph.updateNode(fixture.set.id, {
    pluginData: motionPluginData(fixture.set, {
      version: MOTION_SPEC_VERSION,
      transitions: [
        {
          id: 'hover',
          trigger: 'hover',
          use: 'hover',
          properties: ['background-color'],
          ...transition
        }
      ]
    })
  })
  const time = fakeClock()
  let leases = 0
  let undoable = 0
  const playback = createMotionPlayback({
    getGraph: () => graph,
    requestRepaint: () => {},
    requestRender: () => {},
    beginInteractiveEdit: () => {
      leases++
      return () => leases--
    },
    prefersReducedMotion: () => reduced,
    clock: time.clock
  })
  graph.emitter.on('node:updated', () => undoable++)
  return { graph, ...fixture, time, playback, leases: () => leases, committed: () => undoable }
}

const red = (graph: SceneGraph, id: string) => graph.getNode(id)?.fills[0]?.color.r ?? NaN

describe('motion preview playback', () => {
  test('animates to the hover variant over the token duration and back, restoring exactly', () => {
    const { graph, instance, time, playback, leases, committed } = setup()
    const before = structuredClone(graph.getNode(instance.id))
    expect(playback.enter(instance.id, 'hover')).toMatchObject({
      status: 'animating',
      timing: { durationMs: 200 }
    })
    expect(leases()).toBe(1)
    time.advance(100)
    const mid = red(graph, instance.id)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    time.advance(150)
    expect(red(graph, instance.id)).toBe(1)
    // Untransitioned fields jump to the destination.
    expect(graph.getNode(instance.id)?.cornerRadius).toBe(8)

    playback.leave(instance.id, 'hover')
    time.advance(500)
    expect(graph.getNode(instance.id)).toEqual(before)
    expect(playback.isActive(instance.id)).toBe(false)
    expect(leases()).toBe(0)
    expect(committed()).toBe(0)
  })

  test('is instant in the reduced Motion mode and under OS reduced motion', () => {
    const reducedMode = setup()
    graphMode(reducedMode.graph, 'reduced')
    expect(reducedMode.playback.enter(reducedMode.instance.id, 'hover').status).toBe('instant')
    expect(red(reducedMode.graph, reducedMode.instance.id)).toBe(1)

    const os = setup({}, true)
    expect(os.playback.enter(os.instance.id, 'hover').status).toBe('instant')
    os.playback.stop()
    expect(red(os.graph, os.instance.id)).toBe(0)
  })

  test('stop restores mid-flight and a committed edit survives', () => {
    const { graph, instance, time, playback } = setup()
    playback.enter(instance.id, 'hover')
    time.advance(50)
    graph.updateNode(instance.id, { opacity: 0.5 })
    playback.handleNodeUpdated(instance.id, { opacity: 0.5 })
    expect(red(graph, instance.id)).toBe(0)
    expect(graph.getNode(instance.id)?.opacity).toBe(0.5)
    expect(playback.isActive(instance.id)).toBe(false)
  })

  test('returns none for nodes without a matching transition', () => {
    const { set, instance, playback } = setup()
    expect(playback.enter(instance.id, 'press').status).toBe('none')
    expect(playback.enter(set.id, 'hover').status).toBe('none')
  })

  test('unbinds bound colours during the preview and rebinds them afterwards', () => {
    const { graph, base, hover, instance, time, playback } = setup()
    const collection = graph.createCollection('Colors')
    const variable = graph.createVariable('blue', 'COLOR', collection.id, {
      r: 0,
      g: 0,
      b: 1,
      a: 1
    })
    graph.updateNode(base.id, { boundVariables: { 'fills/0/color': variable.id } })
    graph.updateNode(instance.id, { boundVariables: { 'fills/0/color': variable.id } })
    void hover
    playback.enter(instance.id, 'hover')
    time.advance(300)
    expect(graph.getNode(instance.id)?.boundVariables['fills/0/color']).toBeUndefined()
    playback.stop(instance.id)
    expect(graph.getNode(instance.id)?.boundVariables['fills/0/color']).toBe(variable.id)
  })
})

function graphMode(graph: SceneGraph, mode: string) {
  graph.setActiveMode(motionCollection(graph).id, modeId(graph, mode))
}
