import type { TreeNode } from '@open-pencil/core/design-jsx'
import { renderTree } from '@open-pencil/core/design-jsx'
import { computeAllLayouts } from '@open-pencil/core/layout'

import { convertDesignJSXRoots } from '@/app/code/sandbox/convert'
import { evaluateDesignJSX } from '@/app/code/sandbox/evaluate'
import {
  commitCodeEditSession,
  createCodeEditSession,
  replaceCodeSelection,
  resetCodeEditPreview,
  type CodeEditSession,
  type CodeEditStore,
  type CodePreviewResult
} from '@/app/code/selection-session'

export type ApplyDesignJSXResult = CodePreviewResult
export type DesignJSXEditSession = CodeEditSession

export const createDesignJSXEditSession = createCodeEditSession

export async function previewDesignJSX(
  store: CodeEditStore,
  session: DesignJSXEditSession,
  source: string
): Promise<ApplyDesignJSXResult> {
  const evaluated = await evaluateDesignJSX(source)
  if (!evaluated.ok) return evaluated

  let roots: TreeNode[]
  try {
    roots = convertDesignJSXRoots(evaluated.roots)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }

  return replaceCodeSelection(
    store,
    session,
    roots.length,
    async (parentId, origin, index) => {
      const root = roots.at(index)
      if (!root) throw new Error('Design JSX root is missing.')
      const result = await renderTree(store.graph, root, { parentId, x: origin.x, y: origin.y })
      return result.id
    },
    () => computeAllLayouts(store.graph, store.state.currentPageId)
  )
}

export function resetDesignJSXPreview(store: CodeEditStore, session: DesignJSXEditSession): void {
  resetCodeEditPreview(store, session)
}

export function commitDesignJSXSession(store: CodeEditStore, session: DesignJSXEditSession): void {
  commitCodeEditSession(store, session, { edit: 'Edit JSX', insert: 'Insert JSX' })
}
