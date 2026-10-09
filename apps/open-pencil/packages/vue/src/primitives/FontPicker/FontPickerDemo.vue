<script setup lang="ts">
import { ref } from 'vue'

import FontPickerRoot from './FontPickerRoot.vue'
import type { FontFamilyOption } from './useFontPicker'

const family = ref('Inter')
const families: FontFamilyOption[] = [
  { family: 'Agrandir', source: 'team' },
  { family: 'IBM Plex Mono', source: 'team' },
  { family: 'Inter', source: 'bundled' },
  { family: 'Public Sans', source: 'fontsource' },
  { family: 'Roboto', source: 'fontsource' },
  { family: 'Sora', source: 'local' }
]
const sections = [{ source: 'team' as const, label: 'Team fonts · altitude-designs' }]
const ui = {
  trigger: 'w-56 rounded border border-border px-2 py-1 text-left text-xs',
  content: 'w-56 overflow-hidden rounded border border-border bg-panel p-0 text-surface',
  search: 'w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none',
  item: 'flex w-full gap-2 px-3 py-2.5 text-sm leading-tight data-[highlighted]:bg-input',
  sectionLabel: 'block text-[10px] uppercase text-muted'
}
</script>

<template>
  <div class="grid gap-2 text-surface">
    <FontPickerRoot
      v-model="family"
      :list-families="async () => families"
      :sections="sections"
      other-section-label="All fonts"
      :ui="ui"
    />
    <output role="status" aria-label="Selected family" class="text-xs">{{ family }}</output>
  </div>
</template>
