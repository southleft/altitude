import type { SceneGraph } from '@open-pencil/scene-graph'

import type { EditorStore } from '@/app/editor/session'
import {
  closeTab,
  failPreparation,
  getTabForStore,
  reusableTabStore,
  showImportedGraph,
  switchTab
} from '@/app/tabs'

/**
 * Open a document read from an external source (such as GitHub) in a reusable tab, or
 * reload it into `target`. `bind` attaches the source once the graph is shown.
 */
export async function openExternalDocumentInTab(options: {
  name: string
  target?: EditorStore
  read: (signal: AbortSignal) => Promise<SceneGraph>
  bind: (store: EditorStore) => void | Promise<void>
}): Promise<EditorStore> {
  const { store, created } = options.target
    ? { store: options.target, created: false }
    : reusableTabStore()
  if (options.target) {
    const tab = getTabForStore(options.target)
    if (tab) switchTab(tab.id)
  }
  store.state.documentName = options.name
  const load = store.preparationController.begin({ kind: 'storage-open', subject: options.name })
  let succeeded = false
  try {
    load.update({ phase: 'reading', detail: options.name })
    const graph = await options.read(load.signal)
    load.signal.throwIfAborted()
    await showImportedGraph(store, graph, () => options.bind(store), load)
    succeeded = true
    return store
  } catch (error) {
    failPreparation(load, 'read-failed', error)
    if (created) {
      const tab = getTabForStore(store)
      if (tab) await closeTab(tab.id)
    }
    throw error
  } finally {
    if (succeeded) load.complete()
  }
}
