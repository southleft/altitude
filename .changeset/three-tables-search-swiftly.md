---
"al-web-components": minor
"al-react": minor
---

Add three new components: `al-table` (sortable/selectable data table with an
in-component horizontal scroll container), `al-combobox` (WAI-ARIA combobox
with filtered listbox, built on the same `al-dropdown-panel`/`al-list`
primitives as `al-select`/`al-search`), and `al-command-palette` (cmd/ctrl+k
overlay with fuzzy search over a provided action list, built on
`al-focus-trap`). Each ships with a React wrapper, Storybook stories, and a
`scoped-complete` migration.json entry.
