<script setup lang="ts">
import { templateRef, unrefElement } from '@vueuse/core'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxVirtualizer,
  ComboboxViewport,
  type AcceptableValue
} from 'reka-ui'
import { computed, nextTick } from 'vue'

import { useRetainedPopup } from '#vue/lifecycle/retention/popup'
import type { FontPickerSection, FontPickerUI } from '#vue/primitives/FontPicker/types'
import {
  useFontPicker,
  type FontAccessController,
  type FontFamilyOption
} from '#vue/primitives/FontPicker/useFontPicker'

const ITEM_SIZE = 36
const HEADING_SIZE = 24

const {
  listFamilies,
  localFontAccess,
  ui,
  emptySearchText,
  emptyFontsText,
  emptyFontsHint,
  sections,
  otherSectionLabel
} = defineProps<{
  listFamilies: () => Promise<string[] | FontFamilyOption[]>
  localFontAccess?: FontAccessController
  ui?: FontPickerUI
  emptySearchText?: string
  emptyFontsText?: string
  emptyFontsHint?: string
  /** Families pinned above the rest under a heading, such as team fonts. */
  sections?: FontPickerSection[]
  /** Heading above the remaining families when a section is shown. */
  otherSectionLabel?: string
}>()

const modelValue = defineModel<string>({ required: true })
const emit = defineEmits<{ select: [family: string] }>()

const contentRef = templateRef<HTMLElement>('contentRef')

function focusSearchInput() {
  nextTick(() => {
    const content = unrefElement(contentRef)
    if (!(content instanceof HTMLElement)) return
    content.querySelector<HTMLInputElement>('input')?.focus()
  })
}

const { searchTerm, open, filtered, headings, loading, accessState, requestAccess, select } =
  useFontPicker({
    modelValue,
    listFamilies,
    localFontAccess,
    onSelect: (family) => emit('select', family),
    sections: () => sections ?? [],
    otherSectionLabel: () => otherSectionLabel
  })

/** Row sizes are estimated once per layout; remount the virtualizer when headings move. */
const layoutKey = computed(() => `${filtered.value.length}:${[...headings.value.keys()].join(',')}`)

/** Rows that start a section are taller: the heading renders inside them. */
function itemSize(index: number): number {
  return headings.value.has(index) ? ITEM_SIZE + HEADING_SIZE : ITEM_SIZE
}
const { portalActive } = useRetainedPopup(open)
</script>

<template>
  <ComboboxRoot
    v-model:open="open"
    :model-value="modelValue"
    :ignore-filter="true"
    @update:model-value="
      (v: AcceptableValue) => {
        if (typeof v === 'string') select(v)
      }
    "
  >
    <ComboboxAnchor as-child>
      <ComboboxTrigger as-child>
        <slot name="trigger" :value="modelValue" :open="open">
          <button :class="ui?.trigger">
            <span class="truncate">{{ modelValue }}</span>
          </button>
        </slot>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal v-if="portalActive">
      <ComboboxContent
        :side-offset="2"
        align="start"
        position="popper"
        :class="ui?.content"
        @open-auto-focus.prevent
        ref="contentRef"
        @vue:mounted="focusSearchInput"
      >
        <slot name="search" :search-term="searchTerm">
          <ComboboxInput
            v-model="searchTerm"
            :display-value="() => ''"
            :class="ui?.search"
            placeholder="Search fonts…"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </slot>

        <ComboboxViewport :class="ui?.viewport ?? 'max-h-72 overflow-y-auto'">
          <ComboboxVirtualizer
            v-slot="{ option, virtualItem }"
            :key="layoutKey"
            :options="filtered"
            :text-content="(option: FontFamilyOption) => option.family"
            :estimate-size="itemSize"
          >
            <ComboboxItem
              :value="option.family"
              :class="ui?.item"
              :data-section-start="headings.has(virtualItem.index) ? '' : undefined"
              :style="{
                fontFamily: `'${option.family}', sans-serif`,
                ...(headings.has(virtualItem.index)
                  ? { height: `${itemSize(virtualItem.index)}px` }
                  : {})
              }"
            >
              <slot
                name="item"
                :family="option.family"
                :source="option.source"
                :selected="option.family === modelValue"
                :section-label="headings.get(virtualItem.index)"
              >
                <span v-if="headings.has(virtualItem.index)" :class="ui?.sectionLabel">
                  {{ headings.get(virtualItem.index) }}
                </span>
                <ComboboxItemIndicator>
                  <slot name="indicator" :selected="option.family === modelValue" />
                </ComboboxItemIndicator>
                <span class="truncate">{{ option.family }}</span>
              </slot>
            </ComboboxItem>
          </ComboboxVirtualizer>

          <div v-if="filtered.length === 0 && searchTerm" :class="ui?.empty">
            {{ emptySearchText ?? 'No fonts found' }}
          </div>
          <div v-else-if="filtered.length === 0" :class="ui?.empty">
            <div>
              <p v-if="accessState === 'prompt'">
                Allow local font access to browse installed fonts.
              </p>
              <p v-else-if="accessState === 'denied'">
                Local font access is blocked for this site.
              </p>
              <p v-else-if="accessState === 'unsupported'">
                Local fonts are not available in this browser.
              </p>
              <p v-else>{{ emptyFontsText ?? 'No local fonts available.' }}</p>
              <p v-if="emptyFontsHint" class="mt-1">{{ emptyFontsHint }}</p>
              <button
                v-if="accessState === 'prompt'"
                type="button"
                :class="ui?.emptyAction"
                :disabled="loading"
                @click="requestAccess"
              >
                {{ loading ? 'Loading…' : 'Allow local fonts' }}
              </button>
            </div>
          </div>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
