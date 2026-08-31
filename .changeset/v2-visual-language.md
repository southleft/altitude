---
'@southleft/al-web-components': major
---

v2 visual language: flat, minimal, type-first

The base theme is restyled to the approved "Altitude v2 Components" canvas — hairline
borders on warm paper neutrals, one refined blue, shadows reserved for surfaces that
genuinely float, Public Sans for UI and IBM Plex Mono for the metadata layer. **This
changes how every unbranded consumer renders.** The `southleft` brand is unaffected and
was verified byte-identical on type, hue and shadow tint.

**Typefaces.** `font-family.primary` is now `Public Sans` (was `IBM Plex Sans`), and
`font-family.mono` now leads with `IBM Plex Mono`. `styles/main.scss` fetches both.
IBM Plex Sans is no longer in the base bundle — a new tier-1 primitive
`font-family.plex` pins it so the `southleft` brand keeps its face, and consumers of that
brand must now load it themselves (this repo does so in `apps/southleft` and `apps/docs`).

**Palette.** Five tier-1 ramps are added — `stone` (warm neutrals, one ramp serving both
modes), `cobalt`, `jade`, `ochre`, `crimson` — and every tier-2 semantic colour is
re-pointed onto them in both modes. Nothing existing was renamed or re-valued, so the v1
ramps (`blue`, `green`, `orange`, `red`, `paper`, `ink`, `taupe`) remain for anyone
referencing them directly.

**Shape and elevation.** The default radius moves 4px → 6px (controls), `lg` 8px → 12px
(cards); chips and badges are pills. Four single-stop elevation stops replace stacked
shadows at the semantic layer: cards are flat, and only dialog/drawer/popover/menu/tooltip
carry a shadow.

**Accessibility.** A new gate, `pnpm run check:palette-contrast`, measures 58 real
foreground/background pairings — each traced to the call site that renders it — across
both modes. It found ten failures the existing gates structurally could not see, and all
ten are fixed: `verify-contrast-axis` only exercises the `contrast=` axis against
hardcoded colours, `check-token-usage` proves a token is wired but not that it is legible,
and VRT goes green again the moment baselines are recaptured after a deliberate restyle.

Two consequences worth calling out:

- `content.<hue>-weak` is the ink that sits ON `background.<hue>-default` (26 call sites
  across button/badge/chip/checkbox/radio/calendar), not a muted tint. v2's light-mode
  fills are saturated, so those inks flipped to white — except on `warning`, whose fill is
  a bright amber and keeps dark ink. A brand overriding these must respect that role.
- `contrast="more"` now raises `opacity.disabled` to `1.0` (was `0.8`). The v2 muted ink
  and page are both lighter, and no alpha below 0.96 clears AA on that pairing; the
  default (`contrast` unset, 0.4) is unchanged and still carries the disabled affordance.

**Also:** `tier-2/brand/altitude/colors.json` is deleted. It restated base values, which
stopped being a no-op once the primary role became mode-dependent — its single
mode-agnostic `content.primary-weak` line outranked the mode axis by specificity and
pinned dark ink into the light bundle. Overriding nothing makes the "altitude === base"
guarantee structural rather than maintained; both brand bundles still emit, byte-identical
to base.

Floating labels, the `input-stepper` redesign and the inset-label variant are deliberately
NOT in this release — they are markup/API changes, tracked separately.
