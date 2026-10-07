---
title: Motion
description: Token-driven component motion in OpenPencil — transitions between variants, Motion modes, canvas preview, and CSS export.
---

# Motion

Motion describes how a component moves between its variant states: a button that darkens on hover, a panel that expands, a dialog that fades in. OpenPencil stores it as a **motion spec** on a component set and reads its timing from **motion role tokens**, so code stays the source of truth and the canvas expresses it.

Motion is component-state motion. It is not a prototyping system: there are no frame connections, flows, or timelines.

## Concepts

A motion spec is a list of **transitions**. Each transition has:

- **Trigger** — what starts it: Hover, Press, Focus, Expand, Enter, Exit, or Variant change.
- **Target variant** — the variant values it moves to, such as `State=Hover`. Leave it on **Automatic** to pick the variant whose value names the trigger (`Hover`, `Pressed`, `Focused`, `Expanded`, `Open`…).
- **Use case** — which duration and easing roles it reads:

  | Use case | Duration role | Easing role | Typical properties |
  |---|---|---|---|
  | Hover | fast | standard | `background-color`, `border-color`, `color`, `box-shadow` |
  | Expand | base | standard | `height`, `transform` |
  | Overlay | slow | standard | `opacity`, `transform` |
  | Emphasis | base | emphasized | a one-off attention change |

- **Animated properties** — the CSS properties that interpolate. Anything else that differs between the two variants changes immediately, as a CSS property without a transition does.

Duration and easing follow the use case's role tokens by default. Bind a transition to a specific duration or easing variable only when the design system has no role for it.

## Motion tokens and modes

Role tokens are found by name: a variable whose path ends in `animation/duration/role/<fast|base|slow>` or `animation/timing/role/<standard|emphasized>`. Importing Altitude's tokens ([design tokens](/programmable/design-tokens)) creates them in the **Tier 2 | Motion** collection with three modes:

| Mode | fast | base | slow | easing |
|---|---|---|---|---|
| Full | 200 ms | 200 ms | 400 ms | `cubic-bezier(0.15, 0.99, 0.18, 0.99)` |
| Reduced | 0 ms | 0 ms | 0 ms | — (instant) |
| Expressive | 300 ms | 600 ms | 800 ms | spring `cubic-bezier(0.34, 1.56, 0.64, 1)` |

Switch the active mode from the Motion section or the Variables panel; every transition re-times immediately. Without role tokens, OpenPencil uses the Full values.

## The Motion section

Select a component set, one of its variants, or an instance. The **Motion** section in the Design panel lists the transitions that govern it:

- **+** adds a transition for the next unused trigger with that trigger's usual properties.
- The wand suggests transitions from the set's variant values (for example, `Hover` and `Pressed` variants produce Hover and Press transitions).
- **Motion mode** switches the active mode of the collection that holds the role tokens.
- Each transition shows its resolved timing, for example `200 ms · fast`, or **Instant** in Reduced mode.

Edits are written to the component set as single undo steps. An instance shows its component set's motion read-only, with a **Play** button that plays the transition on that instance and returns it to its variant.

## Previewing on the canvas

Turn on **Motion preview** with the play-circle button at the end of the toolbar. While it is on:

- Hovering an instance plays its Hover transition; moving away reverses it.
- Holding the mouse button plays Press; a click toggles Expand (or Enter when there is no Expand transition).
- Panning and zooming keep working. Selecting and dragging are paused.

The instance interpolates opacity, colors (including token-bound colors, resolved in the instance's modes), position, size, corner radii, stroke weights, padding, gap, and shadows towards the target variant over the resolved duration and easing. Values the instance overrides keep their override. Previews never change the document: nothing enters undo history, and leaving preview restores every instance exactly.

When the operating system asks for reduced motion, or animations are turned off in Settings, previews are instant — the same outcome as the Reduced mode.

## Export

HTML/CSS export writes a `transition` declaration on each variant and instance, expanded per use case with each role token's fallback, the same way Altitude's `al-motion-transition()` mixin does:

```css
transition:
  background-color
    var(--al-theme-animation-duration-role-fast, var(--al-theme-animation-duration))
    var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing)),
  opacity
    var(--al-theme-animation-duration-role-slow, var(--al-theme-animation-duration-long))
    var(--al-theme-animation-timing-role-standard, var(--al-theme-animation-timing));
```

The fallback comes from the token itself: a role token that is omitted from CSS in a mode aliases its fallback there. Transition composites such as `theme.animation.transition.hover` are never emitted as custom properties — their `var()` references would resolve once at `:root` and freeze nested themes at full-motion timing.

The spec itself travels as a `data-op-motion` design fact, so importing the HTML back restores the triggers, target variants, and token bindings. In `.fig` files the spec is stored as OpenPencil plugin data on the component set.

## Agents and scripts

Agents use `set_motion`, `get_motion`, and `preview_motion` ([MCP tools](/programmable/mcp-server#motion)). For Altitude, `bun run motion:defaults <altitude-root>` prints the motion each component contract implies, and `--into <file.fig>` applies it to matching component sets.
