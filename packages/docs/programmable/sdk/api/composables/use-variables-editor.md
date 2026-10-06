---
title: useVariablesEditor
description: Compose the variables dialog state, table columns, and TanStack table wiring.
---

# useVariablesEditor

`useVariablesEditor()` is a higher-level variables-domain composable for building a variables dialog or editor screen.

It combines:

- variables dialog state
- variables table columns
- TanStack Vue Table wiring
- collection/mode helpers

## Usage

```ts
const variables = useVariablesEditor({
  colorInput: ColorInput,
  icons,
  fallbackIcon,
  deleteIcon,
})
```

## What it returns

It includes the lower-level dialog/table state plus:

- `columns`
- `table`
- `hasCollections`

## Practical examples

### Build a variables dialog

Use `useVariablesEditor()` when you want one composable that already wires the table and action handlers together.

## Related APIs

- [SDK API Overview](../)
