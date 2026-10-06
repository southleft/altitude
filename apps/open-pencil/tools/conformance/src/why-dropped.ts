/**
 * Classify why nodes never reached the CSS bridge.
 *
 * "87% of nodes dropped" is only alarming if the drops are defects. The bridge deliberately
 * skips hidden and internal-only nodes, and skipping a hidden layer is correct. This separates
 * the two so the headline number means something.
 *
 *   bun tools/conformance/src/why-dropped.ts <file.fig> [--roots]
 */

import type { SceneNode } from '@open-pencil/scene-graph'

import { loadFigGraph, requireFigArgument } from './fig'
import { isUnderText, refusalReason, subtreeSize } from './reachability'

const file = requireFigArgument('bun tools/conformance/src/why-dropped.ts <file.fig> [--roots]')
const graph = await loadFigGraph(file)
const all = [...graph.nodes.values()]

const DOCUMENT_ROOT = 'document root (n/a)'
const UNDER_TEXT = 'inside a TEXT node'
const REACHABLE = 'REACHABLE'

const buckets = new Map<string, number>()
const bump = (key: string) => buckets.set(key, (buckets.get(key) ?? 0) + 1)

for (const node of all) {
  if (node.type === 'DOCUMENT') bump(DOCUMENT_ROOT)
  else bump(refusalReason(graph, node) ?? (isUnderText(graph, node) ? UNDER_TEXT : REACHABLE))
}

console.log(`Total nodes: ${all.length}\n`)
for (const [key, count] of [...buckets.entries()].sort((a, b) => b[1] - a[1])) {
  const pct = ((count / all.length) * 100).toFixed(1)
  console.log(`${String(count).padStart(7)}  ${pct.padStart(5)}%  ${key}`)
}

const count = (key: string) => buckets.get(key) ?? 0
const reachable = count(REACHABLE)
const byDesign =
  count('self-hidden') +
  count('ancestor-hidden') +
  count('self-internal') +
  count('ancestor-internal')

/**
 * --roots: name the subtree roots that account for the skipped nodes. For a design-system file
 * this answers whether the component library itself is reachable, or sits under an internal
 * root the bridge refuses.
 */
if (process.argv.includes('--roots')) {
  const refused = (node: SceneNode | undefined) => !!node && (node.internalOnly || !node.visible)
  const roots = all.filter((node) => {
    if (!refused(node)) return false
    const parent = node.parentId ? graph.getNode(node.parentId) : undefined
    // A root is a refused node whose parent is NOT itself refused.
    return !refused(parent)
  })

  console.log(`\n=== REFUSED SUBTREE ROOTS (${roots.length}) ===`)
  const byType = new Map<string, number>()
  for (const root of roots) byType.set(root.type, (byType.get(root.type) ?? 0) + 1)
  for (const [type, total] of [...byType].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(total).padStart(6)}  ${type}`)
  }

  console.log('\nLargest refused subtrees:')
  const sized = roots
    .map((node) => ({ node, size: subtreeSize(graph, node) }))
    .sort((a, b) => b.size - a.size)
  for (const { node, size } of sized.slice(0, 15)) {
    const why = node.visible ? 'internal' : 'hidden'
    console.log(
      `  ${String(size).padStart(7)} nodes  ${why.padEnd(8)} ${node.type.padEnd(14)} ` +
        JSON.stringify(node.name).slice(0, 50)
    )
  }
}

console.log(`\nReachable by the bridge: ${reachable}`)
console.log(`Skipped by design (hidden/internal): ${byDesign}`)
console.log(
  `Unexplained: ${all.length - reachable - byDesign - count(DOCUMENT_ROOT) - count(UNDER_TEXT)}`
)
