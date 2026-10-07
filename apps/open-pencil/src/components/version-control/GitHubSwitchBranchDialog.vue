<script setup lang="ts">
import { useCommonMessages, useStorageMessages } from '@open-pencil/vue'

import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'

const {
  current,
  target,
  pending = false,
  errorText = null
} = defineProps<{
  current: string
  target: string
  pending?: boolean
  errorText?: string | null
}>()

const emit = defineEmits<{ commitFirst: []; discard: [] }>()
const open = defineModel<boolean>('open', { default: false })
const storage = useStorageMessages()
const common = useCommonMessages()
</script>

<template>
  <AppDialog
    v-model:open="open"
    size="sm"
    :heading="storage.githubSwitchDirtyTitle"
    :description="storage.githubSwitchDirtyDescription({ branch: current, target })"
    :close-label="common.close"
    data-test-id="github-switch-dirty-dialog"
  >
    <template v-if="errorText" #default>
      <AppAlert tone="error" :heading="errorText" />
    </template>
    <template #footer>
      <AppButton color="neutral" variant="ghost" :disabled="pending" @click="open = false">{{
        common.cancel
      }}</AppButton>
      <AppButton
        color="error"
        variant="outline"
        :disabled="pending"
        data-test-id="github-switch-discard"
        @click="emit('discard')"
        >{{ storage.githubDiscardAndSwitch }}</AppButton
      >
      <AppButton
        color="primary"
        variant="solid"
        :loading="pending"
        :disabled="pending"
        data-test-id="github-switch-commit-first"
        @click="emit('commitFirst')"
        >{{ storage.githubCommitFirst }}</AppButton
      >
    </template>
  </AppDialog>
</template>
