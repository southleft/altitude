# Fonts — provenance

`Agrandir-Variable.woff2` / `Agrandir-Variable.ttf` are copied unmodified from
the frozen `southleft-v5` checkout (`D:\Southleft\southleft-v5\public\fonts\`,
github.com/southleft/southleft-v5). Southleft owns the license for its own
site's display typeface; self-hosting here (rather than in the Altitude
library) keeps the cost of this font at zero for every `altitude`-brand-only
consumer of `@southleft/al-web-components` — see `.altitude/BRANDS.md` § "Webfont
decision" for the full rationale.

Wired through `@font-face` in `../../src/styles/fonts.css` (`font-display:
swap`), and referenced ONLY through the `southleft` brand's
`font-family.secondary` design token
(`libs/al-web-components/styles/tokens/tier-2/brand/southleft/typography-primitives.json`)
— no page or component sets `font-family: 'Agrandir'` directly.

IBM Plex Sans (body/heading) needs no separate self-hosted file: it is already
fetched by `@southleft/al-web-components/css/main.css` (`styles/main.scss:11`, Google
Fonts) for every consumer of the library, southleft-branded or not.

Go-live note: if southleft.com ever needs additional Agrandir weights/styles
beyond the single variable file here, re-export from the same source Southleft
already licenses (do not source a new file from a third party).

## IBM Plex Mono (T12 audit-2, round A4)

`ibm-plex-mono-latin-{400,500}-normal.woff2` are copied unmodified from the
`@fontsource/ibm-plex-mono` package already vendored in the frozen
`southleft-v5` checkout's `node_modules`
(`D:\Southleft\southleft-v5\node_modules\@fontsource\ibm-plex-mono\files\`) —
the same two weights (regular/medium) v5 actually loads via `@fontsource`.
Licensed under the SIL Open Font License 1.1 (IBM Corp.) — full license text
copied to `IBM-Plex-Mono-LICENSE.txt` alongside the font files in this same
directory.

Wired through `@font-face` in `../../src/styles/fonts.css` and referenced only
through the app-level `--sl-font-mono` custom property
(`src/styles/layout.css`, set once on `.sl-page`, inherited by every mono
surface: `.sl-section-rule`, `.sl-kicker`, `.sl-token-chip`, `.sl-terminal*`,
`.sl-header__mobile-nav-index`, `.sl-media-card__meta`, `.sl-tag-chip`, and
the try-the-system panel) — not the generic Altitude `--al-font-family-mono`
token, since `southleft`'s brand recipe doesn't override that token with IBM
Plex Mono (a token-authoring gap documented, not fixed here — see
`layout.css`'s `--sl-font-mono` comment).
