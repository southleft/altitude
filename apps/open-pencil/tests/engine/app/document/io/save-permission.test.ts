import { describe, expect, test, vi } from 'bun:test'

import { reactive } from 'vue'

import { createDefaultEditorState } from '@open-pencil/core/editor'

import { createAutosave } from '@/app/document/autosave/create'
import { createSaveActions } from '@/app/document/io/save'
import type { BrowserFigSaveTarget } from '@/app/document/io/save-targets'

type Permission = PermissionState

/**
 * A File System Access handle opened read-only, the way `showOpenFilePicker` returns it. Every
 * call is appended to `log` so tests can assert the order of permission, export and write steps.
 */
function makeHandle(
  name: string,
  log: string[],
  {
    initial,
    onRequest,
    requestRefused = false
  }: { initial: Permission; onRequest: Permission; requestRefused?: boolean }
) {
  let permission = initial
  const writes: Uint8Array[] = []
  const handle = {
    kind: 'file',
    name,
    queryPermission: vi.fn(async () => {
      log.push(`query:${name}`)
      return permission
    }),
    requestPermission: vi.fn(async () => {
      log.push(`request:${name}`)
      // Chromium rejects the prompt outright once user activation has expired.
      if (requestRefused) {
        throw new DOMException('User activation is required.', 'SecurityError')
      }
      permission = onRequest
      return permission
    }),
    createWritable: vi.fn(async () => {
      log.push(`createWritable:${name}`)
      // Mirrors Chromium: without granted access, createWritable needs user activation.
      if (permission !== 'granted') {
        throw new DOMException(
          'User activation is required to request permissions.',
          'SecurityError'
        )
      }
      return {
        write: vi.fn(async (data: Uint8Array) => {
          writes.push(data)
        }),
        close: vi.fn(async () => undefined)
      }
    })
  } as FileSystemFileHandle
  return { handle, writes }
}

function createHarness(
  handle: FileSystemFileHandle,
  log: string[],
  chooseTarget: () => Promise<BrowserFigSaveTarget> = async () => ({ kind: 'unavailable' })
) {
  const state = { ...createDefaultEditorState('page'), documentName: 'Big' }
  let currentHandle: FileSystemFileHandle | null = handle
  const download = vi.fn((_data: Uint8Array, filename: string) => {
    log.push(`download:${filename}`)
  })
  const onWritePermissionDenied = vi.fn()
  const chooseBrowserSaveTarget = vi.fn(async () => {
    log.push('picker')
    return chooseTarget()
  })
  const actions = createSaveActions({
    state,
    buildFigFile: async () => {
      log.push('export')
      return new Uint8Array([1, 2, 3])
    },
    getFilePath: () => null,
    setFilePath: vi.fn(),
    getFileHandle: () => currentHandle,
    setFileHandle: (next) => {
      currentHandle = next
    },
    getDownloadName: () => 'Big.fig',
    setDownloadName: vi.fn(),
    getStorageBinding: () => null,
    setStorageBinding: vi.fn(),
    setSourceIdentity: vi.fn(),
    setSavedVersion: vi.fn(),
    setLastWriteTime: vi.fn(),
    startWatchingFile: vi.fn(),
    onWritePermissionDenied,
    chooseBrowserSaveTarget,
    download
  })
  return {
    actions,
    download,
    onWritePermissionDenied,
    chooseBrowserSaveTarget,
    getHandle: () => currentHandle
  }
}

describe('saving to a File System Access handle', () => {
  test('writes directly when read-write access is already granted', async () => {
    const log: string[] = []
    const { handle, writes } = makeHandle('Big.fig', log, {
      initial: 'granted',
      onRequest: 'granted'
    })
    const { actions, onWritePermissionDenied } = createHarness(handle, log)

    await expect(actions.saveFigFile()).resolves.toBe(true)

    expect(handle.requestPermission).not.toHaveBeenCalled()
    expect(log).toEqual(['query:Big.fig', 'export', 'createWritable:Big.fig'])
    expect(writes).toHaveLength(1)
    expect(onWritePermissionDenied).not.toHaveBeenCalled()
  })

  test('requests access inside the gesture before the export starts', async () => {
    const log: string[] = []
    const { handle, writes } = makeHandle('Big.fig', log, {
      initial: 'prompt',
      onRequest: 'granted'
    })
    const { actions } = createHarness(handle, log)

    await expect(actions.saveFigFile()).resolves.toBe(true)

    expect(log).toEqual(['query:Big.fig', 'request:Big.fig', 'export', 'createWritable:Big.fig'])
    expect(writes).toHaveLength(1)
  })

  test('falls back to a download when access is denied and no picker can be shown', async () => {
    const log: string[] = []
    const { handle } = makeHandle('Big.fig', log, { initial: 'prompt', onRequest: 'denied' })
    const { actions, onWritePermissionDenied } = createHarness(handle, log)

    await expect(actions.saveFigFile()).resolves.toBe(true)

    // The picker is tried before the export, and the original file is never opened for writing.
    expect(log).toEqual([
      'query:Big.fig',
      'request:Big.fig',
      'picker',
      'export',
      'download:Big.fig'
    ])
    expect(handle.createWritable).not.toHaveBeenCalled()
    expect(onWritePermissionDenied).toHaveBeenCalledWith('Big.fig', 'downloaded')
  })

  test('saves to a picked location when access is denied', async () => {
    const log: string[] = []
    const { handle } = makeHandle('Big.fig', log, { initial: 'prompt', onRequest: 'denied' })
    const picked = makeHandle('Copy.fig', log, { initial: 'granted', onRequest: 'granted' })
    const { actions, onWritePermissionDenied, getHandle } = createHarness(
      handle,
      log,
      async () => ({
        kind: 'handle',
        handle: picked.handle
      })
    )

    await expect(actions.saveFigFile()).resolves.toBe(true)

    expect(log).toEqual([
      'query:Big.fig',
      'request:Big.fig',
      'picker',
      'export',
      'createWritable:Copy.fig'
    ])
    expect(picked.writes).toHaveLength(1)
    expect(getHandle()).toBe(picked.handle)
    expect(onWritePermissionDenied).toHaveBeenCalledWith('Big.fig', 'saved-copy')
  })

  test('reports an unsaved document when the fallback picker is cancelled', async () => {
    const log: string[] = []
    const { handle } = makeHandle('Big.fig', log, { initial: 'prompt', onRequest: 'denied' })
    const { actions, onWritePermissionDenied, download } = createHarness(handle, log, async () => ({
      kind: 'cancelled'
    }))

    await expect(actions.saveFigFile()).resolves.toBe(false)

    expect(log).not.toContain('export')
    expect(download).not.toHaveBeenCalled()
    expect(onWritePermissionDenied).toHaveBeenCalledWith('Big.fig', 'not-saved')
  })

  test('treats a refused permission prompt as denied instead of throwing', async () => {
    const log: string[] = []
    const { handle } = makeHandle('Big.fig', log, {
      initial: 'prompt',
      onRequest: 'granted',
      requestRefused: true
    })
    const { actions, onWritePermissionDenied } = createHarness(handle, log)

    await expect(actions.saveFigFile()).resolves.toBe(true)

    expect(handle.createWritable).not.toHaveBeenCalled()
    expect(onWritePermissionDenied).toHaveBeenCalledWith('Big.fig', 'downloaded')
  })

  test('Save As shows the picker before building the file', async () => {
    const log: string[] = []
    const picked = makeHandle('New.fig', log, { initial: 'granted', onRequest: 'granted' })
    const { actions } = createHarness(picked.handle, log, async () => ({
      kind: 'handle',
      handle: picked.handle
    }))

    await expect(actions.saveFigFileAs()).resolves.toBe(true)

    expect(log).toEqual(['picker', 'export', 'createWritable:New.fig'])
  })
})

describe('autosave without write access', () => {
  test('skips the write without prompting or throwing', async () => {
    const log: string[] = []
    const { handle } = makeHandle('Big.fig', log, { initial: 'prompt', onRequest: 'granted' })
    const { actions } = createHarness(handle, log)
    const state = reactive({ ...createDefaultEditorState('page'), autosaveEnabled: true })
    const saved = vi.fn()
    const autosave = createAutosave({
      state,
      getSavedVersion: () => 0,
      hasWritableSource: () => true,
      // Same guard the document source installs for its autosave.
      saveCurrentDocument: async (version) => {
        if (!(await actions.canWriteWithoutPrompt())) return
        saved(await actions.writeFile(new Uint8Array([1]), version))
      }
    })

    await expect(autosave.requestSave(1)).resolves.toBeUndefined()
    autosave.disposeAutosave()

    expect(handle.requestPermission).not.toHaveBeenCalled()
    expect(handle.createWritable).not.toHaveBeenCalled()
    expect(saved).not.toHaveBeenCalled()
  })

  test('writes once access has been granted', async () => {
    const log: string[] = []
    const { handle, writes } = makeHandle('Big.fig', log, {
      initial: 'granted',
      onRequest: 'granted'
    })
    const { actions } = createHarness(handle, log)

    await expect(actions.canWriteWithoutPrompt()).resolves.toBe(true)
    await actions.writeFile(new Uint8Array([1]), 1)

    expect(writes).toHaveLength(1)
    expect(handle.requestPermission).not.toHaveBeenCalled()
  })
})
