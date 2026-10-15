import { describe, expect, test } from 'bun:test'

import { reactive, ref } from 'vue'

import { createDefaultEditorState } from '@open-pencil/core/editor'

import { createDocumentRecovery } from '@/app/document/recovery/controller'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import type { RecoverySnapshotInput, RecoveryStore } from '@/app/document/recovery/types'

function deferredWriteStore() {
  const memory = createMemoryRecoveryStore()
  let release: (() => void) | null = null
  const store: RecoveryStore = {
    ...memory,
    async write(input: RecoverySnapshotInput) {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      return memory.write(input)
    }
  }
  return { store, release: () => release?.() }
}

function deferredRemoveStore() {
  const memory = createMemoryRecoveryStore()
  let release: (() => void) | null = null
  const store: RecoveryStore = {
    ...memory,
    async remove(id: string) {
      await new Promise<void>((resolve) => {
        release = resolve
      })
      await memory.remove(id)
    }
  }
  return { store, release: () => release?.() }
}

function setup(
  buildFigFile = async () => new Uint8Array([1, 2, 3]),
  initialEnabled = true,
  injectedStore?: RecoveryStore
) {
  const state = reactive({ ...createDefaultEditorState('page-1'), documentName: 'Agent draft' })
  const store = injectedStore ?? createMemoryRecoveryStore()
  const enabled = ref(initialEnabled)
  const recovery = createDocumentRecovery({
    state,
    store,
    recoveryId: 'recovery-1',
    isEnabled: () => enabled.value,
    subscribePageHidden: () => () => undefined,
    buildFigFile
  })
  return {
    state,
    store,
    recovery,
    setEnabled: (value: boolean) => (enabled.value = value)
  }
}

describe('document recovery controller', () => {
  test('persists source-less changes and skips untouched documents', async () => {
    const { state, store, recovery } = setup()
    await recovery.persistNow()
    expect(await store.list()).toEqual([])

    state.sceneVersion = 1
    await recovery.persistNow()
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(1)
    recovery.disposeRecovery()
  })

  test('does not serialize or persist while disabled', async () => {
    let builds = 0
    const { state, store, recovery } = setup(async () => {
      builds++
      return new Uint8Array([1])
    }, false)
    state.sceneVersion = 1
    await recovery.persistNow()
    expect(builds).toBe(0)
    expect(await store.list()).toEqual([])
    recovery.disposeRecovery()
  })

  test('removes the owned snapshot when disabled and resumes from the current version', async () => {
    const { state, store, recovery, setEnabled } = setup()
    state.sceneVersion = 1
    await recovery.persistNow()
    expect(await store.list()).toHaveLength(1)

    setEnabled(false)
    await Promise.resolve()
    await Promise.resolve()
    expect(await store.list()).toEqual([])

    state.sceneVersion = 2
    setEnabled(true)
    await recovery.persistNow()
    expect(await store.list()).toEqual([])

    state.sceneVersion = 3
    await recovery.persistNow()
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(3)
    recovery.disposeRecovery()
  })

  test('waits for disable cleanup before writing after re-enable', async () => {
    const deferred = deferredRemoveStore()
    const { state, store, recovery, setEnabled } = setup(undefined, true, deferred.store)
    state.sceneVersion = 1
    await recovery.persistNow()

    setEnabled(false)
    setEnabled(true)
    state.sceneVersion = 2
    const nextWrite = recovery.persistNow()
    await Promise.resolve()
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(1)

    deferred.release()
    await nextWrite
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(2)
    recovery.disposeRecovery()
  })

  test('recovery coalesces 100 changes during encoding to the latest scene version', async () => {
    let release: (() => void) | null = null
    let calls = 0
    const { state, store, recovery } = setup(async () => {
      calls++
      if (calls === 1) {
        await new Promise<void>((resolve) => {
          release = resolve
        })
      }
      return new Uint8Array([calls])
    })
    state.sceneVersion = 1
    const pending = recovery.persistNow()
    await Promise.resolve()
    for (let version = 2; version <= 101; version++) {
      state.sceneVersion = version
      void recovery.persistNow()
    }
    const releaseFirst = () => {
      if (release) release()
    }
    releaseFirst()
    await pending

    expect(calls).toBe(2)
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(101)
    recovery.disposeRecovery()
  })

  test('propagates persistence failures to close and reload callers', async () => {
    const state = reactive({ ...createDefaultEditorState('page-1'), documentName: 'Draft' })
    const store = createMemoryRecoveryStore()
    const memoryWrite = store.write.bind(store)
    let writeAttempts = 0
    store.write = async (input) => {
      writeAttempts++
      if (writeAttempts === 1) throw new Error('recovery storage unavailable')
      return memoryWrite(input)
    }
    const recovery = createDocumentRecovery({
      state,
      store,
      recoveryId: 'recovery-1',
      buildFigFile: () => new Uint8Array([1])
    })
    state.sceneVersion = 1

    await expect(recovery.persistNow()).rejects.toThrow('recovery storage unavailable')
    await recovery.persistNow()
    expect(writeAttempts).toBe(2)
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(1)
    recovery.disposeRecovery()
  })

  test('successful save removes recovery data', async () => {
    const { state, store, recovery } = setup()
    state.sceneVersion = 1
    await recovery.persistNow()
    expect(await store.list()).toHaveLength(1)

    await recovery.markProtectedVersion(1)
    expect(await store.list()).toEqual([])
    recovery.disposeRecovery()
  })

  test('save waits for an active write before deleting its snapshot', async () => {
    const deferred = deferredWriteStore()
    const state = reactive({ ...createDefaultEditorState('page-1'), documentName: 'Draft' })
    const recovery = createDocumentRecovery({
      state,
      store: deferred.store,
      recoveryId: 'recovery-1',
      buildFigFile: () => new Uint8Array([1])
    })
    state.sceneVersion = 1
    const write = recovery.persistNow()
    await Promise.resolve()
    const cleanup = recovery.markProtectedVersion(1)
    deferred.release()
    await Promise.all([write, cleanup])

    expect(await deferred.store.list()).toEqual([])
    recovery.disposeRecovery()
  })

  test('discard waits for an active write before deleting its snapshot', async () => {
    const deferred = deferredWriteStore()
    const state = reactive({ ...createDefaultEditorState('page-1'), documentName: 'Draft' })
    const recovery = createDocumentRecovery({
      state,
      store: deferred.store,
      recoveryId: 'recovery-1',
      buildFigFile: () => new Uint8Array([1])
    })
    state.sceneVersion = 1
    const write = recovery.persistNow()
    await Promise.resolve()
    const discard = recovery.discardRecovery()
    deferred.release()
    await Promise.all([write, discard])

    expect(await deferred.store.list()).toEqual([])
    recovery.disposeRecovery()
  })

  test('adoption waits for an active write and removes the previous recovery id', async () => {
    const deferred = deferredWriteStore()
    const state = reactive({ ...createDefaultEditorState('page-1'), documentName: 'Draft' })
    const recovery = createDocumentRecovery({
      state,
      store: deferred.store,
      recoveryId: 'previous',
      buildFigFile: () => new Uint8Array([1])
    })
    state.sceneVersion = 1
    const write = recovery.persistNow()
    await Promise.resolve()
    const adoption = recovery.adoptRecoverySnapshot('recovered', 7)
    deferred.release()
    await Promise.all([write, adoption])

    expect(recovery.getRecoveryId()).toBe('recovered')
    expect(await deferred.store.read('previous')).toBeNull()
    recovery.disposeRecovery()
  })

  test('preserves a snapshot newer than the saved version', async () => {
    const { state, store, recovery } = setup()
    state.sceneVersion = 2
    await recovery.persistNow()

    await recovery.markProtectedVersion(1)

    expect((await store.read('recovery-1'))?.sceneVersion).toBe(2)
    recovery.disposeRecovery()
  })

  test('background snapshots wait for interactive edits; close and reload flushes do not', async () => {
    let builds = 0
    let interactive = true
    let hide: (() => void) | null = null
    const state = reactive({ ...createDefaultEditorState('page-1'), documentName: 'Draft' })
    const store = createMemoryRecoveryStore()
    const recovery = createDocumentRecovery({
      state,
      store,
      recoveryId: 'recovery-1',
      isInteractiveEditing: () => interactive,
      subscribePageHidden: (onHidden) => {
        hide = onHidden
        return () => (hide = null)
      },
      buildFigFile: () => {
        builds++
        return new Uint8Array([1])
      }
    })
    state.sceneVersion = 1

    hide?.()
    await Promise.resolve()
    expect(builds).toBe(0)

    await recovery.persistNow()
    expect(builds).toBe(1)
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(1)

    interactive = false
    state.sceneVersion = 2
    hide?.()
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0)
    })
    expect(builds).toBe(2)
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(2)
    recovery.disposeRecovery()
    expect(hide).toBeNull()
  })

  test('never runs two snapshot encodes at once', async () => {
    let active = 0
    let maxActive = 0
    let release: (() => void) | null = null
    const { state, store, recovery } = setup(async () => {
      active++
      maxActive = Math.max(maxActive, active)
      if (!release) {
        await new Promise<void>((resolve) => {
          release = resolve
        })
      }
      active--
      return new Uint8Array([1])
    })
    state.sceneVersion = 1
    const first = recovery.persistNow()
    await Promise.resolve()
    state.sceneVersion = 2
    const second = recovery.persistNow()
    state.sceneVersion = 3
    const third = recovery.persistNow()
    const releaseFirst = () => release?.()
    releaseFirst()
    await Promise.all([first, second, third])

    expect(maxActive).toBe(1)
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(3)
    recovery.disposeRecovery()
  })

  test('follows the content revision rather than the scene version', async () => {
    const state = reactive({ ...createDefaultEditorState('page-1'), documentName: 'Draft' })
    const store = createMemoryRecoveryStore()
    const revision = ref(0)
    const recovery = createDocumentRecovery({
      state,
      store,
      recoveryId: 'recovery-1',
      getRevision: () => revision.value,
      subscribePageHidden: () => () => undefined,
      buildFigFile: () => new Uint8Array([1])
    })
    state.sceneVersion = 40
    await recovery.persistNow()
    expect(await store.list()).toEqual([])

    revision.value = 1
    await recovery.persistNow()
    expect((await store.read('recovery-1'))?.sceneVersion).toBe(1)
    await recovery.markProtectedVersion(1)
    expect(await store.list()).toEqual([])
    recovery.disposeRecovery()
  })
})
