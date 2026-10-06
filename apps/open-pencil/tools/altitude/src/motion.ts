import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { motionSpecForStates, type MotionComponentKind } from '@open-pencil/core/motion'
import {
  MOTION_PROPERTIES,
  motionPluginData,
  readMotionSpec,
  type MotionProperty,
  type MotionSpec,
  type SceneGraph
} from '@open-pencil/scene-graph'

/**
 * Default component motion from Altitude contracts.
 *
 * `.altitude/contracts/altitude/<tag>.contract.json` lists a component's interaction
 * `states` and, under `conditionalBindings`, the CSS properties each state changes. MOTION.md
 * pairs those with use cases: hover/press/focus → `hover`; disclosure → `expand`; a surface
 * entering or leaving → `overlay`. Which components are disclosures or overlays is Altitude
 * knowledge, so it lives here; the generic state → use-case rules live in core.
 */

export const ALTITUDE_CONTRACTS_DIR = '.altitude/contracts/altitude'

/** Surfaces that enter and leave (MOTION.md: dialog, drawer, popover, command palette). */
export const ALTITUDE_OVERLAY_TAGS: ReadonlySet<string> = new Set([
  'al-dialog',
  'al-drawer',
  'al-popover',
  'al-command-palette',
  'al-dropdown-panel',
  'al-toast'
])

/** In-place disclosure (MOTION.md: accordion expand/collapse). */
export const ALTITUDE_DISCLOSURE_TAGS: ReadonlySet<string> = new Set([
  'al-accordion-panel',
  'al-details',
  'al-disclosure'
])

export interface AltitudeContract {
  id: string
  name?: string
  states?: unknown[]
  conditionalBindings?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMotionProperty(value: string): value is MotionProperty {
  return (MOTION_PROPERTIES as readonly string[]).includes(value)
}

export function altitudeMotionKind(tag: string): MotionComponentKind {
  if (ALTITUDE_OVERLAY_TAGS.has(tag)) return 'overlay'
  if (ALTITUDE_DISCLOSURE_TAGS.has(tag)) return 'disclosure'
  return 'control'
}

/**
 * The CSS properties each state changes, from every `state.<name>` block anywhere in
 * `conditionalBindings` (per variant, per size, or top level). Only properties a motion spec
 * can animate are kept.
 */
export function contractStateProperties(
  contract: AltitudeContract
): Record<string, MotionProperty[]> {
  const result = new Map<string, Set<MotionProperty>>()
  function walk(value: unknown) {
    if (!isRecord(value)) return
    for (const [key, child] of Object.entries(value)) {
      if (key === 'state' && isRecord(child)) {
        for (const [state, declarations] of Object.entries(child)) {
          if (!isRecord(declarations)) continue
          const properties = result.get(state) ?? new Set<MotionProperty>()
          for (const property of Object.keys(declarations)) {
            if (isMotionProperty(property)) properties.add(property)
          }
          result.set(state, properties)
        }
      }
      walk(child)
    }
  }
  walk(contract.conditionalBindings)
  return Object.fromEntries(
    [...result].filter(([, properties]) => properties.size).map(([state, set]) => [state, [...set]])
  )
}

/** The default motion spec for a contract, or null when the component does not move. */
export function altitudeMotionSpec(contract: AltitudeContract): MotionSpec | null {
  const states = (contract.states ?? []).filter(
    (state): state is string => typeof state === 'string'
  )
  return motionSpecForStates({
    states,
    kind: altitudeMotionKind(contract.id),
    properties: contractStateProperties(contract)
  })
}

/** Every Altitude contract under `<altitudeRoot>/.altitude/contracts/altitude`. */
export async function readAltitudeContracts(altitudeRoot: string): Promise<AltitudeContract[]> {
  const dir = join(altitudeRoot, ALTITUDE_CONTRACTS_DIR)
  if (!existsSync(dir)) throw new Error(`Altitude contracts not found: ${dir}`)
  const contracts: AltitudeContract[] = []
  for (const entry of (await readdir(dir)).sort()) {
    if (!entry.endsWith('.contract.json')) continue
    const parsed: unknown = JSON.parse(await readFile(join(dir, entry), 'utf8'))
    if (!isRecord(parsed) || typeof parsed.id !== 'string') continue
    contracts.push({
      id: parsed.id,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      states: Array.isArray(parsed.states) ? parsed.states : undefined,
      conditionalBindings: parsed.conditionalBindings
    })
  }
  return contracts
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/^al-/, '')
    .replace(/[\s_-]+/g, '')
}

export interface AppliedAltitudeMotion {
  nodeId: string
  name: string
  contract: string
  transitions: number
}

/**
 * Give every COMPONENT_SET that matches a contract (by tag, `al-button`, or display name,
 * `Button`) the contract's default motion. Sets that already have a spec keep it unless
 * `overwrite` is set: authored motion is never silently replaced.
 */
export function applyAltitudeMotion(
  graph: SceneGraph,
  contracts: readonly AltitudeContract[],
  options: { overwrite?: boolean } = {}
): AppliedAltitudeMotion[] {
  const byName = new Map<string, AltitudeContract>()
  for (const contract of contracts) {
    byName.set(normalize(contract.id), contract)
    if (contract.name) byName.set(normalize(contract.name), contract)
  }
  const applied: AppliedAltitudeMotion[] = []
  for (const node of graph.getAllNodes()) {
    if (node.type !== 'COMPONENT_SET') continue
    const contract = byName.get(normalize(node.name))
    if (!contract || (!options.overwrite && readMotionSpec(node))) continue
    const spec = altitudeMotionSpec(contract)
    if (!spec) continue
    graph.updateNode(node.id, { pluginData: motionPluginData(node, spec) })
    applied.push({
      nodeId: node.id,
      name: node.name,
      contract: contract.id,
      transitions: spec.transitions.length
    })
  }
  return applied
}
