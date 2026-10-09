<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useCommonMessages, useStorageMessages } from '@open-pencil/vue'

import { validBranchName } from '@/app/integrations/storage/github/branches/name'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'

const {
  base,
  suggestion,
  pending = false,
  errorText = null
} = defineProps<{
  /** Branch the new one starts from. */
  base: string
  /** Name offered when the dialog opens. */
  suggestion: string
  pending?: boolean
  /** Translated failure of the last attempt. */
  errorText?: string | null
}>()

const emit = defineEmits<{ create: [name: string] }>()
const open = defineModel<boolean>('open', { default: false })
const storage = useStorageMessages()
const common = useCommonMessages()
const name = ref('')
const touched = ref(false)

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    name.value = suggestion
    touched.value = false
  },
  { immediate: true }
)

const invalid = computed(() => !validBranchName(name.value))
const fieldError = computed(() =>
  touched.value && invalid.value ? storage.value.githubInvalidBranch : undefined
)

function submit() {
  touched.value = true
  if (!invalid.value && !pending) emit('create', name.value.trim())
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    size="sm"
    :heading="storage.githubNewBranchTitle"
    :description="storage.githubNewBranchDescription({ branch: base })"
    :close-label="common.close"
  >
    <form
      id="github-new-branch"
      class="flex flex-col gap-3"
      novalidate
      data-test-id="github-new-branch-form"
      @submit.prevent="submit"
    >
      <ProviderSettingsField
        v-slot="{ control }"
        :label="storage.githubBranchName"
        :error="fieldError"
      >
        <AppInput
          v-bind="control"
          v-model="name"
          tone="panel"
          autofocus
          spellcheck="false"
          autocomplete="off"
          :disabled="pending"
          @blur="touched = true"
        />
      </ProviderSettingsField>
      <AppAlert v-if="errorText" tone="error" :heading="errorText" />
    </form>
    <template #footer>
      <AppButton color="neutral" variant="ghost" :disabled="pending" @click="open = false">{{
        common.cancel
      }}</AppButton>
      <AppButton
        type="submit"
        form="github-new-branch"
        color="primary"
        variant="solid"
        :loading="pending"
        :disabled="pending"
        >{{ pending ? storage.githubCreatingBranch : storage.githubCreateBranch }}</AppButton
      >
    </template>
  </AppDialog>
</template>
