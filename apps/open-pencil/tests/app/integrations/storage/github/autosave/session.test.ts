import { expect, test } from 'bun:test'

import { nextTick, reactive, ref, shallowRef } from 'vue'

import type { AutosaveTimers } from '@/app/integrations/storage/github/autosave/scheduler'
import {
  createGitHubAutosave,
  type GitHubAutosaveHost
} from '@/app/integrations/storage/github/autosave/session'
import type {
  GitHubAutosaveResult,
  GitHubDocumentStatus
} from '@/app/integrations/storage/github/document/session'
import type { GitHubDocumentBinding } from '@/app/integrations/storage/github/repository'

const binding: GitHubDocumentBinding = {
  owner: 'southleft',
  repo: 'altitude-designs',
  branch: 'main',
  path: 'documents/landing-page',
  commitSHA: 'a'.repeat(40),
  committedAt: null,
  files: {}
}

function manualTimers() {
  let now = 0
  const pending: Array<{ at: number; callback: () => void; id: number }> = []
  let ids = 0
  const timers: AutosaveTimers = {
    now: () => now,
    setTimeout(callback, ms) {
      pending.push({ at: now + ms, callback, id: ++ids })
      return ids
    },
    clearTimeout(handle) {
      const index = pending.findIndex((entry) => entry.id === handle)
      if (index !== -1) pending.splice(index, 1)
    }
  }
  return {
    timers,
    async advance(ms: number) {
      now += ms
      for (const entry of pending.filter((candidate) => candidate.at <= now)) {
        pending.splice(pending.indexOf(entry), 1)
        entry.callback()
      }
      await Bun.sleep(0)
    }
  }
}

function fixture() {
  const clock = manualTimers()
  const runs: string[] = []
  const status = shallowRef<GitHubDocumentStatus>({ phase: 'idle' })
  const bound = shallowRef<GitHubDocumentBinding | null>(binding)
  const dirty = ref(false)
  const enabled = ref(true)
  const online = ref(true)
  const state = reactive({ sceneVersion: 1 })
  let interactive = false
  const github: GitHubAutosaveHost['github'] = {
    binding: bound,
    status,
    async autosave(): Promise<GitHubAutosaveResult> {
      runs.push('autosave')
      dirty.value = false
      return { kind: 'committed' }
    },
    async commit() {
      runs.push('commit')
      return true
    }
  }
  const autosave = createGitHubAutosave(
    {
      github,
      editor: { isInteractiveEditing: () => interactive },
      state,
      hasUnsavedChanges: () => dirty.value
    },
    {
      enabled: () => enabled.value,
      online,
      scheduler: { timers: clock.timers, idleMs: 1_000, minIntervalMs: 5_000 }
    }
  )
  async function edit() {
    dirty.value = true
    state.sceneVersion++
    await nextTick()
  }
  return {
    clock,
    runs,
    autosave,
    edit,
    enabled,
    online,
    bound,
    status,
    setInteractive: (value: boolean) => {
      interactive = value
    }
  }
}

test('edits to a bound document autosave after the debounce', async () => {
  const { clock, runs, autosave, edit } = fixture()
  await edit()
  expect(autosave.indicator.value.kind).toBe('unsaved')
  await clock.advance(1_000)
  expect(runs).toEqual(['autosave'])
  expect(autosave.indicator.value.kind).toBe('committed')
  autosave.dispose()
})

test('autosave off or offline: edits stay pending and resume when it can run', async () => {
  const { clock, runs, autosave, edit, enabled, online } = fixture()
  enabled.value = false
  await edit()
  await clock.advance(10_000)
  expect(runs).toEqual([])
  expect(autosave.state.value).toEqual({ phase: 'paused' })
  enabled.value = true
  online.value = false
  await nextTick()
  await clock.advance(10_000)
  expect(runs).toEqual([])
  expect(autosave.indicator.value.kind).toBe('offline')
  online.value = true
  await nextTick()
  await clock.advance(0)
  expect(runs).toEqual(['autosave'])
  autosave.dispose()
})

test('switching documents drops pending work; Retry with autosave off commits', async () => {
  const { clock, runs, autosave, edit, bound, enabled } = fixture()
  await edit()
  bound.value = null
  await nextTick()
  await clock.advance(10_000)
  expect(runs).toEqual([])
  enabled.value = false
  await nextTick()
  await autosave.retry()
  expect(runs).toEqual(['commit'])
  autosave.dispose()
})

test('an explicit commit restarts the minimum interval', async () => {
  const { clock, runs, autosave, edit, status } = fixture()
  status.value = { phase: 'working', operation: 'commit', origin: 'user' }
  await nextTick()
  status.value = { phase: 'idle' }
  await nextTick()
  await edit()
  await clock.advance(1_000)
  expect(runs).toEqual([])
  await clock.advance(4_000)
  expect(runs).toEqual(['autosave'])
  autosave.dispose()
})
