/**
 * Frames exchanged between the hosted relay and an OpenPencil tab.
 *
 * The relay owns no tool definitions: it forwards MCP `tools/list` and
 * `tools/call` to the tab and returns the tab's MCP result unchanged. Both
 * sides validate every frame against these schemas.
 */
import * as v from 'valibot'

/** Subprotocol the relay selects; the tab offers it together with its key token. */
export const RELAY_SUBPROTOCOL = 'open-pencil-relay.v1'

/**
 * Prefix of the second offered subprotocol, which carries the connection key.
 * Browsers cannot set headers on a WebSocket, and keys must never appear in URLs.
 */
export const RELAY_KEY_PROTOCOL_PREFIX = 'op-key.'

/** Connection keys are base64url, at least 32 random bytes (43 characters). */
export const RELAY_KEY_PATTERN = /^[A-Za-z0-9_-]{43,128}$/

/** Largest frame either side accepts, and the largest MCP request body. */
export const RELAY_MAX_FRAME_BYTES = 8 * 1024 * 1024

/** Keep-alive frames; the relay answers them without waking its Durable Object. */
export const RELAY_PING_FRAME = '{"type":"ping"}'
export const RELAY_PONG_FRAME = '{"type":"pong"}'

/** Ids of relay-initiated requests (tool cache refresh); they are not agent activity. */
export const RELAY_REFRESH_ID_PREFIX = 'refresh:'

/** WebSocket close codes the relay uses. Codes 4000–4999 are application-defined. */
export const RELAY_CLOSE = {
  /** A frame failed validation. */
  invalidFrame: 4400,
  /** The key was rejected. Reconnecting with the same key cannot succeed. */
  unauthorized: 4401,
  /** A frame exceeded `RELAY_MAX_FRAME_BYTES`. */
  tooLarge: 1009
} as const

export const relayMethodSchema = v.picklist(['tools/list', 'tools/call'])
export type RelayMethod = v.InferOutput<typeof relayMethodSchema>

const idSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(64))

/** Relay → tab: an MCP request for the tab to answer from its own registry. */
export const relayRequestFrameSchema = v.object({
  type: v.literal('request'),
  id: idSchema,
  method: relayMethodSchema,
  params: v.optional(v.unknown())
})
export type RelayRequestFrame = v.InferOutput<typeof relayRequestFrameSchema>

/** Relay → tab: sent once after the socket opens. */
export const relayWelcomeFrameSchema = v.object({
  type: v.literal('welcome'),
  timeoutMs: v.number(),
  maxFrameBytes: v.number()
})

export const relayInboundFrameSchema = v.variant('type', [
  relayRequestFrameSchema,
  relayWelcomeFrameSchema,
  v.object({ type: v.literal('pong') })
])
export type RelayInboundFrame = v.InferOutput<typeof relayInboundFrameSchema>

export const relayErrorSchema = v.object({
  code: v.number(),
  message: v.pipe(v.string(), v.maxLength(4096))
})
export type RelayError = v.InferOutput<typeof relayErrorSchema>

/** Tab → relay: the MCP result (or a JSON-RPC error) for a request. */
export const tabResponseFrameSchema = v.object({
  type: v.literal('response'),
  id: idSchema,
  result: v.optional(v.unknown()),
  error: v.optional(relayErrorSchema)
})
export type TabResponseFrame = v.InferOutput<typeof tabResponseFrameSchema>

/** Tab → relay: focus changes decide which tab answers when several share a key. */
export const tabFocusFrameSchema = v.object({
  type: v.literal('focus'),
  focused: v.boolean()
})

/** Tab → relay: sent once after the socket opens. */
export const tabHelloFrameSchema = v.object({
  type: v.literal('hello'),
  focused: v.boolean(),
  appVersion: v.optional(v.pipe(v.string(), v.maxLength(64)))
})

export const tabFrameSchema = v.variant('type', [
  tabResponseFrameSchema,
  tabFocusFrameSchema,
  tabHelloFrameSchema,
  v.object({ type: v.literal('ping') })
])
export type TabFrame = v.InferOutput<typeof tabFrameSchema>

/** JSON-RPC error codes shared by the relay and the tab. */
export const RELAY_ERROR_CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  /** No OpenPencil tab is connected with this key. */
  noTab: -32001,
  /** The tab did not answer in time. */
  timeout: -32002,
  /** The request or the tab's answer exceeded the size limit. */
  tooLarge: -32003,
  /** Too many requests for this key. */
  rateLimited: -32029,
  /** Missing or malformed connection key. */
  unauthorized: -32401
} as const

/** Minimal MCP result shapes the tab returns. */
export type MCPContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }

export interface MCPCallToolResult {
  content: MCPContent[]
  isError?: boolean
}

export interface MCPToolDefinition {
  name: string
  description: string
  /** A JSON Schema object. */
  inputSchema: object
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean }
  _meta?: Record<string, unknown>
}

export interface MCPListToolsResult {
  tools: MCPToolDefinition[]
}

/** Offered subprotocols for a key: the versioned protocol first, then the key token. */
export function relaySubprotocols(key: string): string[] {
  return [RELAY_SUBPROTOCOL, `${RELAY_KEY_PROTOCOL_PREFIX}${key}`]
}

/** Extract the key token from a `Sec-WebSocket-Protocol` header, or null. */
export function keyFromSubprotocols(header: string | null): string | null {
  if (!header) return null
  const offered = header.split(',').map((value) => value.trim())
  if (!offered.includes(RELAY_SUBPROTOCOL)) return null
  const token = offered.find((value) => value.startsWith(RELAY_KEY_PROTOCOL_PREFIX))
  if (!token) return null
  const key = token.slice(RELAY_KEY_PROTOCOL_PREFIX.length)
  return RELAY_KEY_PATTERN.test(key) ? key : null
}
