import type { Editor, EditorState } from '@open-pencil/core/editor'
import { createFigExportMirror, exportFigFile } from '@open-pencil/core/io/formats/fig'
import { filesMessages } from '@open-pencil/vue'

import { createAutosave } from '@/app/document/autosave'
import { createDocumentChanges } from '@/app/document/io/changes'
import {
  documentNameFromFigPath,
  downloadNameFromPath,
  figDownloadName
} from '@/app/document/io/names'
import { createSaveActions, type WritePermissionFallback } from '@/app/document/io/save'
import { createDocumentSourceState } from '@/app/document/io/source-state'
import type { DocumentSourceAccess } from '@/app/document/io/types'
import { createDocumentRecovery } from '@/app/document/recovery'
import { recoveryEnabled } from '@/app/document/recovery/preferences'
import type { StorageDocumentBinding } from '@/app/integrations/storage/types'
import { toast } from '@/app/shell/ui'

type DocumentSourceState = EditorState & {
  documentName: string
  autosaveEnabled: boolean
}

export { createDocumentSourceState }

function notifyWritePermissionDenied(name: string, fallback: WritePermissionFallback) {
  const messages = filesMessages.get()
  const message = {
    'saved-copy': messages.savePermissionDeniedSavedCopy,
    downloaded: messages.savePermissionDeniedDownloaded,
    'not-saved': messages.savePermissionDeniedNotSaved
  }[fallback]
  toast.warning(message({ name }))
}

type DocumentSourceOptions = DocumentSourceAccess & {
  editor: Editor
  state: DocumentSourceState
  stopWatchingFile: () => void
  startWatchingFile: () => Promise<void>
  getRenderer: () => Editor['renderer']
}

export function createDocumentSourceActions({
  editor,
  state,
  stopWatchingFile,
  startWatchingFile,
  getFileHandle,
  setFileHandle,
  getFilePath,
  setFilePath,
  getDownloadName,
  setDownloadName,
  getStorageBinding,
  setStorageBinding,
  setSourceIdentity,
  getSavedVersion,
  setSavedVersion,
  setLastWriteTime,
  getRenderer
}: DocumentSourceOptions) {
  const changes = createDocumentChanges(editor)

  /** A save of `revision` landed: the document is clean up to it and its snapshot can go. */
  async function markRevisionSaved(revision: number) {
    changes.markSaved(revision)
    try {
      await recovery.markProtectedVersion(revision)
    } catch (error) {
      console.warn('[Recovery] Cleanup after document write failed:', error)
    }
  }

  async function saveAndTrack(save: () => Promise<boolean>) {
    const revision = changes.capture()
    const saved = await save()
    if (saved) await markRevisionSaved(revision)
    return saved
  }

  // A motion preview patches live node values; restore them so a save never captures a
  // half-played transition.
  function settleMotionPreview() {
    editor.stopMotion()
  }

  function buildFigFile() {
    settleMotionPreview()
    const renderer = getRenderer()
    return exportFigFile(editor.graph, renderer?.ck, renderer ?? undefined, state.currentPageId)
  }

  // Recovery snapshots are encoded in a worker that mirrors the document, so a large file
  // does not block the main thread for the whole export on every snapshot.
  const recoveryExporter = createFigExportMirror()

  function buildRecoveryFigFile() {
    settleMotionPreview()
    return recoveryExporter.exportFigFile(editor.graph, state.currentPageId)
  }

  // Recovery follows content revisions: page population, layout and font loads advance the
  // scene version without changing the document and must not trigger a snapshot.
  const recovery = createDocumentRecovery({
    state,
    getRevision: changes.capture,
    isEnabled: () => recoveryEnabled.value,
    isInteractiveEditing: () => editor.isInteractiveEditing(),
    buildFigFile: buildRecoveryFigFile
  })

  const { saveFigFile, saveFigFileAs, writeFile, canWriteWithoutPrompt } = createSaveActions({
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
    startWatchingFile: () => {
      void startWatchingFile()
    },
    onWritePermissionDenied: notifyWritePermissionDenied
  })

  const autosave = createAutosave({
    state,
    getSavedVersion,
    hasWritableSource: () => !!getFileHandle() || !!getFilePath() || !!getStorageBinding(),
    saveCurrentDocument: async (version) => {
      // The scene version also advances for page population and layout; only edits need a save.
      if (!changes.hasUnsavedChanges()) return
      // Autosave runs outside any gesture: never prompt for write access, and leave the
      // document dirty until a user-initiated save obtains it.
      if (!(await canWriteWithoutPrompt())) return
      const revision = changes.capture()
      const data = await buildFigFile()
      if (await writeFile(data, version)) await markRevisionSaved(revision)
    }
  })

  function setDocumentSource(
    fileName: string,
    sourceFormat: string,
    handle?: FileSystemFileHandle,
    path?: string
  ) {
    stopWatchingFile()
    setStorageBinding(null)
    const isFig = sourceFormat === 'fig'
    setFileHandle(isFig ? (handle ?? null) : null)
    setFilePath(isFig ? (path ?? null) : null)
    setDownloadName(figDownloadName(fileName, sourceFormat))
    setSourceIdentity({ handle: handle ?? null, path: path ?? null })
    setSavedVersion(state.sceneVersion)
    changes.markSaved()
    void recovery.markProtectedVersion(changes.capture())
    if (isFig && (handle || path)) {
      void startWatchingFile()
    }
  }

  function setStorageDocumentSource(binding: StorageDocumentBinding, documentName: string) {
    stopWatchingFile()
    setFileHandle(null)
    setFilePath(null)
    setDownloadName(`${documentName}.fig`)
    setSourceIdentity({ handle: null, path: null })
    setStorageBinding(binding)
    state.documentName = documentName
    state.autosaveEnabled = true
    setSavedVersion(state.sceneVersion)
    changes.markSaved()
    void recovery.markProtectedVersion(changes.capture())
  }

  function setPlannedFilePath(path: string) {
    stopWatchingFile()
    setStorageBinding(null)
    setFileHandle(null)
    setFilePath(path)
    const downloadName = downloadNameFromPath(path)
    setDownloadName(downloadName)
    state.documentName = documentNameFromFigPath(downloadName)
  }

  function startWatchingCurrentFile() {
    void startWatchingFile()
  }

  function disposeDocumentIO() {
    changes.dispose()
    stopWatchingFile()
    autosave.disposeAutosave()
    recovery.disposeRecovery()
    recoveryExporter.dispose()
  }

  return {
    setDocumentSource,
    setStorageDocumentSource,
    setPlannedFilePath,
    startWatchingCurrentFile,
    disposeDocumentIO,
    saveFigFile: () => saveAndTrack(saveFigFile),
    saveFigFileAs: () => saveAndTrack(saveFigFileAs),
    hasUnsavedChanges: changes.hasUnsavedChanges,
    markDocumentSaved: changes.markSaved,
    // External version control (GitHub): capture before snapshotting, then mark the
    // revision saved and release its recovery snapshot only once the commit succeeded.
    captureRevision: changes.capture,
    markExternallyPersisted: async (revision: number, _version: number) => {
      changes.markSaved(revision)
      await recovery.markProtectedVersion(revision)
    },
    getStorageBinding,
    getRecoveryId: () => recovery.getRecoveryId(),
    // The restored content is what the adopted snapshot holds: protect the current revision.
    adoptRecoverySnapshot: (id: string) => {
      changes.markChanged()
      return recovery.adoptRecoverySnapshot(id, changes.capture())
    },
    persistRecoveryNow: () => recovery.persistNow(),
    discardRecovery: () => recovery.discardRecovery()
  }
}
