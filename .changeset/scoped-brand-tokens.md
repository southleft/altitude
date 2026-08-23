---
"@southleft/al-web-components": minor
"@southleft/al-react": minor
---

`<al-theme brand>` now actually applies tokens, and three inert rules in
`theme.scss` are fixed.

**New capability.** The token pipeline emits `:host([brand='x'])`,
`:host([brand='x'][mode='y'])` and `:host([mode='y'])` partials into
`styles/dist-v5/scss/host/`, and `components/theme/theme.scss` consumes them.
Two `<al-theme>` subtrees with different `brand` values now compute different
`--al-*` values on the same page — the thing `MIGRATION.md` has documented
since v2 and that nothing implemented. It works under
`registerAltitude({ mode: 'versioned' })`, it works with no global sheet-swap,
and it works server-rendered with JavaScript disabled.

The `:root` artifacts (`dist/css/main.css`, `dist/css/theme/*`,
`dist/css/brand/*`) are **byte-identical** — the scoped output is purely
additive and no consumer of the flat sheet needs an edit.

**Behaviour changes for existing `<al-theme>` users** (all bug fixes, all
visible):

- `mode` used to be worth exactly two properties, and both were hardcoded hexes
  that contradicted the generated tokens and beat them:
  `--al-theme-color-background-default: #161616` where the dark bundle says
  `#181818`, and `#f4f4f4` where it says `#f8f8f6`. Those literals are gone.
  `mode` now carries all 23 properties the two base themes differ on, so
  `<al-theme mode="light">` over a dark `:root` genuinely renders light instead
  of shifting two colours.
- `motion="reduced"` and the `prefers-reduced-motion` fallback did nothing at
  all: both blocks zeroed `--al-theme-animation-duration-{2,4,6,8}`, names the
  pipeline has never emitted. Corrected to `--al-theme-animation-duration` and
  `--al-theme-animation-duration-long`, which are what all 34 component call
  sites read.
- `density="comfortable"` was not a no-op — it wrote
  `--al-theme-space-md: 1rem` where the bundle says 1.25rem, so naming the axis
  at its own default value silently reflowed the page. The rule is removed (the
  base ramp *is* comfortable); `compact` and `cozy` are unchanged in value.

**Note for consumers.** The host blocks are deltas over the base `:root`
bundle. Keep `dist/css/main.css` (or another `:root` token sheet) loaded —
`<al-theme>` composes on top of it, it does not replace it.

Also fixed: `dist/components/theme/theme.js` shipped as a 35-byte empty file
because the Vite entry map spelled two different modules `theme`. The
stylesheet entry moved to `dist/styles/theme.js` and the `<al-theme>` component
now occupies its documented path. `css/main.css` is unchanged.
