import { omit } from 'es-toolkit/object'

import type { SceneNode } from './types'

export function removeStaleBindings(
  node: SceneNode,
  field: 'fills' | 'strokes',
  changes: Partial<SceneNode>
): void {
  const length = node[field].length
  const stale = Object.keys(node.boundVariables).filter((key) => {
    if (key === field) return true
    if (!key.startsWith(`${field}/`)) return false
    const index = Number.parseInt(key.split('/')[1] ?? '', 10)
    return Number.isNaN(index) || index < 0 || index >= length
  })
  if (stale.length === 0) return
  node.boundVariables = omit(node.boundVariables, stale)
  changes.boundVariables = { ...node.boundVariables }
}
