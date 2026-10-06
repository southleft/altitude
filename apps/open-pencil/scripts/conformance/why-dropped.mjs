#!/usr/bin/env bun
/**
 * Classify why nodes never reached the CSS bridge.
 *
 * "87% of nodes dropped" is only alarming if the drops are defects. The bridge
 * deliberately skips hidden and internal-only nodes, and skipping a hidden layer is
 * correct. This separates the two so the headline number means something.
 *
 *   bun scripts/conformance/why-dropped.mjs <file.fig>
 */

import { readFileSync } from 'node:fs'
import { parseFigFile } from '@open-pencil/core/io/formats/fig'

const file = process.argv[2]
if (!file) {
  console.error('usage: bun scripts/conformance/why-dropped.mjs <file.fig>')
  process.exit(2)
}

const bytes = readFileSync(file)
const graph = await parseFigFile(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  { populate: 'all' }
)

const all = [...graph.nodes.values()]

/** Walk to the root, reporting the first ancestor (or self) the bridge would refuse. */
function refusedBy(node) {
  let cur = node
  let depth = 0
  while (cur && depth++ < 200) {
    if (!cur.visible) return cur === node ? 'self-hidden' : 'ancestor-hidden'
    if (cur.internalOnly) return cur === node ? 'self-internal' : 'ancestor-internal'
    cur = cur.parentId ? graph.getNode(cur.parentId) : null
  }
  return null
}

/**
 * TEXT nodes return before recursing, so their element descendants are unreachable
 * even when everything on the path is visible. That one is a real structural drop.
 */
function underText(node) {
  let cur = node.parentId ? graph.getNode(node.parentId) : null
  let depth = 0
  while (cur && depth++ < 200) {
    if (cur.type === 'TEXT') return true
    cur = cur.parentId ? graph.getNode(cur.parentId) : null
  }
  return false
}

const buckets = new Map()
const bump = (k) => buckets.set(k, (buckets.get(k) ?? 0) + 1)

for (const n of all) {
  if (n.type === 'DOCUMENT') {
    bump('document root (n/a)')
    continue
  }
  const refused = refusedBy(n)
  if (refused) bump(refused)
  else if (underText(n)) bump('inside a TEXT node')
  else bump('REACHABLE')
}

console.log(`Total nodes: ${all.length}\n`)
const rows = [...buckets.entries()].sort((a, b) => b[1] - a[1])
for (const [k, n] of rows) {
  const pct = ((n / all.length) * 100).toFixed(1)
  console.log(`${String(n).padStart(7)}  ${pct.padStart(5)}%  ${k}`)
}

const reachable = buckets.get('REACHABLE') ?? 0
const byDesign =
  (buckets.get('self-hidden') ?? 0) +
  (buckets.get('ancestor-hidden') ?? 0) +
  (buckets.get('self-internal') ?? 0) +
  (buckets.get('ancestor-internal') ?? 0)

/**
 * --roots: name the subtree roots that account for the skipped nodes. For a design
 * system file this answers the question that matters — whether the component library
 * itself is reachable, or is sitting under an internal root the bridge refuses.
 */
if (process.argv.includes('--roots')) {
  const roots = []
  for (const n of all) {
    if (!n.internalOnly && n.visible) continue
    const p = n.parentId ? graph.getNode(n.parentId) : null
    // A root is a refused node whose parent is NOT itself refused.
    if (p && (p.internalOnly || !p.visible)) continue
    roots.push(n)
  }

  const subtreeSize = (node) => {
    let count = 0
    const stack = [node.id]
    while (stack.length) {
      const cur = graph.getNode(stack.pop())
      if (!cur) continue
      count++
      for (const id of cur.childIds ?? []) stack.push(id)
    }
    return count
  }

  const sized = roots
    .map((r) => ({ node: r, size: subtreeSize(r) }))
    .sort((a, b) => b.size - a.size)

  console.log(`\n=== REFUSED SUBTREE ROOTS (${roots.length}) ===`)
  const byType = new Map()
  for (const r of roots) byType.set(r.type, (byType.get(r.type) ?? 0) + 1)
  for (const [t, c] of [...byType].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(c).padStart(6)}  ${t}`)
  }

  console.log('\nLargest refused subtrees:')
  for (const { node, size } of sized.slice(0, 15)) {
    const why = !node.visible ? 'hidden' : 'internal'
    console.log(
      `  ${String(size).padStart(7)} nodes  ${why.padEnd(8)} ${node.type.padEnd(14)} ` +
        JSON.stringify(node.name ?? '').slice(0, 50)
    )
  }
}

console.log(`\nReachable by the bridge: ${reachable}`)
console.log(`Skipped by design (hidden/internal): ${byDesign}`)
console.log(`Unexplained: ${all.length - reachable - byDesign - (buckets.get('document root (n/a)') ?? 0) - (buckets.get('inside a TEXT node') ?? 0)}`)
