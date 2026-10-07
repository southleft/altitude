/**
 * The per-key routing core of the relay Durable Object, kept free of Workers
 * globals so it runs under `bun test` with fake sockets.
 *
 * One hub exists per connection key. Tabs attach over hibernatable WebSockets;
 * agent requests are forwarded to the most recently focused tab.
 */
import * as v from 'valibot'

import { constantTimeEqual } from './auth'
import { exceedsBytes, TokenBucket, type RelayLimits } from './limits'
import { handleMCPBody, jsonRPCError, type ForwardOutcome, type MCPBackend } from './mcp'
import {
  RELAY_CLOSE,
  RELAY_ERROR_CODES,
  RELAY_MAX_FRAME_BYTES,
  RELAY_REFRESH_ID_PREFIX,
  tabFrameSchema,
  type RelayMethod,
  type RelayRequestFrame
} from './protocol'

/** The subset of a hibernatable WebSocket the hub needs. */
export interface HubSocket {
  send(data: string): void
  close(code?: number, reason?: string): void
  serializeAttachment(value: unknown): void
  deserializeAttachment(): unknown
}

/** The subset of `DurableObjectState` the hub needs. */
export interface HubState {
  getWebSockets(): HubSocket[]
  storage: {
    get(key: string): Promise<unknown>
    put(key: string, value: unknown): Promise<void>
  }
}

export interface HubOptions extends RelayLimits {
  now?: () => number
  /** Request ids for frames sent to the tab. */
  createId?: () => string
}

const attachmentSchema = v.object({
  keyHash: v.string(),
  connectedAt: v.number(),
  focused: v.boolean(),
  /** Last time this tab reported focus or answered a request. */
  activeAt: v.number()
})
type TabAttachment = v.InferOutput<typeof attachmentSchema>

export const NO_TAB_MESSAGE =
  'No OpenPencil tab is connected with this key. STOP and tell the user: "Open the hosted OpenPencil editor in your browser, sign in, and keep the tab open; the Connect AI button shows when the tab is linked." Then try again. If the user regenerated the key, update the agent configuration with the new command from Connect AI.'

const TOOL_CACHE_KEY = 'tools-list'
const MAX_CACHED_TOOLS_BYTES = 1024 * 1024

interface Pending {
  socket: HubSocket
  resolve: (outcome: ForwardOutcome) => void
  timer: ReturnType<typeof setTimeout>
}

export interface HubHTTPResult {
  status: number
  /** `null` when no response is due (202). */
  body: unknown
}

function readAttachment(socket: HubSocket): TabAttachment | null {
  const parsed = v.safeParse(attachmentSchema, socket.deserializeAttachment())
  return parsed.success ? parsed.output : null
}

function defaultId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export class RelayHub {
  private readonly pending = new Map<string, Pending>()
  private readonly bucket: TokenBucket
  private readonly now: () => number
  private readonly createId: () => string

  constructor(
    private readonly state: HubState,
    private readonly options: HubOptions
  ) {
    this.now = options.now ?? Date.now
    this.createId = options.createId ?? defaultId
    this.bucket = new TokenBucket(options.rateBurst, options.ratePerSecond, this.now)
  }

  /** Register an accepted tab socket. The caller has validated origin and key. */
  attach(socket: HubSocket, keyHash: string): void {
    const now = this.now()
    socket.serializeAttachment({
      keyHash,
      connectedAt: now,
      focused: false,
      activeAt: now
    } satisfies TabAttachment)
    socket.send(
      JSON.stringify({
        type: 'welcome',
        timeoutMs: this.options.timeoutMs,
        maxFrameBytes: RELAY_MAX_FRAME_BYTES
      })
    )
  }

  /** Tabs authenticated with exactly this key digest. */
  private tabs(keyHash: string): { socket: HubSocket; attachment: TabAttachment }[] {
    return this.state.getWebSockets().flatMap((socket) => {
      const attachment = readAttachment(socket)
      return attachment && constantTimeEqual(attachment.keyHash, keyHash)
        ? [{ socket, attachment }]
        : []
    })
  }

  /**
   * Several tabs may share a key. A focused tab wins; otherwise the tab that
   * was focused or active most recently, then the newest connection.
   */
  selectTab(keyHash: string): HubSocket | null {
    const candidates = this.tabs(keyHash)
    candidates.sort(
      (a, b) =>
        Number(b.attachment.focused) - Number(a.attachment.focused) ||
        b.attachment.activeAt - a.attachment.activeAt ||
        b.attachment.connectedAt - a.attachment.connectedAt
    )
    return candidates[0]?.socket ?? null
  }

  private touch(socket: HubSocket, patch: Partial<Pick<TabAttachment, 'focused'>> = {}): void {
    const attachment = readAttachment(socket)
    if (!attachment) return
    socket.serializeAttachment({ ...attachment, ...patch, activeAt: this.now() })
  }

  private send(socket: HubSocket, method: RelayMethod, params: unknown, id: string) {
    return new Promise<ForwardOutcome>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        resolve({
          ok: false,
          error: {
            code: RELAY_ERROR_CODES.timeout,
            message: `The OpenPencil tab did not answer within ${Math.round(
              this.options.timeoutMs / 1000
            )} s. The tab may be busy or suspended in the background; bring it to the front and try again.`
          }
        })
      }, this.options.timeoutMs)
      this.pending.set(id, { socket, resolve, timer })
      const frame: RelayRequestFrame = { type: 'request', id, method, params }
      try {
        socket.send(JSON.stringify(frame))
      } catch {
        this.settle(id, {
          ok: false,
          error: { code: RELAY_ERROR_CODES.noTab, message: NO_TAB_MESSAGE }
        })
      }
    })
  }

  private settle(id: string, outcome: ForwardOutcome): void {
    const entry = this.pending.get(id)
    if (!entry) return
    clearTimeout(entry.timer)
    this.pending.delete(id)
    entry.resolve(outcome)
  }

  private async cachedTools(): Promise<unknown> {
    return this.state.storage.get(TOOL_CACHE_KEY)
  }

  private async cacheTools(result: unknown): Promise<void> {
    const text = JSON.stringify(result)
    if (exceedsBytes(text, MAX_CACHED_TOOLS_BYTES)) return
    await this.state.storage.put(TOOL_CACHE_KEY, result)
  }

  /** Forward one MCP method to the selected tab. */
  async forward(keyHash: string, method: RelayMethod, params: unknown): Promise<ForwardOutcome> {
    const socket = this.selectTab(keyHash)
    if (!socket) {
      // The tab's last tool list lets an agent start before the tab opens.
      if (method === 'tools/list') {
        const cached = await this.cachedTools()
        if (cached !== undefined) return { ok: true, result: cached }
      }
      return { ok: false, error: { code: RELAY_ERROR_CODES.noTab, message: NO_TAB_MESSAGE } }
    }
    const outcome = await this.send(socket, method, params, this.createId())
    if (outcome.ok && method === 'tools/list') await this.cacheTools(outcome.result)
    return outcome
  }

  /** Handle a POSTed MCP body for an authenticated key digest. */
  async handleMCP(keyHash: string, body: unknown): Promise<HubHTTPResult> {
    if (!this.bucket.take()) {
      return {
        status: 429,
        body: jsonRPCError(
          null,
          RELAY_ERROR_CODES.rateLimited,
          'Too many requests for this connection key. Slow down and retry shortly.'
        )
      }
    }
    const backend: MCPBackend = {
      forward: (method, params) => this.forward(keyHash, method, params)
    }
    const response = await handleMCPBody(body, backend)
    return response === null ? { status: 202, body: null } : { status: 200, body: response }
  }

  /** Handle a frame from a tab. Invalid or oversized frames close that socket. */
  async handleTabMessage(socket: HubSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') {
      socket.close(RELAY_CLOSE.invalidFrame, 'Binary frames are not supported')
      return
    }
    if (exceedsBytes(message, RELAY_MAX_FRAME_BYTES)) {
      socket.close(RELAY_CLOSE.tooLarge, 'Frame too large')
      return
    }
    let raw: unknown
    try {
      raw = JSON.parse(message)
    } catch {
      socket.close(RELAY_CLOSE.invalidFrame, 'Invalid JSON')
      return
    }
    const parsed = v.safeParse(tabFrameSchema, raw)
    if (!parsed.success) {
      socket.close(RELAY_CLOSE.invalidFrame, 'Invalid frame')
      return
    }
    const frame = parsed.output
    switch (frame.type) {
      case 'response': {
        const entry = this.pending.get(frame.id)
        if (entry?.socket === socket) {
          this.touch(socket)
          this.settle(
            frame.id,
            frame.error
              ? { ok: false, error: frame.error }
              : { ok: true, result: frame.result ?? null }
          )
        } else if (frame.id.startsWith(RELAY_REFRESH_ID_PREFIX) && !frame.error) {
          await this.cacheTools(frame.result ?? null)
        }
        return
      }
      case 'focus':
        this.touch(socket, { focused: frame.focused })
        return
      case 'hello':
        this.touch(socket, { focused: frame.focused })
        // Refresh the tool cache so agents that start later see current tools.
        socket.send(
          JSON.stringify({
            type: 'request',
            id: `${RELAY_REFRESH_ID_PREFIX}${this.createId()}`,
            method: 'tools/list',
            params: {}
          } satisfies RelayRequestFrame)
        )
        return
      case 'ping':
        // Normally answered by the platform's auto-response without waking the object.
        socket.send(JSON.stringify({ type: 'pong' }))
    }
  }

  /** A tab went away: fail its in-flight requests now instead of at the timeout. */
  handleTabClose(socket: HubSocket): void {
    for (const [id, entry] of this.pending) {
      if (entry.socket !== socket) continue
      this.settle(id, {
        ok: false,
        error: {
          code: RELAY_ERROR_CODES.noTab,
          message: 'The OpenPencil tab disconnected before answering. Ask the user to reopen it.'
        }
      })
    }
  }
}

/** The Durable Object's `/mcp` route: parse the forwarded body and answer as JSON. */
export async function respondToMCP(hub: RelayHub, keyHash: string, request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(jsonRPCError(null, RELAY_ERROR_CODES.parseError, 'Parse error'), {
      status: 400
    })
  }
  const result = await hub.handleMCP(keyHash, body)
  if (result.body === null) return new Response(null, { status: result.status })
  return Response.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'no-store' }
  })
}
