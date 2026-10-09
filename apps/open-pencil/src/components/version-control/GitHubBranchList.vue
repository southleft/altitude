<script setup lang="ts">
import {
  ListboxContent,
  ListboxFilter,
  ListboxItem,
  ListboxItemIndicator,
  ListboxRoot
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useStorageMessages } from '@open-pencil/vue'

import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import inputTheme from '@/theme/input/input'
import versionControlTheme from '@/theme/version-control'

const {
  branches,
  current,
  defaultBranch = null,
  loading = false,
  failureText = null,
  disabled = false
} = defineProps<{
  /** Branch names, default branch first. Null until loaded. */
  branches: readonly string[] | null
  current: string
  defaultBranch?: string | null
  loading?: boolean
  failureText?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{ select: [branch: string] }>()
const filter = defineModel<string>('filter', { default: '' })
const storage = useStorageMessages()
const styles = tv(versionControlTheme)()
const filterClass = tv(inputTheme)({ tone: 'panel', size: 'sm' })

const visible = computed(() => {
  const query = filter.value.trim().toLowerCase()
  const names = branches ?? []
  return query ? names.filter((name) => name.toLowerCase().includes(query)) : names
})

function select(value: unknown) {
  if (typeof value === 'string' && value !== current && !disabled) emit('select', value)
}
</script>

<template>
  <ListboxRoot
    :model-value="current"
    :disabled="disabled"
    highlight-on-hover
    data-test-id="github-branch-list"
    class="flex flex-col gap-1.5"
    @update:model-value="select"
  >
    <ListboxFilter
      v-model="filter"
      :placeholder="storage.githubFilterBranches"
      :aria-label="storage.githubFilterBranches"
      :class="filterClass"
    />
    <AppAlert v-if="failureText" tone="error" :heading="failureText" />
    <ListboxContent :class="styles.branchList()">
      <p v-if="loading && !branches" :class="styles.branchMessage()">
        {{ storage.githubLoadingBranches }}
      </p>
      <p v-else-if="branches && visible.length === 0" :class="styles.branchMessage()">
        {{ storage.githubNoBranches }}
      </p>
      <ListboxItem
        v-for="name in visible"
        :key="name"
        :value="name"
        :class="styles.branchItem()"
        data-test-id="github-branch-item"
      >
        <span class="flex size-3 shrink-0 items-center justify-center">
          <ListboxItemIndicator>
            <icon-lucide-check class="size-3" />
          </ListboxItemIndicator>
        </span>
        <span :class="styles.branchName()">{{ name }}</span>
        <span v-if="name === defaultBranch" :class="styles.branchBadge()">{{
          storage.githubDefaultBranch
        }}</span>
      </ListboxItem>
    </ListboxContent>
  </ListboxRoot>
</template>
