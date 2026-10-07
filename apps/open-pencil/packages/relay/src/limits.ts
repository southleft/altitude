/** Runtime limits; each can be overridden by a Worker variable of the same name. */
export interface RelayLimits {
  /** How long an MCP request waits for the tab. */
  timeoutMs: number
  /** Requests a key may burst before throttling. */
  rateBurst: number
  /** Sustained requests per second per key. */
  ratePerSecond: number
}

export const DEFAULT_LIMITS: RelayLimits = {
  timeoutMs: 60_000,
  rateBurst: 60,
  ratePerSecond: 10
}

export interface RelayLimitEnv {
  RELAY_TIMEOUT_MS?: string
  RELAY_RATE_BURST?: string
  RELAY_RATE_PER_SECOND?: string
}

function positive(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function readLimits(env: RelayLimitEnv): RelayLimits {
  return {
    timeoutMs: positive(env.RELAY_TIMEOUT_MS, DEFAULT_LIMITS.timeoutMs),
    rateBurst: positive(env.RELAY_RATE_BURST, DEFAULT_LIMITS.rateBurst),
    ratePerSecond: positive(env.RELAY_RATE_PER_SECOND, DEFAULT_LIMITS.ratePerSecond)
  }
}

/** A token bucket per Durable Object, which is per key. Resets when the object is evicted. */
export class TokenBucket {
  private tokens: number
  private updatedAt: number

  constructor(
    private readonly capacity: number,
    private readonly perSecond: number,
    private readonly now: () => number
  ) {
    this.tokens = capacity
    this.updatedAt = now()
  }

  take(): boolean {
    const current = this.now()
    const elapsed = Math.max(0, current - this.updatedAt) / 1000
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.perSecond)
    this.updatedAt = current
    if (this.tokens < 1) return false
    this.tokens -= 1
    return true
  }
}

/** UTF-8 byte length, skipping the encode when the string cannot reach the limit. */
export function exceedsBytes(value: string, limit: number): boolean {
  if (value.length * 3 <= limit) return false
  return new TextEncoder().encode(value).byteLength > limit
}
