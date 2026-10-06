/**
 * Full HTML-text round trip, at scale.
 *
 * `roundtrip.ts` measures the MODEL path, which skips serialisation entirely. This one goes all
 * the way out to markup and back:
 *
 *   .fig -> SceneGraph -> DesignDocument -> HTML string -> parse -> SceneGraph
 *
 * That extra leg is where `element.design` is destroyed and only `data-op-*` attributes
 * survive, so it is the only measurement that proves the attribute encoding carries the facts
 * in bulk — attribute size, quote escaping inside JSON and parser limits only show up there.
 * It also reports output size, because markup nobody can read defeats the purpose.
 *
 *   bun tools/conformance/src/html-roundtrip.ts [file.fig]
 */

import { basename } from 'node:path'

import {
  createHeadlessCSSRuntime,
  designDocumentToSceneGraph,
  sceneGraphToDesignDocument,
  serializeHTML,
  type DesignNode,
  type ImportDegradation
} from '@open-pencil/dom-css'

import { overall, pairNodes, propertyStats } from './core'
import { loadFigGraph } from './fig'
import { buildSyntheticFixture } from './synthetic-fixture'

const figPath = process.argv.slice(2).find((arg) => !arg.startsWith('--'))

console.log(
  figPath
    ? `Fixture: ${basename(figPath)}`
    : 'Fixture: synthetic (pass a .fig path to use a real file)'
)
const graph = figPath ? await loadFigGraph(figPath) : buildSyntheticFixture()

const doc = sceneGraphToDesignDocument(graph)

const serializeStarted = Date.now()
const html = serializeHTML(doc)
const serializeMs = Date.now() - serializeStarted

const size = Buffer.byteLength(html, 'utf8')
const factBytes = [...html.matchAll(/data-op-[a-z-]+="[^"]*"/g)].reduce(
  (sum, match) => sum + match[0].length,
  0
)
const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)

console.log(`HTML:    ${megabytes(size)} MB (serialised in ${serializeMs}ms)`)
console.log(
  `Facts:   ${megabytes(factBytes)} MB of data-op-* (${((factBytes / size) * 100).toFixed(0)}% of output)`
)

const runtime = createHeadlessCSSRuntime()
const parseStarted = Date.now()
const reparsed = runtime.parseHTML(html)
console.log(`Parsed back in ${Date.now() - parseStarted}ms`)

// The parsed document has attrs but no `design` field — prove that, because if the typed field
// somehow survived, this would be measuring the model path again by accident.
let typedFacts = 0
let elements = 0
const check = (node: DesignNode): void => {
  if (node.type !== 'element') return
  elements++
  if (node.design !== undefined) typedFacts++
  for (const child of node.children) check(child)
}
for (const child of reparsed.children) check(child)

console.log(`Elements: ${elements}, carrying a typed design field: ${typedFacts}`)
if (typedFacts > 0) {
  console.error('\nThe parsed document has typed design fields — this is not the attribute path.')
  process.exit(1)
}

const degradations: ImportDegradation[] = []
const rebuilt = designDocumentToSceneGraph(reparsed, { degradations })

// Pair against the ORIGINAL document, whose sourceSceneNodeId still points at real nodes.
const { pairs, dropped } = pairNodes(graph, doc, rebuilt)
const { rows, typeChanges } = propertyStats(pairs)
const total = overall(rows)

console.log(`\nPaired ${pairs.length} nodes${dropped.length ? `, ${dropped.length} dropped` : ''}`)
console.log(
  `Overall: ${(total.rate * 100).toFixed(2)}% (${total.survived}/${total.present}) through HTML text`
)
console.log(`Named degradations: ${degradations.length}`)

if (typeChanges.size) {
  console.log('\nType changes:')
  for (const [key, count] of [...typeChanges.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(count).padStart(6)}  ${key}`)
  }
}

console.log('\nWorst properties through HTML text:')
for (const row of rows.slice(0, 15)) {
  console.log(
    `  ${String(row.lost).padStart(6)} /${String(row.present).padStart(7)}  ` +
      `${(row.rate * 100).toFixed(0).padStart(3)}%  ${row.prop}`
  )
}
