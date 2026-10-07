<script setup lang="ts">
import { webmcpMode } from '@/app/automation/webmcp/preferences'
import { webmcpRuntime } from '@/app/automation/webmcp/runtime'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'

import MCPSettingsPanel from './MCPSettingsPanel.vue'
import WebMCPSettingsPanel from './WebMCPSettingsPanel.vue'

// Outbound connections (MCPConnectionsSection) serve the dormant built-in AI agents only.
</script>

<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col" data-test-id="settings-mcp-panel">
    <SettingsPage>
      <div class="flex flex-col gap-6">
        <MCPSettingsPanel />
        <WebMCPSettingsPanel v-model="webmcpMode" :state="webmcpRuntime" />
      </div>
    </SettingsPage>
  </div>
</template>
