/**
 * A small MCP Streamable HTTP endpoint: JSON-RPC 2.0 over POST, answered with
 * `application/json` (no SSE stream, no sessions). `initialize` and `ping` are
 * answered here; `tools/list` and `tools/call` go to the connected tab.
 */
import * as v from 'valibot'

import { RELAY_ERROR_CODES, type RelayError, type RelayMethod } from './protocol'

export const SUPPORTED_PROTOCOL_VERSIONS = [
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05'
] as const

export const RELAY_SERVER_INFO = {
  name: 'open-pencil',
  title: 'OpenPencil (hosted relay)',
  version: '1.0.0'
} as const

const SERVER_INSTRUCTIONS =
  'Tools act on the OpenPencil editor tab that registered this connection key. ' +
  'If a call reports that no tab is connected, ask the user to open OpenPencil in the browser and keep the tab open.'

export type ForwardOutcome = { ok: true; result: unknown } | { ok: false; error: RelayError }

export interface MCPBackend {
  forward(method: RelayMethod, params: unknown): Promise<ForwardOutcome>
}

type JSONRPCId = string | number | null

export interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: JSONRPCId
  result?: unknown
  error?: RelayError & { data?: unknown }
}

const idSchema = v.union([v.string(), v.number(), v.null()])

const messageSchema = v.object({
  jsonrpc: v.literal('2.0'),
  id: v.optional(idSchema),
  method: v.optional(v.string()),
  params: v.optional(v.unknown())
})

const initializeParamsSchema = v.object({
  protocolVersion: v.optional(v.string())
})

const callParamsSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(256)),
  arguments: v.optional(v.record(v.string(), v.unknown()))
})

export function jsonRPCError(id: JSONRPCId, code: number, message: string): JSONRPCResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

export function negotiateProtocolVersion(requested: string | undefined): string {
  const supported: readonly string[] = SUPPORTED_PROTOCOL_VERSIONS
  return requested && supported.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0]
}

async function handleMessage(raw: unknown, backend: MCPBackend): Promise<JSONRPCResponse | null> {
  const parsed = v.safeParse(messageSchema, raw)
  if (!parsed.success) {
    return jsonRPCError(null, RELAY_ERROR_CODES.invalidRequest, 'Invalid JSON-RPC message')
  }
  const { id, method, params } = parsed.output
  // Client responses and notifications (no id) need no answer.
  if (method === undefined || id === undefined) return null

  switch (method) {
    case 'initialize': {
      const init = v.safeParse(initializeParamsSchema, params ?? {})
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: negotiateProtocolVersion(
            init.success ? init.output.protocolVersion : undefined
          ),
          capabilities: { tools: { listChanged: false } },
          serverInfo: RELAY_SERVER_INFO,
          instructions: SERVER_INSTRUCTIONS
        }
      }
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} }
    case 'tools/list':
    case 'tools/call': {
      if (method === 'tools/call' && !v.safeParse(callParamsSchema, params).success) {
        return jsonRPCError(id, RELAY_ERROR_CODES.invalidParams, 'tools/call requires a tool name')
      }
      const outcome = await backend.forward(method, params ?? {})
      return outcome.ok
        ? { jsonrpc: '2.0', id, result: outcome.result }
        : { jsonrpc: '2.0', id, error: outcome.error }
    }
    default:
      return jsonRPCError(id, RELAY_ERROR_CODES.methodNotFound, `Method not found: ${method}`)
  }
}

/**
 * Handle one POSTed body (a message or a legacy batch). Returns null when no
 * response is due, which the transport turns into `202 Accepted`.
 */
export async function handleMCPBody(
  body: unknown,
  backend: MCPBackend
): Promise<JSONRPCResponse | JSONRPCResponse[] | null> {
  if (Array.isArray(body)) {
    if (body.length === 0) {
      return jsonRPCError(null, RELAY_ERROR_CODES.invalidRequest, 'Empty batch')
    }
    const responses = await Promise.all(body.map((message) => handleMessage(message, backend)))
    const answered = responses.filter((response): response is JSONRPCResponse => response !== null)
    return answered.length > 0 ? answered : null
  }
  return handleMessage(body, backend)
}
