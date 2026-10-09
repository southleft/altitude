<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { ref, watch } from 'vue'

import { useAutomationMessages, useCommonMessages } from '@open-pencil/vue'

import type { RelaySetupCommands } from '@/app/automation/mcp/agent/setup'
import { useAgentConnection } from '@/app/automation/mcp/agent/use'
import { toast } from '@/app/shell/ui'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import agentConnectTheme from '@/theme/agent-connect'

import AgentConnectPanel from './AgentConnectPanel.vue'

const automation = useAutomationMessages()
const common = useCommonMessages()
const connection = useAgentConnection()
const { status, failure, restarting, externallyManaged, developmentCommand, relay } = connection
const open = ref(false)
const { copy } = useClipboard()

// A revealed key does not outlive the popover.
watch(open, (isOpen) => {
  if (!isOpen) relay?.hide()
})

async function copyRelay(kind: keyof RelaySetupCommands): Promise<void> {
  const command = await relay?.commandFor(kind)
  if (!command) return
  await copy(command)
  toast.info(common.value.copied)
}
const styles = tv(agentConnectTheme)()
const cls = usePopoverUI({
  // Relay setup is taller than the local steps; scroll inside short windows.
  content: 'z-50 max-h-(--reka-popover-content-available-height) w-80 overflow-y-auto p-3'
})

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
        <icon-lucide-sparkles
          :class="styles.triggerIcon({ class: styles.triggerStatusIcon() })"
          :data-status="status"
          aria-hidden="true"
        />
        <span :class="styles.triggerLabel()">{{
          status === 'connected' ? automation.agentConnected : automation.agentConnect
        }}</span>
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
          :relay="relay?.view.value ?? null"
          @restart="connection.restart"
          @open-settings="openSettings"
          @create-relay-key="relay?.issueKey()"
          @regenerate-relay-key="relay?.issueKey()"
          @toggle-relay-key="relay?.toggleReveal()"
          @copy-relay="copyRelay"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
