<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useAutomationMessages, useCommonMessages } from '@open-pencil/vue'

import { AGENT_CLIENT_NAMES, type AgentSetupCommands } from '@/app/automation/mcp/agent/setup'
import type { AgentConnectionStatus } from '@/app/automation/mcp/agent/status'
import type { MCPFailure } from '@/app/automation/mcp/failure'
import { toast } from '@/app/shell/ui'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import MCPFailureAlert from '@/components/settings/mcp/MCPFailureAlert.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import agentConnectTheme from '@/theme/agent-connect'

const {
  status,
  commands,
  docsURL,
  developmentCommand = null,
  failure = null,
  restarting = false,
  externallyManaged = false
} = defineProps<{
  status: AgentConnectionStatus
  commands: AgentSetupCommands
  docsURL: string
  /** Set on the development server, whose MCP server stdio clients cannot discover. */
  developmentCommand?: string | null
  failure?: MCPFailure | null
  restarting?: boolean
  externallyManaged?: boolean
}>()
const emit = defineEmits<{ restart: []; openSettings: [] }>()

const automation = useAutomationMessages()
const common = useCommonMessages()
const { copy } = useClipboard()
const styles = tv(agentConnectTheme)()

const statusCopy = computed(() => {
  const messages = automation.value
  const map: Record<AgentConnectionStatus, { label: string; hint: string | null }> = {
    connected: {
      label: messages.agentStatusConnected,
      hint: messages.agentStatusConnectedHint
    },
    waiting: { label: messages.agentStatusWaiting, hint: messages.agentStatusWaitingHint },
    starting: { label: messages.agentStatusStarting, hint: null },
    // A recorded failure renders its own guidance below the status.
    offline: {
      label: messages.agentStatusOffline,
      hint: failure ? null : messages.agentStatusOfflineHint
    },
    unavailable: {
      label: messages.agentStatusUnavailable,
      hint: messages.agentStatusUnavailableHint
    }
  }
  return map[status]
})

interface SetupStep {
  id: string
  label: string
  hint?: string
  command: string
}

const steps = computed<SetupStep[]>(() => {
  if (status === 'unavailable' || status === 'connected') return []
  const messages = automation.value
  if (developmentCommand) {
    return [
      {
        id: 'development',
        label: messages.agentStepClaudeCode({ client: AGENT_CLIENT_NAMES.primary }),
        hint: messages.agentDevelopmentNote,
        command: developmentCommand
      }
    ]
  }
  return [
    { id: 'install', label: messages.agentStepInstall, command: commands.install },
    {
      id: 'claude-code',
      label: messages.agentStepClaudeCode({ client: AGENT_CLIENT_NAMES.primary }),
      command: commands.claudeCode
    },
    {
      id: 'other-clients',
      label: messages.agentStepOtherClients,
      hint: messages.agentStepOtherClientsHint({ clients: AGENT_CLIENT_NAMES.others }),
      command: commands.clientConfig
    }
  ]
})

async function copyCommand(command: string): Promise<void> {
  await copy(command)
  toast.info(common.value.copied)
}
</script>

<template>
  <div :class="styles.content()" :data-status="status" data-slot="agent-connect">
    <div :class="styles.header()">
      <p :class="styles.title()">{{ automation.agentConnectTitle }}</p>
      <p :class="styles.description()">
        {{ automation.agentConnectDescription({ clients: AGENT_CLIENT_NAMES.all }) }}
      </p>
    </div>

    <div :class="styles.status()" role="status" data-slot="agent-connect-status">
      <span
        :class="styles.dot({ class: styles.statusDot() })"
        :data-status="status"
        aria-hidden="true"
      />
      <div :class="styles.statusBody()">
        <span :class="styles.statusLabel()">{{ statusCopy.label }}</span>
        <span v-if="statusCopy.hint" :class="styles.hint()">{{ statusCopy.hint }}</span>
        <div v-if="status === 'offline' && !failure">
          <AppButton
            size="xs"
            variant="outline"
            :disabled="externallyManaged"
            :loading="restarting"
            @click="emit('restart')"
            >{{ externallyManaged ? automation.externallyManaged : automation.restart }}</AppButton
          >
        </div>
      </div>
    </div>

    <MCPFailureAlert
      v-if="status === 'offline' && failure"
      :failure="failure"
      :restarting="restarting"
      :externally-managed="externallyManaged"
      @restart="emit('restart')"
    />

    <div v-for="step in steps" :key="step.id" :class="styles.step()" :data-step="step.id">
      <span :class="styles.stepLabel()">{{ step.label }}</span>
      <span v-if="step.hint" :class="styles.hint()">{{ step.hint }}</span>
      <div :class="styles.command()">
        <code :class="styles.code()">{{ step.command }}</code>
        <IconButton :label="common.copy" @click="copyCommand(step.command)">
          <icon-lucide-copy class="size-3" />
        </IconButton>
      </div>
    </div>

    <div :class="styles.footer()">
      <SettingsLink :href="docsURL">{{ automation.agentSetupGuide }}</SettingsLink>
      <AppButton size="xs" variant="link" @click="emit('openSettings')">{{
        automation.agentOpenSettings
      }}</AppButton>
    </div>
  </div>
</template>
