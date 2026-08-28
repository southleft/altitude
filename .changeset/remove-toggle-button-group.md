---
'@southleft/al-web-components': major
'@southleft/al-react': major
---

`al-toggle-button-group` / `ALToggleButtonGroup` removed

**Breaking.** The component and its React wrapper are deleted, along with its schema,
contract, generated reference doc, docs guidance page and Figma set.

Unlike `al-button-group` and the other arrangement-only wrappers removed before it,
this one **did own behaviour** — that is why it survived the earlier
"Arrangement vs. semantics" cut (AGENTS.md). Specifically it owned:

- **single-select enforcement** — listening for `onToggleButtonSelect` and clearing the
  previously selected button's `isSelected` (`toggle-button-group.ts:81-84`)
- **click-outside deselection** — a global `mousedown` listener that cleared the
  selection when the click landed outside the selected button (`:63`, `:96-101`)

Nothing in the system consumed either behaviour, so it was cut rather than carried —
the same reasoning applied to `al-chip-group` and `al-toast-group`.

**Migration.** A row of toggle buttons is now arrangement plus explicit state:

```html
<al-layout direction="row" gap="none">
  <al-toggle-button>One</al-toggle-button>
  <al-toggle-button>Two</al-toggle-button>
</al-layout>
```

`al-toggle-button` is unchanged and still dispatches `onToggleButtonSelect`. If you
relied on the group's mutual exclusivity or click-outside deselection, that state is now
yours to own: listen for `onToggleButtonSelect` on your container and clear the previous
button's `isSelected` yourself.
