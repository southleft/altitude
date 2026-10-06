# Preset axes — six token-driven axes, and the brand-as-recipe rule

> **Scope.** The six `<al-theme>` axes — `brand`, `mode`, `density`,
> `contrast`, `shape`, `motion` — and how each is expressed as DTCG tokens.
> `shape` and `motion` were added by spec `2026-08-20-token-axes-expansion`,
> modeled on southleft/figma's "Hyper Token" collections (Shape, Motion,
> Appearance). Since 2026-10 density/contrast/motion/shape are mode files under
> `styles/tokens-dtcg/tier-2/axis/` rather than hand-written CSS (§2). The
> motion system built on the motion axis is [`MOTION.md`](./MOTION.md).
> Companion to [`BRANDS.md`](./BRANDS.md) (what a `brand` may override) and
> [`TOKENS.md`](./TOKENS.md) (the pipeline itself).

## 1. The rule: a brand LOOK is a recipe, never one attribute flip

`<al-theme>` now carries six axes: `brand`, `mode`, `density`, `contrast`,
`shape`, `motion`. Each is independent — setting one never implies or
constrains another — and every combination is legal. A **preset**
(`libs/al-web-components/theme-presets.ts`) is nothing more than a named tuple
of these six values. There is no seventh "preset" concept anywhere in the token
layer, the emitter, the DTCG source, or the component API; the tuple lives in
`theme-presets.ts` and nowhere else.

(Presets were surfaced as a Storybook toolbar dropdown until **2026-08-25**,
when Storybook was retired. The module moved from `.storybook/presets.ts` to
`libs/al-web-components/theme-presets.ts` and survived because the story fixture
and `apps/home`'s stats generator read it; the toolbar itself has no successor.)

The corollary, and the rule this file exists to state plainly:

> **A brand's identity is brand + mode + density + shape + motion, together.
> Never characterize a brand — or design a new one — by flipping a single
> attribute.**

A brand is not "the brand with 2px corners"; it is the brand PLUS whichever
density/shape/motion values its preset carries, because an
archetype (`.altitude/BRANDS.md` §7) is expressed by the COMBINATION of a
type ramp, a radius scale, AND a spacing choice together. Naming only the
radius would describe a different, thinner idea. See §3 for three worked
recipes that make new combinations (pill+expressive, sharp+compact,
reduced-motion+high-contrast) without touching a single brand file.

## 2. Six axes, all token-driven — and orthogonal, not combinatorial

All six `<al-theme>` axes are now DTCG tokens. `brand` and `mode` were already
token bundles (the per-project stylesheet, `[data-al-mode]`). Since
2026-10 the other four — `density`, `contrast`, `motion`, `shape` — are too:
the literal declarations that used to be hand-written in
`components/theme/theme.scss` now come from **mode files**, and theme.scss
carries no axis value at all.

```
styles/tokens-dtcg/tier-2/axis/
  density/   compact.json   cozy.json        comfortable.json (default)
  contrast/  normal.json (default)            more.json
  motion/    full.json (default)   reduced.json   expressive.json
  shape/     default.json (default) sharp.json    pill.json
```

One directory per axis, one file per attribute value. Every file of an axis
names the same token paths (the paths of the custom properties it sets, e.g.
`theme.space.sm` → `--al-theme-space-sm`), so a canvas tool can import each
directory as ONE variable collection whose modes are the files. The file root
carries `$extensions["org.altitude.axis"] = { axis, attribute, mode, default }`.
Exactly one mode per axis is `default: true`.

The axis directory is deliberately outside every `:root` build
(`tier-2/*.json` is a non-recursive glob): an axis is a scoped override, and
two of them carry role tokens that must never get a `:root` default (§2.3).

### 2.0 How a mode file becomes CSS

`styles/tokens-config.v5.mjs` ("`<al-theme>` axes") resolves each mode file
against the dark `:root` sources and writes:

| Output | What it is |
|---|---|
| `styles/dist-v5/scss/host/axis/<axis>.scss` | The `:host([…])` rules for that axis. Unlayered; theme.scss loads all four with `meta.load-css()` inside its own `@layer al.theme` block, so the compiled component CSS is byte-identical to the hand-written rules it replaced. Not mirrored into `styles/dist/`, exactly like the brand/mode host partials. |
| `styles/dist-v5/axes.json` → `styles/dist/axes.json` → published `dist/css/axes.json` (`@southleft/al-web-components/axes.json`) | The manifest: per axis, its modes, the default, every token's resolved value in every mode (CSS name, DTCG path, `$type`, whether it is emitted), and the exact rules emitted. Baselined by `.altitude/baselines/tokens/snapshot.json`. |

What a mode file cannot say — which selector a mode is written under, and in
what order — lives in the emitter's `AXES` table, because order is
load-bearing (§2.2). The table today:

| Axis | Rules, in source order | Default mode emits |
|---|---|---|
| density | `[density='compact']`, `[density='cozy']` | nothing — `comfortable` is the `:root` ramp |
| contrast | `[contrast='more']`, `:not([contrast='more'])` (= `normal`) | `normal`, under `:not(…)` |
| motion | `[motion='reduced']`, `[motion='expressive']`, `@media (prefers-reduced-motion: reduce) :not([motion='full'])` (reduced's durations only), `[motion='full']` | `full`, under `[motion='full']` |
| shape | `[shape='sharp']`, `[shape='pill']` | nothing — role tokens stay undeclared (§2.3) |

A token can override how it is emitted with
`$extensions["org.altitude.axis"].css`:

- `"initial"` — emit the guaranteed-invalid value so the component's
  `var(--role, var(--legacy))` fallback resolves. `$value` then records what
  that fallback resolves to, so an importer still sees a real value.
- `"omit"` — emit nothing; the property inherits or falls back. Used by every
  `shape/default` token, pill's `indicator`, and the motion `transition`
  composites (design-tool data, see `.altitude/MOTION.md`).

`generate:token-metadata` preserves this extension verbatim.

**Guards in the build** (each fails `build:tokens`): a mode file on disk with no
`AXES` entry or vice versa; a non-default mode with no rule (it could never
apply); zero or two default modes; a default mode whose plain value differs
from what `:root` emits (this replaced the "MUST track tier 2" comment the
motion block used to carry); a value that is neither a literal nor one whole
alias; and motion use cases that disagree with the `al-motion-transition()`
mixin. `check-css-layers.js` lints the partials (0,3,0 budget, no `:root`, must
stay unlayered, must be loaded inside theme.scss's layer), and
`gate:token-usage` counts their declarations through `axes.json`.

**Importer contract.** Collection = `tokens-dtcg/tier-2/axis/<axis>/`; mode =
file name; default = the file whose root extension says `default: true`;
variables = the token paths, named by the usual `--al-<path>` rule (`@` is
dropped). A mode may be **sparse**: `contrast/normal.json` does not name
`theme.color.border.neutral-default`, meaning "the base value applies" (in
`axes.json` that mode's value is `null`). Values resolve against the default
brand in dark mode; `currentColor` (contrast `more`) is a CSS keyword with no
DTCG colour form. Durations are DTCG `duration` strings (`0.2s`), easings DTCG
`cubicBezier` arrays, transitions DTCG `transition` composites.

### 2.0.1 Why no per-brand axis files

`styles/tokens-dtcg/tier-2/brand/<brand>/` (the brand contract, `BRANDS.md`
§6) has no `shape` or `motion` entry and never should: adding one would make
the axes multiply (2 brands × 3 shapes × 3 motions = a combinatorial file
explosion) instead of compose. The axis rules are brand-agnostic by
construction — a direct `:host` declaration beats inheritance whatever the
brand — and only the FALLBACK path is brand-aware. Six axes stay six
independent dials. (The specificity budget forbids combining them anyway:
`:host([brand][mode])` already sits on the 0,3,0 ceiling.)

### 2.1 Shape (`<al-theme shape="default|sharp|pill">`)

Four ROLE tokens, one per usage category a component's border-radius falls
into:

| Role | Meaning | Components wired so far |
|---|---|---|
| `--al-theme-border-radius-role-action` | buttons, interactive controls | `button.scss` |
| `--al-theme-border-radius-role-control` | form control boxes | `checkbox.scss` (outer box) |
| `--al-theme-border-radius-role-surface` | containers | `card.scss`, `dialog.scss`, `popover.scss`, `accordion.scss` |
| `--al-theme-border-radius-role-indicator` | avatars, badge dots | `avatar.scss`, `badge.scss` |

`default` (no `shape` attribute) is intentionally NOT "the role tokens at
their own baseline value" — **the role tokens have no tier-2 `:root`
definition at all.** A wired component reads:

```scss
border-radius: var(--al-theme-border-radius-role-action, var(--al-theme-border-radius));
```

With no `shape` set, `--al-theme-border-radius-role-action` is genuinely
absent from the cascade, so the CSS fallback (`var()`'s second argument)
resolves — the SAME per-brand token the component read before it adopted the
role token. That token is already brand-aware, so `shape="default"` costs
nothing: every brand renders byte-identical to before — except a brand that
sets a role token itself (southleft does; `BRANDS.md` records the
contradiction). `shape/default.json`
still gives each role a `$value` (the most common fallback: `{theme.border.radius.@}`,
or `.round` for `indicator`) marked `css: "omit"`, so an importer has a default
column; the real fallback is chosen per call site.

`sharp` and `pill` set the role tokens directly, using tier-1
`{border.radius.0}` / `{border.radius.pill}` (`999px`, clamped by the CSS
`border-radius` algorithm to a true stadium — deliberately NOT
`border-radius.round`, which is `50%` and draws an ellipse on anything that
isn't square).

`indicator` (avatar, badge dot) is left out of `pill` (`css: "omit"`): those
elements already resolve to `50%`, and layering a 999px pill radius on an
already-circular element is a no-op. `sharp` DOES square `indicator` (a square
avatar is a legitimate shape statement at the brutalist end of the axis).

### 2.2 Motion (`<al-theme motion="full|reduced|expressive">`)

Seven tokens per mode — the legacy tier-2 pair and five ROLE tokens — plus four
use-case composites (`.altitude/MOTION.md`):

| Token | Meaning |
|---|---|
| `--al-theme-animation-duration` / `-long` | legacy pair, still read by components that predate the roles, and the roles' fallback |
| `--al-theme-animation-duration-role-fast` | micro-interactions |
| `--al-theme-animation-duration-role-base` | typical transitions |
| `--al-theme-animation-duration-role-slow` | large surface open/close |
| `--al-theme-animation-timing-role-standard` | default easing |
| `--al-theme-animation-timing-role-emphasized` | emphasis easing |

| Mode | Durations (legacy, fast/base/slow) | Easing roles |
|---|---|---|
| `full` (default) | 0.2s / 0.4s; roles `initial` → fall back to the legacy pair | `initial` → fall back to `theme.animation.timing` |
| `reduced` | all `0s` | `initial` (moot at 0s) |
| `expressive` | 0.2s / 0.4s; roles 0.3s / 0.6s / 0.8s | tier-1 `spring` |

OS `prefers-reduced-motion` still wins over an explicit `motion="expressive"`
choice exactly as it wins over the unset default — only `motion="full"` opts
back in. That is why the `full` rule must come AFTER the media rule: both are
0,2,0, so source order decides. `expressive` is a decorative upgrade, not a
licence to override the user's OS preference.

**Every explicit motion value asserts the COMPLETE token set**, even where a
value equals the default. Custom properties inherit, so a nested `<al-theme>`
that declared only part of the set would silently adopt the rest from its
ancestor. Before this was made complete, `reduced > full` stayed frozen at 0s
(the documented accessibility opt-back-in was inert under any nesting),
`expressive > full` kept the ancestor's spring curves, and `reduced >
expressive` animated on the role tokens but stayed frozen on the legacy pair.
An UNSET `motion` still inherits deliberately: absent means "no opinion".

Role tokens reset with `initial`, not a concrete value: it computes to the
guaranteed-invalid value, so `var(--role, var(--legacy))` takes its fallback —
precisely the "genuinely absent" state §2.3 requires. The legacy pair cannot do
that (`unset` on a custom property means `inherit`, i.e. the ancestor's zero),
so `full` restates it from tier 1; the build checks that restatement equals
`:root`. (`scripts/verify-motion-axis.mjs` was written to prove the nesting
cases in a browser, but it targets Storybook stories that no longer exist and
cannot run as written.)

### 2.3 Why role tokens have no tier-2 `:root` default

The first draft gave role tokens a tier-2 default that SELF-REFERENCED the
brand-aware legacy token (e.g. `theme.border.radius.role.action:
{theme.border.radius.@}`, i.e. `--al-theme-border-radius-role-action:
var(--al-theme-border-radius)` in `:root`). It looked right in the generated
CSS text and it is wrong: a browser resolves an INHERITED custom property's
`var()` reference ONCE, at the element that declares it — `:root` — and what
inherits down the tree is the already-resolved VALUE, not a live formula
that re-evaluates per descendant. Every brand's `<al-theme brand="x">` would
therefore inherit `:root`'s own (altitude) resolution of
`--al-theme-border-radius`, silently discarding the brand's own override.

Proven live, not just reasoned about: with the self-referencing draft,
`getComputedStyle(host).getPropertyValue('--al-theme-border-radius-role-action')`
read a stale value on `<al-theme brand="southleft">` while
`--al-theme-border-radius` on the SAME host correctly read the brand's own
value — the role token had gone brand-blind. (Motion's role tokens happened to
be safe with the same pattern, because no brand touches `theme.animation.*` —
but the same fallback pattern applies to both for one predictable rule.)

The fallback pattern (`var(--role-token, var(--legacy-token))`) sidesteps
the whole class of bug. The role token only ever gets a value from a DIRECT
`:host([shape=…])` / `:host([motion=…])` declaration — never through
inheritance-of-a-formula — so it is either genuinely absent (fallback wins) or
freshly, directly asserted (role token wins). This is also why the axis mode
files sit outside every `:root` build, and why a `default`-mode role token's
`$value` is importer data, never emitted.

### 2.4 Density (`<al-theme density="compact|cozy|comfortable">`)

Owns `theme.space.{sm,md,lg}` (`.altitude/BRANDS.md` §4-5): compact 4/8/12px,
cozy 8/12/16px, comfortable 12/20/24px. `comfortable` is the `:root` ramp, so
it has no rule — naming the default costs nothing. (It used to have one that
wrote `--al-theme-space-md: 1rem` while the bundle said `20px`, so the axis
could not be written at its own default without reflowing the page.)

Known inconsistency, preserved for byte-identity: the `:root` ramp is emitted
in `rem` (`0.75rem`), the compact/cozy overrides in `px`, exactly as the
hand-written rules were. They agree at a 16px root font size only.

### 2.5 Contrast (`<al-theme contrast="normal|more">`)

`more` is a real, user-facing remedy for the low-vision case, offered as an
explicit opt-in. WCAG 2.x SC 1.4.3/1.4.11 exempt disabled UI from contrast
requirements; axe flags them anyway, and the accessibility report measures the
DEFAULT (`contrast` unset), which `more` does not move.

`theme.opacity.disabled` is where those findings concentrate (component call
sites dim disabled content instead of switching colour). On the v2 palette the
worst realistic pairing — `field-note.scss`'s disabled text,
`content.default-weak` over `background.default-weak` — needs alpha ≥ 0.96 to
reach 4.5:1, so `more` uses `{opacity.100}`:

| alpha | 0.40 | 0.80 | 0.90 | 1.00 |
|---|---|---|---|---|
| light (`#6E6B60` on `#F7F6F3`) | 1.72:1 | 3.34:1 | 4.04:1 | 4.94:1 |
| dark (`#A5A399` on `#131311`) | 2.41:1 | 5.11:1 | 6.16:1 | 7.35:1 |

Full opacity means disabled content under `more` no longer reads as dimmed —
the intended trade for an explicit opt-in. Verified behaviourally by
`scripts/verify-contrast-axis.mjs`.

`normal` is emitted under `:host(:not([contrast='more']))`, NOT
`[contrast='normal']`: `<al-theme>` never reflects its default to the
attribute, so a `[contrast='normal']` rule would only match a hand-written
attribute, and a bare inner `<al-theme>` nested inside `contrast="more"` would
inherit the raised value with nothing to override it (reproduced live).

`theme.color.border.neutral-default` has NO reset, which is why
`contrast/normal.json` is sparse. The token varies by mode AND brand and every
consumer reads it with no `var()` fallback, so neither remedy works: `initial`
would leave consumers with CSS's own initial value (`transparent` for
`background-color` — dividers would vanish), and a restated value would bake
one brand+mode's colour into every other (the §2.3 bug). The real fix is a
role token with a fallback at every consumer — out of scope. Measured: `more`
is already a no-op for this property on any branded, moded host, because the
0,3,0 brand+mode partial outranks `[contrast='more']` (0,2,0).

## 3. Recipe presets — RETIRED 2026-08-25

This section used to document three named "recipe" presets
(`altitude-dark-playful`, `altitude-dark-brutalist`, `southleft-dark-calm`) that
demonstrated the six axes composing. **They no longer exist**, and nothing
replaced them.

They were entries in `.storybook/presets.ts`, whose only consumer was the
Storybook toolbar dropdown. When Storybook was retired on 2026-08-25 the module
moved to `libs/al-web-components/theme-presets.ts` and was reduced to the brand ×
mode pairs its two surviving readers actually need — the story fixture's render
axes and `apps/home`'s "recipes shipped" count. What ships today is four pairs
with no extra axes:

| array | ids |
|---|---|
| `PRESETS` | `altitude-light`, `altitude-dark` (`DEFAULT_PRESET_ID` is **dark**, not `PRESETS[0]`) |
| `SOUTHLEFT_PRESETS` | `southleft-light`, `southleft-dark` |
| `ALL_PRESETS` | all four |

The claim §1 makes is unaffected: a preset is still nothing but a named tuple of
axis values, and composing `shape` / `motion` / `density` / `contrast` still costs
no brand file, component variant, or CSS bundle — you write the attributes on
`<al-theme>` directly. There is simply no curated list of example combinations
any more.

## 4. AI theme engine (`theme-engine/`)

`engine.ts`'s `buildTheme()` already derives a `RADIUS_SCALES` /
`MOTION_SCALES` tuple per personality (`personalities.ts`) and writes it as
tier-1 primitive overrides (`--al-border-radius-N`, `--al-animation-duration-N`).
This spec APPENDS (does not change any exported signature) a second set of
writes, using the SAME already-computed tuple, into the new role token names
— so an AI-derived theme drives `shape`/`motion`-wired components exactly as
if an authored `shape`/`motion` preset had. Because `apply.ts` writes the AI
palette as literal (already-resolved) inline values directly onto every live
`<al-theme>` element, none of the inheritance/self-reference trap in §2.3
applies here: an inline literal value inherits correctly as-is, and an inline
declaration on `<al-theme>` itself always outranks its own `:host` rules —
consistent with the documented "AI theme stacks on top of the preset" behavior.
(That behavior was demonstrated by `.storybook/with-preset.ts` and
`.storybook/manager.js`; both went with Storybook on 2026-08-25. The cascade
reasoning above is a property of the CSS, not of those files, so it still holds
— there is just no longer a decorator you can read it off.)

(The engine moved out of `.storybook/ai-theme/` to `libs/al-web-components/
theme-engine/` on 2026-08-23 so it is actually built, declared and exported;
the file names referenced above are unchanged, only their directory is.)

`role.control` and `role.surface` both take the personality's `lg` radius
stop (matching the fallback every wired component reads); `role.duration.fast`
and `role.easing.emphasized` reuse the closest existing personality stop
rather than inventing a value with no design input behind it — the
personality scales don't carry a distinct "extra fast" duration or a second
easing curve today.

## 5. Tests

> **The preset-parity checker was deleted with Storybook on 2026-08-25** (it
> drove two running Storybooks through every preset and compared their toolbars,
> host attributes and computed brand tokens). Nothing replaced it, so the
> shape/motion assertions described below are **no longer executed anywhere**.
> Kept as the record of what was proved and how. `pnpm test:brands`,
> `pnpm test:scoped-theming` and `pnpm test:contrast-axis` are the axis-related
> checks that still run.

The retired checker — `AXES` included `shape` and
`motion`; the per-preset computed-style comparison added `radiusRoleAction`
(host) and `buttonRadius` (the real, rendered `al-button` border-radius,
proof the fallback chain reaches an actual component, not just the host's
own custom property) plus `durationRoleSlow`. `scripts/test-tokens-contract.js`
is generic (byte/name/value stability over whatever the pipeline emits) and
needed no axis-specific change — only a rebaseline
(`.altitude/baselines/tokens/snapshot.json`) for the five new tier-1 leaves
(`--al-border-radius-pill`, `--al-animation-duration-{1,3}`,
`--al-animation-timing-{emphasized,spring}`).

**Axes as tokens (2026-10).** Moving density/contrast/motion/shape into
`tokens-dtcg/tier-2/axis/` was verified as a no-op on the shipped CSS: the
compressed compile of `components/theme/theme.scss` is byte-identical before
and after, and every pre-existing file under `styles/dist-v5/` is unchanged.
The token snapshot moved only by the new `axes.json` manifest (it is
mirrored into `styles/dist/`, so the snapshot now baselines every axis value
in every mode). `pnpm test:scoped-theming` and `pnpm test:contrast-axis`
exercise the emitted rules in a browser; for motion and shape the byte-identical
compile is the evidence.
