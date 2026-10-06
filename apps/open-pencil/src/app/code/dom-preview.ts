import { computeAllLayouts } from '@open-pencil/core/layout'
import { browserHTMLToSceneGraph } from '@open-pencil/dom-css/browser'
import type { SceneGraph, SceneNode, Vector } from '@open-pencil/scene-graph'
import { cloneNodeProps } from '@open-pencil/scene-graph/copy'

import {
  commitCodeEditSession,
  createCodeEditSession,
  replaceCodeSelection,
  resetCodeEditPreview,
  type CodeEditSession,
  type CodeEditStore,
  type CodePreviewResult
} from '@/app/code/selection-session'

export type DOMCodeSession = CodeEditSession

/** Turns HTML/CSS source into a standalone graph whose first page holds the roots. */
export type ParseDOMCode = (source: string) => Promise<SceneGraph>

const parseInBrowser: ParseDOMCode = (source) =>
  browserHTMLToSceneGraph(source, { pageName: 'Code preview' })

export const createDOMCodeSession = createCodeEditSession

/**
 * Copy one imported root, with its subtree, into the editor graph.
 *
 * Bindings are kept only for variables the document already defines: markup recovers variable
 * identity, not values, and a binding to a variable the document lacks resolves to nothing.
 */
function copyImportedTree(
  source: SceneGraph,
  target: SceneGraph,
  root: SceneNode,
  parentId: string,
  origin: Vector,
  copiedIds: Map<string, string>
): string {
  const copy = (node: SceneNode, nextParentId: string, position?: Vector): string => {
    const props = cloneNodeProps(node, null)
    const boundVariables = Object.fromEntries(
      Object.entries(node.boundVariables).filter(([, variableId]) =>
        target.variables.has(variableId)
      )
    )
    const created = target.createNode(node.type, nextParentId, {
      ...props,
      ...position,
      boundVariables,
      childIds: []
    })
    copiedIds.set(node.id, created.id)
    for (const childId of node.childIds) {
      const child = source.getNode(childId)
      if (child) copy(child, created.id)
    }
    return created.id
  }
  return copy(root, parentId, origin)
}

/** Point copied instances at copied components when both came from the same snippet. */
function remapComponentIds(target: SceneGraph, copiedIds: Map<string, string>): void {
  for (const id of copiedIds.values()) {
    const node = target.getNode(id)
    const componentId = node?.componentId ? copiedIds.get(node.componentId) : undefined
    if (componentId) target.updateNode(id, { componentId })
  }
}

/**
 * Preview HTML/CSS against the canvas selection.
 *
 * Only the selected layers are replaced; the rest of the document stays as it was. With no
 * selection the markup is inserted on the current page.
 */
export async function previewDOMCode(
  store: CodeEditStore,
  session: DOMCodeSession,
  source: string,
  parse: ParseDOMCode = parseInBrowser
): Promise<CodePreviewResult> {
  let imported: SceneGraph
  try {
    imported = await parse(source)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
  const page = imported.getPages().at(0)
  const roots = (page?.childIds ?? [])
    .map((id) => imported.getNode(id))
    .filter((node): node is SceneNode => node !== undefined)
  if (roots.length === 0) return { ok: false, error: 'The HTML did not produce any layers.' }

  const copiedIds = new Map<string, string>()
  return replaceCodeSelection(
    store,
    session,
    roots.length,
    (parentId, origin, index) => {
      const root = roots.at(index)
      if (!root) throw new Error('Imported HTML root is missing.')
      return copyImportedTree(imported, store.graph, root, parentId, origin, copiedIds)
    },
    () => {
      remapComponentIds(store.graph, copiedIds)
      for (const [hash, bytes] of imported.images) {
        if (!store.graph.images.has(hash)) store.graph.images.set(hash, bytes)
      }
      computeAllLayouts(store.graph, store.state.currentPageId)
    }
  )
}

export function resetDOMCodePreview(store: CodeEditStore, session: DOMCodeSession): void {
  resetCodeEditPreview(store, session)
}

export function commitDOMCodeSession(store: CodeEditStore, session: DOMCodeSession): void {
  commitCodeEditSession(store, session, { edit: 'Edit HTML/CSS', insert: 'Insert HTML/CSS' })
}
