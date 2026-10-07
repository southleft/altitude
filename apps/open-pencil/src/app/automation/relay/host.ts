import * as v from 'valibot'

import {
  RELAY_ERROR_CODES,
  type MCPCallToolResult,
  type MCPListToolsResult,
  type RelayError,
  type RelayMethod
} from '@open-pencil/relay/protocol'

/** The local MCP server's result limit; images and JSON above it fail with a hint. */
export const RELAY_MAX_RESULT_BYTES = 900_000

export type RelayHostOutcome = { result: unknown } | { error: RelayError }

export interface RelayToolHostDependencies {
  /** Enabled tool definitions, already filtered by exposure and Tool access. */
  listTools: () => MCPListToolsResult['tools']
  /** Whether a tool is offered right now; checked again at call time. */
  isToolEnabled: (name: string) => boolean
  /**
   * Run an automation command (`tool`, `list_documents`) through the same
   * handlers the local MCP bridge uses, against the active editor.
   */
  runCommand: (command: string, args: Record<string, unknown>) => Promise<unknown>
  codegenPrompt: () => string
}

const callParamsSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  arguments: v.optional(v.record(v.string(), v.unknown()))
})

type CommandResponse = { ok?: boolean; result?: unknown; error?: string }

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength
}

function textResult(data: unknown, isError = false): MCPCallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, isError ? undefined : 2) }],
    ...(isError ? { isError: true } : {})
  }
}

function failure(message: string): MCPCallToolResult {
  return textResult({ error: message }, true)
}

function tooLarge(kind: string, bytes: number, hint: string): MCPCallToolResult {
  return failure(
    `${kind} is too large (${Math.round(bytes / 1024)}KB, limit ${Math.round(
      RELAY_MAX_RESULT_BYTES / 1024
    )}KB). ${hint}`
  )
}

/** Shape a command response the way the local MCP server does, images included. */
export function toCallToolResult(toolName: string, response: unknown): MCPCallToolResult {
  const res = (response ?? {}) as CommandResponse
  if (res.ok === false) return failure(res.error ?? 'Tool failed')
  const result = res.result
  if (result && typeof result === 'object' && 'base64' in result && 'mimeType' in result) {
    const data = String(result.base64)
    const bytes = byteLength(data)
    if (bytes > RELAY_MAX_RESULT_BYTES) {
      return tooLarge(
        `Image from "${toolName}"`,
        bytes,
        'Export a smaller region or lower the scale/resolution.'
      )
    }
    return { content: [{ type: 'image', data, mimeType: String(result.mimeType) }] }
  }
  const text = JSON.stringify(result ?? null, null, 2)
  const bytes = byteLength(text)
  if (bytes > RELAY_MAX_RESULT_BYTES) {
    return tooLarge(
      `Result from "${toolName}"`,
      bytes,
      'Narrow the request with depth/root_id/node_types, get_node, or find_nodes.'
    )
  }
  return { content: [{ type: 'text', text }] }
}

function splitTarget(args: Record<string, unknown>) {
  const { document_id, page_id, ...rest } = args
  const target: Record<string, string> = {}
  if (typeof document_id === 'string') target.document_id = document_id
  if (typeof page_id === 'string') target.page_id = page_id
  return { target, args: rest }
}

/** Answers relay requests from this tab's registry and automation handlers. */
export function createRelayToolHost(dependencies: RelayToolHostDependencies) {
  async function callTool(params: unknown): Promise<RelayHostOutcome> {
    const parsed = v.safeParse(callParamsSchema, params)
    if (!parsed.success) {
      return {
        error: { code: RELAY_ERROR_CODES.invalidParams, message: 'tools/call requires a tool name' }
      }
    }
    const { name } = parsed.output
    // Tool access applies at call time too: a cached or stale list cannot widen it.
    if (!dependencies.isToolEnabled(name)) {
      return {
        error: {
          code: RELAY_ERROR_CODES.invalidParams,
          message: `Unknown or disabled tool: ${name}. Enable it in OpenPencil Settings → Tool access.`
        }
      }
    }
    if (name === 'get_codegen_prompt') {
      return { result: textResult({ prompt: dependencies.codegenPrompt() }) }
    }
    try {
      const { target, args } = splitTarget(parsed.output.arguments ?? {})
      if (name === 'list_documents') {
        const response = (await dependencies.runCommand('list_documents', {})) as CommandResponse
        if (response.ok === false) return { result: failure(response.error ?? 'Tool failed') }
        return { result: textResult(response.result ?? {}) }
      }
      const response = await dependencies.runCommand('tool', { ...target, name, args })
      return { result: toCallToolResult(name, response) }
    } catch (error) {
      return { result: failure(error instanceof Error ? error.message : String(error)) }
    }
  }

  return {
    async handle(method: RelayMethod, params: unknown): Promise<RelayHostOutcome> {
      if (method === 'tools/list') {
        return { result: { tools: dependencies.listTools() } satisfies MCPListToolsResult }
      }
      return callTool(params)
    }
  }
}

export type RelayToolHost = ReturnType<typeof createRelayToolHost>
