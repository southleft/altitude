import type { Vector } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

/** The editor surface a code edit session needs; the app store and a core editor both fit. */
export type CodeEditStore = Pick<
  EditorStore,
  | 'graph'
  | 'state'
  | 'snapshotPage'
  | 'restorePageFromSnapshot'
  | 'select'
  | 'requestRender'
  | 'pushUndoEntry'
  | 'viewportCanvasCenter'
>

/**
 * A live code edit scoped to the canvas selection.
 *
 * Every preview restores the original page snapshot, removes the selected layers and inserts
 * the freshly generated roots at the same parent and index. Everything outside the selection
 * is untouched, reset restores the snapshot exactly, and commit records one undo step.
 */
export type CodeEditSession = {
  originalSnapshot: ReturnType<EditorStore['snapshotPage']>
  originalSelectionIds: string[]
  targetParentId: string
  targetIndex: number
  origins: Vector[]
  fallbackOrigin: Vector
  previewSnapshot: ReturnType<EditorStore['snapshotPage']> | null
  previewNodeIds: string[]
}

export type CodePreviewResult = { ok: true; nodeIds: string[] } | { ok: false; error: string }

/** Inserts one generated root under `parentId` and returns its id. */
export type InsertCodeRoot = (
  parentId: string,
  origin: Vector,
  index: number
) => string | Promise<string>

function lockedSelectionError(store: CodeEditStore, ids: string[]): string | null {
  const locked = ids.some((id) => {
    const node = store.graph.getNode(id)
    if (node?.locked) return true
    return [...store.graph.getAllNodes()].some(
      (candidate) => candidate.locked && store.graph.isDescendant(candidate.id, id)
    )
  })
  return locked ? 'Unlock the selected layers and their contents before editing code.' : null
}

export function createCodeEditSession(
  store: CodeEditStore
): { ok: true; session: CodeEditSession } | { ok: false; error: string } {
  const selected = [...store.state.selectedIds]
    .map((id) => store.graph.getNode(id))
    .filter((node) => node !== undefined)
    .sort((left, right) => {
      if (left.parentId !== right.parentId) return left.id.localeCompare(right.id)
      const parent = left.parentId ? store.graph.getNode(left.parentId) : undefined
      return (parent?.childIds.indexOf(left.id) ?? 0) - (parent?.childIds.indexOf(right.id) ?? 0)
    })
  const lockedError = lockedSelectionError(
    store,
    selected.map(({ id }) => id)
  )
  if (lockedError) return { ok: false, error: lockedError }
  const parentIds = new Set(selected.map(({ parentId }) => parentId ?? store.state.currentPageId))
  if (parentIds.size > 1) {
    return { ok: false, error: 'Select layers with the same parent before editing code.' }
  }
  const first = selected.at(0)
  const targetParentId = first?.parentId ?? store.state.currentPageId
  const targetIndex = first
    ? (store.graph.getNode(targetParentId)?.childIds.indexOf(first.id) ?? -1)
    : -1
  return {
    ok: true,
    session: {
      originalSnapshot: store.snapshotPage(),
      originalSelectionIds: selected.map(({ id }) => id),
      targetParentId,
      targetIndex,
      origins: selected.map(({ x, y }) => ({ x, y })),
      fallbackOrigin: first ? { x: first.x, y: first.y } : store.viewportCanvasCenter(),
      previewSnapshot: null,
      previewNodeIds: []
    }
  }
}

/** Origin for the root at `index`: the replaced layer's position, else a staggered fallback. */
export function codeRootOrigin(session: CodeEditSession, index: number): Vector {
  return (
    session.origins.at(index) ?? {
      x: session.fallbackOrigin.x + index * 24,
      y: session.fallbackOrigin.y + index * 24
    }
  )
}

/**
 * Replace the session's selection with `count` generated roots.
 *
 * `afterInsert` runs once all roots exist, before the preview snapshot is taken, so callers can
 * lay out the page. On failure the last good preview (or the original) is restored.
 */
export async function replaceCodeSelection(
  store: CodeEditStore,
  session: CodeEditSession,
  count: number,
  insert: InsertCodeRoot,
  afterInsert: (nodeIds: string[]) => void
): Promise<CodePreviewResult> {
  store.restorePageFromSnapshot(session.originalSnapshot)
  try {
    for (const id of session.originalSelectionIds) store.graph.deleteNode(id)
    const nodeIds: string[] = []
    for (let index = 0; index < count; index += 1) {
      const id = await insert(session.targetParentId, codeRootOrigin(session, index), index)
      nodeIds.push(id)
      if (session.targetIndex >= 0) {
        store.graph.insertChildAt(id, session.targetParentId, session.targetIndex + index)
      }
    }
    afterInsert(nodeIds)
    store.select(nodeIds)
    store.requestRender()
    session.previewSnapshot = store.snapshotPage()
    session.previewNodeIds = nodeIds
    return { ok: true, nodeIds }
  } catch (error) {
    store.restorePageFromSnapshot(session.previewSnapshot ?? session.originalSnapshot)
    store.select(
      session.previewNodeIds.length > 0 ? session.previewNodeIds : session.originalSelectionIds
    )
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function resetCodeEditPreview(store: CodeEditStore, session: CodeEditSession): void {
  store.restorePageFromSnapshot(session.originalSnapshot)
  store.select(session.originalSelectionIds)
  session.previewSnapshot = null
  session.previewNodeIds = []
}

export function commitCodeEditSession(
  store: CodeEditStore,
  session: CodeEditSession,
  labels: { edit: string; insert: string }
): void {
  const after = session.previewSnapshot
  if (!after) return
  const previewIds = [...session.previewNodeIds]
  const originalSnapshot = session.originalSnapshot
  const originalSelectionIds = [...session.originalSelectionIds]
  store.pushUndoEntry({
    label: originalSelectionIds.length > 0 ? labels.edit : labels.insert,
    forward: () => {
      store.restorePageFromSnapshot(after)
      store.select(previewIds)
    },
    inverse: () => {
      store.restorePageFromSnapshot(originalSnapshot)
      store.select(originalSelectionIds)
    }
  })
}
