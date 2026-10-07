import type { MCPRuntimeStatus } from '@/app/automation/mcp/runtime'
import type { RelayRuntimeState } from '@/app/automation/relay/state'

/**
 * Whether an external agent can drive this document.
 *
 * - `connected`: an MCP client sent a request recently.
 * - `waiting`: the local server is running and attached; no client has called it yet.
 * - `starting`: the local server is still coming up.
 * - `offline`: the local server is stopped or failed.
 * - `unavailable`: this build cannot host local MCP and has no hosted relay.
 * - `setup`: the hosted relay is available but this browser has no connection key yet.
 */
export type AgentConnectionStatus =
  | 'connected'
  | 'waiting'
  | 'starting'
  | 'offline'
  | 'unavailable'
  | 'setup'

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

export interface RelayAgentConnectionInput {
  key: RelayRuntimeState['key']
  socket: RelayRuntimeState['socket']
  lastRequestAt: number | null
  now: number
}

/**
 * Hosted relay status. The tab holds a WebSocket to the relay, so `waiting`
 * means the tab is linked and reachable; agent activity upgrades it to `connected`.
 */
export function resolveRelayAgentStatus(input: RelayAgentConnectionInput): AgentConnectionStatus {
  if (input.key === null) return 'starting'
  if (input.key === 'missing') return 'setup'
  if (input.key !== 'configured') return 'offline'
  if (input.socket === 'idle' || input.socket === 'connecting') return 'starting'
  if (input.socket === 'closed') return 'offline'
  const last = input.lastRequestAt
  if (last !== null && input.now - last <= AGENT_ACTIVITY_WINDOW_MS) return 'connected'
  return 'waiting'
}
