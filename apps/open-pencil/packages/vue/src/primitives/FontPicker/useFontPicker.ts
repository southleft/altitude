import { tryOnScopeDispose, watchImmediate } from '@vueuse/core'
import { useFilter } from 'reka-ui'
import { computed, ref, watch } from 'vue'

import type { FontFamilyOption } from '@open-pencil/core/text'

import { useRetainedActivity } from '#vue/lifecycle/retention/context'
import type { FontPickerSection } from '#vue/primitives/FontPicker/types'

export type FontAccessState = 'unsupported' | 'prompt' | 'granted' | 'denied'
export type { FontFamilyOption, FontFamilySource } from '@open-pencil/core/text'

export interface FontAccessController {
  state: () => FontAccessState
  load: () => Promise<string[] | FontFamilyOption[]>
}

/**
 * Options for {@link useFontPicker}.
 */
export interface UseFontPickerOptions {
  /** Writable model for the selected font family. */
  modelValue: { value: string }
  /** Async source for available font families. */
  listFamilies: () => Promise<string[] | FontFamilyOption[]>
  /** Host-provided local-font permission controller. */
  localFontAccess?: FontAccessController
  /** Optional callback fired after a family is selected. */
  onSelect?: (family: string) => void
  /** Families pinned above the rest under a heading, such as team fonts. */
  sections?: () => readonly FontPickerSection[]
  /** Heading above the remaining families when a section is shown. */
  otherSectionLabel?: () => string | undefined
}

export interface GroupedFontOptions {
  options: FontFamilyOption[]
  /** Section heading shown above the option at each index. */
  headings: Map<number, string>
}

/**
 * Families of each section first, in section order, then every other family. Headings
 * mark where each section starts; `otherLabel` marks the rest once any section is shown.
 */
export function groupFontOptions(
  options: readonly FontFamilyOption[],
  sections: readonly FontPickerSection[] = [],
  otherLabel?: string
): GroupedFontOptions {
  const headings = new Map<number, string>()
  if (sections.length === 0) return { options: [...options], headings }
  const ordered: FontFamilyOption[] = []
  for (const section of sections) {
    const members = options.filter((option) => option.source === section.source)
    if (members.length === 0) continue
    headings.set(ordered.length, section.label)
    ordered.push(...members)
  }
  const pinned = new Set(sections.map((section) => section.source))
  const rest = options.filter((option) => !pinned.has(option.source))
  if (ordered.length > 0 && rest.length > 0 && otherLabel) headings.set(ordered.length, otherLabel)
  ordered.push(...rest)
  return { options: ordered, headings }
}

function normalizeOptions(items: string[] | FontFamilyOption[]): FontFamilyOption[] {
  return items.map((item) => (typeof item === 'string' ? { family: item, source: 'local' } : item))
}

/**
 * Returns searchable font-picker state and selection helpers.
 */
export function useFontPicker(options: UseFontPickerOptions) {
  const families = ref<FontFamilyOption[]>([])
  const searchTerm = ref('')
  const open = ref(false)
  const loading = ref(false)
  const accessState = ref<FontAccessState>(options.localFontAccess?.state() ?? 'granted')
  const active = useRetainedActivity()
  let requestVersion = 0

  function cancelLoad() {
    requestVersion++
    loading.value = false
  }

  watchImmediate(
    () => active?.value ?? true,
    (enabled) => {
      if (!enabled) cancelLoad()
    },
    { flush: 'sync' }
  )
  tryOnScopeDispose(cancelLoad)

  const { contains } = useFilter({ sensitivity: 'base' })
  const grouped = computed(() => {
    const matching = searchTerm.value
      ? families.value.filter((option) => contains(option.family, searchTerm.value))
      : families.value
    return groupFontOptions(matching, options.sections?.(), options.otherSectionLabel?.())
  })
  const filtered = computed(() => grouped.value.options)
  const headings = computed(() => grouped.value.headings)

  async function loadFamilies() {
    if (families.value.length > 0 || loading.value) return
    loading.value = true
    const version = ++requestVersion
    try {
      const items = await options.listFamilies()
      if (version !== requestVersion) return
      families.value = normalizeOptions(items)
      accessState.value = options.localFontAccess?.state() ?? accessState.value
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  watch(open, async (isOpen) => {
    if (!isOpen) return
    searchTerm.value = ''
    accessState.value = options.localFontAccess?.state() ?? accessState.value
    if (accessState.value === 'prompt') {
      await requestAccess()
      return
    }
    await loadFamilies()
  })

  async function requestAccess() {
    if (!options.localFontAccess || loading.value) return
    loading.value = true
    const version = ++requestVersion
    try {
      const items = await options.localFontAccess.load()
      if (version !== requestVersion) return
      families.value = normalizeOptions(items)
      accessState.value = options.localFontAccess.state()
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  function select(family: string) {
    options.modelValue.value = family
    options.onSelect?.(family)
    open.value = false
  }

  return {
    families,
    searchTerm,
    open,
    filtered,
    headings,
    loading,
    accessState,
    requestAccess,
    select
  }
}
