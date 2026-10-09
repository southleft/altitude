import { expect, test } from 'bun:test'

import {
  createAutosaveScheduler,
  type AutosaveRunResult,
  type AutosaveSchedulerState,
  type AutosaveTimers
} from '@/app/integrations/storage/github/autosave/scheduler'

/** A manual clock: `advance` fires due timers in order. */
function fakeTimers() {
  let now = 0
  let ids = 0
  const pending = new Map<number, { at: number; callback: () => void }>()
  const timers: AutosaveTimers = {
    now: () => now,
    setTimeout(callback, ms) {
      const id = ++ids
      pending.set(id, { at: now + ms, callback })
      return id
    },
    clearTimeout(handle) {
      pending.delete(handle as number)
    }
  }
  async function advance(ms: number) {
    const end = now + ms
    for (;;) {
      const next = [...pending].toSorted((a, b) => a[1].at - b[1].at)[0]
      if (!next || next[1].at > end) break
      pending.delete(next[0])
      now = next[1].at
      next[1].callback()
      // Let a started run settle before the next timer.
      await Promise.resolve()
      await Promise.resolve()
    }
    now = end
  }
  return { timers, advance, now: () => now }
}

function fixture(results: AutosaveRunResult[] = []) {
  const clock = fakeTimers()
  const runs: number[] = []
  const states: AutosaveSchedulerState[] = []
  let interactive = false
  let canRun = true
  let release: (() => void) | null = null
  let holdNext = false
  const scheduler = createAutosaveScheduler({
    idleMs: 30_000,
    minIntervalMs: 60_000,
    interactiveRetryMs: 2_000,
    backoffMs: 30_000,
    maxBackoffMs: 240_000,
    timers: clock.timers,
    canRun: () => canRun,
    isInteractive: () => interactive,
    run: async () => {
      runs.push(clock.now())
      if (holdNext) {
        holdNext = false
        await new Promise<void>((resolve) => {
          release = resolve
        })
      }
      return results.shift() ?? { kind: 'committed' }
    },
    onState: (state) => states.push(state)
  })
  return {
    clock,
    runs,
    states,
    scheduler,
    setInteractive: (value: boolean) => {
      interactive = value
    },
    setCanRun: (value: boolean) => {
      canRun = value
    },
    hold: () => {
      holdNext = true
    },
    release: async () => {
      release?.()
      await Promise.resolve()
      await Promise.resolve()
    }
  }
}

test('saves once after edits have been idle for the debounce', async () => {
  const { clock, runs, scheduler } = fixture()
  scheduler.notifyChange()
  await clock.advance(20_000)
  scheduler.notifyChange()
  await clock.advance(29_000)
  expect(runs).toEqual([])
  await clock.advance(1_000)
  expect(runs).toEqual([50_000])
  expect(scheduler.state()).toEqual({ phase: 'idle' })
})

test('keeps at least the minimum interval between commits', async () => {
  const { clock, runs, scheduler } = fixture()
  scheduler.notifyChange()
  await clock.advance(30_000)
  expect(runs).toEqual([30_000])
  scheduler.notifyChange()
  // Idle would allow 60 s; the minimum interval holds it to 90 s (30 s + 60 s).
  await clock.advance(30_000)
  expect(runs).toEqual([30_000])
  await clock.advance(30_000)
  expect(runs).toEqual([30_000, 90_000])
})

test('an unchanged document does not restart the minimum interval', async () => {
  const { clock, runs, scheduler } = fixture([{ kind: 'unchanged' }])
  scheduler.notifyChange()
  await clock.advance(30_000)
  scheduler.notifyChange()
  await clock.advance(30_000)
  expect(runs).toEqual([30_000, 60_000])
})

test('never runs during an interactive edit and retries shortly after', async () => {
  const { clock, runs, scheduler, setInteractive } = fixture()
  setInteractive(true)
  scheduler.notifyChange()
  await clock.advance(36_000)
  expect(runs).toEqual([])
  setInteractive(false)
  await clock.advance(2_000)
  expect(runs).toEqual([38_000])
})

test('one run at a time; edits during a run coalesce into one follow-up', async () => {
  const { clock, runs, scheduler, hold, release } = fixture()
  hold()
  scheduler.notifyChange()
  await clock.advance(30_000)
  expect(runs).toEqual([30_000])
  expect(scheduler.state()).toEqual({ phase: 'running' })
  scheduler.notifyChange()
  scheduler.notifyChange()
  scheduler.retryNow()
  await clock.advance(1_000)
  expect(runs).toEqual([30_000])
  await release()
  // The follow-up waits for the minimum interval after the commit at 31 s.
  expect(scheduler.state()).toEqual({ phase: 'scheduled', dueAt: 91_000 })
  await clock.advance(60_000)
  expect(runs).toEqual([30_000, 91_000])
})

test('failures back off exponentially, honour a rate-limit reset, and keep edits pending', async () => {
  const { clock, runs, scheduler } = fixture([
    { kind: 'failed' },
    { kind: 'failed' },
    { kind: 'failed', retryAt: 500_000 },
    { kind: 'committed' }
  ])
  scheduler.notifyChange()
  await clock.advance(30_000)
  expect(scheduler.state()).toEqual({ phase: 'backoff', retryAt: 60_000, attempts: 1 })
  await clock.advance(30_000)
  expect(scheduler.state()).toEqual({ phase: 'backoff', retryAt: 120_000, attempts: 2 })
  await clock.advance(60_000)
  expect(scheduler.state()).toEqual({ phase: 'backoff', retryAt: 500_000, attempts: 3 })
  await clock.advance(380_000)
  expect(runs).toEqual([30_000, 60_000, 120_000, 500_000])
  expect(scheduler.state()).toEqual({ phase: 'idle' })
})

test('Retry runs immediately and clears the backoff', async () => {
  const { clock, runs, scheduler } = fixture([{ kind: 'failed' }])
  scheduler.notifyChange()
  await clock.advance(30_000)
  scheduler.retryNow()
  await clock.advance(0)
  expect(runs).toEqual([30_000, 30_000])
  expect(scheduler.state()).toEqual({ phase: 'idle' })
})

test('a conflict blocks autosave until an explicit commit resolves it', async () => {
  const { clock, runs, scheduler } = fixture([{ kind: 'blocked' }])
  scheduler.notifyChange()
  await clock.advance(30_000)
  expect(scheduler.state()).toEqual({ phase: 'blocked' })
  scheduler.notifyChange()
  await clock.advance(120_000)
  expect(runs).toEqual([30_000])
  scheduler.notifyCommitted()
  await clock.advance(60_000)
  expect(runs).toEqual([30_000, 210_000])
})

test('pauses while it cannot run and resumes on refresh', async () => {
  const { clock, runs, scheduler, setCanRun } = fixture()
  setCanRun(false)
  scheduler.notifyChange()
  await clock.advance(60_000)
  expect(runs).toEqual([])
  expect(scheduler.state()).toEqual({ phase: 'paused' })
  setCanRun(true)
  scheduler.refresh()
  await clock.advance(0)
  expect(runs).toEqual([60_000])
})

test('reset drops pending work and dispose stops the timer', async () => {
  const { clock, runs, scheduler } = fixture()
  scheduler.notifyChange()
  scheduler.reset()
  await clock.advance(60_000)
  expect(runs).toEqual([])
  scheduler.notifyChange()
  scheduler.dispose()
  await clock.advance(60_000)
  expect(runs).toEqual([])
})
