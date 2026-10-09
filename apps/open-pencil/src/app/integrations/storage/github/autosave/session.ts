import { useOnline } from '@vueuse/core'
import { computed, effectScope, shallowRef, watch, type Ref } from 'vue'

import type { GitHubDocumentSession } from '../document/session'
import { githubIdentity } from '../identity'
import type { GitHubDocumentBinding } from '../repository'
import { githubSaveIndicator } from './indicator'
import { githubAutosaveEnabled } from './preferences'
import {
  createAutosaveScheduler,
  type AutosaveRunResult,
  type AutosaveSchedulerOptions,
  type AutosaveSchedulerState
} from './scheduler'

/** What autosave needs from its editor session. */
export interface GitHubAutosaveHost {
  github: Pick<GitHubDocumentSession, 'binding' | 'status' | 'autosave' | 'commit'>
  editor: { isInteractiveEditing(): boolean }
  state: { sceneVersion: number }
  hasUnsavedChanges(): boolean
}

export interface GitHubAutosaveServices {
  /** The Settings toggle and a signed-in account. */
  enabled?(): boolean
  /** Network reachability; the browser's online state by default. */
  online?: Readonly<Ref<boolean>>
  scheduler?: Partial<Omit<AutosaveSchedulerOptions, 'canRun' | 'isInteractive' | 'run'>>
}

const defaultEnabled = () => githubAutosaveEnabled.value && githubIdentity.value !== null

/** The same document in the same repository, whatever branch it is bound to. */
function documentIdentity(binding: GitHubDocumentBinding | null): string | null {
  return binding ? `${binding.owner}/${binding.repo}:${binding.path}` : null
}

/**
 * Autosave for one GitHub-bound document: watches edits, asks the scheduler when to
 * commit, and commits through the document session (to the draft branch). Local recovery
 * keeps protecting every revision until one of these commits lands.
 */
export function createGitHubAutosave(
  host: GitHubAutosaveHost,
  services: GitHubAutosaveServices = {}
) {
  const scope = effectScope(true)
  const state = shallowRef<AutosaveSchedulerState>({ phase: 'idle' })
  const enabled = computed(() => (services.enabled ? services.enabled() : defaultEnabled()))
  const online = services.online ?? scope.run(() => useOnline()) ?? shallowRef(true)

  async function run(): Promise<AutosaveRunResult> {
    if (!host.hasUnsavedChanges()) return { kind: 'unchanged' }
    const result = await host.github.autosave()
    if (result.kind !== 'failed') return result
    return { kind: 'failed', retryAt: result.failure.resetAt?.getTime() ?? null }
  }

  const scheduler = createAutosaveScheduler({
    ...services.scheduler,
    canRun: () => enabled.value && online.value && host.github.binding.value !== null,
    isInteractive: () => host.editor.isInteractiveEditing(),
    run,
    onState: (next) => {
      state.value = next
    }
  })

  scope.run(() => {
    watch(
      () => host.state.sceneVersion,
      () => {
        if (host.github.binding.value && host.hasUnsavedChanges()) scheduler.notifyChange()
      }
    )
    // Another document (or none) in this tab: whatever was pending belonged to the old one.
    watch(
      () => documentIdentity(host.github.binding.value),
      () => {
        scheduler.reset()
        if (host.github.binding.value && host.hasUnsavedChanges()) scheduler.notifyChange()
      }
    )
    watch([enabled, online], () => scheduler.refresh())
    // An explicit commit (or a resolved conflict) saved the document: restart the interval.
    watch(host.github.status, (next, previous) => {
      if (next.phase !== 'idle') return
      if (previous.phase === 'conflict') scheduler.notifyCommitted()
      else if (previous.phase === 'working' && previous.origin === 'user') {
        scheduler.notifyCommitted()
      }
    })
  })

  const indicator = computed(() =>
    githubSaveIndicator({
      binding: host.github.binding.value,
      dirty: host.hasUnsavedChanges(),
      status: host.github.status.value,
      autosave: enabled.value ? state.value : null,
      online: online.value
    })
  )

  return {
    state,
    enabled,
    indicator,
    /** The chip's Retry: an autosave now, or an explicit commit when autosave is off. */
    async retry(): Promise<void> {
      if (enabled.value) {
        scheduler.retryNow()
        return
      }
      await host.github.commit()
    },
    dispose() {
      scheduler.dispose()
      scope.stop()
    }
  }
}

export type GitHubAutosave = ReturnType<typeof createGitHubAutosave>
