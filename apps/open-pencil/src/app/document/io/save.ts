import type { EditorState } from '@open-pencil/core/editor'
import { filesMessages } from '@open-pencil/vue'

import { downloadBlob } from '@/app/document/io/browser'
import { documentNameFromFigPath } from '@/app/document/io/names'
import { canWriteHandleSilently, requestHandleWriteAccess } from '@/app/document/io/permission'
import { chooseBrowserFigSaveTarget, chooseTauriFigSavePath } from '@/app/document/io/save-targets'
import type { DocumentSourceAccess } from '@/app/document/io/types'
import { createDocumentWriter, resolveBrowserWriteHandle } from '@/app/document/io/write'
import { IS_TAURI } from '@/constants'

type SaveDocumentState = EditorState & { documentName: string }

/** What a save did after the browser withheld write access to the open file. */
export type WritePermissionFallback = 'saved-copy' | 'downloaded' | 'not-saved'

type SaveActionsOptions = Omit<DocumentSourceAccess, 'getSavedVersion'> & {
  state: SaveDocumentState
  buildFigFile: () => Uint8Array | Promise<Uint8Array>
  startWatchingFile: () => void
  onWriteSuccess?: (version: number) => void | Promise<void>
  onDownloadSuccess?: (version: number) => void | Promise<void>
  onWritePermissionDenied?: (fileName: string, fallback: WritePermissionFallback) => void
  /** Browser save picker; injectable so the fallback order can be exercised without a DOM. */
  chooseBrowserSaveTarget?: typeof chooseBrowserFigSaveTarget
  /** Browser download fallback; injectable for the same reason. */
  download?: typeof downloadBlob
}

export function createSaveActions({
  state,
  buildFigFile,
  getFilePath,
  setFilePath,
  getFileHandle,
  setFileHandle,
  getDownloadName,
  setDownloadName,
  getStorageBinding,
  setStorageBinding,
  setSourceIdentity,
  setSavedVersion,
  setLastWriteTime,
  startWatchingFile,
  onWriteSuccess,
  onDownloadSuccess,
  onWritePermissionDenied,
  chooseBrowserSaveTarget = chooseBrowserFigSaveTarget,
  download = downloadBlob
}: SaveActionsOptions) {
  const writeFile = createDocumentWriter({
    state,
    getFilePath,
    getFileHandle,
    getStorageBinding,
    setSavedVersion,
    setLastWriteTime,
    onWriteSuccess
  })

  const getBrowserWriteHandle = () =>
    resolveBrowserWriteHandle({ getFilePath, getFileHandle, getStorageBinding })

  async function buildVersionedFigFile() {
    const version = state.sceneVersion
    return { data: await buildFigFile(), version }
  }

  async function downloadFigFile(filename: string) {
    const { data, version } = await buildVersionedFigFile()
    download(new Uint8Array(data), filename, 'application/octet-stream')
    await onDownloadSuccess?.(version)
    return true
  }

  async function saveToPickedHandle(handle: FileSystemFileHandle) {
    const { data, version } = await buildVersionedFigFile()
    setStorageBinding(null)
    setFileHandle(handle)
    setFilePath(null)
    state.documentName = documentNameFromFigPath(handle.name)
    const wrote = await writeFile(data, version)
    if (wrote) setSourceIdentity({ handle, path: null })
    startWatchingFile()
    return wrote
  }

  /**
   * The browser withheld write access to the open file. Offer a save picker first; when the
   * browser will not show one (it also needs user activation), download a copy instead.
   */
  async function saveWithoutWriteAccess(handle: FileSystemFileHandle) {
    const target = await chooseBrowserSaveTarget(handle.name)
    if (target.kind === 'cancelled') {
      onWritePermissionDenied?.(handle.name, 'not-saved')
      return false
    }
    if (target.kind === 'handle') {
      const wrote = await saveToPickedHandle(target.handle)
      if (wrote) onWritePermissionDenied?.(handle.name, 'saved-copy')
      return wrote
    }
    const downloaded = await downloadFigFile(handle.name)
    onWritePermissionDenied?.(handle.name, 'downloaded')
    return downloaded
  }

  async function saveFigFile() {
    // Request write access before building the file: export can outlast the gesture's
    // activation window, after which the browser refuses to prompt.
    const browserHandle = getBrowserWriteHandle()
    if (browserHandle && !(await requestHandleWriteAccess(browserHandle))) {
      return saveWithoutWriteAccess(browserHandle)
    }

    const filePath = getFilePath()
    const fileHandle = getFileHandle()
    const storageBinding = getStorageBinding()
    const downloadName = getDownloadName()
    if (storageBinding || filePath || fileHandle) {
      const { data, version } = await buildVersionedFigFile()
      const wrote = await writeFile(data, version)
      if (wrote && !storageBinding) setSourceIdentity({ handle: fileHandle, path: filePath })
      return wrote
    }
    if (downloadName) return downloadFigFile(downloadName)
    return saveFigFileAs()
  }

  async function saveFigFileAs() {
    if (IS_TAURI) {
      const { data, version } = await buildVersionedFigFile()
      const path = await chooseTauriFigSavePath()
      if (!path) return false
      setStorageBinding(null)
      setFilePath(path)
      setFileHandle(null)
      state.documentName = documentNameFromFigPath(path)
      const wrote = await writeFile(data, version)
      if (wrote) setSourceIdentity({ handle: null, path })
      startWatchingFile()
      return wrote
    }

    // Pick before building: the picker needs user activation, which a slow export would outlast.
    // A restored recovery snapshot has no source; suggest its name so the user can replace it.
    const suggestedName = getDownloadName() ?? `${state.documentName || 'Untitled'}.fig`
    const target = await chooseBrowserSaveTarget(suggestedName)
    if (target.kind === 'cancelled') return false
    if (target.kind === 'handle') return saveToPickedHandle(target.handle)

    const filename = prompt(filesMessages.get().saveAsPrompt, suggestedName)
    if (!filename) return false
    setStorageBinding(null)
    setDownloadName(filename)
    state.documentName = documentNameFromFigPath(filename)
    return downloadFigFile(filename)
  }

  /**
   * Whether a background write (autosave) can run without prompting. Storage bindings and native
   * paths always can; a browser handle can only once read-write access is already granted.
   */
  async function canWriteWithoutPrompt() {
    const browserHandle = getBrowserWriteHandle()
    return !browserHandle || (await canWriteHandleSilently(browserHandle))
  }

  return { saveFigFile, saveFigFileAs, writeFile, canWriteWithoutPrompt }
}
