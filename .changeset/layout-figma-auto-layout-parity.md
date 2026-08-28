---
'@southleft/al-web-components': major
---

**Removed `stretchItems` from `<al-layout>`.** It had zero call sites across the
entire repo, and the only two places in app code that mentioned it were comments
explaining why it did not fit. Its rule (`::slotted(*) { width: 100% }` plus
`--al-button-width: 100%`) was also duplicated verbatim inside `responsive`,
which keeps that behaviour for the case it was actually used for.

Migration: if you set `stretchItems`, use `responsive` (same rule, applied below
the small breakpoint) or `.al-u-grid__item` on the children you want stretched —
that utility is `display: grid`, so it fills the track on BOTH axes, which
`stretchItems` never did.

Also in this release, no API change: the contract-to-Figma generator now derives
a node's auto-layout axis from its CSS `display` rather than from
`flex-direction` (which computes to `row` on every non-flex element, so every
block-level container was generating as a horizontal row — 327 of 680 anatomy
nodes across 53 components). `flex-wrap` now reaches Figma as `layoutWrap`.
