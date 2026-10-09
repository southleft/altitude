import { ref } from 'vue'
import type * as awarenessProtocol from 'y-protocols/awareness'

import { randomIndex } from '@open-pencil/core/random'

import { parseCollabUser } from '@/app/collab/identity'
import type { EditorStore } from '@/app/editor/active-store'
import { PEER_COLORS, ROOM_ID_CHARS, ROOM_ID_LENGTH } from '@/constants'

import type { RemotePeer } from './types'

type Awareness = awarenessProtocol.Awareness

type CursorState = {
  x: number
  y: number
  pageId: string
  zoom?: number
}

export function buildRemotePeers(
  states: Map<number, Record<string, unknown>>,
  localClientId: number
): RemotePeer[] {
  const peers: RemotePeer[] = []

  states.forEach((peerState, clientId) => {
    if (clientId === localClientId) return
    const user = parseCollabUser(peerState.user)
    if (!user) return
    const peer: RemotePeer = {
      clientId,
      name: user.name || 'Anonymous',
      color: user.color || PEER_COLORS[clientId % PEER_COLORS.length],
      cursor: peerState.cursor as RemotePeer['cursor'],
      selection: peerState.selection as string[]
    }
    if (user.login) peer.login = user.login
    if (user.avatar) peer.avatarURL = user.avatar
    peers.push(peer)
  })

  return peers
}

type RemoteCursor = EditorStore['state']['remoteCursors'][number]

/** Avatar bytes for a URL once loaded; undefined while loading, failed or absent. */
export type AvatarLookup = (url: string) => Uint8Array | undefined

export function remotePeersToCursors(
  peers: RemotePeer[],
  currentPageId: string,
  avatar: AvatarLookup = () => undefined
) {
  return peers
    .filter((p) => p.cursor && p.cursor.pageId === currentPageId)
    .map((p) => {
      const cursor = p.cursor as NonNullable<RemotePeer['cursor']>
      const remote: RemoteCursor = {
        name: p.name,
        color: p.color,
        x: cursor.x,
        y: cursor.y,
        selection: p.selection
      }
      const bytes = p.avatarURL ? avatar(p.avatarURL) : undefined
      if (p.avatarURL && bytes) remote.avatar = { key: p.avatarURL, bytes }
      return remote
    })
}

export function createFollowActions(
  getStore: () => EditorStore,
  getAwareness: () => Awareness | null
) {
  const followingPeer = ref<number | null>(null)

  function followPeer(clientId: number | null) {
    followingPeer.value = clientId
  }

  function resetFollow() {
    followingPeer.value = null
  }

  function tickFollow() {
    const store = getStore()
    const awareness = getAwareness()
    if (!followingPeer.value || !awareness) return
    const peerState = awareness.getStates().get(followingPeer.value)
    if (!peerState?.cursor) {
      followingPeer.value = null
      return
    }
    const cursor = peerState.cursor as CursorState
    if (cursor.pageId !== store.state.currentPageId) {
      void store.switchPage(cursor.pageId)
    }
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    if (cursor.zoom) store.state.zoom = cursor.zoom
    const cw = canvas.width / devicePixelRatio
    const ch = canvas.height / devicePixelRatio
    store.state.panX = cw / 2 - cursor.x * store.state.zoom
    store.state.panY = ch / 2 - cursor.y * store.state.zoom
    store.requestRender()
  }

  return { followingPeer, followPeer, resetFollow, tickFollow }
}

export function generateRoomId(): string {
  let result = ''
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    result += ROOM_ID_CHARS[randomIndex(ROOM_ID_CHARS.length)]
  }
  return result
}
