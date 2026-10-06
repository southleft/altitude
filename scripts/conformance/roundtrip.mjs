#!/usr/bin/env bun
/**
 * Live round-trip measurement.
 *
 * The gap report reads the bridge source and says which properties are *referenced*.
 * This runs a real file through the bridge and says which values actually *survive* —
 * a property can be mapped in both directions and still come back wrong.
 *
 * Route: .fig -> SceneGraph -> DesignDocument -> SceneGraph, then compare the two
 * graphs node by node. It deliberately skips HTML serialisation so this measures the
 * MODEL round trip; text/CSS parsing losses are a separate pass.
 *
 *   bun scripts/conformance/roundtrip.mjs <file.fig> [--json out.json]
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

import { parseFigFile } from '@open-pencil/core/io/formats/fig'
import { sceneGraphToDesignDocument, designDocumentToSceneGraph } from '@open-pencil/dom-css'

import {
  isEmpty,
  overall,
  pairNodes,
  propertyStats,
  same
} from './lib/roundtrip-core.mjs'

const args = process.argv.slice(2)
const file = args.find((a) => !a.startsWith('--'))
if (!file) {
  console.error('usage: bun scripts/conformance/roundtrip.mjs <file.fig> [--json out.json]')
  process.exit(2)
}
const jsonAt = args.indexOf('--json')
const jsonOut = jsonAt !== -1 ? args[jsonAt + 1] : null
const focusAt = args.indexOf('--focus')
const focusProp = focusAt !== -1 ? args[focusAt + 1] : null

console.log(`Reading ${basename(file)} ...`)
const bytes = readFileSync(file)
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)

const t0 = Date.now()
const original = await parseFigFile(buffer, { populate: 'all' })
console.log(`Parsed in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

const originalNodes = [...original.nodes.values()]
console.log(`Original graph: ${originalNodes.length} nodes`)

const doc = sceneGraphToDesignDocument(original)
const rebuilt = designDocumentToSceneGraph(doc)
console.log(`Rebuilt graph:  ${rebuilt.nodes.size} nodes`)

const { pairs, dropped: droppedIds } = pairNodes(original, doc, rebuilt)

// Nodes present in the original but never represented in the DesignDocument at all.
const reachedIds = new Set(pairs.map(([src]) => src.id))
const neverEmitted = originalNodes.filter(
  (n) => n.type !== 'CANVAS' && n.type !== 'DOCUMENT' && !reachedIds.has(n.id)
)

console.log(`Paired ${pairs.length} nodes; ${neverEmitted.length} never reached the bridge.
`)

const { rows, typeChanges } = propertyStats(pairs)

// ---- --focus <prop>: why does one property fail? --------------------------------------
// "componentId is 69%" is a fact; "componentId fails on INSTANCE nodes whose component is
// absent" is actionable. This turns the former into the latter without guessing.
if (focusProp) {
  const byType = new Map()
  const samples = []
  for (const [src, out] of pairs) {
    const value = src[focusProp]
    if (isEmpty(value)) continue
    if (same(value, out[focusProp])) continue
    const key = `${src.type} -> ${out.type}`
    byType.set(key, (byType.get(key) ?? 0) + 1)
    if (samples.length < 8) {
      samples.push({
        name: src.name,
        from: `${src.type} -> ${out.type}`,
        before: JSON.stringify(value)?.slice(0, 110),
        after: JSON.stringify(out[focusProp])?.slice(0, 110)
      })
    }
  }

  console.log(`=== FOCUS: ${focusProp} ===`)
  console.log('Losses by type transition:')
  for (const [k, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(6)}  ${k}`)
  }
  console.log('\nSamples:')
  for (const s of samples) {
    console.log(`  [${s.from}] ${JSON.stringify(s.name ?? '').slice(0, 40)}`)
    console.log(`     before: ${s.before}`)
    console.log(`     after:  ${s.after}`)
  }
  console.log()
}

const nodesWithVars = originalNodes.filter((n) => !isEmpty(n.boundVariables)).length
const totalBindings = originalNodes.reduce(
  (sum, n) => sum + (n.boundVariables ? Object.keys(n.boundVariables).length : 0),
  0
)

console.log('=== TOKEN BINDINGS ===')
console.log(`${nodesWithVars} nodes carry boundVariables, ${totalBindings} bindings total`)
const survivedVars = pairs.filter(
  ([src, out]) => !isEmpty(src.boundVariables) && !isEmpty(out.boundVariables)
).length
console.log(`${survivedVars} survived the round trip\n`)

console.log('=== VARIABLE COLLECTIONS ===')
console.log(`original: ${original.variableCollections?.size ?? 0} collections`)
console.log(`rebuilt:  ${rebuilt.variableCollections?.size ?? 0} collections\n`)

if (typeChanges.size) {
  console.log('=== NODE TYPE CHANGES ===')
  for (const [k, n] of [...typeChanges.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(6)}  ${k}`)
  }
  console.log()
}

if (neverEmitted.length) {
  const byType = new Map()
  for (const n of neverEmitted) byType.set(n.type, (byType.get(n.type) ?? 0) + 1)
  console.log('=== NEVER EMITTED (dropped before CSS) ===')
  for (const [t, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(6)}  ${t}`)
  }
  console.log()
}

console.log('=== PROPERTY SURVIVAL (worst first) ===')
console.log('   lost / present  rate   property')
for (const r of rows.slice(0, 40)) {
  const rate = `${(r.rate * 100).toFixed(0)}%`.padStart(5)
  console.log(
    `  ${String(r.lost).padStart(6)} /${String(r.present).padStart(7)}  ${rate}   ${r.prop}`
  )
}

const totalPresent = rows.reduce((s, r) => s + r.present, 0)
const totalSurvived = rows.reduce((s, r) => s + r.survived, 0)
console.log(
  `\nOverall: ${totalSurvived}/${totalPresent} property values survived ` +
    `(${((totalSurvived / totalPresent) * 100).toFixed(1)}%)`
)

if (jsonOut) {
  writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        file: basename(file),
        originalNodes: originalNodes.length,
        rebuiltNodes: rebuilt.nodes.size,
        paired: pairs.length,
        neverEmitted: neverEmitted.length,
        tokenBindings: { nodes: nodesWithVars, bindings: totalBindings, survived: survivedVars },
        typeChanges: Object.fromEntries(typeChanges),
        properties: rows
      },
      null,
      2
    )
  )
  console.log(`\nWrote ${jsonOut}`)
}
