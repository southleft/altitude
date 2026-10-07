import { useNow } from '@vueuse/core'
import { computed } from 'vue'

import { canHostMCPAutomation, mcpRuntime, restartMCPRuntime } from '@/app/automation/mcp/runtime'
import { useRelayAgentControls } from '@/app/automation/relay/agent/use'
import { isRelayMode, relayEndpoints } from '@/app/automation/relay/config'
import { relayRuntime } from '@/app/automation/relay/state'
import { openSettingsDialog } from '@/app/settings/dialog'

import { agentSetupCommands, developmentHTTPCommand, MCP_DOCS_URL } from './setup'
import { resolveAgentConnectionStatus, resolveRelayAgentStatus } from './status'

const ACTIVITY_CHECK_INTERVAL_MS = 30_000

/** Live state and setup details for connecting an external agent over MCP. */
export function useAgentConnection() {
  const now = useNow({ interval: ACTIVITY_CHECK_INTERVAL_MS })
  const supported = canHostMCPAutomation()
  // Browser builds with a relay URL route agents through the hosted relay instead.
  const relay =
    isRelayMode() && relayEndpoints ? useRelayAgentControls(relayEndpoints.mcpURL) : null

  const status = computed(() =>
    relay
      ? resolveRelayAgentStatus({
          key: relayRuntime.key,
          socket: relayRuntime.socket,
          lastRequestAt: relayRuntime.lastRequestAt,
          now: now.value.getTime()
        })
      : resolveAgentConnectionStatus({
          supported,
          runtimeStatus: mcpRuntime.status,
          lastClientRequestAt: mcpRuntime.lastClientRequestAt,
          now: now.value.getTime()
        })
  )
  const developmentCommand = computed(() =>
    import.meta.env.DEV && !relay ? developmentHTTPCommand(mcpRuntime.endpoint) : null
  )

  return {
    status,
    relay,
    failure: computed(() => (relay ? null : mcpRuntime.failure)),
    restarting: computed(() => mcpRuntime.status === 'starting' || mcpRuntime.checking),
    externallyManaged: computed(() => mcpRuntime.externallyManaged),
    commands: agentSetupCommands,
    developmentCommand,
    docsURL: MCP_DOCS_URL,
    restart: () => void restartMCPRuntime(),
    // Relay builds have no local server to configure; Tool access governs the relay too.
    openSettings: () => openSettingsDialog(relay ? 'tools' : 'mcp')
  }
}
