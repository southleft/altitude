/** Longest wait before idle work runs anyway on a page that never goes idle. */
const IDLE_TIMEOUT_MS = 2_000

/**
 * Run startup work that nothing visible waits for once the main thread is idle.
 *
 * `requestIdleCallback` is missing from Safari in the supported baseline, so it is
 * feature-detected; elsewhere the work runs after the current task. Returns a cancel.
 */
export function runWhenIdle(work: () => void): () => void {
  if (typeof globalThis.requestIdleCallback === 'function') {
    const handle = globalThis.requestIdleCallback(work, { timeout: IDLE_TIMEOUT_MS })
    return () => globalThis.cancelIdleCallback(handle)
  }
  const handle = setTimeout(work, 0)
  return () => clearTimeout(handle)
}
