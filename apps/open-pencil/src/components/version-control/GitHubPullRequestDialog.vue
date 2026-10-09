<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import { useCommonMessages, useSettingsMessages, useStorageMessages } from '@open-pencil/vue'

import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

const {
  head,
  base,
  initialTitle,
  initialBody,
  preparing = false,
  pending = false,
  errorText = null
} = defineProps<{
  head: string
  base: string
  initialTitle: string
  initialBody: string
  /** The generated description is still loading. */
  preparing?: boolean
  pending?: boolean
  errorText?: string | null
}>()

const emit = defineEmits<{ create: [input: { title: string; body: string; draft: boolean }] }>()
const open = defineModel<boolean>('open', { default: false })
const storage = useStorageMessages()
const common = useCommonMessages()
const settings = useSettingsMessages()
const bodyID = useId()
const title = ref('')
const body = ref('')
const draft = ref(false)
const touched = ref(false)

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    title.value = initialTitle
    body.value = initialBody
    draft.value = false
    touched.value = false
  },
  { immediate: true }
)
// The description arrives after the dialog opened; fill it unless the user typed.
watch(
  () => initialBody,
  (next, previous) => {
    if (open.value && body.value === previous) body.value = next
  }
)

const titleError = computed(() =>
  touched.value && !title.value.trim() ? settings.value.requiredField : undefined
)

function submit() {
  touched.value = true
  if (!title.value.trim() || pending) return
  emit('create', { title: title.value, body: body.value, draft: draft.value })
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    size="md"
    :heading="storage.githubOpenPullRequest"
    :description="storage.githubPullRequestMerges({ head, base })"
    :close-label="common.close"
  >
    <form
      id="github-pull-request"
      class="flex flex-col gap-3"
      novalidate
      data-test-id="github-pull-request-form"
      @submit.prevent="submit"
    >
      <ProviderSettingsField
        v-slot="{ control }"
        :label="storage.githubPullRequestTitleLabel"
        :error="titleError"
      >
        <AppInput
          v-bind="control"
          v-model="title"
          tone="panel"
          :disabled="pending"
          @blur="touched = true"
        />
      </ProviderSettingsField>
      <div class="flex flex-col gap-1">
        <label :for="bodyID" class="text-xs text-surface">{{
          storage.githubPullRequestBody
        }}</label>
        <AppTextarea
          :id="bodyID"
          v-model="body"
          :rows="8"
          :disabled="pending"
          :aria-describedby="`${bodyID}-hint`"
        />
        <p :id="`${bodyID}-hint`" class="text-[11px] leading-relaxed text-muted">
          {{ preparing ? storage.githubPreparingPullRequest : storage.githubPullRequestBodyHint }}
        </p>
      </div>
      <label class="flex items-center gap-2 text-xs text-surface">
        <AppCheckbox
          :model-value="draft"
          :ariaLabel="storage.githubPullRequestAsDraft"
          :disabled="pending"
          @update:model-value="draft = $event"
        />
        {{ storage.githubPullRequestAsDraft }}
      </label>
      <AppAlert v-if="errorText" tone="error" :heading="errorText" />
    </form>
    <template #footer>
      <AppButton color="neutral" variant="ghost" :disabled="pending" @click="open = false">{{
        common.cancel
      }}</AppButton>
      <AppButton
        type="submit"
        form="github-pull-request"
        color="primary"
        variant="solid"
        :loading="pending"
        :disabled="pending"
        data-test-id="github-create-pull-request"
        >{{
          pending ? storage.githubCreatingPullRequest : storage.githubCreatePullRequest
        }}</AppButton
      >
    </template>
  </AppDialog>
</template>
