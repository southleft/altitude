import { computed, ref } from 'vue'

import type { Editor } from '@open-pencil/core/editor'

/**
 * Content-only revisions: viewport repainting and recovery never mark a document saved.
 * Layout recomputation and lazy page population change the graph without changing the
 * document (a page switch or a font load would otherwise look like an edit), so they do not
 * advance the revision; the user edit that triggered a relayout already has.
 */
export function createDocumentChanges(editor: Editor) {
  const revision = ref(0)
  const savedRevision = ref(0)
  const dirty = computed(() => revision.value !== savedRevision.value)
  const changed = () => {
    revision.value++
  }
  const nodeChanged = () => {
    const graph = editor.graph
    if (graph.isApplyingLayout || graph.isApplyingDerivedMutations) return
    changed()
  }
  const unsubscribers = [
    editor.onEditorEvent('node:created', nodeChanged),
    editor.onEditorEvent('node:updated', nodeChanged),
    editor.onEditorEvent('node:deleted', nodeChanged),
    editor.onEditorEvent('node:reparented', nodeChanged),
    editor.onEditorEvent('node:reordered', nodeChanged),
    editor.onEditorEvent('graph:replaced', changed),
    editor.onEditorEvent('history:changed', changed)
  ]
  return {
    hasUnsavedChanges: () => dirty.value,
    /** The current content revision; reactive, so it can drive watchers. */
    capture: () => revision.value,
    markSaved: (version = revision.value) => {
      savedRevision.value = version
    },
    markChanged: changed,
    dispose: () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  }
}
