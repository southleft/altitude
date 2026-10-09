<script setup lang="ts">
import { computed } from 'vue'
import IconComment from '~icons/lucide/message-circle'

import { formatShortcut, useStorageMessages } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import ToolButton from '@/components/Toolbar/ToolButton.vue'
import type { ToolbarUI } from '@/components/Toolbar/types'
import Tip from '@/components/ui/overlay/Tip.vue'

const { ui } = defineProps<{ ui?: ToolbarUI }>()

const store = useEditorStore()
const storage = useStorageMessages()
const comments = computed(() => store.comments)
const availability = computed(() => comments.value.availability.value)
const shortcut = computed(() => formatShortcut(appMenuShortcut('view-comments')) ?? '')

const tip = computed(() => {
  if (availability.value === 'signed-out') return storage.value.githubCommentsSignedOut
  if (availability.value === 'not-committed') return storage.value.githubCommentsNotCommitted
  return `${storage.value.githubComments} (${shortcut.value}) — ${storage.value.githubCommentsHint}`
})
</script>

<template>
  <div class="mx-0.5 w-px self-stretch bg-border" aria-hidden="true" />
  <Tip :label="tip">
    <ToolButton
      data-test-id="toolbar-comments"
      :data-availability="availability"
      :aria-disabled="availability !== 'ready' || undefined"
      :icon="IconComment"
      :label="storage.githubComments"
      :active="comments.active.value"
      :ui="ui"
      @click="comments.toggle()"
    />
  </Tip>
</template>
