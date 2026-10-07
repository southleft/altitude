import { describe, expect, test } from 'bun:test'

import { useCollab } from '@/app/collab/use'
import type { EditorStore } from '@/app/editor/active-store'

function createStoreStub() {
  let renders = 0
  const store = {
    state: { remoteCursors: [{ name: 'stale' }] },
    requestRender: () => renders++
  }
  return { store: store as EditorStore, renders: () => renders }
}

describe('collaboration engine loading', () => {
  test('a session reports itself connected as soon as it is requested', () => {
    const { store } = createStoreStub()
    const collab = useCollab(store)
    collab.connect('room-a')
    expect(collab.state.value.connected).toBe(true)
    expect(collab.state.value.roomId).toBe('room-a')
    collab.disconnect()
  })

  test('disconnecting before the engine loads drops the pending session', async () => {
    const { store, renders } = createStoreStub()
    const collab = useCollab(store)
    collab.connect('room-b')
    collab.disconnect()

    expect(collab.state.value.connected).toBe(false)
    expect(collab.state.value.roomId).toBeNull()
    expect(collab.state.value.peers).toHaveLength(0)
    expect(store.state.remoteCursors).toEqual([])
    expect(renders()).toBe(1)

    // Once the engine module has loaded, the abandoned request must not connect.
    await import('@/app/collab/engine')
    await Promise.resolve()
    await Promise.resolve()
    expect(collab.state.value.connected).toBe(false)
  })
})
