<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useEventListener } from '@vueuse/core'
import { MotionConfig } from 'motion-v'
import { TooltipProvider } from 'reka-ui'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'

import { provideEditor, useI18n } from '@open-pencil/vue'

import { useDocumentCloseProtection } from '@/app/document/close/use'
import { useEditorStore } from '@/app/editor/active-store'
import { settingsDialogOpen } from '@/app/settings/dialog'
import { animationsEnabled } from '@/app/shell/motion'
import { useAppTheme } from '@/app/shell/theme'
import { toast } from '@/app/shell/ui'
import { scheduleStartupUpdateCheck } from '@/app/shell/updater'
import { kickSyncEngine } from '@/app/storage/sync'
import { prepareForReload } from '@/app/tabs'
import AppShell from '@/components/shell/AppShell.vue'
import AppToast from '@/components/shell/AppToast.vue'

// Global dialogs load after the first render instead of with it. Settings, the heaviest
// (its media panel reaches the AI provider SDKs), is not even fetched until first opened.
const SettingsDialog = defineAsyncComponent(
  () => import('@/components/settings/SettingsDialog.vue')
)
const RecoveryDialog = defineAsyncComponent(
  () => import('@/components/recovery/RecoveryDialog.vue')
)
const UnsavedChangesDialog = defineAsyncComponent(
  () => import('@/components/document/UnsavedChangesDialog.vue')
)
const PublishLibraryDialog = defineAsyncComponent(
  () => import('@/components/libraries/PublishLibraryDialog.vue')
)
const LibraryUpdateReviewDialog = defineAsyncComponent(
  () => import('@/components/libraries/review/LibraryUpdateReviewDialog.vue')
)

const store = useEditorStore()
const { updates, locale } = useI18n()

useHead({
  titleTemplate: (title) => (title ? `${title} — OpenPencil` : 'OpenPencil'),
  htmlAttrs: {
    lang: locale,
    'data-motion': computed(() => (animationsEnabled.value ? 'full' : 'off'))
  }
})

const settingsDialogRequested = ref(false)
watch(
  settingsDialogOpen,
  (open) => {
    if (open) settingsDialogRequested.value = true
  },
  { immediate: true }
)

provideEditor(store)
useAppTheme()
useDocumentCloseProtection()
useEventListener(window, 'pagehide', () => {
  void prepareForReload()
})

onMounted(() => {
  toast.setupGlobalErrorHandler()
  scheduleStartupUpdateCheck(updates)
  void kickSyncEngine()
})
</script>

<template>
  <MotionConfig :reduced-motion="animationsEnabled ? 'never' : 'always'">
    <TooltipProvider :delay-duration="400">
      <AppShell>
        <RouterView />
      </AppShell>
      <SettingsDialog v-if="settingsDialogRequested" />
      <RecoveryDialog />
      <UnsavedChangesDialog />
      <PublishLibraryDialog />
      <LibraryUpdateReviewDialog />
      <AppToast />
    </TooltipProvider>
  </MotionConfig>
</template>
