# Preset axes — orthogonal shape/motion, and the brand-as-recipe rule

> **Scope.** The `shape` and `motion` axes added to `<al-theme>` by spec
> `2026-08-20-token-axes-expansion`, modeled on southleft/figma's "Hyper
> Token" collections (Shape, Motion, Appearance) and adapted to Altitude's
> tier-1/tier-2/brand pipeline. Companion to [`BRANDS.md`](./BRANDS.md) (what
> a `brand` may override) and [`TOKENS.md`](./TOKENS.md) (the pipeline
> itself).

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

## 2. Orthogonal, not combinatorial — no per-brand shape/motion files

The two axes below are **hand-written host rules in `theme.scss`**, exactly
like `density` and `contrast` before them (T4.4) — never a generated
per-brand file, never a `brand+shape` combination file. `styles/tokens-dtcg/tier-2/brand/<brand>/`
(the brand contract, `BRANDS.md` §6) has no `shape` or `motion` entry and
never should: adding one would make the two axes multiply
(2 brands × 3 shapes × 3 motions = a combinatorial file explosion) instead of
compose. Six axes stay six independent dials.

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
resolves — the SAME per-brand token (`--al-theme-border-radius` /
`-lg` / `-round`) the component read before it adopted the role token. That
token is already brand-aware (`styles/dist-v5/scss/host/tokens-brand-*.scss`
restates it per brand), so `shape="default"` costs nothing: every brand
renders byte-identical to before this spec, not just `altitude`.

`sharp` and `pill` set the role tokens DIRECTLY, as `:host([shape=…])`
declarations in `theme.scss`, using tier-1 literals
(`--al-border-radius-0` / `--al-border-radius-pill`, the latter a NEW tier-1
primitive: `999px`, clamped by the CSS `border-radius` algorithm to a true
stadium/pill shape on a rectangle — deliberately NOT the existing
`--al-border-radius-round` primitive, which is `50%` and produces an ellipse
on anything that isn't square). A direct `:host` declaration always wins over
inheritance, so `sharp`/`pill` overrides every brand uniformly — brand-agnostic
by construction, exactly what "no per-brand shape file" requires.

`indicator` (avatar, badge dot) is deliberately left out of `pill`: those
elements already resolve to `50%` (a true circle via `border-radius-round`),
and layering a 999px pill radius on an already-circular element is a
no-op — omitting the declaration says that plainly rather than restating a
value that changes nothing. `sharp` DOES square `indicator` (a square avatar
is a legitimate shape statement at the brutalist end of the axis), matching
how `sharp` squares every other role.

### 2.2 Motion (`<al-theme motion="full|reduced|expressive">`)

Extends the T4.4 two-state axis (`full` / `reduced`, the `prefers-reduced-motion`
fallback) with a third, decorative state. Five ROLE tokens:

| Token | Meaning |
|---|---|
| `--al-theme-animation-duration-role-fast` | micro-interactions |
| `--al-theme-animation-duration-role-base` | typical transitions |
| `--al-theme-animation-duration-role-slow` | large surface open/close |
| `--al-theme-animation-timing-role-standard` | default easing |
| `--al-theme-animation-timing-role-emphasized` | emphasis easing |

Same no-tier-2-default / fallback pattern as shape (§2.3 explains why), wired
so far in `accordion-panel.scss` (`base` + `standard`, its expand/collapse
and hover transitions) and `dialog.scss` / `popover.scss` (`slow` +
`standard`, their open/close). `expressive` lengthens the durations and
swaps in a new tier-1 spring curve (`--al-animation-timing-spring`,
`cubic-bezier(0.34, 1.56, 0.64, 1)` — the same curve the AI theme engine's
`personalities.ts` already uses for its `springy` motion preset, reused
rather than inventing a second spring). `reduced` still zeroes the role
durations, and OS `prefers-reduced-motion` still wins over an explicit
`motion="expressive"` choice exactly as it already won over the unset
default — only `motion="full"` opts back in. This is a deliberate
accessibility-first choice: `expressive` is a decorative upgrade, not a
license to override the user's OS preference.

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
`--al-theme-border-radius`, silently discarding the brand's own
`:host([brand='x'])` override.

Proven live, not just reasoned about: with the self-referencing draft,
`getComputedStyle(host).getPropertyValue('--al-theme-border-radius-role-action')`
read a stale value on `<al-theme brand="southleft">` while
`--al-theme-border-radius` on the SAME host correctly read the brand's own
value — the role token had gone brand-blind. (Motion's role tokens happened to be safe
with the same self-reference pattern, because no brand ever touches
`theme.animation.*` — but the fix applies the same fallback pattern to both
axes for one predictable rule instead of two.)

The fallback pattern (`var(--role-token, var(--legacy-token))`) sidesteps
the whole class of bug: the legacy token is STILL restated directly, per
brand, in `tokens-brand-*.scss` (unchanged by this spec), so the fallback
always resolves against the correct brand. The role token only ever gets a
value from a DIRECT `:host([shape=…])` / `:host([motion=…])` declaration —
never through inheritance-of-a-formula — so it is either genuinely absent
(fallback wins) or freshly, directly asserted (role token wins). No third
state, no brand-blindness.

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
