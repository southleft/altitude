#!/usr/bin/env bun
/**
 * Is the component library actually reachable by the CSS bridge?
 *
 * `why-dropped --roots` shows one internal CANVAS ("Internal Only Canvas") holding 83%
 * of the file. The favourable reading is that it is Figma's backing store for published
 * library components — duplicates of the real thing — and that the working library sits
 * on normal pages and IS reachable. The unfavourable reading is that the real library is
 * in there and the bridge cannot see it.
 *
 * Naming the reachable component sets settles it: if they read like the design system,
 * the bridge sees the design system.
 *
 *   bun scripts/conformance/reachable-library.mjs <file.fig>
 */

import { readFileSync } from 'node:fs'
import { parseFigFile } from '@open-pencil/core/io/formats/fig'

const file = process.argv[2]
if (!file) {
  console.error('usage: bun scripts/conformance/reachable-library.mjs <file.fig>')
  process.exit(2)
}

const bytes = readFileSync(file)
const graph = await parseFigFile(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  { populate: 'all' }
)

const refused = (node) => {
  let cur = node
  let depth = 0
  while (cur && depth++ < 200) {
    if (!cur.visible || cur.internalOnly) return true
    cur = cur.parentId ? graph.getNode(cur.parentId) : null
  }
  return false
}

const all = [...graph.nodes.values()]
const sets = all.filter((n) => n.type === 'COMPONENT_SET')
const reachableSets = sets.filter((n) => !refused(n))
const hiddenSets = sets.filter((n) => refused(n))

const variantsOf = (set) =>
  (set.childIds ?? []).map((id) => graph.getNode(id)).filter((n) => n?.type === 'COMPONENT').length

console.log(`COMPONENT_SET total: ${sets.length}`)
console.log(`  reachable: ${reachableSets.length}`)
console.log(`  refused:   ${hiddenSets.length}\n`)

console.log('=== REACHABLE COMPONENT SETS ===')
for (const s of reachableSets.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))) {
  console.log(`  ${String(variantsOf(s)).padStart(4)} variants  ${s.name}`)
}

// Do the refused sets duplicate the reachable ones by name?
const reachableNames = new Set(reachableSets.map((s) => (s.name ?? '').trim().toLowerCase()))
const refusedNames = hiddenSets.map((s) => (s.name ?? '').trim().toLowerCase())
const dupes = refusedNames.filter((n) => reachableNames.has(n))
const uniqueRefused = [...new Set(refusedNames.filter((n) => !reachableNames.has(n)))]

console.log(`\n=== REFUSED SETS vs REACHABLE ===`)
console.log(`${dupes.length} of ${refusedNames.length} refused sets duplicate a reachable name`)
console.log(`${uniqueRefused.length} distinct names exist ONLY behind the refusal boundary`)
if (uniqueRefused.length) {
  console.log('\nOnly-internal set names (first 30) — these would be genuinely invisible:')
  for (const n of uniqueRefused.slice(0, 30)) console.log(`  ${n}`)
}
