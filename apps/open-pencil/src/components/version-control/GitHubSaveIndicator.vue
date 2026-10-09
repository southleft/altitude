<script setup lang="ts">
import { useNow } from '@vueuse/core'
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import { useI18n, useStorageMessages } from '@open-pencil/vue'

import type { GitHubSaveIndicator } from '@/app/integrations/storage/github/autosave/indicator'
import { relativeTime } from '@/app/integrations/storage/github/failure-message'
import versionControlTheme from '@/theme/version-control'

/**
 * The saving chip: a dot and a short status. A separate polite live region announces
 * only changes of state (not the ticking relative time) and never takes focus.
 */
const { indicator } = defineProps<{ indicator: GitHubSaveIndicator }>()

const storage = useStorageMessages()
const { locale } = useI18n()
const styles = tv(versionControlTheme)()
const now = useNow({ interval: 30_000 })

const dotState = computed(() => {
  switch (indicator.kind) {
    case 'saving':
      return 'working'
    case 'failed':
      return 'attention'
    case 'committed':
      return 'clean'
    default:
      return 'dirty'
  }
})

function committedLabel(at: number): string {
  if (indicator.kind !== 'committed') return ''
  const time = indicator.committedAt
    ? relativeTime(new Date(indicator.committedAt), locale.value, at)
    : ''
  return storage.value.githubSaveCommitted({ time }).replace(/\s*·\s*$/, '')
}

function labelAt(at: number): string {
  switch (indicator.kind) {
    case 'unpublished':
      return storage.value.githubSaveToRepository
    case 'unsaved':
      return storage.value.githubSaveUnsaved
    case 'saving':
      return storage.value.githubSaving
    case 'committed':
      return committedLabel(at)
    case 'offline':
      return storage.value.githubSaveOffline
    case 'failed':
      return storage.value.githubSaveFailed
  }
}

const label = computed(() => labelAt(now.value.getTime()))

// Announce when the state changes, not every time the relative time ticks.
const announcement = ref('')
watch(
  () => indicator.kind,
  () => {
    announcement.value = indicator.kind === 'unpublished' ? '' : labelAt(Date.now())
  }
)
</script>

<template>
  <span :class="styles.indicator()" :data-state="dotState" data-test-id="github-save-indicator">
    <span :class="styles.dot()" :data-state="dotState" aria-hidden="true" />
    <span :class="styles.triggerLabel()">{{ label }}</span>
    <span class="sr-only" role="status" aria-live="polite">{{ announcement }}</span>
  </span>
</template>
