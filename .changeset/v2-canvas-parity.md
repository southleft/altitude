---
'@southleft/al-web-components': major
'@southleft/al-react': major
---

Bring the library in line with the v2 design canvas, in both light and dark modes.

**Controls now take their height from a control scale, not from padding plus
line-height.** New `theme.size.control-sm` / `control` / `control-lg` tokens
(32 / 40 / 48px) back `al-button`, the shared `al-input` mixin (and with it
`al-input`, `al-textarea`, `al-select`, `al-search`, `al-combobox`),
`al-chip` and `al-toggle-button`. Control text is 14px/1 semibold. This also
fixes `al-button`'s outline variant rendering 42px against every other
variant's 40px — its 1px border had nothing to subtract from.

**New API**

- `al-button` gains `size` (`sm` | `lg`) and `isPill`.
- `al-card` gains a `footer` slot, a hairline border, and region padding so
  its header rule and tinted footer reach the card edge.
- `al-table` and `al-command-palette` accept their array inputs as JSON
  attributes, so they can be driven from static HTML and SSR rather than only
  from JavaScript.

**Fixes**

- `al-button`'s `isDisabled` set `aria-disabled` and never the native
  `disabled` attribute, so the `:disabled` opacity rule could not match and
  disabled buttons stayed clickable. `isAriaDisabled` now drives the
  aria-only case.
- `al-alert` tone variants painted a background but no foreground, so slotted
  copy inherited the surrounding page colour — a danger alert rendered near-
  white text on its own tint at roughly 1.05:1.
- `al-input-stepper`'s trailing variant rendered two 40px controls inside a
  50px box and clipped the decrement control out of sight; the segments now
  measure the 24px its WCAG 2.2 SC 2.5.8 note specifies.
- Dark mode: `border-info-weak`, `border-success-weak` and `border-danger-weak`
  each resolved to the same value as their own fill, so three of four callout
  borders were invisible.
- `al-tab` selected with the muted tone for both label and underline, making
  the active tab greyer than its inactive siblings.
- Checkbox and radio drew 2px ink rings rather than the hairlines the rest of
  the system uses.
- The token pipeline's font-weight emitter was a binary (`'Bold' ? 600 : 400`)
  and silently flattened any other weight to 400; it is now a map, and
  `font-weight.medium` (500) exists.

**Visual**

Status badges are soft tints with tone-coloured text rather than saturated
fills. Shadows are reserved for overlays: `al-alert`, `al-toggle-button`,
`al-toggle` and inline `al-calendar` are flat, and dialog/drawer/toast/menu
each take the overlay step the canvas actually draws.

Five light-mode text roles deliberately keep their shipped value rather than
the canvas's, which would have cost five WCAG AA passes and collided the
meta-text colour with the disabled colour. Each deviation is one ramp step and
visually indistinguishable.

**Breaking**

Bumped to `major`: the Figma reconciliation that followed this work removed and
renamed public API. Nothing here is source-compatible with the previous shape.

- **Button and Chip moved onto an emphasis axis.** Both are now
  `bare | neutral | primary | secondary | tertiary`. `al-button`'s `danger`
  variant is **gone**, and `al-chip`'s `info` / `success` / `warning` /
  `danger` variants are **gone**. Status is carried by `al-badge` and
  `al-alert`, which keep those axes. A destructive confirm is now a primary
  button with destructive copy. Button's `secondary` also changed appearance:
  it was a primary-tinted "tonal" fill and now uses the secondary colour role.
- **`--al-font-weight-bold` changed value, 600 -> 700.** What the library
  called "bold" always emitted 600, which is semibold. `semibold` (600) now
  exists as its own weight and every shipped call site moved to it, so nothing
  re-renders — but any consumer reading `--al-font-weight-bold`, or including
  an `al-theme-typography-*-bold` mixin, now gets 700. The 600 mixins are
  `-semibold`; `-medium` (500) was added alongside.
- **Type presets are named for their role, not a size.** Every
  `--al-typography-preset-<number>` custom property and matching
  `.al-typography-preset-<number>` utility class is renamed to
  `body-xs | body-sm | body-md | body-lg | heading-sm | heading-md |
  heading-lg | display-sm | display-md | display-lg`. The numbers had drifted
  off the sizes they named (`preset-36` held 28px).
- **Colour primitives renumbered to a 100-900 ramp** and the `color/brand/*`
  namespace removed; the eight hue families are addressed by role
  (`primary`, `secondary`, `tertiary`, `danger`, `warning`, `success`, `info`,
  `neutral`). The theme engine's generated palette follows
  (`--al-color-brand-blue-*` -> `--al-color-primary-*`).
- **Removed tokens:** `--al-font-size-13`, `-15` and `-18` (migrated to 12, 16
  and 20); `--al-color-transparent-{dark,light}-*` (collapsed to a single
  `--al-color-transparent-0`, with the mode axis doing the work);
  `--al-color-shadow-*` (now `--al-theme-color-shadow-*`).
- **Renamed semantic tokens:** `background-default-stronger` ->
  `background-default-bold`; `background-primary-weak` ->
  `background-primary-faint`; `background-primary-weak-strong` ->
  `background-primary-weak`.
