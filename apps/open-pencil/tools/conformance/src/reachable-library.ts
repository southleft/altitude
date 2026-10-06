/**
 * Is the component library actually reachable by the CSS bridge?
 *
 * A design-system file can hold most of its nodes under one internal canvas. The favourable
 * reading is that it is Figma's backing store for published components — duplicates of the
 * real thing — and that the working library sits on normal pages. Naming the reachable
 * component sets settles it: if they read like the design system, the bridge sees it.
 *
 *   bun tools/conformance/src/reachable-library.ts <file.fig>
 */

import type { SceneNode } from '@open-pencil/scene-graph'

import { loadFigGraph, requireFigArgument } from './fig'
import { refusalReason } from './reachability'

const file = requireFigArgument('bun tools/conformance/src/reachable-library.ts <file.fig>')
const graph = await loadFigGraph(file)

const sets = [...graph.nodes.values()].filter((node) => node.type === 'COMPONENT_SET')
const reachableSets = sets.filter((node) => refusalReason(graph, node) === null)
const refusedSets = sets.filter((node) => refusalReason(graph, node) !== null)

const variantsOf = (set: SceneNode) =>
  set.childIds.map((id) => graph.getNode(id)).filter((node) => node?.type === 'COMPONENT').length
const normalized = (node: SceneNode) => node.name.trim().toLowerCase()

console.log(`COMPONENT_SET total: ${sets.length}`)
console.log(`  reachable: ${reachableSets.length}`)
console.log(`  refused:   ${refusedSets.length}\n`)

console.log('=== REACHABLE COMPONENT SETS ===')
for (const set of reachableSets.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(`  ${String(variantsOf(set)).padStart(4)} variants  ${set.name}`)
}

// Do the refused sets duplicate the reachable ones by name?
const reachableNames = new Set(reachableSets.map(normalized))
const refusedNames = refusedSets.map(normalized)
const duplicates = refusedNames.filter((name) => reachableNames.has(name))
const onlyRefused = [...new Set(refusedNames.filter((name) => !reachableNames.has(name)))]

console.log('\n=== REFUSED SETS vs REACHABLE ===')
console.log(
  `${duplicates.length} of ${refusedNames.length} refused sets duplicate a reachable name`
)
console.log(`${onlyRefused.length} distinct names exist ONLY behind the refusal boundary`)
if (onlyRefused.length) {
  console.log('\nOnly-internal set names (first 30) — these would be genuinely invisible:')
  for (const name of onlyRefused.slice(0, 30)) console.log(`  ${name}`)
}
