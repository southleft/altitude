<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import { useAutomationMessages, useCommonMessages } from '@open-pencil/vue'

import {
  AGENT_CLIENT_NAMES,
  RELAY_KEY_MASK,
  relaySetupCommands,
  type RelayConnectionView,
  type RelaySetupCommands
} from '@/app/automation/mcp/agent/setup'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import agentConnectTheme from '@/theme/agent-connect'

const { relay } = defineProps<{ relay: RelayConnectionView }>()
const emit = defineEmits<{
  createKey: []
  regenerateKey: []
  toggleReveal: []
  copy: [kind: keyof RelaySetupCommands]
}>()

const automation = useAutomationMessages()
const common = useCommonMessages()
const styles = tv(agentConnectTheme)()
const confirmRegenerate = ref(false)

/** Commands as displayed: the key stays masked unless the user reveals it. */
const displayed = computed(() =>
  relaySetupCommands(relay.mcpURL, relay.revealedKey ?? RELAY_KEY_MASK)
)

const steps = computed(() => {
  const messages = automation.value
  return [
    {
      id: 'claudeCode' as const,
      label: messages.agentStepClaudeCode({ client: AGENT_CLIENT_NAMES.primary }),
      hint: null,
      command: displayed.value.claudeCode
    },
    {
      id: 'clientConfig' as const,
      label: messages.agentStepOtherClients,
      hint: messages.agentRelayOtherClientsHint({ clients: AGENT_CLIENT_NAMES.others }),
      command: displayed.value.clientConfig
    }
  ]
})

function regenerate(): void {
  confirmRegenerate.value = false
  emit('regenerateKey')
}
</script>

<template>
  <AppAlert
    v-if="relay.keyError"
    tone="error"
    :heading="automation.agentRelayKeyFailed"
    :description="automation.agentRelayKeyFailedHint"
  />

  <div v-if="!relay.keyConfigured">
    <AppButton
      size="xs"
      color="primary"
      variant="solid"
      :loading="relay.busy"
      @click="emit('createKey')"
      >{{ automation.agentRelayCreateKey }}</AppButton
    >
  </div>

  <template v-else>
    <div v-for="step in steps" :key="step.id" :class="styles.step()" :data-step="step.id">
      <span :class="styles.stepLabel()">{{ step.label }}</span>
      <span v-if="step.hint" :class="styles.hint()">{{ step.hint }}</span>
      <div :class="styles.command()">
        <code :class="styles.code()">{{ step.command }}</code>
        <IconButton :label="common.copy" @click="emit('copy', step.id)">
          <icon-lucide-copy class="size-3" />
        </IconButton>
      </div>
    </div>

    <div :class="styles.step()" data-step="relay-key">
      <span :class="styles.stepLabel()">{{ automation.agentRelayKey }}</span>
      <span :class="styles.hint()">{{ automation.agentRelayKeyHint }}</span>
      <div :class="styles.keyActions()">
        <AppButton
          size="xs"
          variant="outline"
          :aria-pressed="relay.revealedKey !== null"
          @click="emit('toggleReveal')"
        >
          <icon-lucide-eye-off v-if="relay.revealedKey !== null" class="size-3" />
          <icon-lucide-eye v-else class="size-3" />
          {{
            relay.revealedKey !== null ? automation.agentRelayHideKey : automation.agentRelayShowKey
          }}
        </AppButton>
        <AppButton
          size="xs"
          variant="outline"
          :loading="relay.busy"
          @click="confirmRegenerate = true"
        >
          <icon-lucide-refresh-cw class="size-3" />
          {{ automation.agentRelayRegenerate }}
        </AppButton>
      </div>
    </div>
  </template>

  <AppConfirmationDialog
    v-model:open="confirmRegenerate"
    tone="warning"
    :heading="automation.agentRelayRegenerateHeading"
    :description="automation.agentRelayRegenerateDescription"
    :cancel-label="common.cancel"
    :confirm-label="automation.agentRelayRegenerate"
    @confirm="regenerate"
  />
</template>
