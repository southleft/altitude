---
---

The `density`, `contrast`, `motion` and `shape` axes of `<al-theme>` are now DTCG
tokens, like `brand` and `mode`. Each axis is a directory of mode files in the
published token source, one file per attribute value
(`tokens-dtcg/tier-2/axis/<axis>/<mode>.json`), and the host rules `<al-theme>`
applies are generated from them instead of being hand-written in its stylesheet. The
compiled `<al-theme>` CSS is byte-identical, so nothing renders differently.

New: `@southleft/al-web-components/axes.json`, a manifest of every axis — its modes,
its default, the resolved value of each token in each mode, and the exact rules
emitted — for tools that import the tokens as variable collections with modes.

The motion system gains four use cases (`hover`, `expand`, `overlay`, `emphasis`),
authored as DTCG `transition` composites and accepted by the
`al-motion-transition()` Sass mixin in place of a duration role. The mixin's `slow`
role now falls back to `--al-theme-animation-duration-long`, matching every
hand-written call site (the mixin had no callers, so no output changes). Easing
curves in the token source are DTCG `cubicBezier` arrays; the emitted CSS is
unchanged. No version bump, for the same reason as `v2-release-line.md`.
