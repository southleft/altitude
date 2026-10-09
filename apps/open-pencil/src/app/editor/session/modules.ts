import { computed } from 'vue'

import type { Editor } from '@open-pencil/core/editor'
import type { IORegistry } from '@open-pencil/core/io'
import { createSelectedNodeState } from '@open-pencil/vue'

import { createDocumentExportActions } from '@/app/document/export'
import { createDocumentIOActions } from '@/app/document/io'
import type { ViewportSize } from '@/app/document/io/types'
import { createFlashActions } from '@/app/editor/flash'
import { createMobileClipboardActions } from '@/app/editor/mobile-clipboard'
import { createPenActions } from '@/app/editor/pen'
import type { EditorPreparationController } from '@/app/editor/preparation/controller'
import { createProfilerActions } from '@/app/editor/profiler'
import type { AppEditorState } from '@/app/editor/session/types'
import { createVectorEditActions } from '@/app/editor/vector'
import { createGitHubCommentsSession } from '@/app/integrations/storage/github/comments/session'
import { createGitHubDocumentSession } from '@/app/integrations/storage/github/document/session'

export function defineEditorStoreAccessors(store: object, editor: Editor) {
  Object.defineProperties(store, {
    graph: {
      enumerable: true,
      get: () => editor.graph
    },
    renderer: {
      enumerable: true,
      get: () => editor.renderer
    },
    canvasRenderers: {
      enumerable: true,
      get: () => editor.canvasRenderers
    },
    textEditor: {
      enumerable: true,
      get: () => editor.textEditor
    }
  })
}

export function createEditorComputedRefs(editor: Editor, state: AppEditorState) {
  const { nodes: selectedNodes, dispose: disposeSelection } = createSelectedNodeState(editor)

  const selectedNode = computed(() =>
    selectedNodes.value.length === 1 ? selectedNodes.value[0] : undefined
  )

  const layerTree = computed(() => {
    void state.sceneVersion
    return editor.getLayerTree()
  })

  return { selectedNodes, selectedNode, layerTree, disposeSelection }
}

export function createEditorStoreModules(
  editor: Editor,
  state: AppEditorState,
  io: IORegistry,
  viewportSize: ViewportSize,
  preparationController: EditorPreparationController
) {
  const flash = createFlashActions(editor, state)
  const pen = createPenActions(editor, state)
  const vectorEdit = createVectorEditActions(editor, state)
  const documentIO = createDocumentIOActions(editor, state, viewportSize, preparationController)
  const documentExport = createDocumentExportActions(editor, state, io, documentIO.downloadBlob)
  const mobileClipboard = createMobileClipboardActions(editor)
  const profiler = createProfilerActions(editor)
  const github = createGitHubDocumentSession({
    editor,
    state,
    captureRevision: documentIO.captureRevision,
    markPersisted: documentIO.markExternallyPersisted
  })
  const comments = createGitHubCommentsSession({ github, editor, state })
  // Save in a GitHub-bound document commits; every other document saves as before.
  const saveDocument = () => (github.binding.value ? github.commit() : documentIO.saveFigFile())

  return {
    ...flash,
    ...pen,
    ...vectorEdit,
    openFigFile: documentIO.openFigFile,
    openDOMFile: documentIO.openDOMFile,
    importDOMText: documentIO.importDOMText,
    setViewportSize: documentIO.setViewportSize,
    fitCurrentPageToViewport: documentIO.fitCurrentPageToViewport,
    hasUnsavedChanges: documentIO.hasUnsavedChanges,
    saveFigFile: saveDocument,
    github,
    comments,
    saveFigFileAs: documentIO.saveFigFileAs,
    getDocumentFilePath: documentIO.getDocumentFilePath,
    getSourceIdentity: documentIO.getSourceIdentity,
    getStorageBinding: documentIO.getStorageBinding,
    getRecoveryId: documentIO.getRecoveryId,
    adoptRecoverySnapshot: documentIO.adoptRecoverySnapshot,
    persistRecoveryNow: documentIO.persistRecoveryNow,
    discardRecovery: documentIO.discardRecovery,
    setDocumentSource: documentIO.setDocumentSource,
    setStorageDocumentSource: documentIO.setStorageDocumentSource,
    setPlannedFilePath: documentIO.setPlannedFilePath,
    startWatchingCurrentFile: documentIO.startWatchingCurrentFile,
    dispose: () => {
      editor.releaseGraphResources()
      editor.dispose()
      editor.clearPageViewports()
      documentIO.disposeDocumentIO()
      comments.dispose()
      github.dispose()
      preparationController.dispose()
    },
    ...documentExport,
    ...mobileClipboard,
    ...profiler
  }
}
