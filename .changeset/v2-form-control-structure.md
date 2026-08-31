---
'@southleft/al-web-components': major
---

v2 form controls: floating labels retired, stepper redrawn, inset-label variant added

The three parts of the v2 canvas that change markup rather than values. Paired with
`v2-visual-language`, which moved the tokens; this one moves the structure.

**Floating labels are gone.** `al-input`, `al-textarea`, and — through the inputs they
compose — `al-select`, `al-search`, `al-combobox`, `al-date-picker`, `al-date-time-picker`,
`al-file-upload` and `al-pagination` now render a top-aligned label in normal flow. The
label was absolutely positioned inside the field and moved above the border on
focus/value, painting a background patch to punch a hole through that border, plus a
second `::before` patch for the disabled case. All of it is deleted. The label is lifted
OUT of `.al-c-input__container`, which matters structurally: `__before` / `__after` are
absolutely centred against that container, so a label inside it would drag slotted icons
off-centre.

**`hideLabel` no longer reveals the placeholder.** It now hides the label *visually*
(clip-based) while keeping the element and its `for` association in the accessibility
tree, so the field keeps its accessible name. The placeholder used to be hidden by
default and revealed only under `.al-has-hidden-label`, because the floating label sat in
its position; that coupling is gone and a `placeholder` renders whenever it is set.
Verified across 12 stories and pinned by four new unit tests.

**`isActive` is deprecated on `al-input` and `al-textarea`.** It existed to float the
label. It is still derived and `.al-is-active` is still emitted — deliberately, so
consumer CSS keyed on that hook does not break silently — but nothing in the library
styles it, and it goes in the next major. `al-select` and `al-search` no longer forward it
to their inner input; their own `isActive` is unaffected. Note the name was always a
misnomer here: everywhere else in the library `isActive` means open/expanded.

**New: `al-input labelPosition="inset"`.** The canvas's replacement for the floating
label — the label sits inside the field's top padding, above the value, and is STATIC. It
renders identically in every state, so there is no jump on focus and no border patch.

**`al-input-stepper` is a segmented control.** One bordered box divided into
decrement | value | increment by hairlines, with the value in the mono metadata face so
digits do not shift sideways under the buttons. Previously the buttons were absolutely
positioned on top of the input, the input carried `xxxl` inline padding to clear them, and
an invisible `::after` tried to auto-size the box from `attr(data-value)` — an attribute
nothing has ever set. That dead rule is removed.

**New: `al-input-stepper variant="trailing"`.** The value takes the full width and both
steppers stack at the trailing edge, for table rows. It defaults to **50px tall, not the
40px the canvas draws**: two stacked controls in 40px are 20px each, under the 24×24
minimum in WCAG 2.2 SC 2.5.8, and neither exception applies. 50px rather than 48px because
the box is `border-box` — 48px minus the 1px top and bottom border leaves 46px of content,
which splits into two 23px rows (measured, after a first pass assumed otherwise).
`--al-input-stepper-block-size` is the escape hatch.

New per-component custom properties: `--al-input-background`,
`--al-input-inset-min-height`, `--al-input-stepper-block-size`,
`--al-input-stepper-button-size`, `--al-input-stepper-value-width`.

Accessibility is measured, not assumed: `a11y:report` goes from 18 contrast findings to
16, structural stays at 0, and every remaining finding is a `--Disabled` story, which
WCAG 1.4.3 exempts.
