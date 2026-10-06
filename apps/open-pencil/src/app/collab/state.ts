import type { IndexeddbPersistence } from 'y-indexeddb'
import type * as awarenessProtocol from 'y-protocols/awareness'
import type * as Y from 'yjs'

import { randomIndex } from '@open-pencil/core/random'

import type { CollabRoomTransport } from '@/app/collab/transport'
import type { CollabState } from '@/app/collab/types'
import type { EditorStore } from '@/app/editor/active-store'
import { PEER_COLORS } from '@/constants'

/**
 * Collaboration state that exists before a session does. Kept free of runtime Yjs and
 * transport imports so the editor can hold it without loading the collaboration engine.
 */
export type CollabRuntime = {
  ydoc: Y.Doc | null
  awareness: awarenessProtocol.Awareness | null
  ynodes: Y.Map<Y.Map<unknown>> | null
  yimages: Y.Map<Uint8Array> | null
  room: CollabRoomTransport | null
  persistence: IndexeddbPersistence | null
  connectedStore: EditorStore | null
  suppressGraphSync: boolean
  suppressYjsEvents: boolean
  unbindGraphEvents: (() => void) | null
  stopZoomWatch: (() => void) | null
}

export function createCollabRuntime(): CollabRuntime {
  return {
    ydoc: null,
    awareness: null,
    ynodes: null,
    yimages: null,
    room: null,
    persistence: null,
    connectedStore: null,
    suppressGraphSync: false,
    suppressYjsEvents: false,
    unbindGraphEvents: null,
    stopZoomWatch: null
  }
}

export function createInitialCollabState(localName: string): CollabState {
  return {
    connected: false,
    roomId: null,
    peers: [],
    localName,
    localColor: PEER_COLORS[randomIndex(PEER_COLORS.length)]
  }
}
