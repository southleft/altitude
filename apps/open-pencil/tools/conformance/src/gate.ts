/**
 * Round-trip fidelity gate.
 *
 * The unit tests pin individual facts; this pins the AGGREGATE, which is what catches a change
 * that quietly trades one property for another. It runs against a fixture built in code, so CI
 * needs no binary `.fig`. Point it at a real file when you have one; the floors apply either way.
 *
 *   bun run conformance:gate                    # synthetic fixture, check floors
 *   bun run conformance:gate:update             # re-record the baseline
 *   bun run conformance:gate path/to/file.fig   # measure a real file instead
 *   bun run conformance:gate --verbose          # list every property
 *
 * Exit codes: 0 pass, 1 regression, 2 usage error.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts'

import { BASELINE_PATH, gateFailures, measureFidelity, type FidelityBaseline } from './fidelity'
import { loadFigGraph } from './fig'
import { buildSyntheticFixture } from './synthetic-fixture'

const args = process.argv.slice(2)
const update = args.includes('--update')
const verbose = args.includes('--verbose')
const figPath = args.find((arg) => !arg.startsWith('--'))

const root = await resolveWorkspaceRoot(import.meta.dir)
const baselinePath = join(root, BASELINE_PATH)

if (figPath && !existsSync(figPath)) {
  console.error(`No such fixture: ${figPath}`)
  process.exit(2)
}

const graph = figPath ? await loadFigGraph(figPath) : buildSyntheticFixture()
const measurement = measureFidelity(graph, figPath !== undefined)
const { baseline: measured, rows } = measurement

console.log(`Fixture: ${figPath ?? 'synthetic fixture'}`)
console.log(`Pairs:   ${measured.pairs}${measured.dropped ? ` (${measured.dropped} dropped)` : ''}`)
console.log(
  `Overall: ${(measured.overallRate * 100).toFixed(2)}% ` +
    `(${measurement.survived}/${measurement.present})`
)
console.log()

if (verbose) {
  for (const row of rows) {
    const rate = (row.rate * 100).toFixed(0).padStart(3)
    console.log(`  ${rate}%  ${row.survived}/${row.present}  ${row.prop}`)
  }
  console.log()
}

// --update writes the baseline for the synthetic fixture only: a baseline recorded from
// someone's private .fig could not be reproduced by anyone else, least of all CI.
if (update) {
  if (figPath) {
    console.error(
      'Refusing to record a baseline from an external fixture — it is not reproducible.'
    )
    process.exit(2)
  }
  writeFileSync(baselinePath, `${JSON.stringify(measured, null, 2)}\n`)
  console.log(`Recorded baseline: ${BASELINE_PATH}`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error(`No baseline at ${BASELINE_PATH}. Record one with --update.`)
  process.exit(2)
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as FidelityBaseline
const failures = gateFailures(measurement, baseline)

if (failures.length) {
  console.error('FIDELITY GATE FAILED')
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('\nIf a drop is intentional, re-record with --update and say why in the commit.')
  process.exit(1)
}

console.log('FIDELITY GATE PASSED')
if (figPath) console.log('(external fixture: absolute floors checked, baseline comparison skipped)')
