<script setup lang="ts">
import { computed } from 'vue'

import { fontManager, WEB_FONT_PROVIDER_IDS } from '@open-pencil/core/text'
import { FontPickerRoot, useI18n } from '@open-pencil/vue'
import type { FontPickerSection, FontPickerUI } from '@open-pencil/vue'

import {
  listFamilies,
  loadFont,
  localFontAccessState,
  requestLocalFontAccess
} from '@/app/editor/fonts'
import { teamFontStatus } from '@/app/editor/fonts/team'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import { useSelectUI } from '@/components/ui/select/select'

const { panels, fonts } = useI18n()
const { label: labelProp } = defineProps<{ label?: string }>()
const label = computed(() => labelProp ?? panels.value.fontFamily)
const modelValue = defineModel<string>({ required: true })
const emit = defineEmits<{ select: [family: string] }>()

const cls = usePopoverUI({
  content: 'w-[var(--reka-combobox-trigger-width)] min-w-56 overflow-hidden p-0'
})
const selectCls = useSelectUI({
  trigger: 'w-full rounded px-2 py-1 text-xs',
  item: 'w-full gap-2 px-3 py-2.5 text-sm leading-tight'
})

const ui = computed<FontPickerUI>(() => ({
  trigger: selectCls.trigger,
  content: cls.content,
  item: selectCls.item,
  search:
    'w-full border-b border-border bg-transparent px-3 py-2 text-sm text-surface outline-none placeholder:text-muted',
  empty: 'px-2 py-3 text-center text-xs text-muted',
  emptyAction: 'mt-2 rounded bg-accent px-2 py-1 text-xs font-medium text-white disabled:opacity-50'
}))

/** Team fonts are pinned above the rest under the library's name. */
const sections = computed<FontPickerSection[]>(() => {
  void teamFontStatus.value
  const library = fontManager.teamFontLibraryLabel()
  return library ? [{ source: 'team', label: fonts.value.teamFontsSection({ library }) }] : []
})

const previewFontLoads = new Set<string>()

const localFontAccess = {
  state: localFontAccessState,
  load: requestLocalFontAccess
}

function loadPreviewFont(family: string, source: string) {
  const remote =
    source === 'team' ||
    WEB_FONT_PROVIDER_IDS.includes(source as (typeof WEB_FONT_PROVIDER_IDS)[number])
  if (!remote) return
  if (previewFontLoads.has(family)) return
  previewFontLoads.add(family)
  void loadFont(family)
}
</script>

<template>
  <FontPickerRoot
    v-model="modelValue"
    data-test-id="font-picker-root"
    :list-families="listFamilies"
    :local-font-access="localFontAccess"
    :ui="ui"
    :search-placeholder="panels.searchFonts"
    :empty-search-text="panels.noFontsFound"
    :empty-fonts-text="panels.noLocalFontsAvailable"
    :empty-fonts-hint="panels.localFontsAccessHint"
    :sections="sections"
    :other-section-label="fonts.allFontsSection"
    @select="emit('select', $event)"
  >
    <template #trigger>
      <button
        type="button"
        data-test-id="font-picker-trigger"
        :aria-label="label"
        :class="selectCls.trigger"
      >
        <span class="truncate">{{ modelValue }}</span>
        <icon-lucide-chevron-down class="size-3 shrink-0 text-muted" />
      </button>
    </template>

    <template #item="{ family, selected, source, sectionLabel }">
      <div
        data-test-id="font-picker-item"
        :data-source="source"
        class="flex min-w-0 flex-1 flex-col justify-end self-stretch"
        @vue:mounted="loadPreviewFont(family, source)"
      >
        <span
          v-if="sectionLabel"
          data-slot="font-picker-section"
          class="font-sans mb-1.5 truncate text-[10px] font-medium tracking-wide text-muted uppercase"
        >
          {{ sectionLabel }}
        </span>
        <div class="flex min-w-0 items-center gap-2">
          <icon-lucide-check v-if="selected" class="size-3 shrink-0 text-accent" />
          <span v-else class="size-3 shrink-0" />
          <span class="truncate" :style="{ fontFamily: `'${family}', sans-serif` }">{{
            family
          }}</span>
          <span
            class="font-sans ml-auto shrink-0 rounded bg-input px-1.5 py-0.5 text-[9px] uppercase text-muted"
          >
            {{ source }}
          </span>
        </div>
      </div>
    </template>
  </FontPickerRoot>
</template>
