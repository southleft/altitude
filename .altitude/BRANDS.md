# Brand identities — reachability map and brand contract

> **Scope.** What a `brand` token set is allowed to override, which overrides
> actually reach a rendered component, and which ones are silently inert.
> Companion to [`TOKENS.md`](./TOKENS.md), which covers the pipeline itself.

A brand in Altitude is **the whole look**, not the accent hue. `brand` is one of
the four axes on `<al-theme brand mode density contrast>`; `mode`, `density` and
`contrast` own specific token slices (see §5) and `brand` owns everything else.

---

## 1. The reachability map (R1)

Measured on 2026-07-28 by grepping `--al-[a-z0-9-]+` across
`libs/al-web-components/components/**/*.scss` (167 distinct properties) and
diffing against the 322 properties emitted into
`styles/dist-v5/css/theme/tokens-dark.css`.

Reproduce with:

```bash
grep -rhoE '\-\-al-[a-z0-9-]+' libs/al-web-components/components --include=*.scss \
  | sort | uniq -c | sort -rn
```

### 1.1 Defined **and** consumed — the live brand levers

| Property | Consumers | Tier-2 token | Brand lever? |
|---|---:|---|---|
| `--al-theme-space-xs` | 88 | `theme.space.xs` | ✅ |
| `--al-theme-space` | 84 | `theme.space.@` | ✅ |
| `--al-theme-space-xxs` | 50 | `theme.space.xxs` | ✅ |
| `--al-theme-animation-timing` | 42 | `theme.animation.timing.@` | ✅ (subtle) |
| `--al-theme-animation-duration` | 33 | `theme.animation.duration.@` | ✅ (subtle) |
| `--al-theme-border-radius` | 32 | `theme.border.radius.@` | ✅ |
| `--al-theme-opacity-disabled` | 28 | `theme.opacity.disabled` | ✅ (subtle) |
| `--al-theme-icon-lg` | 24 | `theme.icon.lg` | ✅ |
| `--al-theme-space-sm` | 22 | `theme.space.sm` | ❌ **density-owned** (§5) |
| `--al-theme-icon` | 18 | `theme.icon.@` | ✅ |
| `--al-theme-border-width` | 18 | `theme.border.width.@` | ✅ |
| `--al-theme-icon-md` | 12 | `theme.icon.md` | ✅ |
| `--al-theme-space-xxxs` | 11 | `theme.space.xxxs` | ✅ |
| `--al-theme-space-lg` | 11 | `theme.space.lg` | ❌ **density-owned** (§5) |
| `--al-theme-box-shadow-md` | 10 | `theme.box-shadow.md` | ✅ |
| `--al-theme-border-radius-round` | 10 | `theme.border.radius.round` | ⚠️ avatars/toggles — leave at 50% |
| `--al-theme-border-radius-lg` | 10 | `theme.border.radius.lg` | ✅ |
| `--al-theme-animation-duration-long` | 9 | `theme.animation.duration.long` | ✅ (subtle) |
| `--al-theme-border-width-md` | 8 | `theme.border.width.md` | ✅ |
| `--al-theme-space-md` | 5 | `theme.space.md` | ❌ **density-owned** (§5) |
| `--al-theme-box-shadow` | 5 | `theme.box-shadow.@` | ✅ |
| `--al-theme-border-radius-md` | 4 | `theme.border.radius.md` | ✅ |
| `--al-theme-box-shadow-lg` | 2 | `theme.box-shadow.lg` | ✅ |
| `--al-theme-box-shadow-xs` / `-sm` | 1 each | `theme.box-shadow.{xs,sm}` | ✅ |
| `--al-theme-border-width-lg` | 1 | `theme.border.width.lg` | ✅ |
| `--al-theme-color-*` | many | `theme.color.*` | ✅ (what brands already do) |

### 1.2 Defined but **zero** consumers — overriding these changes nothing

```
--al-theme-border-radius-sm
--al-theme-box-shadow-xl
--al-theme-space-xl        --al-theme-space-super
--al-theme-layout-max-width     --al-theme-layout-max-width-{xs,lg,xxl}
--al-theme-typography-body-{xs,sm,md,lg}[-bold]        (8)
--al-theme-typography-heading-{sm,md,lg}[-bold]        (6)
--al-theme-typography-display-{sm,md,lg}[-bold]        (6)
```

**All 28 `--al-theme-typography-*` properties have zero consumers.** See §2.

`--al-theme-border-radius-sm` is emitted (`dist/css/theme/tokens-light.css:219`)
and referenced by no component. It is kept — renaming or removing it would trip
the name-stability gate for no benefit — but it is not a brand lever.

### 1.3 Consumed but **undefined** — phantoms

Token-level phantoms (a component asks for an `--al-theme-*` that no token
emits, so the declaration is invalid and drops):

| Property | Site | Status |
|---|---|---|
| `--al-theme-border-radius-xs` | `components/button/button.scss:173` | **fixed here** — `theme.border.radius.xs` added (R4) |
| `--al-theme-animation-duration-{2,4,6,8}` | motion axis in `components/theme/theme.scss:43-46` + 4 component sites | pre-existing; the motion axis sets them on `:host`, nothing emits a default |
| `--al-theme-color-focus-ring` | focus mixin | pre-existing, out of scope |
| `--al-theme-color-content-tertiary` | | pre-existing, out of scope |
| `--al-theme-color-content-default-primary-stronger` | | pre-existing, out of scope |
| `--al-theme-color-primary-stronger` | | pre-existing, out of scope |
| `--al-theme-color-background-transparent` | | pre-existing, out of scope |

The other ~80 undefined `--al-*` properties are **per-component public API
knobs** (`--al-button-width`, `--al-popover-offset`, …) — deliberately
undefined, always read with a fallback. Not phantoms; not brand levers.

---

## 2. Typography: the tier-1 exception (R3, R7)

**Components never read `--al-theme-typography-*`.** Every one of the 64
typography call sites in component SCSS goes through a Sass mixin:

```
components/button/button.scss:13     @include al-theme-typography-body-md-bold;
styles/core/mixins/typography.scss:161-163  → @include al-typography-preset-16-bold;
styles/core/mixins/typography.scss:25-27    → font: var(--al-typography-preset-16);
```

The rendered custom property is the **tier-1** `--al-typography-preset-N`.
The tier-2 token is emitted (`--al-theme-typography-body-md:
var(--al-typography-preset-16)`) and read by nothing.

So a brand file overriding `theme.typography.*` changes a variable nobody
reads. **The only working lever is the tier-1 `typography.preset.N.*`
composites.**

### The mechanism, verified

`brandConfig()` (`styles/tokens-config.v5.mjs:278-328`) puts tier-1 in
`include` and `tokens-dtcg/tier-2/brand/<brand>/*.json` in `source`. Style
Dictionary resolves `source` **over** `include`, so a tier-1-shaped token
authored in a brand directory overrides the shared primitive **for that brand's
bundle only**.

Proven empirically (scratch build, southleft, 2026-07-28):

| Bundle | `--al-typography-preset-16` |
|---|---|
| `brand/tokens-southleft-dark.css` (scratch override → `{font-size.14}`) | `400 0.875rem/1.25rem IBM Plex Sans, sans-serif` |
| `brand/tokens-northright-dark.css` (control) | `400 1rem/1.5rem IBM Plex Sans, sans-serif` |
| `theme/tokens-dark.css` (control) | `400 1rem/1.5rem IBM Plex Sans, sans-serif` |

Containment confirmed: no other bundle moved.

### Why here and not somewhere else

Three options were on the table:

| Option | Verdict |
|---|---|
| **(a) tier-1-shaped overrides in `tier-2/brand/<brand>/`** | **CHOSEN.** Works today, no build-machinery change, contained to one bundle. Bends tier discipline — hence this document. |
| (b) reinstate a `tier-3/brand/<brand>/` layer | Rejected. The glob was deliberately removed one spec ago (`tokens-config.v5.mjs:294-303`), and putting **tier-1** primitives in **tier-3** inverts the tier numbering — more confusing, not less. It would also need a `tokens-config.v5.mjs` edit, which G8 watches. |
| (c) rewrite the 26 `al-theme-typography-*` mixins to consume tier-2 | Rejected — explicitly out of scope for this spec, and it changes every component's compiled output. Worth doing later; it is the only fix that makes tier-2 typography live. |

To keep the exception loud, per-brand primitive overrides live in a file named
**`typography-primitives.json`**, never `typography.json`. Anything in a file
named `typography.json` under `tier-2/brand/` would be inert.

### What a preset override can and cannot change

`formatTypographyValue` (`tokens-config.v5.mjs:45-49`) emits only

```
<font-weight> <font-size>/<line-height> <font-family>, sans-serif
```

**`letterSpacing` and `textDecoration` are dropped.** Overriding
`letter-spacing.*` in a preset composite is inert — verified in the same
scratch build (`{letter-spacing.1}` produced no tracking in the output). Do not
use tracking as a brand lever through presets.

Consequence of the mixin hardcoding `--al-typography-preset-16`: under
branding, `preset.N` names a **slot** ("the body-md slot"), not a literal size.
northright's `preset.16` legitimately renders at 14px.

Preset → mixin traffic, so you know which presets are worth overriding:

| Preset | Tier-2 role | Component call sites |
|---|---|---:|
| `preset.14` | `body-sm` | 19 |
| `preset.16` | `body-md` | 13 |
| `preset.12` | `body-xs` | 11 |
| `preset.18` | `body-lg` | 3 |
| `preset.20` | `heading-sm` | 3 |
| `preset.24` | `heading-md` | 3 |
| `preset.36` | `heading-lg` | 3 |
| `preset.{40,44,48}` | `display-{sm,md,lg}` | 3 each |

---

## 3. Shadows recompute per brand

`tokens/tier-1/shadows.json` colours every drop-shadow stop with
`{theme.color.shadow.default}` — a **tier-2** reference from a tier-1 token
(pre-existing inversion). The `--al-box-shadow-N` literals are therefore
recomputed at build time from whatever `theme.color.shadow.default` resolves to
in that bundle, so a brand can re-tint every shadow by overriding that single
colour token.

---

## 4. Spacing: what a brand may touch

| Token | Owner | Reason |
|---|---|---|
| `theme.space.xxxs` (11) | **brand** | |
| `theme.space.xxs` (50) | **brand** | |
| `theme.space.xs` (88) | **brand** | |
| `theme.space.@` (84) | **brand** | |
| `theme.space.sm` (22) | **density** | hardcoded in `components/theme/theme.scss:21,26,31` |
| `theme.space.md` (5) | **density** | hardcoded in `components/theme/theme.scss:22,27,32` |
| `theme.space.lg` (11) | **density** | hardcoded in `components/theme/theme.scss:23,28,33` |

A `:host([density=…])` declaration on `<al-theme>` outranks the brand bundle's
`:root` block, so brand overrides of `sm`/`md`/`lg` are dead the moment the
`density` attribute is written — which the Storybook preset switcher does for
every preset. Luckily the density axis owns the three least-used spacing
tokens; the four highest-traffic ones are free.

**Rule: a brand set must not contain `theme.space.{sm,md,lg}`.**

---

## 5. Axis ownership summary

| Axis | Owns | Where |
|---|---|---|
| `mode` | `theme.color.background.default`, `theme.color.content.default` | `components/theme/theme.scss:11-17` |
| `density` | `theme.space.{sm,md,lg}` | `components/theme/theme.scss:20-34` |
| `contrast` | `theme.color.border.default` | `components/theme/theme.scss:37-39` |
| `motion` | `theme.animation.duration.{2,4,6,8}` | `components/theme/theme.scss:42-55` |
| `brand` | everything else in §1.1 | `styles/tokens/tier-2/brand/<brand>/*.json` |

---

## 6. The brand contract (R3)

A brand token set lives in
`libs/al-web-components/styles/tokens/tier-2/brand/<brand>/` and may contain:

| File | Token paths | Tier |
|---|---|---|
| `colors.json` | `theme.color.*` | tier-2 semantic |
| `borders.json` | `theme.border.{radius,width}.*` | tier-2 semantic |
| `spacing.json` | `theme.space.{xxxs,xxs,xs,@}` **only** | tier-2 semantic |
| `shadows.json` | `theme.box-shadow.*` | tier-2 semantic |
| `typography-primitives.json` | `typography.preset.N.*` | **tier-1 — the documented exception (§2)** |

Rules:

1. **Reference, never literal.** Every brand value must be a `{…}` reference to
   a tier-1 primitive. If the primitive you need does not exist, add it to
   `tokens/tier-1/*.json` — additively, never renaming or re-valuing an
   existing stop.
2. **Typography goes through tier-1 presets** (§2). A `theme.typography.*`
   override is inert; never write one.
3. **No `theme.space.{sm,md,lg}`** (§4).
4. **No `theme.border.radius.sm`** — zero consumers (§1.2).
5. **Leave `theme.border.radius.round` at 50%** unless you intend square
   avatars, toggles and spinners.
6. **Tracking is not a lever** — `letterSpacing` is dropped by the formatter
   (§2).
7. Register every new file in `tokens/$metadata.json` `tokenSetOrder` (after
   the tier-2 default it overrides) and in the brand's `tokens/$themes.json`
   `selectedTokenSets` as `"enabled"`.
8. `altitude` is the **neutral reference**. It is what an adopter renders with
   no `brand` set, so its bundle must stay byte-identical to the base theme
   bundle apart from additive tokens. Do not give altitude character.

---

## 7. The four brands

| | altitude | northright | odyssey | southleft |
|---|---|---|---|---|
| Archetype | general-purpose reference | dense operational / fintech | airy editorial | high-contrast utilitarian |
| Accent ramp | blue | green | taupe + teal | red |
| Type family | IBM Plex Sans | IBM Plex Sans | Georgia / Cambria serif | ui-monospace / Consolas |
| Body size | 16 / 24 | **14 / 20** | **18 / 28** | 16 / 24 |
| Radius `@` / `lg` | 4 / 8 | **2 / 4** | **12 / 24** | **0 / 0** |
| Border `@` / `md` | 1 / 2 | 1 / 2 | 1 / 2 | **2 / 4** |
| Shadow `@` / `md` | 8 / 16 | **2 / 4** | **16 / 32** | **hard 2 / hard 4** |
| Space `xxs` / `xs` / `@` | 4 / 8 / 16 | **2 / 4 / 8** | **8 / 12 / 24** | 4 / 8 / 16 |
| Non-color axes varied | 0 (by design) | 4 | 5 | 4 |

Rendered side-by-side proof: [`visual-compare/brands.dark.png`](./visual-compare/brands.dark.png),
generated by `scripts/build-brand-compare.mjs` (see §8).

### Webfont decision (Risks #1)

**No new webfont is loaded and none is needed.** `styles/main.scss:11` fetches
IBM Plex Sans and nothing else; `font-family.secondary` (`Agrandir`) has always
been declared-but-never-fetched and still renders as `sans-serif` — it is not
used by any brand here.

Typographic differentiation comes from **size ramp, line-height, weight, and
two system font stacks** (`font-family.mono`, `font-family.editorial`), added
as tier-1 primitives. System stacks give a genuinely different texture —
serif vs. grotesk vs. monospace — with zero bundle cost, no licensing
question, and no FOUT. Procuring a licensed display face is a separate
decision and deliberately not made here.

---

## 8. Verification

```bash
pnpm --filter al-web-components build:tokens
node scripts/check-brand-distinctiveness.js   # token-level assertions
node scripts/build-brand-compare.mjs          # regenerates the side-by-side harness
```

`check-brand-distinctiveness.js` enforces, for the built bundles:

- every pair of brands differs on non-colour properties;
- `--al-theme-border-radius-xs` is present in every bundle (R4);
- no `--al-theme-typography-*` override appears without a matching
  `--al-typography-preset-*` change (the inert-override smell test);
- `altitude` is byte-identical to the base theme bundle for its mode (R12).
