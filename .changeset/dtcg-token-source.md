---
'@southleft/al-web-components': minor
---

Tokens Studio removed; `styles/tokens-dtcg/` is now the hand-authored token source

The legacy Tokens Studio tree (`styles/tokens/`, `value`/`type` shape) and its converter
`scripts/convert-tokens-to-dtcg.js` are deleted. `styles/tokens-dtcg/` — already the
published `./tokens-dtcg/*` subpath export — is now tracked, hand-authored and editable
rather than generated and gitignored. The Tokens Studio plugin manifests
(`$metadata.json`, `$themes.json`) and the dead `ingest-tokens-from-studio.js` are gone,
as is the `build:tokens:v5` alias.

**Consumer-visible:** every token in the published `tokens-dtcg/*` export gains a new
`$extensions["org.altitude.token"].cssType` field naming the CSS surface the token was
authored for. This is additive — no existing field changes.

It exists because DTCG `$type` is deliberately coarse: `sizing`, `spacing`,
`borderRadius`, `borderWidth`, `fontSizes` and `lineHeights` all collapse into
`dimension`, so `$type` alone cannot say whether a `dimension` token is a width, a
padding, a radius, a font-size or a border width. `cssType` carries that intent and is
what drives each token's `com.salesforce.styling.cssProperties` allow-list; without it
163 of 555 tokens would publish with no allow-list at all.

No change to emitted CSS: `styles/dist/` and `styles/dist-v5/` are byte-identical
across this change (38 files verified before and after), and the `exports`/`files`
surface is unchanged.
