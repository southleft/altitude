import type { Ref } from 'vue'

import { createCollabConnectionActions } from '@/app/collab/session'
import type { CollabRuntime } from '@/app/collab/state'
import type { CollabState } from '@/app/collab/types'
import { createYjsGraphSync } from '@/app/collab/yjs-sync'
import type { EditorStore } from '@/app/editor/active-store'

export interface CollabEngineOptions {
  runtime: CollabRuntime
  state: Ref<CollabState>
  getStore: () => EditorStore
  getActiveStore: () => EditorStore
  updatePeersList: () => void
  tickFollow: () => void
  broadcastAwareness: () => void
  resetFollow: () => void
}

/**
 * The Yjs, awareness and transport half of collaboration. `useCollab` loads this module
 * only when a session starts, so Yjs, y-indexeddb, Trystero and MQTT stay out of startup.
 */
export function createCollabEngine(options: CollabEngineOptions) {
  const { runtime } = options
  const { syncNodeToYjs, syncAllNodesToYjs, applyYjsToGraph } = createYjsGraphSync({
    getStore: options.getActiveStore,
    getYdoc: () => runtime.ydoc,
    getYnodes: () => runtime.ynodes,
    getYimages: () => runtime.yimages,
    setSuppressYjsEvents: (value) => {
      runtime.suppressYjsEvents = value
    }
  })
  const { connect, disconnect } = createCollabConnectionActions({
    runtime,
    state: options.state,
    getStore: options.getStore,
    updatePeersList: options.updatePeersList,
    tickFollow: options.tickFollow,
    broadcastAwareness: options.broadcastAwareness,
    applyYjsToGraph,
    syncNodeToYjs,
    resetFollow: options.resetFollow
  })
  return { connect, disconnect, syncAllNodesToYjs }
}

export type CollabEngine = ReturnType<typeof createCollabEngine>
