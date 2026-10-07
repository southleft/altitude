import type { Color } from '@open-pencil/scene-graph/primitives'

export interface RemotePeer {
  clientId: number
  name: string
  color: Color
  /** GitHub login the peer claims; display-only, not verified. */
  login?: string
  /** A validated avatars.githubusercontent.com URL. */
  avatarURL?: string
  cursor?: { x: number; y: number; pageId: string }
  selection?: string[]
}

export interface CollabState {
  connected: boolean
  roomId: string | null
  peers: RemotePeer[]
  localName: string
  localColor: Color
}

export const DEFAULT_COLLAB_STATE: CollabState = {
  connected: false,
  roomId: null,
  peers: [],
  localName: '',
  localColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 }
}
