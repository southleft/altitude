import { useFileDialog } from '@vueuse/core'
import { computed, ref, shallowRef } from 'vue'

import type { TokenImportResult } from '@open-pencil/core/io/formats/dtcg'

import { useEditorStore } from '@/app/editor/active-store'

import {
  readTokenDirectory,
  readTokenFileList,
  readTokenPresetFile,
  type TokenSource
} from './read'

export type TokenImportOutcome =
  | { status: 'imported'; result: TokenImportResult }
  | { status: 'failed'; message: string }

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Import-tokens workflow: pick a token source and an optional mapping preset, then run
 * the shared Core importer as one undoable editor step. Returns outcomes; the dialog
 * decides how to present them.
 */
export function useTokensImport() {
  const editor = useEditorStore()
  const source = shallowRef<TokenSource | null>(null)
  const preset = shallowRef<{ label: string; mapping: unknown } | null>(null)
  const prune = ref(false)
  const reading = ref(false)
  const readError = ref<string | null>(null)
  const outcome = shallowRef<TokenImportOutcome | null>(null)

  const fileCount = computed(() => Object.keys(source.value?.files ?? {}).length)
  const canImport = computed(() => fileCount.value > 0 && !reading.value)

  async function load(task: () => Promise<TokenSource | null>): Promise<void> {
    reading.value = true
    readError.value = null
    outcome.value = null
    try {
      const next = await task()
      if (next) source.value = next
    } catch (error) {
      if (!isAbort(error)) readError.value = messageOf(error)
    } finally {
      reading.value = false
    }
  }

  const folderDialog = useFileDialog({ directory: true, multiple: true, reset: true })
  folderDialog.onChange((files) => {
    if (files?.length) void load(() => readTokenFileList([...files]))
  })
  const fileDialog = useFileDialog({
    accept: '.json,.zip,application/json,application/zip',
    multiple: true,
    reset: true
  })
  fileDialog.onChange((files) => {
    if (files?.length) void load(() => readTokenFileList([...files]))
  })
  const presetDialog = useFileDialog({
    accept: '.json,application/json',
    multiple: false,
    reset: true
  })
  presetDialog.onChange((files) => {
    const file = files?.[0]
    if (!file) return
    readError.value = null
    void (async () => {
      try {
        preset.value = await readTokenPresetFile(file)
        outcome.value = null
      } catch (error) {
        readError.value = messageOf(error)
      }
    })()
  })

  /** File System Access folder picker where available, `webkitdirectory` otherwise. */
  function chooseFolder(): void {
    if (!window.showDirectoryPicker) {
      folderDialog.open()
      return
    }
    void load(async () => {
      const handle = await window.showDirectoryPicker?.({ mode: 'read' })
      return handle ? readTokenDirectory(handle) : null
    })
  }

  function importTokens(): TokenImportOutcome | null {
    const current = source.value
    if (!current || fileCount.value === 0) return null
    try {
      const result = editor.importDesignTokens(current.files, preset.value?.mapping ?? {}, {
        prune: prune.value
      })
      outcome.value = { status: 'imported', result }
    } catch (error) {
      outcome.value = { status: 'failed', message: messageOf(error) }
    }
    return outcome.value
  }

  function reset(): void {
    source.value = null
    preset.value = null
    prune.value = false
    readError.value = null
    outcome.value = null
  }

  return {
    source,
    preset,
    prune,
    reading,
    readError,
    outcome,
    fileCount,
    canImport,
    chooseFolder,
    chooseFiles: () => fileDialog.open(),
    choosePreset: () => presetDialog.open(),
    clearPreset: () => {
      preset.value = null
    },
    importTokens,
    reset
  }
}
