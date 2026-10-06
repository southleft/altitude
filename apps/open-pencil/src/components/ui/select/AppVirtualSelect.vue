<script setup lang="ts">
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
  ComboboxVirtualizer,
  type AcceptableValue
} from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import { useRetainedPopup } from '@open-pencil/vue'

import type { ComponentUI } from '@/components/ui/types'
import theme from '@/theme/select/virtual'
import type { AppVirtualSelectTheme } from '@/theme/select/virtual'

export type AppVirtualSelectOption = { value: string; label: string; disabled?: boolean }

interface AppVirtualSelectProps {
  options: AppVirtualSelectOption[]
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  ui?: ComponentUI<AppVirtualSelectTheme>
}

defineOptions({ inheritAttrs: false })

const {
  options,
  label,
  placeholder,
  searchPlaceholder,
  emptyLabel = 'No results',
  ui
} = defineProps<AppVirtualSelectProps>()
const modelValue = defineModel<string>({ required: true })
const open = ref(false)
const searchTerm = ref('')
const { portalActive } = useRetainedPopup(open, () => updateOpen(false))
const styles = tv(theme)()

// Items mount only while open and only for visible rows, so catalogs with thousands of
// entries cost nothing until the list is shown.
const selectedLabel = computed(
  () => options.find((option) => option.value === modelValue.value)?.label
)
const filteredOptions = computed(() => {
  const query = searchTerm.value.trim().toLocaleLowerCase()
  if (!query) return options
  return options.filter((option) => option.label.toLocaleLowerCase().includes(query))
})

function updateValue(value: AcceptableValue): void {
  if (typeof value === 'string') modelValue.value = value
}

function updateOpen(value: boolean): void {
  open.value = value
  if (!value) searchTerm.value = ''
}
</script>

<template>
  <ComboboxRoot
    :model-value="modelValue"
    :open="open"
    :ignore-filter="true"
    @update:model-value="updateValue"
    @update:open="updateOpen"
  >
    <ComboboxAnchor as-child>
      <ComboboxTrigger v-if="$slots.trigger" as-child v-bind="$attrs" :aria-label="label">
        <slot name="trigger" />
      </ComboboxTrigger>
      <ComboboxTrigger
        v-else
        v-bind="$attrs"
        :aria-label="label"
        :class="styles.trigger({ class: ui?.trigger })"
      >
        <span :class="styles.value({ class: ui?.value })">
          {{ selectedLabel ?? placeholder }}
        </span>
        <icon-lucide-chevron-down :class="styles.chevron({ class: ui?.chevron })" />
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal v-if="portalActive">
      <ComboboxContent
        position="popper"
        :side-offset="2"
        :class="styles.content({ class: ui?.content })"
      >
        <div :class="styles.search({ class: ui?.search })">
          <icon-lucide-search :class="styles.searchIcon({ class: ui?.searchIcon })" />
          <ComboboxInput
            v-model="searchTerm"
            :aria-label="searchPlaceholder ?? label"
            :placeholder="searchPlaceholder"
            :display-value="() => ''"
            :class="styles.input({ class: ui?.input })"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>

        <ComboboxViewport :class="styles.viewport({ class: ui?.viewport })">
          <ComboboxVirtualizer
            v-slot="{ option }"
            :options="filteredOptions"
            :text-content="(option: AppVirtualSelectOption) => option.label"
            :estimate-size="24"
          >
            <ComboboxItem
              :value="option.value"
              :disabled="option.disabled"
              :class="styles.item({ class: ui?.item })"
            >
              <ComboboxItemIndicator :class="styles.indicator({ class: ui?.indicator })">
                <icon-lucide-check class="size-3 text-accent" />
              </ComboboxItemIndicator>
              <span :class="styles.itemText({ class: ui?.itemText })">{{ option.label }}</span>
            </ComboboxItem>
          </ComboboxVirtualizer>
          <div v-if="filteredOptions.length === 0" :class="styles.empty({ class: ui?.empty })">
            {{ emptyLabel }}
          </div>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
