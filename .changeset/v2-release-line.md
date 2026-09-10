---
---

Documentation, gate and tooling work on the v2 release line. Deliberately no version
bump: both libraries are already at 2.0.0 and neither has ever been published, so this
work belongs in the 2.0.0 notes rather than in a release after them. The two `major`
changesets that previously sat here (`v2-canvas-parity`, `neutral-colour-ramp`) were
folded into each package's 2.0.0 CHANGELOG for the same reason — left in place they
would have made the first-ever publish 3.0.0.

`al-button` gains `variant="primary"` as a named value of the emphasis axis. It is
additive and renders identically to what an omitted `variant` already rendered: the
primary fill moved from the base `.al-c-button` selector onto `.al-c-button--primary`,
which `render()` applies for `variant="primary"` and for an omitted variant alike, so
no existing markup changes. It closes the last variant-axis disagreement against the
Figma set, which has always spelled this value `Primary` while the code spelled it as
the absence of a value — the reason the two axes could not be compared.

The same treatment lands on three more axes that were spelled as the absence of a value,
each additive and each rendering exactly what an omitted attribute already rendered
(verified by computed style, not by inspection):

- `al-button` gains `size="md"` — the 40px control. The height and padding move from the
  base selector onto `.al-c-button--md`.
- `al-badge` gains `variant="neutral"` — the non-status badge. The fill moves from the
  base selector onto `.al-c-badge--neutral`.
- `al-progress` gains `circleSize="sm"` — the 16px circle. Its dimensions move onto
  `.al-is-circle-sm`, which also lets the label offset rule say what it means
  (`.al-has-label.al-is-circle-sm`) instead of
  `:not(.al-is-circle-md):not(.al-is-circle-lg):not(.al-is-circle-xl)`.
