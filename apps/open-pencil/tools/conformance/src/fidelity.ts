import { join } from 'node:path'

import { designDocumentToSceneGraph, sceneGraphToDesignDocument } from '@open-pencil/dom-css'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { overall, pairNodes, propertyStats, type PropertyRow } from './core'

/** The tracked baseline, relative to the workspace root. */
export const BASELINE_PATH = join('tools', 'conformance', 'fidelity-baseline.json')

/**
 * Properties that must not regress at all, because each was measured at 0% before the
 * design-fact carrier existed and is the reason it exists.
 */
export const MUST_BE_PERFECT = [
  'boundVariables',
  'componentId',
  'componentKey',
  'fills',
  'strokes',
  'effects',
  'lineHeight',
  'fontSize',
  'fontFamily',
  'vectorNetwork',
  'variantPropSpecs',
  'componentPropertyDefinitions'
] as const

/** Tolerance on rates, so float noise alone cannot red a build. */
export const OVERALL_TOLERANCE = 0.002

export interface FidelityBaseline {
  fixture: 'synthetic' | 'external'
  pairs: number
  dropped: number
  overallRate: number
  perfect: string[]
  properties: Record<string, number>
}

export interface FidelityMeasurement {
  baseline: FidelityBaseline
  rows: PropertyRow[]
  typeChanges: Map<string, number>
  present: number
  survived: number
}

/** Run the model round trip on `graph` and measure what survived. */
export function measureFidelity(graph: SceneGraph, external: boolean): FidelityMeasurement {
  const doc = sceneGraphToDesignDocument(graph)
  const rebuilt = designDocumentToSceneGraph(doc)
  const { pairs, dropped } = pairNodes(graph, doc, rebuilt)
  const { rows, typeChanges } = propertyStats(pairs)
  const total = overall(rows)
  const byProp = new Map(rows.map((row) => [row.prop, row]))

  return {
    baseline: {
      fixture: external ? 'external' : 'synthetic',
      pairs: pairs.length,
      dropped: dropped.length,
      overallRate: Number(total.rate.toFixed(4)),
      perfect: MUST_BE_PERFECT.filter((prop) => byProp.get(prop)?.rate === 1),
      properties: Object.fromEntries(rows.map((row) => [row.prop, Number(row.rate.toFixed(4))]))
    },
    rows,
    typeChanges,
    present: total.present,
    survived: total.survived
  }
}

/**
 * Every reason the gate fails, or none. Absolute floors always apply; the baseline comparison
 * only applies to the synthetic fixture, since nobody else can reproduce an external file.
 */
export function gateFailures(
  measurement: FidelityMeasurement,
  baseline: FidelityBaseline | null
): string[] {
  const failures: string[] = []
  const byProp = new Map(measurement.rows.map((row) => [row.prop, row]))

  if (measurement.baseline.pairs === 0) {
    return ['measured zero node pairs — the fixture or the pairing is broken']
  }

  for (const prop of MUST_BE_PERFECT) {
    const row = byProp.get(prop)
    if (!row || row.rate === 1) continue
    failures.push(
      `${prop} must round-trip perfectly but lost ${row.lost}/${row.present} ` +
        `(${(row.rate * 100).toFixed(1)}%)`
    )
  }

  // Node type collapse is the defect the whole effort started from.
  for (const [transition, count] of measurement.typeChanges) {
    if (transition.startsWith('CANVAS ->')) continue // deliberate, and named as a degradation
    failures.push(`node type changed on ${count} nodes: ${transition}`)
  }

  if (!baseline || measurement.baseline.fixture === 'external') return failures

  const measured = measurement.baseline
  if (measured.overallRate < baseline.overallRate - OVERALL_TOLERANCE) {
    failures.push(
      `overall fidelity regressed: ${(measured.overallRate * 100).toFixed(2)}% < ` +
        `${(baseline.overallRate * 100).toFixed(2)}% baseline`
    )
  }

  for (const [prop, baseRate] of Object.entries(baseline.properties)) {
    const row = byProp.get(prop)
    if (!row) {
      failures.push(`${prop} vanished from the fixture — was ${(baseRate * 100).toFixed(0)}%`)
      continue
    }
    if (row.rate < baseRate - OVERALL_TOLERANCE) {
      failures.push(
        `${prop} regressed: ${(row.rate * 100).toFixed(1)}% < ${(baseRate * 100).toFixed(1)}%`
      )
    }
  }

  return failures
}
