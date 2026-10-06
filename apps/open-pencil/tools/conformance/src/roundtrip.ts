/**
 * Live round-trip measurement on a real `.fig`.
 *
 * The gap report reads the bridge source and says which properties are *referenced*. This runs
 * a real file through the bridge and says which values actually *survive* — a property can be
 * mapped in both directions and still come back wrong.
 *
 * Route: .fig -> SceneGraph -> DesignDocument -> SceneGraph. It deliberately skips HTML
 * serialisation, so this measures the MODEL round trip; see `html-roundtrip.ts` for text.
 *
 *   bun run conformance:roundtrip <file.fig> [--json out.json] [--focus <prop>]
 */

import { writeFileSync } from 'node:fs'
import { basename } from 'node:path'

import { designDocumentToSceneGraph, sceneGraphToDesignDocument } from '@open-pencil/dom-css'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { isEmpty, nodeField, pairNodes, propertyStats, same, type NodePair } from './core'
import { loadFigGraph, requireFigArgument } from './fig'

const args = process.argv.slice(2)
const file = requireFigArgument(
  'bun run conformance:roundtrip <file.fig> [--json out.json] [--focus <prop>]'
)
const optionValue = (flag: string): string | undefined => {
  const index = args.indexOf(flag)
  return index === -1 ? undefined : args[index + 1]
}
const jsonOut = optionValue('--json')
const focusProp = optionValue('--focus')

function sortedCounts(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

/**
 * Why does one property fail? "componentId is 69%" is a fact; "componentId fails on INSTANCE
 * nodes whose component is absent" is actionable.
 */
function printFocus(pairs: readonly NodePair[], prop: string): void {
  const byType = new Map<string, number>()
  const samples: { name: string; from: string; before: string; after: string }[] = []
  for (const [source, out] of pairs) {
    const value = nodeField(source, prop)
    if (isEmpty(value) || same(value, nodeField(out, prop))) continue
    const key = `${source.type} -> ${out.type}`
    byType.set(key, (byType.get(key) ?? 0) + 1)
    if (samples.length < 8) {
      samples.push({
        name: source.name,
        from: key,
        before: String(JSON.stringify(value)).slice(0, 110),
        after: String(JSON.stringify(nodeField(out, prop))).slice(0, 110)
      })
    }
  }

  console.log(`=== FOCUS: ${prop} ===`)
  console.log('Losses by type transition:')
  for (const [key, count] of sortedCounts(byType))
    console.log(`  ${String(count).padStart(6)}  ${key}`)
  console.log('\nSamples:')
  for (const sample of samples) {
    console.log(`  [${sample.from}] ${JSON.stringify(sample.name).slice(0, 40)}`)
    console.log(`     before: ${sample.before}`)
    console.log(`     after:  ${sample.after}`)
  }
  console.log()
}

function bindingCounts(original: SceneGraph, pairs: readonly NodePair[]) {
  const nodes = [...original.nodes.values()]
  return {
    nodes: nodes.filter((node) => !isEmpty(node.boundVariables)).length,
    bindings: nodes.reduce((sum, node) => sum + Object.keys(node.boundVariables).length, 0),
    survived: pairs.filter(
      ([source, out]) => !isEmpty(source.boundVariables) && !isEmpty(out.boundVariables)
    ).length
  }
}

console.log(`Reading ${basename(file)} ...`)
const started = Date.now()
const original = await loadFigGraph(file)
console.log(`Parsed in ${((Date.now() - started) / 1000).toFixed(1)}s`)

const originalNodes = [...original.nodes.values()]
console.log(`Original graph: ${originalNodes.length} nodes`)

const doc = sceneGraphToDesignDocument(original)
const rebuilt = designDocumentToSceneGraph(doc)
console.log(`Rebuilt graph:  ${rebuilt.nodes.size} nodes`)

const { pairs, dropped } = pairNodes(original, doc, rebuilt)

// Nodes present in the original but never represented in the DesignDocument at all.
const reachedIds = new Set(pairs.map(([source]) => source.id))
const neverEmitted = originalNodes.filter(
  (node) => node.type !== 'CANVAS' && node.type !== 'DOCUMENT' && !reachedIds.has(node.id)
)

console.log(
  `Paired ${pairs.length} nodes; ${dropped.length} emitted but not rebuilt; ` +
    `${neverEmitted.length} never reached the bridge.\n`
)

const { rows, typeChanges } = propertyStats(pairs)

if (focusProp) printFocus(pairs, focusProp)

const tokens = bindingCounts(original, pairs)
console.log('=== TOKEN BINDINGS ===')
console.log(`${tokens.nodes} nodes carry boundVariables, ${tokens.bindings} bindings total`)
console.log(`${tokens.survived} survived the round trip\n`)

console.log('=== VARIABLE COLLECTIONS ===')
console.log(`original: ${original.variableCollections.size} collections`)
console.log(`rebuilt:  ${rebuilt.variableCollections.size} collections\n`)

if (typeChanges.size) {
  console.log('=== NODE TYPE CHANGES ===')
  for (const [key, count] of sortedCounts(typeChanges)) {
    console.log(`  ${String(count).padStart(6)}  ${key}`)
  }
  console.log()
}

if (neverEmitted.length) {
  const byType = new Map<string, number>()
  for (const node of neverEmitted) byType.set(node.type, (byType.get(node.type) ?? 0) + 1)
  console.log('=== NEVER EMITTED (dropped before CSS) ===')
  for (const [type, count] of sortedCounts(byType)) {
    console.log(`  ${String(count).padStart(6)}  ${type}`)
  }
  console.log()
}

console.log('=== PROPERTY SURVIVAL (worst first) ===')
console.log('   lost / present  rate   property')
for (const row of rows.slice(0, 40)) {
  const rate = `${(row.rate * 100).toFixed(0)}%`.padStart(5)
  console.log(
    `  ${String(row.lost).padStart(6)} /${String(row.present).padStart(7)}  ${rate}   ${row.prop}`
  )
}

const totalPresent = rows.reduce((sum, row) => sum + row.present, 0)
const totalSurvived = rows.reduce((sum, row) => sum + row.survived, 0)
console.log(
  `\nOverall: ${totalSurvived}/${totalPresent} property values survived ` +
    `(${((totalSurvived / totalPresent) * 100).toFixed(1)}%)`
)

if (jsonOut) {
  const report = {
    file: basename(file),
    originalNodes: originalNodes.length,
    rebuiltNodes: rebuilt.nodes.size,
    paired: pairs.length,
    dropped: dropped.length,
    neverEmitted: neverEmitted.length,
    tokenBindings: tokens,
    typeChanges: Object.fromEntries(typeChanges),
    properties: rows
  }
  writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  console.log(`\nWrote ${jsonOut}`)
}
