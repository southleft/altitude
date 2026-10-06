import { describe, expect, test } from 'bun:test'

import { exportFigFile, parseFigFile } from '@open-pencil/core/io'
import { motionSpecTransitionCSS, resolveMotionContext } from '@open-pencil/core/motion'
import {
  MOTION_SPEC_VERSION,
  motionPluginData,
  readMotionSpec,
  type MotionSpec
} from '@open-pencil/scene-graph'

import { buttonSet, motionGraph } from './fixtures'

describe('motion through a .fig round trip', () => {
  test('the spec and the role tokens it reads survive save and reopen', async () => {
    const graph = motionGraph()
    const { set, instance } = buttonSet(graph)
    const fast = [...graph.variables.values()].find((v) => v.name.endsWith('duration/role/fast'))
    const spec: MotionSpec = {
      version: MOTION_SPEC_VERSION,
      transitions: [
        {
          id: 'hover',
          trigger: 'hover',
          to: { State: 'Hover' },
          use: 'hover',
          properties: ['background-color'],
          duration: fast ? { variableId: fast.id } : undefined
        }
      ]
    }
    graph.updateNode(set.id, { pluginData: motionPluginData(set, spec) })
    const css = motionSpecTransitionCSS(graph, spec)

    const bytes = await exportFigFile(graph)
    const reopened = await parseFigFile(bytes.slice().buffer, { populate: 'all' })
    const reopenedSet = [...reopened.getAllNodes()].find((node) => node.type === 'COMPONENT_SET')
    if (!reopenedSet) throw new Error('component set missing')
    const reread = readMotionSpec(reopenedSet)
    expect(reread?.transitions[0]).toMatchObject({ trigger: 'hover', to: { State: 'Hover' } })
    expect(reread && motionSpecTransitionCSS(reopened, reread)).toBe(css)

    const reopenedInstance = [...reopened.getAllNodes()].find(
      (node) => node.type === 'INSTANCE' && node.name === instance.name
    )
    expect(reopenedInstance && resolveMotionContext(reopened, reopenedInstance.id)?.owner.id).toBe(
      reopenedSet.id
    )
  })
})
