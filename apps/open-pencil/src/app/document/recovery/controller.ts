import { watchDebounced } from '@vueuse/core'
import { watch, type WatchHandle } from 'vue'

import type { EditorState } from '@open-pencil/core/editor'

import { getRecoveryStore } from '@/app/document/recovery/store'
import type { RecoveryStore } from '@/app/document/recovery/types'
import { createCanvasId } from '@/app/storage/id'
import { IS_BROWSER } from '@/constants'

type RecoveryState = EditorState & { documentName: string }

/** How long a deferred snapshot waits before checking again whether an interactive edit ended. */
const INTERACTIVE_RETRY_MS = 1000

/** Subscribes to the page being hidden or unloaded; returns the unsubscribe function. */
export type PageHiddenSubscription = (onHidden: () => void) => () => void

/**
 * Best-effort flush trigger. The IndexedDB write may not finish before the page goes away, so the
 * debounced snapshot remains the main guarantee; this only narrows the window.
 */
const subscribeToPageHidden: PageHiddenSubscription = (onHidden) => {
  if (!IS_BROWSER) return () => undefined
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') onHidden()
  }
  window.addEventListener('pagehide', onHidden)
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    window.removeEventListener('pagehide', onHidden)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

interface DocumentRecoveryOptions {
  state: RecoveryState
  buildFigFile: () => Promise<Uint8Array> | Uint8Array
  isEnabled?: () => boolean
  /** Background snapshots wait while a gesture is live; encoding a large file would stall it. */
  isInteractiveEditing?: () => boolean
  subscribePageHidden?: PageHiddenSubscription
  store?: RecoveryStore
  recoveryId?: string
}

export interface DocumentRecoveryController {
  getRecoveryId(): string
  adoptRecoverySnapshot(id: string, sceneVersion: number): Promise<void>
  persistNow(): Promise<void>
  markProtectedVersion(version: number): Promise<void>
  discardRecovery(): Promise<void>
  disposeRecovery(): void
}

export function createDocumentRecovery({
  state,
  buildFigFile,
  isEnabled = () => true,
  isInteractiveEditing = () => false,
  subscribePageHidden = subscribeToPageHidden,
  store = getRecoveryStore(),
  recoveryId = createCanvasId()
}: DocumentRecoveryOptions): DocumentRecoveryController {
  let id = recoveryId
  let protectedVersion = state.sceneVersion
  let persistedVersion: number | null = null
  let requestedVersion = protectedVersion
  let lifecycleGeneration = 0
  let writing: Promise<void> | null = null
  let cleanup: Promise<void> = Promise.resolve()
  let disposed = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null

  function reportSnapshotFailure(error: unknown) {
    console.warn('[Recovery] Snapshot failed:', error)
  }

  function scheduleRetry() {
    if (retryTimer !== null || disposed) return
    retryTimer = setTimeout(() => {
      retryTimer = null
      snapshotInBackground()
    }, INTERACTIVE_RETRY_MS)
  }

  /**
   * Snapshots every dirty document, including file- and storage-backed ones, until a save of that
   * revision lands: a save can fail (for example, when the browser withholds write access), and a
   * reload must not lose the edits. Only one encode runs at a time; later versions coalesce.
   */
  async function runWrites(generation: number, force: boolean): Promise<void> {
    if (disposed || generation !== lifecycleGeneration || !isEnabled()) return
    if (requestedVersion === protectedVersion) return
    if (!force && isInteractiveEditing()) {
      scheduleRetry()
      return
    }
    const version = requestedVersion
    const bytes = await buildFigFile()
    if (generation !== lifecycleGeneration || !isEnabled()) return
    await store.write({
      id,
      documentName: state.documentName,
      sceneVersion: version,
      figBytes: bytes
    })
    persistedVersion = version
    if (generation !== lifecycleGeneration) return
    protectedVersion = version
    if (requestedVersion !== version) await runWrites(generation, force)
  }

  async function persist(force: boolean): Promise<void> {
    await cleanup
    if (disposed || !isEnabled()) return
    requestedVersion = state.sceneVersion
    if (requestedVersion === protectedVersion) return
    const joined = writing !== null
    if (!writing) {
      const generation = lifecycleGeneration
      writing = runWrites(generation, force).finally(() => {
        writing = null
      })
    }
    await writing
    // A forced flush that joined a background encode must not stop where that encode deferred.
    if (force && joined && state.sceneVersion !== protectedVersion) await persist(true)
  }

  /** Close/reload flush: runs even during an interactive edit. */
  function persistNow(): Promise<void> {
    return persist(true)
  }

  function snapshotInBackground() {
    void persist(false).catch(reportSnapshotFailure)
  }

  const stopVersionWatch: WatchHandle = watchDebounced(
    () => state.sceneVersion,
    snapshotInBackground,
    { debounce: 3000, maxWait: 10000 }
  )

  const stopPageHidden = subscribePageHidden(snapshotInBackground)

  const stopEnabledWatch: WatchHandle = watch(
    isEnabled,
    (enabled) => {
      if (enabled) {
        protectedVersion = state.sceneVersion
        requestedVersion = state.sceneVersion
        return
      }
      lifecycleGeneration++
      const cleanupGeneration = lifecycleGeneration
      const snapshotId = id
      requestedVersion = state.sceneVersion
      protectedVersion = state.sceneVersion
      const activeWrite = writing
      cleanup = cleanup
        .then(async () => {
          await activeWrite
          await store.remove(snapshotId)
          if (cleanupGeneration === lifecycleGeneration) persistedVersion = null
          return undefined
        })
        .catch((error) => console.warn('[Recovery] Failed to disable recovery:', error))
    },
    { flush: 'sync' }
  )

  async function invalidateActiveWrite(): Promise<void> {
    lifecycleGeneration++
    await Promise.all([writing, cleanup])
  }

  return {
    getRecoveryId: () => id,
    async adoptRecoverySnapshot(nextId, sceneVersion) {
      const previousId = id
      await invalidateActiveWrite()
      id = nextId
      protectedVersion = sceneVersion
      persistedVersion = sceneVersion
      requestedVersion = sceneVersion
      disposed = false
      if (previousId !== nextId) await store.remove(previousId)
    },
    persistNow,
    async markProtectedVersion(version) {
      await invalidateActiveWrite()
      protectedVersion = version
      requestedVersion = state.sceneVersion
      if (persistedVersion == null || persistedVersion <= version) {
        await store.remove(id)
        persistedVersion = null
      }
    },
    async discardRecovery() {
      await invalidateActiveWrite()
      protectedVersion = state.sceneVersion
      persistedVersion = null
      requestedVersion = state.sceneVersion
      await store.remove(id)
    },
    disposeRecovery() {
      disposed = true
      lifecycleGeneration++
      if (retryTimer !== null) clearTimeout(retryTimer)
      retryTimer = null
      stopPageHidden()
      stopVersionWatch()
      stopEnabledWatch()
    }
  }
}
