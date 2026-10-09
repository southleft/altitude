/**
 * When to autosave: a framework-free state machine with an injected clock, so every rule is
 * testable without real time.
 *
 * - Debounce: a save waits until edits have been idle for `idleMs`.
 * - Rate limit: at most one commit per `minIntervalMs`.
 * - Never during an interactive edit (a drag or a scrub); it checks again shortly after.
 * - One run at a time; edits during a run coalesce into one follow-up run.
 * - Failures back off exponentially (or until a rate limit resets) and keep the edits
 *   pending; a conflict blocks until the user resolves it or asks to retry.
 */

export type AutosaveRunResult =
  | { kind: 'committed' }
  | { kind: 'unchanged' }
  /** `retryAt` (epoch ms) overrides the computed backoff, such as a rate-limit reset. */
  | { kind: 'failed'; retryAt?: number | null }
  | { kind: 'blocked' }
  | { kind: 'skipped' }

export type AutosaveSchedulerState =
  /** Nothing waiting to be saved. */
  | { phase: 'idle' }
  /** Edits are waiting for the idle debounce or the minimum interval. */
  | { phase: 'scheduled'; dueAt: number }
  | { phase: 'running' }
  /** The last attempt failed; the next one is at `retryAt`. */
  | { phase: 'backoff'; retryAt: number; attempts: number }
  /** A conflict (or another state only the user can resolve) stopped autosave. */
  | { phase: 'blocked' }
  /** Edits are pending but autosave cannot run (turned off, signed out, or not bound). */
  | { phase: 'paused' }

export interface AutosaveTimers {
  now(): number
  setTimeout(callback: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export interface AutosaveSchedulerOptions {
  /** Quiet time after the last edit before saving. */
  idleMs?: number
  /** Minimum time between two commits. */
  minIntervalMs?: number
  /** How soon to check again when an interactive edit is in progress. */
  interactiveRetryMs?: number
  /** First backoff after a failure; doubles per consecutive failure up to `maxBackoffMs`. */
  backoffMs?: number
  maxBackoffMs?: number
  timers?: AutosaveTimers
  /** Whether autosave may run now (enabled, signed in, bound). */
  canRun(): boolean
  isInteractive(): boolean
  run(): Promise<AutosaveRunResult>
  onState?(state: AutosaveSchedulerState): void
}

export const AUTOSAVE_IDLE_MS = 30_000
export const AUTOSAVE_MIN_INTERVAL_MS = 60_000
export const AUTOSAVE_INTERACTIVE_RETRY_MS = 2_000
export const AUTOSAVE_BACKOFF_MS = 30_000
export const AUTOSAVE_MAX_BACKOFF_MS = 10 * 60_000

const realTimers: AutosaveTimers = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
}

export function createAutosaveScheduler(options: AutosaveSchedulerOptions) {
  const idleMs = options.idleMs ?? AUTOSAVE_IDLE_MS
  const minIntervalMs = options.minIntervalMs ?? AUTOSAVE_MIN_INTERVAL_MS
  const interactiveRetryMs = options.interactiveRetryMs ?? AUTOSAVE_INTERACTIVE_RETRY_MS
  const backoffMs = options.backoffMs ?? AUTOSAVE_BACKOFF_MS
  const maxBackoffMs = options.maxBackoffMs ?? AUTOSAVE_MAX_BACKOFF_MS
  const timers = options.timers ?? realTimers

  let pending = false
  let running = false
  let blocked = false
  let disposed = false
  let lastChangeAt = Number.NEGATIVE_INFINITY
  let lastCommitAt = Number.NEGATIVE_INFINITY
  let retryAt = Number.NEGATIVE_INFINITY
  let failures = 0
  let timer: unknown = null
  let state: AutosaveSchedulerState = { phase: 'idle' }

  function setState(next: AutosaveSchedulerState) {
    state = next
    options.onState?.(next)
  }

  function clearTimer() {
    if (timer !== null) timers.clearTimeout(timer)
    timer = null
  }

  function dueAt(): number {
    return Math.max(lastChangeAt + idleMs, lastCommitAt + minIntervalMs, retryAt)
  }

  function arm(at: number) {
    clearTimer()
    timer = timers.setTimeout(fire, Math.max(0, at - timers.now()))
  }

  /** Re-evaluate: arm the timer for the next attempt, or settle into a resting state. */
  function schedule() {
    if (disposed || running) return
    clearTimer()
    if (!pending) {
      setState({ phase: 'idle' })
      return
    }
    if (blocked) {
      setState({ phase: 'blocked' })
      return
    }
    if (!options.canRun()) {
      setState({ phase: 'paused' })
      return
    }
    const at = dueAt()
    arm(at)
    if (failures > 0 && retryAt >= at) {
      setState({ phase: 'backoff', retryAt, attempts: failures })
    } else {
      setState({ phase: 'scheduled', dueAt: at })
    }
  }

  function fire() {
    timer = null
    if (disposed || running || !pending || blocked) return
    if (!options.canRun()) {
      setState({ phase: 'paused' })
      return
    }
    const at = dueAt()
    if (at > timers.now()) {
      arm(at)
      return
    }
    if (options.isInteractive()) {
      arm(timers.now() + interactiveRetryMs)
      return
    }
    void attempt()
  }

  async function attempt() {
    running = true
    // Edits made while this run snapshots and commits set `pending` again.
    pending = false
    setState({ phase: 'running' })
    let result: AutosaveRunResult
    try {
      result = await options.run()
    } catch {
      result = { kind: 'failed' }
    }
    running = false
    if (disposed) return
    const now = timers.now()
    switch (result.kind) {
      case 'committed':
        lastCommitAt = now
        failures = 0
        retryAt = Number.NEGATIVE_INFINITY
        break
      case 'unchanged':
        failures = 0
        retryAt = Number.NEGATIVE_INFINITY
        break
      case 'failed': {
        failures++
        pending = true
        const backoff = Math.min(maxBackoffMs, backoffMs * 2 ** (failures - 1))
        retryAt = Math.max(now + backoff, result.retryAt ?? Number.NEGATIVE_INFINITY)
        break
      }
      case 'blocked':
        pending = true
        blocked = true
        break
      case 'skipped':
        // Nothing ran (another operation was busy): try again on the normal schedule.
        pending = true
        lastChangeAt = now
        break
    }
    schedule()
  }

  return {
    /** An edit happened. */
    notifyChange() {
      if (disposed) return
      pending = true
      lastChangeAt = timers.now()
      schedule()
    },
    /**
     * Something outside the scheduler committed the document (an explicit Save or a
     * resolved conflict): restart the minimum interval and clear any backoff or block.
     */
    notifyCommitted() {
      if (disposed) return
      lastCommitAt = timers.now()
      failures = 0
      retryAt = Number.NEGATIVE_INFINITY
      blocked = false
      schedule()
    },
    /** Conditions changed (turned on, signed in, online): re-evaluate. */
    refresh() {
      schedule()
    },
    /** Retry now: clears the backoff, a block and the debounce, but not a running save. */
    retryNow() {
      if (disposed) return
      pending = true
      blocked = false
      retryAt = Number.NEGATIVE_INFINITY
      lastChangeAt = Number.NEGATIVE_INFINITY
      lastCommitAt = Number.NEGATIVE_INFINITY
      if (running) return
      if (!options.canRun()) {
        schedule()
        return
      }
      clearTimer()
      if (options.isInteractive()) {
        arm(timers.now() + interactiveRetryMs)
        setState({ phase: 'scheduled', dueAt: timers.now() + interactiveRetryMs })
        return
      }
      void attempt()
    },
    /** Nothing left to save (the document was reloaded or replaced). */
    reset() {
      clearTimer()
      pending = false
      blocked = false
      failures = 0
      retryAt = Number.NEGATIVE_INFINITY
      if (!running) setState({ phase: 'idle' })
    },
    state: () => state,
    dispose() {
      disposed = true
      clearTimer()
    }
  }
}

export type AutosaveScheduler = ReturnType<typeof createAutosaveScheduler>
