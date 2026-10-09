import { tryOnScopeDispose, useLocalStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import { createFollowActions, generateRoomId } from '@/app/collab/awareness'
import type { CollabEngine } from '@/app/collab/engine'
import { localCollabUser } from '@/app/collab/identity'
import { createLocalAwarenessActions } from '@/app/collab/local-awareness'
import { createCollabRuntime, createInitialCollabState } from '@/app/collab/state'
import { DEFAULT_COLLAB_STATE, type CollabState, type RemotePeer } from '@/app/collab/types'
import type { EditorStore } from '@/app/editor/active-store'
import { githubIdentity } from '@/app/integrations/storage/github/identity'

export { COLLAB_KEY, useCollabInjected } from '@/app/collab/context'
export { DEFAULT_COLLAB_STATE }
export type { CollabState, RemotePeer }

export function useCollab(storeOrGetter: EditorStore | (() => EditorStore)) {
  const getStore = () =>
    typeof storeOrGetter === 'function' ? (storeOrGetter as () => EditorStore)() : storeOrGetter
  const storedName = useLocalStorage('op-collab-name', '')
  const state = ref<CollabState>(createInitialCollabState(storedName.value))
  const runtime = createCollabRuntime()
  const remotePeers = computed(() => state.value.peers)
  const getActiveStore = () => runtime.connectedStore ?? getStore()

  const { followingPeer, followPeer, resetFollow, tickFollow } = createFollowActions(
    getActiveStore,
    () => runtime.awareness
  )
  const { broadcastAwareness, updateCursor, updateSelection, updatePeersList, setLocalName } =
    createLocalAwarenessActions({
      state,
      storedName,
      getStore: getActiveStore,
      getAwareness: () => runtime.awareness
    })

  // Signing in or out of GitHub changes the name and avatar peers see.
  watch(githubIdentity, broadcastAwareness)
  /** What peers see for this tab: the GitHub identity when signed in. */
  const localUser = computed(() =>
    localCollabUser(state.value.localName, state.value.localColor, githubIdentity.value)
  )

  let engine: CollabEngine | undefined
  let engineLoad: Promise<CollabEngine> | undefined
  // Bumped by every connect and disconnect, so a session requested before the engine
  // finished loading is dropped if the user has already moved on.
  let sessionRequest = 0

  function loadEngine(): Promise<CollabEngine> {
    engineLoad ??= import('@/app/collab/engine').then(({ createCollabEngine }) => {
      engine = createCollabEngine({
        runtime,
        state,
        getStore,
        getActiveStore,
        updatePeersList,
        tickFollow,
        broadcastAwareness,
        resetFollow
      })
      return engine
    })
    return engineLoad
  }

  function startSession(roomId: string, shareDocument: boolean): void {
    const request = ++sessionRequest
    // A session reports itself connected as soon as it is requested, as it did when the
    // engine was loaded up front; the room transport connects peers afterwards either way.
    state.value.roomId = roomId
    state.value.connected = true
    loadEngine()
      .then((loaded) => {
        const current = request === sessionRequest
        if (current) loaded.connect(roomId)
        if (current && shareDocument) loaded.syncAllNodesToYjs()
        return current
      })
      .catch((error: unknown) => {
        console.error('[Collab] Failed to start the collaboration session', error)
        if (!engine) engineLoad = undefined
        if (request === sessionRequest) disconnect()
      })
  }

  function connect(roomId: string) {
    startSession(roomId, false)
  }

  function disconnect() {
    sessionRequest++
    if (engine) {
      engine.disconnect()
      return
    }
    // Nothing was connected yet; settle the same visible state a disconnect leaves.
    resetFollow()
    state.value.connected = false
    state.value.roomId = null
    state.value.peers = []
    const store = getStore()
    store.state.remoteCursors = []
    store.requestRender()
  }

  function shareCurrentDoc(): string {
    const roomId = generateRoomId()
    startSession(roomId, true)
    return roomId
  }

  tryOnScopeDispose(disconnect)

  return {
    state,
    localUser,
    /** Start loading the engine ahead of a session, e.g. on a `/share/:roomId` link. */
    preload: () => void loadEngine().catch(() => undefined),
    remotePeers,
    followingPeer,
    connect,
    disconnect,
    shareCurrentDoc,
    updateCursor,
    updateSelection,
    setLocalName,
    followPeer,
    tickFollow
  }
}
