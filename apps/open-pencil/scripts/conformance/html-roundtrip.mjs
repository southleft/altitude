#!/usr/bin/env bun
/**
 * Full HTML-text round trip, at scale.
 *
 * `roundtrip.mjs` measures the MODEL path (graph -> DesignDocument -> graph), which skips
 * serialisation entirely. This one goes all the way out to markup and back:
 *
 *   .fig -> SceneGraph -> DesignDocument -> HTML string -> parse -> SceneGraph
 *
 * That extra leg is where `element.design` is destroyed and only `data-op-*` attributes
 * survive, so it is the only test that proves the attribute encoding actually carries the
 * facts. The unit tests cover it on a three-node fixture; a design system is a different
 * question — attribute size, escaping of quotes inside JSON, and parser limits all only
 * show up in bulk.
 *
 * It also reports output size, because markup nobody can read defeats the purpose of
 * putting facts in the markup at all.
 *
 *   bun scripts/conformance/html-roundtrip.mjs <file.fig>
 */

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

import { parseFigFile } from '@open-pencil/core/io/formats/fig'
import {
  createHeadlessCSSRuntime,
  designDocumentToSceneGraph,
  sceneGraphToDesignDocument,
  serializeHTML
} from '@open-pencil/dom-css'

import { overall, pairNodes, propertyStats } from './lib/roundtrip-core.mjs'
import { buildSyntheticFixture } from './lib/synthetic-fixture.mjs'

const figPath = process.argv[2]

const graph = await (async () => {
  if (!figPath) {
    console.log('Fixture: synthetic (pass a .fig path to use a real file)')
    return buildSyntheticFixture()
  }
  console.log(`Fixture: ${basename(figPath)}`)
  const bytes = readFileSync(figPath)
  return parseFigFile(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    { populate: 'all' }
  )
})()

const doc = sceneGraphToDesignDocument(graph)

const t0 = Date.now()
const html = serializeHTML(doc)
const serializeMs = Date.now() - t0

const bytes = Buffer.byteLength(html, 'utf8')
const factBytes = [...html.matchAll(/data-op-[a-z-]+="[^"]*"/g)].reduce(
  (sum, m) => sum + m[0].length,
  0
)

console.log(`HTML:    ${(bytes / 1024 / 1024).toFixed(2)} MB (serialised in ${serializeMs}ms)`)
console.log(
  `Facts:   ${(factBytes / 1024 / 1024).toFixed(2)} MB of data-op-* ` +
    `(${((factBytes / bytes) * 100).toFixed(0)}% of output)`
)

const runtime = createHeadlessCSSRuntime()
const t1 = Date.now()
const reparsed = runtime.parseHTML(html)
console.log(`Parsed back in ${Date.now() - t1}ms`)

// The parsed document has attrs but no `design` field — prove that, because if the typed
// field somehow survived, this test would be measuring the model path again by accident.
let sawDesignField = 0
let elements = 0
const check = (node) => {
  if (node.type === 'element') {
    elements++
    if (node.design !== undefined) sawDesignField++
  }
  for (const child of node.children ?? []) check(child)
}
for (const child of reparsed.children) check(child)

console.log(`Elements: ${elements}, carrying a typed design field: ${sawDesignField}`)
if (sawDesignField > 0) {
  console.error('\nThe parsed document has typed design fields — this is not the attribute path.')
  process.exit(1)
}

const rebuilt = designDocumentToSceneGraph(reparsed)

// Pair against the ORIGINAL document, whose sourceSceneNodeId still points at real nodes.
// The reparsed document has the ids only as attributes, so reuse the original tree shape.
const { pairs, dropped } = pairNodes(graph, doc, rebuilt)
const { rows, typeChanges } = propertyStats(pairs)
const total = overall(rows)

console.log(`\nPaired ${pairs.length} nodes${dropped.length ? `, ${dropped.length} dropped` : ''}`)
console.log(
  `Overall: ${(total.rate * 100).toFixed(2)}% (${total.survived}/${total.present}) through HTML text`
)

if (typeChanges.size) {
  console.log('\nType changes:')
  for (const [k, n] of [...typeChanges.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(n).padStart(6)}  ${k}`)
  }
}

console.log('\nWorst properties through HTML text:')
for (const row of rows.slice(0, 15)) {
  console.log(
    `  ${String(row.lost).padStart(6)} /${String(row.present).padStart(7)}  ` +
      `${(row.rate * 100).toFixed(0).padStart(3)}%  ${row.prop}`
  )
}
