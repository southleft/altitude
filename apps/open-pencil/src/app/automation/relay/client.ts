import { useIntervalFn } from '@vueuse/core'
import * as v from 'valibot'

import {
  RELAY_ERROR_CODES,
  RELAY_MAX_FRAME_BYTES,
  RELAY_PING_FRAME,
  RELAY_REFRESH_ID_PREFIX,
  relayInboundFrameSchema,
  relaySubprotocols,
  type RelayMethod,
  type TabFrame
} from '@open-pencil/relay/protocol'

import type { RelayHostOutcome } from './host'

export type RelaySocketStatus = 'connecting' | 'open' | 'closed'

/** The subset of `WebSocket` the client uses, so tests can drive it with a fake. */
export interface RelaySocket {
  readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  onopen: ((event: unknown) => void) | null
  onmessage: ((event: { data: unknown }) => void) | null
  onclose: ((event: { code: number }) => void) | null
  onerror: ((event: unknown) => void) | null
}

export interface RelayClientOptions {
  connectURL: string
  /** Read once per connection attempt; never retained by the client. */
  resolveKey: () => Promise<string | null>
  handle: (method: RelayMethod, params: unknown) => Promise<RelayHostOutcome>
  onStatus: (status: RelaySocketStatus) => void
  /** An agent request reached this tab. Relay-internal refreshes are not reported. */
  onAgentRequest: (method: RelayMethod) => void
  isFocused: () => boolean
  appVersion?: string
  createSocket?: (url: string, protocols: string[]) => RelaySocket
  /** Reconnect delay for the given attempt; defaults to jittered exponential backoff. */
  reconnectDelay?: (attempt: number) => number
}

const OPEN = 1
const PING_INTERVAL_MS = 25_000
const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS = 30_000

function cryptoRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
}

/** Exponential backoff with jitter: 1 s, 2 s, 4 s … capped at 30 s, each scaled by 0.5–1. */
export function relayReconnectDelay(attempt: number, random: () => number): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt)
  return Math.round(ceiling * (0.5 + random() / 2))
}

function exceedsFrameLimit(text: string): boolean {
  if (text.length * 3 <= RELAY_MAX_FRAME_BYTES) return false
  return new TextEncoder().encode(text).byteLength > RELAY_MAX_FRAME_BYTES
}

/**
 * Keep this tab linked to the hosted relay: connect with the key as a
 * subprotocol token, answer forwarded MCP requests, report focus, and
 * reconnect with backoff until disconnected.
 */
export function connectRelay(options: RelayClientOptions) {
  const createSocket =
    options.createSocket ??
    ((url: string, protocols: string[]) => new WebSocket(url, protocols) as RelaySocket)
  const reconnectDelay =
    options.reconnectDelay ?? ((attempt: number) => relayReconnectDelay(attempt, cryptoRandom))
  let socket: RelaySocket | null = null
  let attempt = 0
  let stopped = false
  // Read through a function: `stopped` changes while `open()` awaits the key.
  const isStopped = () => stopped
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  function send(frame: TabFrame | string): void {
    if (socket?.readyState !== OPEN) return
    socket.send(typeof frame === 'string' ? frame : JSON.stringify(frame))
  }

  // Keep-alives stop proxies from dropping an idle socket; the relay answers them cheaply.
  const keepAlive = useIntervalFn(() => send(RELAY_PING_FRAME), PING_INTERVAL_MS, {
    immediate: false
  })

  function scheduleReconnect(): void {
    if (stopped) return
    clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => void open(), reconnectDelay(attempt))
    attempt++
  }

  async function answer(id: string, method: RelayMethod, params: unknown): Promise<void> {
    if (!id.startsWith(RELAY_REFRESH_ID_PREFIX)) options.onAgentRequest(method)
    let outcome: RelayHostOutcome
    try {
      outcome = await options.handle(method, params)
    } catch (error) {
      outcome = {
        error: {
          code: RELAY_ERROR_CODES.internalError,
          message: error instanceof Error ? error.message : String(error)
        }
      }
    }
    let text = JSON.stringify({ type: 'response', id, ...outcome })
    if (exceedsFrameLimit(text)) {
      text = JSON.stringify({
        type: 'response',
        id,
        error: {
          code: RELAY_ERROR_CODES.tooLarge,
          message: 'The result exceeds the relay size limit. Narrow the request.'
        }
      })
    }
    send(text)
  }

  function handleMessage(data: unknown): void {
    if (typeof data !== 'string' || exceedsFrameLimit(data)) return
    let raw: unknown
    try {
      raw = JSON.parse(data)
    } catch {
      return
    }
    const parsed = v.safeParse(relayInboundFrameSchema, raw)
    if (!parsed.success) return
    const frame = parsed.output
    if (frame.type === 'welcome') {
      attempt = 0
      options.onStatus('open')
      return
    }
    if (frame.type === 'request') void answer(frame.id, frame.method, frame.params)
  }

  async function open(): Promise<void> {
    if (stopped) return
    options.onStatus('connecting')
    let key: string | null
    try {
      key = await options.resolveKey()
    } catch {
      key = null
    }
    if (isStopped()) return
    if (!key) {
      options.onStatus('closed')
      return
    }
    let next: RelaySocket
    try {
      next = createSocket(options.connectURL, relaySubprotocols(key))
    } catch {
      options.onStatus('closed')
      scheduleReconnect()
      return
    }
    socket = next
    next.onopen = () => {
      send({ type: 'hello', focused: options.isFocused(), appVersion: options.appVersion })
      keepAlive.resume()
    }
    next.onmessage = (event) => handleMessage(event.data)
    next.onclose = () => {
      if (socket !== next) return
      socket = null
      keepAlive.pause()
      if (stopped) return
      options.onStatus('closed')
      scheduleReconnect()
    }
    next.onerror = () => next.close()
  }

  void open()

  return {
    reportFocus(focused: boolean): void {
      send({ type: 'focus', focused })
    },
    disconnect(): void {
      stopped = true
      clearTimeout(reconnectTimer)
      keepAlive.pause()
      const current = socket
      socket = null
      current?.close(1000, 'Disconnected')
      options.onStatus('closed')
    }
  }
}

export type RelayConnection = ReturnType<typeof connectRelay>
