# altitude — the neutral reference brand

`altitude` is deliberately the only brand with **no override files at all**, and
this directory is expected to stay that way. It is empty on purpose.

Why:

- `brand` defaults to `'altitude'` (`components/theme/theme.ts:32`), and most
  consumers never set the attribute at all — they render the base theme bundle.
  Anything given character here shifts under every adopter who did not opt in.
- `altitude` is the control the other brands are judged against in the
  side-by-side distinctiveness check
  (`.altitude/visual-compare/brands.dark.png`).
- `tokens-altitude-{light,dark}.css` is asserted byte-identical to
  `tokens-{light,dark}.css` by `scripts/check-brand-distinctiveness.js` (R12).
  Adding a `colors.json` / `borders.json` / `spacing.json` / `shadows.json` /
  `typography-primitives.json` here will fail that gate.

## Why `colors.json` was deleted (v2 restyle, 2026-08-30)

This directory used to hold a `colors.json` that re-pointed the six primary
colour tokens at the same stops the base theme already resolved them to — a
deliberate semantic no-op, on the theory that `brandSources()`
(`styles/tokens-config.v5.mjs:474`) globs `tier-2/brand/altitude/*.json` and so
needed *something* to build from.

Two things made that wrong:

1. **It could not stay a no-op.** A mode-agnostic brand file can only restate a
   token that has ONE value across both modes. v2 made the primary role
   mode-dependent — light paints white ink on a saturated fill, dark paints dark
   ink on a light fill — so the single `content.primary-weak` line in that file
   pinned the DARK ink into the LIGHT bundle and outranked the mode axis by
   specificity (`:host([brand='altitude'][mode='light'])` is 0,3,0 against the
   mode block's 0,2,0). Every primary button in light mode rendered its label
   near-black on blue. `test:brands` caught it as an R12 drift.

2. **The file was never load-bearing.** The old note here claimed deleting it
   would stop `tokens-altitude-{light,dark}.css` being emitted. That is not what
   happens — measured 2026-08-30: Style Dictionary still builds the two brand
   entries from their `include` chain with an empty `source`, and both bundles
   emit at 509 lines, byte-identical to the base theme bundles (diff is empty;
   `test:brands` reports "neutral reference intact").

So the mirror is now **structural rather than maintained**: altitude overrides
nothing, therefore it cannot drift from the base. Restating base values here is
a standing drift risk with no upside — it bought nothing and cost one real
rendering bug.

If a future review wants altitude to have character of its own, that is a
re-scope: it needs a new default brand for unbranded consumers first. See
`.altitude/BRANDS.md` §6 rule 8.
