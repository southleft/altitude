---
"@southleft/al-web-components": minor
"@southleft/al-react": minor
---

Add a marketing-organism layer so Altitude serves marketing sites as well as
product UIs: `al-split-content` (two-column media/content band), `al-bento-grid`
+ `al-bento-item` (asymmetric feature grid), `al-footer` (site footer,
composes `al-list`/`al-link`), `al-stat` (single KPI tile with trend delta —
compose several into a "KPI band"), `al-testimonial` (quote + attribution,
composes `al-avatar`), `al-banner` (page-level, full-width announcement bar,
distinct from `al-alert`), and `al-empty-state`. Also extends `al-hero`
additively with `contentAlignment` and an opt-in poster `overlay` scrim — zero
visual change to existing usage. Each new component ships with a React
wrapper, Storybook stories, and a `scoped-complete` migration.json entry.
