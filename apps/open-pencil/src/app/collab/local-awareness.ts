import type { Ref } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import { collabAvatars, type AvatarCache } from '@/app/collab/avatars'
import { buildRemotePeers, remotePeersToCursors } from '@/app/collab/awareness'
import { localCollabUser } from '@/app/collab/identity'
import type { CollabState } from '@/app/collab/types'
import type { EditorStore } from '@/app/editor/active-store'
import { githubIdentity, type GitHubIdentity } from '@/app/integrations/storage/github/identity'

/** What presence updates touch on the editor store. */
type AwarenessStore = {
  state: Pick<EditorStore['state'], 'remoteCursors' | 'currentPageId' | 'zoom'>
  requestRender(): void
}

type LocalAwarenessOptions = {
  state: Ref<CollabState>
  storedName: Ref<string>
  getStore: () => AwarenessStore
  getAwareness: () => Awareness | null
  /** The signed-in GitHub account, if any; its name and avatar replace the local name. */
  getIdentity?: () => GitHubIdentity | null
  avatars?: AvatarCache
}

export function createLocalAwarenessActions({
  state,
  storedName,
  getStore,
  getAwareness,
  getIdentity = () => githubIdentity.value,
  avatars = collabAvatars
}: LocalAwarenessOptions) {
  function broadcastAwareness() {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField(
      'user',
      localCollabUser(state.value.localName, state.value.localColor, getIdentity())
    )
  }

  function updateCursor(x: number, y: number, pageId: string) {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField('cursor', { x, y, pageId, zoom: getStore().state.zoom })
  }

  function updateSelection(ids: string[]) {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField('selection', ids)
  }

  function updatePeersList() {
    const awareness = getAwareness()
    if (!awareness) return

    const store = getStore()
    const peers = buildRemotePeers(
      awareness.getStates() as Map<number, Record<string, unknown>>,
      awareness.clientID
    )

    state.value.peers = peers
    store.state.remoteCursors = remotePeersToCursors(peers, store.state.currentPageId, (url) => {
      const bytes = avatars.peek(url)
      // Draw without the avatar until it loads, then repaint once with it.
      if (bytes === undefined) {
        void avatars.request(url).then((loaded) => {
          if (loaded) updatePeersList()
          return loaded
        })
      }
      return bytes ?? undefined
    })
    store.requestRender()
  }

  function setLocalName(name: string) {
    state.value.localName = name
    storedName.value = name
    broadcastAwareness()
  }

  return { broadcastAwareness, updateCursor, updateSelection, updatePeersList, setLocalName }
}
