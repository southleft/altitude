# altitude — the neutral reference brand

`altitude` is deliberately the only brand with **no non-colour override files**,
and this directory is expected to stay that way.

Why:

- `brand` defaults to `'altitude'` (`components/theme/theme.ts:32`), and most
  consumers never set the attribute at all — they render the base theme bundle.
  Anything given character here shifts under every adopter who did not opt in.
- `altitude` is the control the other three brands are judged against in the
  side-by-side distinctiveness check
  (`.altitude/visual-compare/brands.dark.png`).
- `tokens-altitude-{light,dark}.css` is asserted byte-identical to
  `tokens-{light,dark}.css` by `scripts/check-brand-distinctiveness.js`. Adding
  a `borders.json` / `spacing.json` / `shadows.json` /
  `typography-primitives.json` here will fail that gate.

`colors.json` re-points the six primary colour tokens at `{color.brand.blue.*}`
— which is what the base theme already resolves them to, so it is a semantic
no-op kept for Tokens Studio round-trip symmetry with the other three brands.

If a future review wants altitude to have character of its own, that is a
re-scope: it needs a new default brand for unbranded consumers first. See
`.altitude/BRANDS.md` §6 rule 8.
