<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed } from 'vue'

import { useAutomationMessages, useCommonMessages, useSettingsMessages } from '@open-pencil/vue'

import type { RelayConnectionView, RelaySetupCommands } from '@/app/automation/mcp/agent/setup'
import type { AgentConnectionStatus } from '@/app/automation/mcp/agent/status'
import AgentRelaySetup from '@/components/agent-connect/AgentRelaySetup.vue'
import { relayStatusCopy } from '@/components/agent-connect/relay-status'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppButton from '@/components/ui/button/AppButton.vue'

/** Settings → MCP on hosted builds, where agents reach this tab through the hosted relay. */
const { status, relay } = defineProps<{
  status: AgentConnectionStatus
  relay: RelayConnectionView
}>()
const emit = defineEmits<{
  createKey: []
  regenerateKey: []
  toggleReveal: []
  copy: [kind: keyof RelaySetupCommands]
  openToolAccess: []
}>()

const automation = useAutomationMessages()
const settings = useSettingsMessages()
const common = useCommonMessages()
const { copy, copied } = useClipboard()

const statusCopy = computed(() => relayStatusCopy(status, automation.value))
const lastRequest = computed(() =>
  relay.lastRequestAt
    ? automation.value.agentRelayLastRequest({
        time: new Date(relay.lastRequestAt).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        })
      })
    : null
)
</script>

<template>
  <SettingsSection data-test-id="settings-mcp-relay-panel">
    <template #title>{{ automation.relayServer }}</template>
    <template #description>{{ automation.relayDescription }}</template>
    <SettingsGroup>
      <SettingsRow :label="automation.status" :description="statusCopy.hint ?? undefined">
        <span class="text-xs text-surface" role="status">{{ statusCopy.label }}</span>
      </SettingsRow>
      <SettingsRow v-if="lastRequest" :label="automation.relayActivity">
        <span class="text-xs text-surface">{{ lastRequest }}</span>
      </SettingsRow>
      <div class="px-3 py-2.5">
        <p class="mb-1 text-xs font-medium text-surface">{{ automation.relayAddress }}</p>
        <div class="flex items-center justify-between gap-2">
          <code class="min-w-0 select-all break-all text-xs text-surface">{{ relay.mcpURL }}</code>
          <AppButton size="xs" variant="link" @click="copy(relay.mcpURL)">{{
            copied ? common.copied : common.copy
          }}</AppButton>
        </div>
      </div>
    </SettingsGroup>

    <div class="flex flex-col gap-3" data-slot="relay-setup">
      <AgentRelaySetup
        :relay="relay"
        @create-key="emit('createKey')"
        @regenerate-key="emit('regenerateKey')"
        @toggle-reveal="emit('toggleReveal')"
        @copy="(kind) => emit('copy', kind)"
      />
    </div>

    <div class="flex flex-col items-start gap-1">
      <p class="text-xs leading-relaxed text-muted">{{ automation.relayToolAccessHint }}</p>
      <AppButton variant="link" @click="emit('openToolAccess')">{{
        settings.toolAccess
      }}</AppButton>
    </div>
    <p class="text-xs leading-relaxed text-muted">{{ automation.relayLocalServerNote }}</p>
  </SettingsSection>
</template>
