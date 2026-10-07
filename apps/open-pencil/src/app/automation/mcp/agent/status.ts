import type { MCPRuntimeStatus } from '@/app/automation/mcp/runtime'

/**
 * Whether an external agent can drive this document.
 *
 * - `connected`: an MCP client sent a request recently.
 * - `waiting`: the local server is running and attached; no client has called it yet.
 * - `starting`: the local server is still coming up.
 * - `offline`: the local server is stopped or failed.
 * - `unavailable`: this build cannot host local MCP (statically hosted browser build).
 */
export type AgentConnectionStatus = 'connected' | 'waiting' | 'starting' | 'offline' | 'unavailable'

/**
 * How long after its last request an agent still counts as connected. Stdio
 * bridges hold no connection between tool calls, so activity is the signal.
 */
export const AGENT_ACTIVITY_WINDOW_MS = 15 * 60_000

export interface AgentConnectionInput {
  supported: boolean
  runtimeStatus: MCPRuntimeStatus
  lastClientRequestAt: number | null
  now: number
}

export function resolveAgentConnectionStatus(input: AgentConnectionInput): AgentConnectionStatus {
  if (!input.supported) return 'unavailable'
  if (input.runtimeStatus === 'idle' || input.runtimeStatus === 'starting') return 'starting'
  if (input.runtimeStatus !== 'running') return 'offline'
  const last = input.lastClientRequestAt
  if (last !== null && input.now - last <= AGENT_ACTIVITY_WINDOW_MS) return 'connected'
  return 'waiting'
}
