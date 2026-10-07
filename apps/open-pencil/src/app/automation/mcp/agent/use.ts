import { useNow } from '@vueuse/core'
import { computed } from 'vue'

import { canHostMCPAutomation, mcpRuntime, restartMCPRuntime } from '@/app/automation/mcp/runtime'
import { openSettingsDialog } from '@/app/settings/dialog'

import { agentSetupCommands, developmentHTTPCommand, MCP_DOCS_URL } from './setup'
import { resolveAgentConnectionStatus } from './status'

const ACTIVITY_CHECK_INTERVAL_MS = 30_000

/** Live state and setup details for connecting an external agent over MCP. */
export function useAgentConnection() {
  const now = useNow({ interval: ACTIVITY_CHECK_INTERVAL_MS })
  const supported = canHostMCPAutomation()

  const status = computed(() =>
    resolveAgentConnectionStatus({
      supported,
      runtimeStatus: mcpRuntime.status,
      lastClientRequestAt: mcpRuntime.lastClientRequestAt,
      now: now.value.getTime()
    })
  )
  const developmentCommand = computed(() =>
    import.meta.env.DEV ? developmentHTTPCommand(mcpRuntime.endpoint) : null
  )

  return {
    status,
    failure: computed(() => mcpRuntime.failure),
    restarting: computed(() => mcpRuntime.status === 'starting' || mcpRuntime.checking),
    externallyManaged: computed(() => mcpRuntime.externallyManaged),
    commands: agentSetupCommands,
    developmentCommand,
    docsURL: MCP_DOCS_URL,
    restart: () => void restartMCPRuntime(),
    openSettings: () => openSettingsDialog('mcp')
  }
}
