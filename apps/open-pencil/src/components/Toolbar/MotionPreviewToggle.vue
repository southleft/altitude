<script setup lang="ts">
import { ref } from 'vue'
import IconPlay from '~icons/lucide/circle-play'

import { useEditorEvent, useI18n } from '@open-pencil/vue'

import { useEditorStore } from '@/app/editor/active-store'
import ToolButton from '@/components/Toolbar/ToolButton.vue'
import type { ToolbarUI } from '@/components/Toolbar/types'
import Tip from '@/components/ui/overlay/Tip.vue'

const { ui } = defineProps<{ ui?: ToolbarUI }>()

const store = useEditorStore()
const { panels } = useI18n()
const enabled = ref(store.isMotionPreviewEnabled())
useEditorEvent('motion:preview-changed', (value) => {
  enabled.value = value
})
</script>

<template>
  <div class="mx-0.5 w-px self-stretch bg-border" aria-hidden="true" />
  <Tip :label="`${panels.motionPreview} — ${panels.motionPreviewHint}`">
    <ToolButton
      :icon="IconPlay"
      :label="panels.motionPreview"
      :active="enabled"
      :ui="ui"
      @click="store.setMotionPreviewEnabled(!enabled)"
    />
  </Tip>
</template>
