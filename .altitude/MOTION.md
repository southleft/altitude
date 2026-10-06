# Motion system

> How Altitude components move, and which tokens they read to do it. The
> `<al-theme motion>` axis that drives it is [`AXES.md`](./AXES.md) §2.2; the
> token pipeline is [`TOKENS.md`](./TOKENS.md). Everything here is generated
> from or checked against `styles/tokens-dtcg/`.

## The three tiers

| Tier | What | Where it lives | Who reads it |
|---|---|---|---|
| 1 | Raw durations, easing curves, travel distances: `--al-animation-duration-{1,2,3,4,6,8,12}`, `--al-animation-timing-*`, `--al-animation-distance-{sm,md,lg}` | `tokens-dtcg/tier-1/animations.json` (`$type` `duration`, `cubicBezier`, `dimension`) | Nothing in component code. Only tier 2 and the axis mode files alias them. |
| 2 | The ROLES a component reads, set per `<al-theme motion>` mode | `tokens-dtcg/tier-2/axis/motion/{full,reduced,expressive}.json` (plus the legacy pair in `tier-2/animations.json`) | Component stylesheets, via the fallback pattern below or the `al-motion-transition()` mixin. |
| 3 | Multi-element choreography (stagger, coordinated tracks, shared element) | `motion/` — `@southleft/al-web-components/motion` | Components that move more than one element in concert (`MotionController`). |

Easing curves are DTCG `cubicBezier` arrays (`[0.2, 0, 0, 1]`), emitted to CSS
as `cubic-bezier(0.2,0,0,1)`. `ease` and `linear` stay CSS keywords
(`$type: other`) so their emitted value is unchanged.

## Roles

| Role | Token (always read with its fallback) | Use it for |
|---|---|---|
| duration `fast` | `var(--al-theme-animation-duration-role-fast, var(--al-theme-animation-duration))` | hover, press, focus, small reveals (button, tooltip, list-item, select) |
| duration `base` | `var(--al-theme-animation-duration-role-base, var(--al-theme-animation-duration))` | disclosure and in-place change (accordion expand/collapse, toggles) |
| duration `slow` | `var(--al-theme-animation-duration-role-slow, var(--al-theme-animation-duration-long))` | a surface entering or leaving (dialog, drawer, popover, command palette) |
| easing `standard` | `var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing))` | every ordinary transition |
| easing `emphasized` | `var(--al-theme-animation-timing-role-emphasized, var(--al-theme-animation-timing))` | a change that should draw the eye |

The fallback is not optional. The role tokens have no `:root` value (AXES.md
§2.3), so without a `motion` attribute only the fallback resolves. Note `slow`
falls back to `-long`.

| Mode | fast | base | slow | easing |
|---|---|---|---|---|
| `full` (default; also no attribute) | 0.2s | 0.2s | 0.4s | `theme.animation.timing` (`cubic-bezier(0.15,0.99,0.18,0.99)`) |
| `reduced` (and OS reduce, unless `full`) | 0s | 0s | 0s | moot |
| `expressive` | 0.3s | 0.6s | 0.8s | `spring` (`cubic-bezier(0.34,1.56,0.64,1)`) |

## Use cases

Which duration pairs with which easing. Authored once as DTCG `transition`
composites, `theme.animation.transition.<use>` in each motion mode file, so a
design tool importing the tokens gets the same pairings and the right values
per mode; mirrored by `$al-motion-uses` in `styles/core/mixins/motion.scss`.
The token build fails if the two disagree.

| Use case | Duration role | Easing role | Typical properties |
|---|---|---|---|
| `hover` | fast | standard | `background-color`, `border-color`, `color`, `box-shadow` on hover/press/focus |
| `expand` | base | standard | `height`, `grid-template-rows`, chevron `transform` on disclosure |
| `overlay` | slow | standard | `opacity`, `transform`, `translate` on a dialog/drawer/popover entering or leaving |
| `emphasis` | base | emphasized | a one-off attention change (a value that just updated, a selection landing) |

In a component stylesheet:

```scss
@use '../../styles/component' as *;

.al-c-thing { @include al-motion-transition(background-color border-color, hover); }
.al-c-panel { @include al-motion-transition(height, expand); }
.al-c-sheet { @include al-motion-transition(opacity transform, overlay); }
// A role pair the table does not name:
.al-c-other { @include al-motion-transition(opacity, slow, emphasized); }
```

The composites are **never emitted as custom properties**. A
`--al-theme-animation-transition-hover` on `:root` would resolve its `var()`
references once, at `:root`, and every `<al-theme motion="reduced">` below it
would inherit the frozen full-motion value (the AXES.md §2.3 trap). The mixin
expands at the call site instead, where the governing theme's values are in
scope. `gate:token-usage` flags a `var(--al-theme-animation-transition-*)` read
as a phantom for this reason.

## Reduced motion

Two authorities, deliberately not merged:

1. **The axis.** `motion="reduced"` zeroes every duration. Every theme without
   `motion="full"` also gets the same zeros under
   `@media (prefers-reduced-motion: reduce)`. Only `full` opts back in, so a
   decorative `expressive` cannot override the OS preference.
2. **The OS query**, for content no `<al-theme>` governs. The runtime's
   `isReducedMotion(el)` (`motion/reduced.ts`) reads the resolved
   `duration-role-base` at the element first — which encodes the whole axis
   cascade — and only falls back to the media query for unthemed content.

A component that animates with CSS needs nothing else: a 0s duration is an
instant jump to the end state. Never gate motion on the media query in
component CSS; that would ignore `motion="full"`.

## Adding to the system

- **A new duration or curve:** add it to `tier-1/animations.json`, then alias it
  from the motion mode files. Never read a tier-1 motion token from a
  component.
- **A new role:** add it to all three motion mode files (`full` with
  `css: "initial"` and a `$value` aliasing its legacy fallback), then
  `pnpm run generate:token-metadata`, `build:tokens`, and rebaseline.
- **A new use case:** add the composite to all three mode files AND the
  `$al-motion-uses` entry, in the same change.
