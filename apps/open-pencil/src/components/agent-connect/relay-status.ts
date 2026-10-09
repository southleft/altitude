import type { AgentConnectionStatus } from '@/app/automation/mcp/agent/status'

interface RelayStatusMessages {
  agentStatusConnected: string
  agentStatusWaiting: string
  agentStatusUnavailable: string
  agentStatusUnavailableHint: string
  agentRelayStatusConnectedHint: string
  agentRelayStatusWaitingHint: string
  agentRelayStatusStarting: string
  agentRelayStatusOffline: string
  agentRelayStatusOfflineHint: string
  agentRelayStatusSetup: string
  agentRelayStatusSetupHint: string
}

export interface RelayStatusCopy {
  label: string
  hint: string | null
}

/** Status wording for the hosted relay, shared by Connect AI and Settings → MCP. */
export function relayStatusCopy(
  status: AgentConnectionStatus,
  messages: RelayStatusMessages
): RelayStatusCopy {
  const map: Record<AgentConnectionStatus, RelayStatusCopy> = {
    connected: {
      label: messages.agentStatusConnected,
      hint: messages.agentRelayStatusConnectedHint
    },
    waiting: { label: messages.agentStatusWaiting, hint: messages.agentRelayStatusWaitingHint },
    starting: { label: messages.agentRelayStatusStarting, hint: null },
    offline: {
      label: messages.agentRelayStatusOffline,
      hint: messages.agentRelayStatusOfflineHint
    },
    unavailable: {
      label: messages.agentStatusUnavailable,
      hint: messages.agentStatusUnavailableHint
    },
    setup: { label: messages.agentRelayStatusSetup, hint: messages.agentRelayStatusSetupHint }
  }
  return map[status]
}
