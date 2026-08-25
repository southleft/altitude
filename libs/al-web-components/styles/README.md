# Tokens

This project uses [Style Dictionary](https://styledictionary.com/) v5 to build
design tokens into CSS custom properties, SCSS variables, JSON and TypeScript
types.

The source is `styles/tokens-dtcg/**.json` — a **hand-authored, git-tracked
[DTCG](https://tr.designtokens.org/format/) tree** (`$value` / `$type`). There
is no second token tree, no converter, and no design-tool round trip: Tokens
Studio was removed on 2026-08-25 along with the legacy `styles/tokens/` tree,
`scripts/convert-tokens-to-dtcg.js`, and the `$metadata.json` / `$themes.json`
plugin manifests. **Edit `tokens-dtcg/` directly.**

The tree is also published as the package's `./tokens-dtcg/*` subpath export
(`package.json` `files`), so its shape is public API.

## How to build tokens

```bash
pnpm --filter @southleft/al-web-components build:tokens
```

That runs `styles/tokens-config.v5.mjs` (Style Dictionary), then
`emit-token-types.js`, `copy-tokens-to-legacy-dist.js` and the AI-readiness
tokens digest. Output lands in `styles/dist-v5/`, mirrored byte-for-byte to
`styles/dist/` for legacy import paths.

**Never edit a generated `.css`, `.scss` or `tokens.json` under `dist/` or
`dist-v5/`** — the next build overwrites it.

## How to add or change a token

1. Edit the relevant file under `styles/tokens-dtcg/`.
2. Give every **new** token an authored CSS type:

```json
"@": {
  "$value": "{border.radius.2}",
  "$type": "dimension",
  "$extensions": { "org.altitude.token": { "cssType": "borderRadius" } }
}
```

   `$type` is the coarse DTCG type — `sizing`, `spacing`, `borderRadius`,
   `borderWidth`, `fontSizes` and `lineHeights` all collapse into `dimension`.
   `$extensions["org.altitude.token"].cssType` is the CSS surface the token was
   authored for, and it is **not recoverable from `$type`**. A token without it
   gets no `com.salesforce.styling.cssProperties` allow-list. The two are
   resolved in exactly one place: `scripts/lib/dtcg-token.mjs`
   (`dtcgType()` vs `authoredType()`).
3. From the repo root, run `pnpm run generate:token-metadata` to fill in the
   rest of the `$extensions` block (usage rule, `cssProperties`, lifecycle,
   uuid), then `pnpm run check:token-metadata` as its drift gate. Both are
   idempotent.
4. Build, then verify and rebaseline:

```bash
pnpm --filter @southleft/al-web-components build:tokens
pnpm --filter @southleft/al-web-components test:tokens
pnpm run gate:token-usage          # fails on phantom tokens
pnpm run baselines:tokens          # G8 — commit the snapshot in the same PR
```

Full pipeline reference, including the rebaselining procedure and the frozen
`core/variables.scss`: [`.altitude/TOKENS.md`](../../../.altitude/TOKENS.md).

## How to add a new theme

Themes and brands are driven by two plain arrays near the bottom of
`tokens-config.v5.mjs`, not by function calls. (An earlier revision of this
document described `styleDictionaryBuildTheme()` / `styleDictionaryBuildBrand()`
helpers — **those functions have never existed**. Ignore any instruction that
mentions them.)

1. Add the theme's colour sets under `styles/tokens-dtcg/tier-2/theme/<theme>/`
   and `styles/tokens-dtcg/tier-3/theme/<theme>/`.
2. Open `tokens-config.v5.mjs` and add the theme name to the `themes` array
   (`const themes = ['light', 'dark'];`). The loop below it builds
   `themeConfig(theme)` for each entry and emits
   `dist-v5/{css,scss}/theme/tokens-<theme>.{css,scss}`.

There is no registration step. The config globs the tier directories, so a new
file in them is picked up on the next build.

Note `withCore: theme === 'dark'` in the loop: `core/variables.scss` and
`tokens.json` are emitted from whichever theme is built last, so leave `dark`
at the end of the array unless you intend to move that output.

## How to add a new brand

1. Create `styles/tokens-dtcg/tier-2/brand/<brand>/` and author the override
   files the brand needs — see **The brand contract** below for which files are
   allowed and which overrides are inert.
2. Open `tokens-config.v5.mjs` and add one `{ theme, brand }` entry to the
   `brands` array **per mode the brand supports**:

```js
const brands = [
  { theme: 'light', brand: 'altitude' },
  { theme: 'dark',  brand: 'altitude' },
  { theme: 'dark',  brand: 'newBrand' },   // <- dark-only brand
];
```

   The loop below it builds `brandConfig(theme, brand)` for each entry and
   emits `dist-v5/{css,scss}/brand/tokens-<brand>-<theme>.{css,scss}`.

3. Run `pnpm --filter @southleft/al-web-components build:tokens`, then
   `pnpm run test:brands` to confirm the new brand is actually distinct and
   carries no inert overrides.

`brandConfig`'s `include` supplies the entire token surface (all of tier-1,
the non-brand tier-2 sets, and the tier-2/tier-3 theme colours); its `source`
is `tokens-dtcg/tier-2/brand/<brand>/*.json` — **any** JSON in that directory,
which is why adding a brand file needs no manifest edit. A brand bundle
therefore contains every token, not just the overridden slice, and Style
Dictionary resolves `source` over `include`.

The top-level brand glob is deliberately **non-recursive**. For a value that
must flip with `mode`, use `tier-2/brand/<brand>/mode/<theme>/colors.json` —
picked up by an explicit `existsSync` check in the config, not the glob.

There is no `tier-3/brand/<brand>` source glob. It was removed as dead in
`tokens-config.v5.mjs` (see the comment above `source:`); do not add a
`tier-3/brand/...` directory expecting it to build.

The two steps above are the token half. A brand name also has to be widened in
`theme.ts`, the theme switcher, the MCP schema and the visual-comparison
harnesses, or the brand builds but nothing can select it. Full ordered
checklist: [`.altitude/BRANDS.md`](../../../.altitude/BRANDS.md) § 9.

## The brand contract

A **brand carries the whole look**, not just an accent hue —
typography, radius, shadow, border width and spacing as well as colour. The
full contract, the reachability map behind it, and the rendered proof live in
[`.altitude/BRANDS.md`](../../../.altitude/BRANDS.md). The rules that bite
most often:

| Rule | Why |
|---|---|
| Typography must be overridden at **tier-1** (`typography.preset.N.*`), in a file named `typography-primitives.json`. | Components resolve typography through Sass mixins to `--al-typography-preset-N` and **never** read `--al-theme-typography-*`. All 28 of those tier-2 properties have zero consumers, so a `theme.typography.*` override in a brand file is silently inert. |
| Never override `theme.space.{sm,md,lg}`. | `components/theme/theme.scss:20-34` hardcodes them inside `:host([density=…])`, which outranks a brand bundle's `:root`. Use `xxxs`/`xxs`/`xs`/`@` — the four highest-traffic spacing tokens, none of which the density axis owns. |
| Never override `theme.border.radius.sm`. | Zero component consumers. |
| `letterSpacing` and `textDecoration` are not brand levers. | `formatTypographyValue` (`tokens-config.v5.mjs:45-49`) emits only `weight size/line-height family` and drops the rest. |
| Every brand value is a `{…}` reference, never a literal. | If the primitive you need does not exist, add it to `tokens-dtcg/tier-1/*.json` **additively**. |
| `altitude` stays neutral. | It is the default for anyone who never sets `brand`; `pnpm run test:brands` asserts its bundles are byte-identical to the base theme bundles. |

**Tier-discipline exception.** `typography-primitives.json` lives under
`tier-2/brand/` but contains **tier-1** token paths. That is deliberate and it
is the only lever that reaches a rendered component. It is contained to that
brand's bundle. Do not "fix" it — read `.altitude/BRANDS.md` §2 first.

## Token structure

```
|__ tokens-dtcg   (the hand-authored DTCG source — this is what you edit)
   |__ tier-1 (These tokens should only be referenced by tier-2 tokens)
       |__ animations.json
       |__ base.json
       |__ borders.json
       |__ breakpoints.json
       |__ colors.json
       |__ icons.json
       |__ layout.json
       |__ opacity.json
       |__ shadows.json
       |__ spacing.json
       |__ typography.json
       |__ z-index.json
   |__ tier-2 (Semantic tokens; these reference tier-1 tokens)
       |__ animations.json
       |__ borders.json
       |__ icons.json
       |__ layout.json
       |__ opacity.json
       |__ shadows.json
       |__ spacing.json
       |__ typography.json
       |__ theme
           |__ light
               |__ colors.json (Color tokens for a light theme)
           |__ dark
               |__ colors.json (Color tokens for a dark theme)
       |__ brand (One directory per brand — the whole look, not just colour)
           |__ altitude
               |__ colors.json          (neutral reference: colour only, by design)
               |__ README.md            (why this brand carries nothing else)
           |__ <brand>
               |__ colors.json                 theme.color.*
               |__ borders.json                theme.border.{radius,width}.*
               |__ spacing.json                theme.space.{xxxs,xxs,xs,@} ONLY
               |__ shadows.json                theme.box-shadow.*
               |__ typography-primitives.json  typography.preset.N.*  <- tier-1 paths,
               |                               the documented exception; see
               |                               .altitude/BRANDS.md section 2
               |__ mode
                   |__ light
                       |__ colors.json  (values that must flip with `mode`)
                   |__ dark
                       |__ colors.json
   |__ tier-3 (Most-specific overrides; these reference tier-2 tokens)
       |__ theme
           |__ light
               |__ colors.json (Color tokens for a light theme)
           |__ dark
               |__ colors.json (Color tokens for a dark theme)
```

There is no `tier-3/brand/` directory and `brandConfig` no longer globs one.
