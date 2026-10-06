#!/usr/bin/env bun
/**
 * Round-trip fidelity gate.
 *
 * Phase 5 of the plan: make a regression fail a build instead of being discovered months
 * later. The unit tests pin individual facts; this pins the AGGREGATE, which is what
 * catches a change that quietly trades one property for another.
 *
 * Runs against a fixture built in code, so CI needs no binary `.fig` — the real design
 * system is 12.5MB, gitignored, and takes two minutes to parse. Point it at a real file
 * when you have one; the floors apply either way.
 *
 *   bun scripts/conformance/gate.mjs                    # synthetic fixture, check floors
 *   bun scripts/conformance/gate.mjs --update           # re-record the baseline
 *   bun scripts/conformance/gate.mjs path/to/file.fig   # measure a real file instead
 *   bun scripts/conformance/gate.mjs --verbose          # list every property
 *
 * Exit codes: 0 pass, 1 regression, 2 usage error.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sceneGraphToDesignDocument, designDocumentToSceneGraph } from '@open-pencil/dom-css'

import { buildSyntheticFixture } from './lib/synthetic-fixture.mjs'
import { overall, pairNodes, propertyStats } from './lib/roundtrip-core.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const BASELINE = join(ROOT, '.slate', 'fidelity-baseline.json')

const args = process.argv.slice(2)
const update = args.includes('--update')
const verbose = args.includes('--verbose')
const figPath = args.find((a) => !a.startsWith('--'))

/**
 * Properties that must not regress at all, because each was measured at 0% before the
 * design-fact carrier existed and is the reason it exists.
 */
const MUST_BE_PERFECT = [
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
]

/** Tolerance on the overall rate, so float noise alone cannot red a build. */
const OVERALL_TOLERANCE = 0.002

async function loadGraph() {
  if (!figPath) return { graph: buildSyntheticFixture(), label: 'synthetic fixture' }

  if (!existsSync(figPath)) {
    console.error(`No such fixture: ${figPath}`)
    process.exit(2)
  }
  const { parseFigFile } = await import('@open-pencil/core/io/formats/fig')
  const bytes = readFileSync(figPath)
  const graph = await parseFigFile(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    { populate: 'all' }
  )
  return { graph, label: figPath }
}

const { graph, label } = await loadGraph()

const doc = sceneGraphToDesignDocument(graph)
const rebuilt = designDocumentToSceneGraph(doc)
const { pairs, dropped } = pairNodes(graph, doc, rebuilt)

if (pairs.length === 0) {
  console.error('Gate measured zero node pairs — the fixture or the pairing is broken.')
  process.exit(1)
}

const { rows, typeChanges } = propertyStats(pairs)
const total = overall(rows)
const byProp = new Map(rows.map((r) => [r.prop, r]))

const measured = {
  fixture: figPath ? 'external' : 'synthetic',
  pairs: pairs.length,
  dropped: dropped.length,
  overallRate: Number(total.rate.toFixed(4)),
  perfect: MUST_BE_PERFECT.filter((p) => byProp.get(p)?.rate === 1),
  properties: Object.fromEntries(rows.map((r) => [r.prop, Number(r.rate.toFixed(4))]))
}

console.log(`Fixture: ${label}`)
console.log(`Pairs:   ${pairs.length}${dropped.length ? ` (${dropped.length} dropped)` : ''}`)
console.log(`Overall: ${(total.rate * 100).toFixed(2)}% (${total.survived}/${total.present})`)
console.log()

if (verbose) {
  for (const r of rows) {
    console.log(`  ${(r.rate * 100).toFixed(0).padStart(3)}%  ${r.survived}/${r.present}  ${r.prop}`)
  }
  console.log()
}

// --update writes the baseline for the synthetic fixture only: a baseline recorded from
// someone's private .fig could not be reproduced by anyone else, least of all CI.
if (update) {
  if (figPath) {
    console.error('Refusing to record a baseline from an external fixture — it is not reproducible.')
    console.error('Run without a path to update the synthetic baseline.')
    process.exit(2)
  }
  writeFileSync(BASELINE, `${JSON.stringify(measured, null, 2)}\n`)
  console.log(`Recorded baseline: ${BASELINE}`)
  process.exit(0)
}

const failures = []

for (const prop of MUST_BE_PERFECT) {
  const row = byProp.get(prop)
  if (!row) continue // absent from this fixture; nothing to assert
  if (row.rate < 1) {
    failures.push(
      `${prop} must round-trip perfectly but lost ${row.lost}/${row.present} ` +
        `(${(row.rate * 100).toFixed(1)}%)`
    )
  }
}

// Node type collapse is the defect the whole effort started from.
for (const [transition, count] of typeChanges) {
  if (transition.startsWith('CANVAS ->')) continue // deliberate, and named as a degradation
  failures.push(`node type changed on ${count} nodes: ${transition}`)
}

if (!existsSync(BASELINE)) {
  console.error(`No baseline at ${BASELINE}. Record one with --update.`)
  process.exit(2)
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'))

if (!figPath) {
  if (measured.overallRate < baseline.overallRate - OVERALL_TOLERANCE) {
    failures.push(
      `overall fidelity regressed: ${(measured.overallRate * 100).toFixed(2)}% < ` +
        `${(baseline.overallRate * 100).toFixed(2)}% baseline`
    )
  }

  for (const [prop, baseRate] of Object.entries(baseline.properties ?? {})) {
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
}

if (failures.length) {
  console.error('FIDELITY GATE FAILED')
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('\nIf a drop is intentional, re-record with --update and say why in the commit.')
  process.exit(1)
}

console.log('FIDELITY GATE PASSED')
if (figPath) console.log('(external fixture: absolute floors checked, baseline comparison skipped)')
