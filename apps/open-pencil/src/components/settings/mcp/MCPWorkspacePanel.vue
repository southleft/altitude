<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

import { useCommonMessages } from '@open-pencil/vue'

import type { RelaySetupCommands } from '@/app/automation/mcp/agent/setup'
import { useAgentConnection } from '@/app/automation/mcp/agent/use'
import { openToolAccessSettings } from '@/app/automation/tool-access/settings/use'
import { webmcpMode } from '@/app/automation/webmcp/preferences'
import { webmcpRuntime } from '@/app/automation/webmcp/runtime'
import { toast } from '@/app/shell/ui'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'

import MCPRelaySettingsPanel from './MCPRelaySettingsPanel.vue'
import MCPSettingsPanel from './MCPSettingsPanel.vue'
import WebMCPSettingsPanel from './WebMCPSettingsPanel.vue'

// Outbound connections (MCPConnectionsSection) serve the dormant built-in AI agents only.

// Hosted builds route agents through the relay; there is no local server to manage.
const { status, relay } = useAgentConnection()
const common = useCommonMessages()
const { copy } = useClipboard()

async function copyRelay(kind: keyof RelaySetupCommands): Promise<void> {
  const command = await relay?.commandFor(kind)
  if (!command) return
  await copy(command)
  toast.info(common.value.copied)
}
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col" data-test-id="settings-mcp-panel">
    <SettingsPage>
      <div class="flex flex-col gap-6">
        <MCPRelaySettingsPanel
          v-if="relay"
          :status="status"
          :relay="relay.view.value"
          @create-key="relay.issueKey()"
          @regenerate-key="relay.issueKey()"
          @toggle-reveal="relay.toggleReveal()"
          @copy="copyRelay"
          @open-tool-access="openToolAccessSettings('mcp')"
        />
        <MCPSettingsPanel v-else />
        <WebMCPSettingsPanel v-model="webmcpMode" :state="webmcpRuntime" />
      </div>
    </SettingsPage>
  </div>
</template>
