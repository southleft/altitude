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
| `motion` | legacy `theme.animation.duration.{2,4,6,8}` + the `-role-{fast,base,slow}` / `-timing-role-{standard,emphasized}` tokens (spec 2026-08-20-token-axes-expansion) | `components/theme/theme.scss` "motion axis" |
| `shape` | `theme.border.radius.role.{action,control,surface,indicator}` (spec 2026-08-20-token-axes-expansion) | `components/theme/theme.scss` "shape axis" |
| `brand` | everything else in §1.1 | `styles/tokens/tier-2/brand/<brand>/*.json` |

`shape` and the `motion` role tokens are documented in full in
[`AXES.md`](./AXES.md) — that file, not this section, is the source of truth
for how they compose with `brand` (the "brand-as-recipe" rule) and why they
carry no tier-2 `:root` default of their own.

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

## 7. The two brands

Spec `2026-08-20-brand-pruning-and-storybook-de-bloat` cut northright, odyssey,
and the four single-mode showcase brands (meridian, voltage, solstice,
nocturne) down to the two the system actually ships: altitude (the DS's own
neutral reference) and southleft (the playground site's brand).

| | altitude | southleft |
|---|---|---|
| Archetype | general-purpose reference | high-contrast utilitarian |
| Accent ramp | blue | red |
| Type family | IBM Plex Sans | ui-monospace / Consolas |
| Body-md size / leading | 16 / 24 | 16 / **20** |
| Radius `@` / `lg` | 4 / 8 | **0 / 0** |
| Border `@` / `md` | 1 / 2 | **2 / 4** |
| Shadow `@` / `md` | 8 / 16 | **hard-2 / hard-4** |
| Shadow tint | neutral black | **brand red, zero blur** |
| Space `xxs` / `xs` / `@` | 4 / 8 / 16 | 4 / 8 / 16 |
| Non-colour axes varied | 0 (by design) | typography, radius, border-width, shadow |

southleft varies four non-colour axes — one more than R5's floor of three. It
takes weight (border width + zero radius + hard shadow) and keeps altitude's
spacing ladder, so the two brands read as genuinely different identities
rather than a recolour. The altitude-vs-southleft pair is the weakest at 3 of
5 marker properties (the two share the same spacing ladder), which is still
above `check-brand-distinctiveness.js`'s `MIN_MARKERS = 3` floor.

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

**Superseded 2026-08-20** (spec `2026-08-20-southleft-example-app`, T2/T4-2).
Southleft owns the Agrandir + IBM Plex license for southleft.com itself, so
the "no licensed webfont" constraint above no longer applies to the
`southleft` brand specifically (it still holds for `altitude`, which loads no
webfont beyond IBM Plex Sans). `tier-2/brand/southleft/typography-primitives.json`
now points its `display` presets (40/44/48) at `{font-family.secondary}`
(Agrandir) and its `body`/`heading` presets at `{font-family.primary}` (IBM
Plex Sans) instead of `{font-family.mono}`; the southleft brand no longer
carries the system-mono texture. The actual font FILES are self-hosted by the
consuming app (`apps/southleft/public/fonts/`, `@font-face` + `font-display:
swap`), not by the library — `styles/main.scss` still fetches nothing beyond
what it always has, so `altitude`-only consumers see zero bundle-cost change.
Also added: southleft's light "paper" mode (`tokens-config.v5.mjs` `brands`
array, `.storybook/presets.ts` `southleft-light`) — §7's table below predates
this and should be read as the **dark ("ink")** identity only.

---

## 8. Verification

```bash
pnpm --filter @southleft/al-web-components build:tokens
pnpm test:brands        # token-level assertions
pnpm brands:compare     # rendered check + regenerates brands.dark.png
```

`check-brand-distinctiveness.js` enforces, for the built bundles:

- every pair of brands differs on non-colour properties, on at least 3 of the
  5 marker properties (`--al-theme-border-radius`, `--al-theme-space-xs`,
  `--al-theme-space`, `--al-theme-box-shadow`, `--al-typography-preset-16`);
- every expressive brand varies at least 3 non-colour axes vs `altitude`;
- `--al-theme-border-radius-xs` is present in every bundle (R4);
- no `--al-theme-typography-*` override appears without a matching
  `--al-typography-preset-*` change (the inert-override smell test);
- `altitude` is byte-identical to the base theme bundle for its mode (R12).

`build-brand-compare.mjs` additionally fails if the two brands do not resolve
to two *distinct* computed `font` shorthands on the same rendered element —
a CSS-variable diff proves the token moved, only a computed style proves it
reached the component. Measured 2026-07-28 (pre-prune) on `al-button`'s label,
read inside the shadow root:

| Brand | computed `font` |
|---|---|
| altitude | `600 16px/24px "IBM Plex Sans", sans-serif` |
| southleft | `600 16px/20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

Same shape on `al-heading` and `al-input`'s field.

### Resolved 2026-07-28 — the bundle baseline

This section used to say the baseline was stale, had to be recaptured **on
Linux**, and that a Windows build inflated dist files and rewrote 98 unrelated
files with CRLF churn. All three are fixed:

- `.gitattributes` pins the working tree to LF on every platform, so the build
  is byte-reproducible. A Windows capture is now byte-identical to a Linux one
  (verified against a real Linux build: same sha256, all 1022 files equal).
  `capture-bundle-baseline.js` refuses to write a snapshot from a CRLF tree.
- @southleft/al-react's `cp -r … 2>/dev/null || true` steps are now
  `libs/al-react/scripts/copy-dist-assets.mjs`, which fails loudly.
- The CEM and schema emitters normalize `\r` and stable-sort modules, so
  `pnpm --filter @southleft/al-web-components build` is a genuine no-op on a clean tree.

The baseline was recaptured on 2026-07-28 and includes the four `altitude`
bundles. Details: `.altitude/baselines/README.md`.

---

## 9. Adding a new brand — the quick start

> §6 says what a brand token set **may contain**. This section says what you
> **do**, in order, to make `<al-theme brand="yourbrand">` real. Traced against
> the code on 2026-08-23; every path below was verified.
>
> **There is no scaffold.** No plop template, no `scripts/*` generator. The MCP
> tool `altitude_generate_theme` is *not* one — it runs an in-memory OKLCH
> solver (`.altitude/AI-THEME.md`) and writes no files, and its raw hex output
> violates rule 1 below anyway. Adding a brand is a hand edit in ~8 places.
>
> Precedent to copy: `git show 5575fac` added four brands; `git show 02a0900`
> removed six. The union of those two diffs is the checklist.

### 9.0 Before you start — read these three

1. **§1** — the reachability map. Several obvious overrides change nothing.
2. **§6** — the contract's 8 rules. Rule 1 (reference, never literal) and
   rule 8 (`altitude` stays neutral) are gate-enforced.
3. **[`AXES.md`](./AXES.md) §1-2** — a brand look is a *recipe* across axes, not
   one attribute flip, and there are **no per-brand shape/motion files**.

### 9.1 Author the token set

```
libs/al-web-components/styles/tokens/tier-2/brand/<brand>/
  colors.json                  # required
  borders.json                 # optional
  shadows.json                 # optional
  typography-primitives.json   # optional — tier-1 exception (§2)
  spacing.json                 # optional — theme.space.{xxxs,xxs,xs,@} ONLY (§4)
  mode/light/colors.json       # optional — see 9.2
  mode/dark/colors.json
```

Legacy Tokens Studio shape (`value`/`type`, **not** `$value`/`$type` — the DTCG
mirror is generated). Copy `tier-2/brand/southleft/borders.json` for the
canonical form:

```json
{ "theme": { "border": { "radius": {
  "@": { "value": "{border.radius.2}", "type": "borderRadius" } } } } }
```

Every value is a `{…}` reference to a tier-1 primitive (§6 rule 1). If the
primitive you need does not exist, add it **additively** to
`tokens/tier-1/*.json` — never rename or re-value an existing stop.

**Do not create these files for `altitude`.** See
`tier-2/brand/altitude/README.md`: `tokens-altitude-{light,dark}.css` is
asserted byte-identical to the base bundles, so any non-colour file there fails
`test:brands`. Giving altitude character is a re-scope, not a brand edit.

**No `motion.json`, no `shape.json` — and no gate will stop you.** The file
list above is exhaustive: `shape` and `motion` are hand-written host rules in
`theme.scss`, never per-brand files ([`AXES.md`](./AXES.md) §2). Writing
`theme.animation.*` into a brand set makes the axes multiply instead of
compose — 2 brands × 3 shapes × 3 motions — which is the exact thing the
six-independent-dials model exists to prevent.

This one is on you: **it is a review obligation, not a checked rule.**
`check-brand-distinctiveness.js` enforces R4, R5, R7 and R12 only
(`:102, :106, :117, :133, :138, :153, :171`) — none of them look at animation
or shape properties — and no script reads `tier-2/brand/**` to validate which
token paths a brand file touched. A brand that overrides motion **builds and
ships silently**. Verified 2026-08-23: no `dist-v5/scss/host/tokens-brand-*.scss`
partial contains the string `animation`, and all 13 motion tokens resolve
identically across altitude/southleft × light/dark. That is the current state
of an ungated rule, not a guarantee — keep it true.

Contrast this with §9.5's failure mode, which is its mirror image: there, a
brand that does *too little* silently does nothing; here, a brand that reaches
*too far* silently works.

#### The `border-radius-role-*` exception — and an open discrepancy

The rule above is **motion-only**. Shape's role tokens are a different case,
and the difference is not cosmetic:

`southleft/borders.json:32, :36` defines `theme.border.radius.role-surface`
and `role-action`, and they emit as real `:host([brand='southleft'])`
declarations (`dist-v5/scss/host/tokens-brand-southleft.scss:30-31`). So a
brand setting shape role radii is shipped, working precedent — do not read the
motion rule as forbidding it.

**But it contradicts a stated invariant, and someone should decide which one
is right.** `theme.scss:196-207` says the shape role tokens have no tier-2
`:root` default and "exist ONLY as the direct `:host` declarations below",
concluding that with no `shape` attribute the fallback wins "so `default` shape
is byte-identical in EVERY brand, not just altitude." That conclusion does not
hold for southleft: with `shape` unset its `role-action` is *present*, so
`var(--role, var(--legacy))` resolves to it rather than to southleft's own
`--al-theme-border-radius`.

Measured 2026-08-23 — computed values at an element inside each brand's
`<al-theme>` on the built site:

| brand | `shape` | `role-action` | `role-surface` | legacy radius |
|---|---|---|---|---|
| altitude | unset | *absent* | *absent* | 4px |
| altitude | `pill` | 999px | 999px | 4px |
| altitude | `sharp` | 0px | 0px | 4px |
| southleft | **unset** | **999px** | **4px** | **2px** |
| southleft | `pill` | 999px | 999px | 2px |
| southleft | `sharp` | 0px | 0px | 2px |

Read the `southleft / unset` row against `altitude / unset`: the role tokens
are meant to be absent there. Southleft's actions render at 999px while its own
legacy radius is 2px. Note that `shape="pill"` is a no-op on `role-action`
specifically (999px → 999px) but **not** wholly a no-op — `role-surface` still
moves 4px → 999px. The word "partial" is doing real work.

Two readings, both defensible, not resolved here:

- **Deliberate** — pill actions are southleft's identity, and the `theme.scss`
  comment's "EVERY brand" is simply overstated and should be narrowed.
- **Accidental** — the role entries predate the shape axis and quietly opted
  southleft out of it, in which case they belong in `theme.border.radius.@`/`-lg`
  instead.

Flagged rather than fixed: it is a design call about southleft's identity, not
a docs edit. If you are adding a brand today, the safe path is to express radii
through `theme.border.radius.{@,md,lg}` and leave `role-*` to the `shape` axis —
you get the same look with no invariant to argue about.

### 9.2 The per-mode escape hatch

A brand's top-level `colors.json` is **theme-independent by construction** — the
same file builds against both the light and dark includes, so a value there
lands in the mode-invariant `:host([brand='x'])` block. For a value that must
flip with `mode` (a neutral canvas, a paper/ink pair), put it in
`tier-2/brand/<brand>/mode/<theme>/colors.json`.

The nesting is load-bearing. The top-level glob (`tokens-config.v5.mjs:474`) is
deliberately **non-recursive**; the mode file is picked up only by the explicit
`existsSync` check at `tokens-config.v5.mjs:476-478`. Rationale: the comment at
`tokens-config.v5.mjs:451-472`. Precedent: southleft's light "paper" mode.

### 9.3 Register with Tokens Studio (both files)

- `tokens/$metadata.json` → `tokenSetOrder`: one entry per file, placed **after
  the tier-2 default it overrides** (existing brand rows: lines 25-29).
- `tokens/$themes.json` → a new object with `"group": "Tier 2 (Brand)"`. Copy
  the `Southleft` entry: dependencies are `"source"`, the brand's own sets are
  `"enabled"`.

**Known gap, inherited:** `southleft/mode/{light,dark}/colors.json` are in
neither file. They build correctly (Style Dictionary reads them directly) but
the Tokens Studio round-trip does not see them. Mirror the omission or fix it —
just know it is a gap, not a convention.

`tokens-dtcg/` needs no edit: `scripts/convert-tokens-to-dtcg.js` mirrors the
tree recursively, so a new directory appears on its own.

### 9.4 The one config edit

`libs/al-web-components/styles/tokens-config.v5.mjs:589-602` — the `brands`
array is **hardcoded**, one entry per brand × mode you intend to ship:

```js
const brands = [
  { theme: 'light', brand: 'altitude' },
  { theme: 'dark',  brand: 'altitude' },
  { theme: 'dark',  brand: 'southleft' },
  { theme: 'light', brand: 'southleft' },
  { theme: 'dark',  brand: '<brand>' },   // <- add
];
```

A brand with no entry for a mode has **no `:host` block for that mode** — under
that mode it renders its mode-invariant identity over the base theme's colours.
That is what the compile-time `PresetBundle` union in `.storybook/presets.ts`
(`presets.ts:33-35`) exists to guard.

### 9.5 Build, then check the emitter actually emitted

```bash
pnpm --filter @southleft/al-web-components build:tokens
ls libs/al-web-components/styles/dist-v5/css/brand/tokens-<brand>-*.css
ls libs/al-web-components/styles/dist-v5/scss/host/tokens-brand-<brand>*.scss
```

**`components/theme/theme.scss` needs no edit.** It has a single
`@use '../../styles/dist-v5/scss/host'` (`theme.scss:13`), and the emitter
regenerates `host/_index.scss` with the full `@use` list in specificity-correct
order (`tokens-config.v5.mjs:733-745`).

**If the host partial is missing, the brand is a silent no-op.** The emitter
skips an empty delta (`tokens-config.v5.mjs:706, 715-717`) — which is exactly
why there is no `tokens-brand-altitude.scss`. A missing file means your values
resolved identically to the base theme: the attribute will parse and do nothing.

### 9.6 Widen the surface (8 sites)

| # | File:line | Edit |
|---|---|---|
| 1 | `components/theme/theme.ts:39-40` | The brand literal union **and** its JSDoc. This is the source of truth. |
| 2 | `custom-elements.json`, `schemas/al-theme.schema.json:35-42` | **Generated** — do not hand-edit. Run `pnpm --filter @southleft/al-web-components build:custom-elements.json`. |
| 3 | `components/theme-switcher/theme-switcher.ts:16-18, 28-31, 46-50` | SCSS import (from legacy `styles/dist/scss/brand/`, **not** `dist-v5`), the `ThemeKey` union, the `BRANDS` array. |
| 4 | `.storybook/presets.ts:33-35` | `PresetBundle` union — required. |
| 5 | `.storybook/presets.ts:53-56` | `PRESETS` — **read the SCOPE note at `presets.ts:68-88` first.** Appending here also grows `@southleft/al-react`'s toolbar dropdown and puts two brands in a Storybook that documents one. For a brand with its own Storybook, copy the `SOUTHLEFT_PRESETS` pattern (`presets.ts:91-94`) instead. |
| 6 | `libs/altitude-mcp/src/server.mjs:189-196` | The `z.enum([...])` on `altitude_get_tokens`, plus the prose naming the shipped brands. |
| 7 | `libs/al-react/src/components/Theme/Theme.stories.tsx:18, 59` | Storybook control only. `ALThemeProps` derives from the generated wrapper, so the type flows from site 1 — no React source edit. |
| 8 | `.altitude/visual-compare/harness/<brand>.html` | Copy `southleft.html`, swap the single `<link>` to `tokens-<brand>-<mode>.css`. Then add the column to `harness/index.html`. |

### 9.7 Widen the three brand lists in the harnesses

```
.altitude/visual-compare/harness/scoped.js:31-34   const BRANDS = [[id, description], …]
scripts/build-brand-compare.mjs:35                 const BRANDS = ['altitude', 'southleft']
scripts/check-scoped-theming.mjs:49                const BRANDS = ['altitude', 'southleft']
```

`scripts/check-brand-distinctiveness.js` needs **no** edit — it discovers brands
from `readdirSync(dist-v5/css/brand)` (`:87-93`).

### 9.8 Verify

```bash
pnpm --filter @southleft/al-web-components build       # full: dist + css, not just tokens
pnpm --filter @southleft/al-web-components test:tokens
pnpm run test:brands            # distinctiveness — see §8
pnpm run brands:compare         # regenerates .altitude/visual-compare/brands.dark.png
pnpm run test:scoped-theming    # regenerates .altitude/visual-compare/brands.scoped.png
pnpm run gate:token-usage       # no phantom tokens
node scripts/capture-token-baseline.js   # MANDATORY, same PR — AGENTS.md G8
```

The two gates a new brand most often trips:

- **`test:brands`** — the brand must differ from *every* other brand on at least
  3 of the 5 marker properties, and vary at least 3 **non-colour** axes vs
  `altitude`. A colours-only brand fails. It also fails a
  `--al-theme-typography-*` override with no matching `--al-typography-preset-*`
  change (the inert-override smell test, §2).
- **`test:scoped-theming`** — asserts the number of distinct computed
  `--al-theme-color-background-primary-default` values across sibling hosts is
  **exactly** `BRANDS.length` (`check-scoped-theming.mjs:143-146`). A new brand
  that shares a primary background with an existing one fails.

The token baseline is a hard CI gate with no tolerance (`AGENTS.md:62-65`, G8);
procedure in [`TOKENS.md`](./TOKENS.md) § "Rebaselining after a token change".

### 9.9 Optional — register a DS project

**A brand does not need one.** The dependency runs the other way:
`scripts/check-ds-projects.mjs:144-149` (R9) requires every registered project
to *have* a brand token set, not the reverse. A brand on its own already gives
you `<al-theme brand="x">`, the scoped `:host` blocks, and the built bundles.

Add a `.altitude/ds-projects.json` entry only if the brand needs its **own Figma
file parity tracking** and a **scoped docs site** at `/<id>/`. Required fields
(`ds-projects.schema.json:34-42`, `additionalProperties: false`): `id`, `name`,
`brand`, `figma{fileKey,fileName,urlBase}`,
`paths{figmaSyncDir,parityManifest,opsDir}`, `library`, `prompts`. Procedure:
[`DS-PROJECTS.md`](./DS-PROJECTS.md) § "Adding a project". `apps/docs` picks a
new project up with **zero code changes** — enforced by
`pnpm run gate:docs-generalises`.

Note that `llms.txt` derives its brand count from `ds-projects.json`, not from
the token directories, so a brand without a project entry will not appear there.

### 9.10 Finally

Update §7 above (its title and table), `MIGRATION.md` if the brand is
consumer-facing, and add a changeset.
