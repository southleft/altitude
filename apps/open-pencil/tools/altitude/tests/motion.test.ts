import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'
import { SceneGraph, readMotionSpec } from '@open-pencil/scene-graph'

import {
  ALTITUDE_CONTRACTS_DIR,
  altitudeMotionKind,
  altitudeMotionSpec,
  applyAltitudeMotion,
  contractStateProperties,
  readAltitudeContracts
} from '../src/motion'

const button = {
  id: 'al-button',
  name: 'Button',
  states: ['hover', 'focus', 'disabled'],
  conditionalBindings: {
    variant: {
      primary: {
        'background-color': { code: '--al-a' },
        state: { hover: { 'background-color': { code: '--al-b' } } }
      },
      bare: {
        state: { hover: { color: { code: '--al-c' }, 'font-weight': { code: '--al-d' } } }
      }
    },
    state: { disabled: { opacity: { code: '--al-e' } } }
  }
}

describe('Altitude contract motion defaults', () => {
  test('collects the animatable properties each state changes', () => {
    expect(contractStateProperties(button)).toEqual({
      hover: ['background-color', 'color'],
      disabled: ['opacity']
    })
  })

  test('maps states to MOTION.md use cases and classifies surfaces', () => {
    expect(altitudeMotionSpec(button)?.transitions).toEqual([
      { id: 'hover', trigger: 'hover', use: 'hover', properties: ['background-color', 'color'] },
      { id: 'focus', trigger: 'focus', use: 'hover', properties: ['box-shadow', 'border-color'] }
    ])
    expect(altitudeMotionKind('al-dialog')).toBe('overlay')
    expect(altitudeMotionKind('al-accordion-panel')).toBe('disclosure')
    expect(
      altitudeMotionSpec({ id: 'al-drawer', states: [] })?.transitions.map((t) => t.use)
    ).toEqual(['overlay', 'overlay'])
    expect(altitudeMotionSpec({ id: 'al-divider', states: [] })).toBeNull()
  })

  test('applies defaults to matching component sets without replacing authored motion', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const set = graph.createNode('COMPONENT_SET', page.id, { name: 'Button' })
    graph.createNode('COMPONENT_SET', page.id, { name: 'Unrelated' })
    expect(applyAltitudeMotion(graph, [button])).toEqual([
      { nodeId: set.id, name: 'Button', contract: 'al-button', transitions: 2 }
    ])
    expect(readMotionSpec(graph.getNode(set.id) ?? set)?.transitions).toHaveLength(2)
    expect(applyAltitudeMotion(graph, [button])).toEqual([])
    expect(applyAltitudeMotion(graph, [button], { overwrite: true })).toHaveLength(1)
  })
})

const workspace = await resolveWorkspaceRoot(import.meta.dir)
const altitudeRoot = process.env.ALTITUDE_ROOT ?? join(workspace, '../..')

describe.skipIf(!existsSync(join(altitudeRoot, ALTITUDE_CONTRACTS_DIR)))(
  'Altitude contracts on disk',
  () => {
    test('al-button hovers with the properties its hover state changes', async () => {
      const contracts = await readAltitudeContracts(altitudeRoot)
      const contract = contracts.find((candidate) => candidate.id === 'al-button')
      const hover = contract && altitudeMotionSpec(contract)?.transitions[0]
      expect(hover).toMatchObject({ trigger: 'hover', use: 'hover' })
      expect(hover?.properties).toContain('background-color')
      const dialog = contracts.find((candidate) => candidate.id === 'al-dialog')
      expect(
        dialog && altitudeMotionSpec(dialog)?.transitions.some((t) => t.use === 'overlay')
      ).toBe(true)
    })
  }
)
