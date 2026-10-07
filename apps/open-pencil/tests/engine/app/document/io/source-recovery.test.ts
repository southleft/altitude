import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import { reactive } from 'vue'

import { createDefaultEditorState, createEditor } from '@open-pencil/core/editor'
import { SceneGraph } from '@open-pencil/scene-graph'

import { createDocumentSourceActions, createDocumentSourceState } from '@/app/document/io/source'
import { resetRecoveryStoreForTests } from '@/app/document/recovery'
import { createMemoryRecoveryStore } from '@/app/document/recovery/memory'
import type { RecoveryStore } from '@/app/document/recovery/types'

/** A handle that already holds read-write access; `failWrites` simulates a failing disk write. */
function makeGrantedHandle(name: string) {
  let failWrites = false
  const handle = {
    kind: 'file',
    name,
    queryPermission: vi.fn(async () => 'granted' as const),
    requestPermission: vi.fn(async () => 'granted' as const),
    createWritable: vi.fn(async () => {
      if (failWrites) throw new DOMException('The disk is full.', 'QuotaExceededError')
      return {
        write: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined)
      }
    })
  } as FileSystemFileHandle
  return {
    handle,
    setFailWrites: (value: boolean) => {
      failWrites = value
    }
  }
}

let store: RecoveryStore

beforeEach(() => {
  store = createMemoryRecoveryStore()
  resetRecoveryStoreForTests(store)
})

afterEach(() => {
  resetRecoveryStoreForTests()
})

function openFileBackedDocument(handle: FileSystemFileHandle) {
  const graph = new SceneGraph()
  const state = reactive({
    ...createDefaultEditorState(graph.getPages()[0].id),
    documentName: 'Big',
    autosaveEnabled: false
  })
  const editor = createEditor({ graph, state })
  const source = createDocumentSourceState()
  const actions = createDocumentSourceActions({
    editor,
    state,
    ...source,
    stopWatchingFile: () => undefined,
    startWatchingFile: async () => undefined,
    getRenderer: () => null
  })
  actions.setDocumentSource('Big.fig', 'fig', handle)
  return {
    editor,
    actions,
    dispose: () => {
      actions.disposeDocumentIO()
      editor.dispose()
    }
  }
}

describe('recovery for file-backed documents', () => {
  test('snapshots unsaved edits to a file-backed document so a reload can offer them', async () => {
    const { handle } = makeGrantedHandle('Big.fig')
    const { editor, actions, dispose } = openFileBackedDocument(handle)
    try {
      await actions.persistRecoveryNow()
      expect(await store.list()).toEqual([])

      editor.createShape('RECTANGLE', 0, 0, 100, 100)
      await actions.persistRecoveryNow()

      // The startup recovery dialog lists exactly what the store lists.
      const listed = await store.list()
      expect(listed).toHaveLength(1)
      expect(listed[0]?.documentName).toBe('Big')
      expect((await store.read(listed[0]?.id ?? ''))?.figBytes.byteLength).toBeGreaterThan(0)
    } finally {
      dispose()
    }
  })

  test('keeps the snapshot when saving to the file fails', async () => {
    const { handle, setFailWrites } = makeGrantedHandle('Big.fig')
    const { editor, actions, dispose } = openFileBackedDocument(handle)
    try {
      editor.createShape('RECTANGLE', 0, 0, 100, 100)
      await actions.persistRecoveryNow()
      setFailWrites(true)

      await expect(actions.saveFigFile()).rejects.toThrow('The disk is full.')

      expect(await store.list()).toHaveLength(1)
      expect(actions.hasUnsavedChanges()).toBe(true)
    } finally {
      dispose()
    }
  })

  test('clears the snapshot once that revision is saved to the file', async () => {
    const { handle } = makeGrantedHandle('Big.fig')
    const { editor, actions, dispose } = openFileBackedDocument(handle)
    try {
      editor.createShape('RECTANGLE', 0, 0, 100, 100)
      await actions.persistRecoveryNow()
      expect(await store.list()).toHaveLength(1)

      await expect(actions.saveFigFile()).resolves.toBe(true)

      expect(await store.list()).toEqual([])
      expect(actions.hasUnsavedChanges()).toBe(false)
    } finally {
      dispose()
    }
  })
})
