import type { FontFamilySource } from '@open-pencil/core/text'

export interface FontPickerUI {
  trigger?: string
  content?: string
  item?: string
  itemMeta?: string
  search?: string
  viewport?: string
  empty?: string
  emptyAction?: string
  /** Heading inside the first row of a section. */
  sectionLabel?: string
}

/** A group of families pinned above the rest, such as a team font library. */
export interface FontPickerSection {
  source: FontFamilySource
  label: string
}
