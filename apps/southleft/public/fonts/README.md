# Fonts — provenance

`Agrandir-Variable.woff2` / `Agrandir-Variable.ttf` are copied unmodified from
the frozen `southleft-v5` checkout (`D:\Southleft\southleft-v5\public\fonts\`,
github.com/southleft/southleft-v5). Southleft owns the license for its own
site's display typeface; self-hosting here (rather than in the Altitude
library) keeps the cost of this font at zero for every `altitude`-brand-only
consumer of `al-web-components` — see `.altitude/BRANDS.md` § "Webfont
decision" for the full rationale.

Wired through `@font-face` in `../../src/styles/fonts.css` (`font-display:
swap`), and referenced ONLY through the `southleft` brand's
`font-family.secondary` design token
(`libs/al-web-components/styles/tokens/tier-2/brand/southleft/typography-primitives.json`)
— no page or component sets `font-family: 'Agrandir'` directly.

IBM Plex Sans (body/heading) needs no separate self-hosted file: it is already
fetched by `al-web-components/css/main.css` (`styles/main.scss:11`, Google
Fonts) for every consumer of the library, southleft-branded or not.

Go-live note: if southleft.com ever needs additional Agrandir weights/styles
beyond the single variable file here, re-export from the same source Southleft
already licenses (do not source a new file from a third party).
