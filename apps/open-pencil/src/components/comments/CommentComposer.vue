<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, onMounted, useTemplateRef } from 'vue'

import { useCommonMessages, useStorageMessages } from '@open-pencil/vue'

import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import commentsTheme from '@/theme/comments'

const {
  pending = false,
  error = null,
  placeholder,
  submitLabel,
  autofocus = true
} = defineProps<{
  pending?: boolean
  error?: string | null
  placeholder?: string
  submitLabel?: string
  autofocus?: boolean
}>()

const emit = defineEmits<{ submit: [text: string]; cancel: [] }>()
const text = defineModel<string>({ default: '' })
const storage = useStorageMessages()
const common = useCommonMessages()
const styles = tv(commentsTheme)()
const root = useTemplateRef<HTMLElement>('root')
const canSubmit = computed(() => text.value.trim().length > 0 && !pending)

onMounted(() => {
  if (autofocus) root.value?.querySelector('textarea')?.focus()
})

function submit() {
  if (canSubmit.value) emit('submit', text.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.code === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    submit()
  } else if (event.code === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('cancel')
  }
}
</script>

<template>
  <div ref="root" data-slot="comment-composer" class="flex flex-col gap-2" @keydown="onKeydown">
    <AppTextarea
      v-model="text"
      :rows="3"
      :disabled="pending"
      :placeholder="placeholder ?? storage.githubCommentPlaceholder"
      :aria-label="placeholder ?? storage.githubCommentPlaceholder"
    />
    <AppAlert v-if="error" tone="error" :heading="error" />
    <div :class="styles.composerFooter()">
      <AppButton
        size="sm"
        variant="ghost"
        color="neutral"
        :disabled="pending"
        @click="emit('cancel')"
        >{{ common.cancel }}</AppButton
      >
      <AppButton
        size="sm"
        variant="solid"
        color="primary"
        :loading="pending"
        :disabled="!canSubmit"
        data-test-id="comment-submit"
        @click="submit"
        >{{
          pending ? storage.githubCommentPosting : (submitLabel ?? storage.githubCommentPost)
        }}</AppButton
      >
    </div>
  </div>
</template>
