import appSelectTheme from './app'
import appComboboxTheme from './combobox'

/** Searchable, virtualized select for long catalogs; triggers match `AppSelect`. */
const appVirtualSelectTheme = {
  slots: {
    trigger: appSelectTheme.slots.trigger,
    value: appSelectTheme.slots.value,
    chevron: 'ml-1 size-3 shrink-0 text-muted',
    content: appComboboxTheme.slots.content,
    search: appComboboxTheme.slots.search,
    searchIcon: appComboboxTheme.slots.searchIcon,
    input: appComboboxTheme.slots.input,
    viewport: appComboboxTheme.slots.viewport,
    empty: appComboboxTheme.slots.empty,
    item: [appSelectTheme.slots.item, 'w-full rounded'],
    itemText: 'truncate',
    indicator: appSelectTheme.slots.indicator
  }
}

export type AppVirtualSelectTheme = typeof appVirtualSelectTheme
export default appVirtualSelectTheme
