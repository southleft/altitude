import { expect, test } from 'bun:test'

import { ref } from 'vue'

import { createAvatarCache } from '@/app/collab/avatars'
import { buildRemotePeers, remotePeersToCursors } from '@/app/collab/awareness'
import { localCollabUser, safeAvatarURL } from '@/app/collab/identity'
import { createLocalAwarenessActions } from '@/app/collab/local-awareness'
import { DEFAULT_COLLAB_STATE, type CollabState } from '@/app/collab/types'
import type { EditorStore } from '@/app/editor/active-store'
import type { GitHubIdentity } from '@/app/integrations/storage/github/identity'

type RemoteCursors = EditorStore['state']['remoteCursors']

const color = { r: 0.2, g: 0.4, b: 0.6, a: 1 }
const identity: GitHubIdentity = {
  id: 7,
  login: 'octo',
  name: 'Octo Cat',
  avatarURL: 'https://avatars.githubusercontent.com/u/7?v=4',
  method: 'oauth'
}

test('signed in, presence uses the GitHub name and a sized avatar; signed out, the local name', () => {
  expect(localCollabUser('Angela', color, identity)).toEqual({
    name: 'Octo Cat',
    color,
    login: 'octo',
    avatar: 'https://avatars.githubusercontent.com/u/7?v=4&s=64'
  })
  expect(localCollabUser('Angela', color, { ...identity, name: null }).name).toBe('octo')
  expect(localCollabUser('Angela', color, null)).toEqual({ name: 'Angela', color })
})

test('only HTTPS avatars from avatars.githubusercontent.com are accepted', () => {
  expect(safeAvatarURL('https://avatars.githubusercontent.com/u/1?v=4')).toBe(
    'https://avatars.githubusercontent.com/u/1?v=4&s=64'
  )
  for (const value of [
    'http://avatars.githubusercontent.com/u/1',
    'https://avatars.githubusercontent.com.evil.example/u/1',
    'https://user:pass@avatars.githubusercontent.com/u/1',
    'https://evil.example/u/1',
    ['javascript', 'alert(1)'].join(':'),
    'data:image/png;base64,AAAA',
    42,
    null
  ]) {
    expect(safeAvatarURL(value)).toBeNull()
  }
})

test('peers’ presence is validated: unsafe avatars, logins and colors are dropped', () => {
  const states = new Map<number, Record<string, unknown>>([
    [1, { user: localCollabUser('', color, identity), cursor: { x: 1, y: 2, pageId: 'p' } }],
    [
      2,
      {
        user: {
          name: 'Mallory',
          color: { r: 9, g: 0, b: 0 },
          login: '<script>',
          avatar: 'https://evil.example/a.png'
        },
        cursor: { x: 3, y: 4, pageId: 'p' }
      }
    ],
    [3, { user: 'not an object' }],
    [4, { user: localCollabUser('Me', color, null) }]
  ])
  const peers = buildRemotePeers(states, 4)
  expect(peers.map((peer) => peer.clientId)).toEqual([1, 2])
  expect(peers[0]).toMatchObject({
    name: 'Octo Cat',
    login: 'octo',
    avatarURL: 'https://avatars.githubusercontent.com/u/7?v=4&s=64'
  })
  expect(peers[1].name).toBe('Mallory')
  expect(peers[1].login).toBeUndefined()
  expect(peers[1].avatarURL).toBeUndefined()
  // Out-of-range colors fall back to the palette.
  expect(peers[1].color.r).toBeLessThanOrEqual(1)

  const bytes = new Uint8Array([1, 2, 3])
  const cursors = remotePeersToCursors(peers, 'p', (url) =>
    url.includes('/u/7') ? bytes : undefined
  )
  expect(cursors[0].avatar).toEqual({ key: peers[0].avatarURL, bytes })
  expect(cursors[1].avatar).toBeUndefined()
})

test('the local awareness broadcasts the GitHub identity and re-renders once avatars load', async () => {
  const fields = new Map<string, unknown>()
  const remote = new Map<number, Record<string, unknown>>()
  const awareness = {
    clientID: 1,
    setLocalStateField: (key: string, value: unknown) => fields.set(key, value),
    getStates: () => remote
  }
  const storeState: { remoteCursors: RemoteCursors; currentPageId: string; zoom: number } = {
    remoteCursors: [],
    currentPageId: 'p',
    zoom: 1
  }
  let renders = 0
  const store = { state: storeState, requestRender: () => renders++ }
  let signedIn: GitHubIdentity | null = identity
  const requested: string[] = []
  const avatars = createAvatarCache(async (url) => {
    requested.push(url)
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      headers: { 'content-type': 'image/png' }
    })
  })
  const state = ref<CollabState>({ ...DEFAULT_COLLAB_STATE, localName: 'Angela' })
  const actions = createLocalAwarenessActions({
    state,
    storedName: ref('Angela'),
    getStore: () => store,
    getAwareness: () => awareness as never,
    getIdentity: () => signedIn,
    avatars
  })

  actions.broadcastAwareness()
  expect(fields.get('user')).toMatchObject({ name: 'Octo Cat', login: 'octo' })
  signedIn = null
  actions.broadcastAwareness()
  expect(fields.get('user')).toEqual({ name: 'Angela', color: DEFAULT_COLLAB_STATE.localColor })

  remote.set(2, {
    user: localCollabUser('', color, identity),
    cursor: { x: 0, y: 0, pageId: 'p' }
  })
  actions.updatePeersList()
  expect(storeState.remoteCursors).toHaveLength(1)
  await avatars.request('https://avatars.githubusercontent.com/u/7?v=4&s=64')
  await Promise.resolve()
  expect(requested).toHaveLength(1)
  expect(storeState.remoteCursors[0]).toMatchObject({ avatar: { bytes: expect.any(Uint8Array) } })
  expect(renders).toBeGreaterThanOrEqual(2)
})

test('the avatar cache rejects non-images, oversized bodies and other origins', async () => {
  const responses: Record<string, Response> = {
    'https://avatars.githubusercontent.com/html': new Response('<html>', {
      headers: { 'content-type': 'text/html' }
    }),
    'https://avatars.githubusercontent.com/huge': new Response(new Uint8Array(300 * 1024), {
      headers: { 'content-type': 'image/png' }
    })
  }
  let fetches = 0
  const cache = createAvatarCache(async (url) => {
    fetches++
    return responses[url] ?? new Response(null, { status: 404 })
  })
  expect(await cache.request('https://avatars.githubusercontent.com/html')).toBeNull()
  expect(await cache.request('https://avatars.githubusercontent.com/huge')).toBeNull()
  expect(await cache.request('https://evil.example/a.png')).toBeNull()
  expect(fetches).toBe(2)
  // Failures are remembered, not retried.
  expect(cache.peek('https://avatars.githubusercontent.com/html')).toBeNull()
  await cache.request('https://avatars.githubusercontent.com/html')
  expect(fetches).toBe(2)
})
