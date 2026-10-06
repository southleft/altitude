<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { ref } from 'vue'

import { useAutomationMessages } from '@open-pencil/vue'

import { useAgentConnection } from '@/app/automation/mcp/agent/use'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import agentConnectTheme from '@/theme/agent-connect'

import AgentConnectPanel from './AgentConnectPanel.vue'

const automation = useAutomationMessages()
const connection = useAgentConnection()
const { status, failure, restarting, externallyManaged, developmentCommand } = connection
const open = ref(false)
const styles = tv(agentConnectTheme)()
const cls = usePopoverUI({ content: 'z-50 w-80 p-3' })

function openSettings(): void {
  open.value = false
  connection.openSettings()
}
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        data-test-id="agent-connect-button"
        :data-status="status"
        :class="styles.trigger()"
      >
        <span :class="styles.dot()" :data-status="status" aria-hidden="true" />
        <template v-if="status === 'connected'">{{ automation.agentConnected }}</template>
        <template v-else>
          <icon-lucide-sparkles :class="styles.triggerIcon()" />
          {{ automation.agentConnect }}
        </template>
      </button>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        data-test-id="agent-connect-popover"
        :class="cls.content"
        :side-offset="8"
        side="bottom"
        align="start"
      >
        <AgentConnectPanel
          :status="status"
          :commands="connection.commands"
          :docs-u-r-l="connection.docsURL"
          :development-command="developmentCommand"
          :failure="failure"
          :restarting="restarting"
          :externally-managed="externallyManaged"
          @restart="connection.restart"
          @open-settings="openSettings"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
