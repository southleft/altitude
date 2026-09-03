/**
 * Shared, hand-audited data for the token `$extensions` metadata pipeline:
 *   - scripts/generate-token-metadata.mjs (writes styles/tokens-dtcg/**.json)
 *   - scripts/check-token-metadata.mjs    (gate — uuid stability, replacement integrity)
 *   - scripts/codemod-deprecated-tokens.mjs (consumes `replacement` to find/fix call sites)
 *
 * Spec: 2026-08-22-token-debt-and-machine-readable-metadata (R7/R8/R9).
 *
 * Every table below is one of exactly three kinds, and the kind matters —
 * it is what keeps this data honest at 552+ tokens instead of fabricated:
 *
 *   1. STRUCTURAL — `TYPE_CSS_PROPERTIES` / `TYPE_CSS_PROPERTY_ROOTS` /
 *      `otherTypeCssProperties()`. An authored `cssType` legally maps to a
 *      fixed set of CSS properties. This is a fact about the TYPE, not
 *      invented per token, and not claiming any token is ACTUALLY used on
 *      every property
 *      in its list (that's what the observed-usage corroboration in
 *      generate-token-metadata.mjs checks separately).
 *
 *   2. FAMILY-LEVEL — `FAMILY_USAGE_RULES`. Authored once per family (the
 *      immediate parent path shared by a set of sibling tokens — e.g. every
 *      token under `theme.color.background` is one family) and inherited by
 *      every member. ~72 families across ~552-555 tokens is the number the
 *      spec itself estimates as tractable; per-token prose at that count is
 *      not. A family with nothing distinctive to say is OMITTED, not filled
 *      with boilerplate — `generate-token-metadata.mjs` falls back to no
 *      `org.primer.llm` extension at all rather than synthesizing one.
 *
 *   3. VERIFIED LIFECYCLE — `KNOWN_LIFECYCLE`. A short, closed list of
 *      individually-checked deprecations, each carrying the evidence that
 *      makes it true (cross-referenced against a `check-token-usage.mjs`
 *      run and the actual `styles/dist/` artifacts, both re-verified when
 *      this file was written — see the `reason` field on each entry).
 *      Nothing is marked deprecated by pattern-matching a family; every
 *      entry here was looked up individually. `replacement` values are
 *      dot-paths that MUST resolve to a real token — enforced by
 *      `check-token-metadata.mjs`.
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. STRUCTURAL — type -> legal CSS surface
// ---------------------------------------------------------------------------

/**
 * Concrete CSS property names for the PUBLIC `cssProperties` allow-list
 * (`$extensions["com.salesforce.styling"].cssProperties`).
 *
 * Keyed by the AUTHORED `cssType`
 * (`$extensions["org.altitude.token"].cssType`), NOT by DTCG `$type`.
 * That is deliberate and load-bearing: DTCG's `$type` vocabulary is coarse by
 * design — `sizing`, `spacing`, `borderRadius`, `borderWidth`, `fontSizes` and
 * `lineHeights` all collapse into `dimension` — so keying this table on `$type`
 * would strip 163 of 555 tokens of any usable allow-list. See
 * `scripts/lib/dtcg-token.mjs` for the two-types-per-token model.
 *
 * The keys below ARE the `cssType` vocabulary. Adding a key here is what makes
 * a new `cssType` value legal.
 */
export const TYPE_CSS_PROPERTIES = {
  color: [
    'color',
    'background-color',
    'background',
    'border-color',
    'border',
    'outline-color',
    'outline',
    'box-shadow',
    'fill',
    'stroke',
    'text-decoration-color',
    'caret-color',
    'accent-color',
    'text-stroke',
    'scrollbar-color',
  ],
  sizing: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'],
  spacing: ['margin', 'padding', 'gap', 'row-gap', 'column-gap', 'grid-gap', 'top', 'right', 'bottom', 'left', 'inset'],
  borderRadius: ['border-radius'],
  // Includes the border-SIDE shorthands (not just the `border-width` longhand):
  // `border-top: <width> solid <color>` is completely standard CSS, and real
  // usage confirms it — see the honesty audit in the spec's verification
  // section (accordion-panel, banner, dialog, tabs, command-palette and
  // others all set a border-width token on `border-top`/`border-bottom`/
  // `border-block-start` etc., not the bare `border-width` property).
  borderWidth: [
    'border-width',
    'outline-width',
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'border-block',
    'border-block-start',
    'border-block-end',
    'border-inline',
    'border-inline-start',
    'border-inline-end',
    'outline',
  ],
  boxShadow: ['box-shadow'],
  fontSizes: ['font-size', 'font'],
  lineHeights: ['line-height', 'font'],
  fontFamilies: ['font-family', 'font'],
  fontWeights: ['font-weight', 'font'],
  opacity: ['opacity'],
  letterSpacing: ['letter-spacing'],
  textDecoration: ['text-decoration'],
  typography: ['font'],
};

/**
 * Broader ROOT match used only internally, to corroborate observed usage
 * (a component writing `border-top-color: var(--al-theme-color-...)` should
 * count as within-allow-list for a `color` token even though
 * `border-top-color` is not spelled out in the concrete list above). Never
 * written to the public extension — that stays the concrete list, which is
 * the honest, reviewable surface.
 */
export const TYPE_CSS_PROPERTY_ROOTS = {
  color: ['color', 'background', 'border', 'outline', 'box-shadow', 'fill', 'stroke', 'text-decoration', 'caret-color', 'accent-color'],
  sizing: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height', 'flex-basis', 'inset'],
  spacing: ['margin', 'padding', 'gap', 'top', 'right', 'bottom', 'left', 'inset'],
  borderRadius: ['border-radius'],
  borderWidth: ['border-width', 'outline-width'],
  boxShadow: ['box-shadow'],
  fontSizes: ['font-size', 'font'],
  lineHeights: ['line-height', 'font'],
  fontFamilies: ['font-family', 'font'],
  fontWeights: ['font-weight', 'font'],
  opacity: ['opacity'],
  letterSpacing: ['letter-spacing'],
  textDecoration: ['text-decoration'],
  typography: ['font'],
};

/**
 * `cssType: "other"` is the escape hatch (animation duration/timing/distance,
 * z-index): unlike every other cssType it cannot be resolved without also
 * knowing the token's path.
 */
export function otherTypeCssProperties(pathStr) {
  if (pathStr.includes('animation.duration')) return ['animation-duration', 'transition-duration'];
  if (pathStr.includes('animation.distance')) return ['transform'];
  if (pathStr.includes('animation.timing')) return ['animation-timing-function', 'transition-timing-function'];
  if (pathStr.startsWith('z-index')) return ['z-index'];
  return [];
}
export function otherTypeCssPropertyRoots(pathStr) {
  if (pathStr.includes('animation.duration')) return ['animation-duration', 'transition-duration'];
  if (pathStr.includes('animation.distance')) return ['transform'];
  if (pathStr.includes('animation.timing')) return ['animation-timing-function', 'transition-timing-function', 'animation', 'transition'];
  if (pathStr.startsWith('z-index')) return ['z-index'];
  return [];
}

// ---------------------------------------------------------------------------
// 2. FAMILY-LEVEL — org.primer.llm usage rules, authored once per family
// ---------------------------------------------------------------------------

const TIER1_SCALE = (label) =>
  `Tier-1 ${label} primitive scale. Has no design meaning of its own, only its position in the ` +
  `ramp — consumed exclusively through tier-2 semantic aliases (theme.*). Do not read one of ` +
  `these directly from component code.`;

/**
 * The post-rename tier-1 ramps are named for the ROLE they back, not the hue
 * they happen to be, and run 100 (lightest) -> 900 (darkest).
 */
const roleRamp = (role, purpose) =>
  `Tier-1 "${role}" colour ramp — nine stops, 100 (lightest) to 900 (darkest), backing the ` +
  `${purpose} role. Never referenced directly by a component: always through a tier-2 ` +
  `theme.color.{background,content,border}.${role}-* semantic alias, so a brand can repoint the ` +
  `hue without touching component code.`;

const legacyNeutralRamp = (name, half) =>
  `LEGACY tier-1 "${name}" ramp (the ${half} of the pre-2026-08 split neutral pair). Still ` +
  `emitted for v1 consumers, but referenced by ZERO tier-2 tokens since the role rename — ` +
  `overriding it changes nothing in the semantic layer. Use color.neutral.* instead.`;

const alphaRamp = (role) =>
  `Tier-1 "${role}" alpha overlay scale — a ramp stop at 10/30/60/80% opacity, named ` +
  `<stop>-<alpha> (e.g. 900-60). Used where a semantic token needs a translucent fill (scrims, ` +
  `shadow tints, hover washes) that must sit over arbitrary content. Consumed through tier-2 ` +
  `theme.color.{background.transparent-*, shadow.*} aliases, not read directly.`;

const brandDelta = (brand, ramp) =>
  `Tier-2 BRAND delta: the "${brand}" override of the tier-1 ${ramp} ramp. Lives in ` +
  `tokens-dtcg/tier-2/brand/${brand}/ and is emitted only into that brand's scoped ` +
  `\`:host([brand=${brand}])\` partial — it does not exist in the base :root bundle. Never read ` +
  `directly; the semantic layer above it is identical to the base brand's.`;

const typographyRole = (role, size) =>
  `Tier-2 semantic type-scale entry: the "${role}" role at "${size}" size, with regular/italic/` +
  `underline/bold sub-variants (italic/underline are authored but filtered from emission — see ` +
  `spec's Out of Scope). Consumed as the \`font\` shorthand through the tier-2 Sass mixins (109 ` +
  `call sites across components), not read as a bare custom property in component CSS.`;

const typographyPreset = (size) =>
  `Tier-1 composite preset at ${size}px: bundles fontFamily/fontWeight/fontSize/lineHeight/` +
  `letterSpacing/textDecoration for one physical size. Referenced only by tier-2 ` +
  `theme.typography.* role aliases (body/heading/display) — never read directly by component code.`;

/** family dot-path -> usage string. Omit rather than pad — see file header. */
export const FAMILY_USAGE_RULES = {
  // ---- tier-1 primitive scales (structural rule, parameterized by role) ----
  'animation.distance': TIER1_SCALE('motion-distance'),
  'animation.duration': TIER1_SCALE('motion-duration'),
  'animation.timing': TIER1_SCALE('easing-curve'),
  // PRUNED 2026-09-02 (307106f0 folded them into the theme layer, so these
  // families no longer exist in the tree): `base`, `icon`, `layout.max-width`,
  // `space`, `theme.layout.width`. A rule matching nothing is dead weight that
  // reads as documentation; generate-token-metadata.mjs now warns about them.
  'border.radius': TIER1_SCALE('border-radius'),
  'border.width': TIER1_SCALE('border-width'),
  'box-shadow': TIER1_SCALE('elevation') + ' Composite (x/y/blur/spread/color); the color sub-value resolves to theme.color.shadow, which is itself a dead token (see that family) because formatBoxShadowValue string-bakes the tint at build time.',
  breakpoint: TIER1_SCALE('breakpoint') + ' Consumed by al-scss-vars as Sass breakpoint() function inputs, not as CSS custom properties — do not expect a `--al-breakpoint-*` var() reader.',
  'font-family': TIER1_SCALE('font-family') + ' `primary` is the v2 UI face (Public Sans); `mono` leads with IBM Plex Mono and carries the metadata layer (table headers, token names, timestamps). `plex` exists so the southleft brand can keep IBM Plex Sans after `primary` moved — it is not a face for new work.',
  'font-size': TIER1_SCALE('font-size'),
  'font-weight': TIER1_SCALE('font-weight'),
  'letter-spacing': TIER1_SCALE('letter-spacing') + ' Percentage-authored (Figma’s %); DTCG has no type that fits a percentage-of-font-size dimension, so this family is left deliberately untyped rather than mislabelled `dimension` — see .altitude/TOKENS.md.',
  'line-height': TIER1_SCALE('line-height'),
  opacity: TIER1_SCALE('opacity') + ' 0.40/0.80 are the two steps the contrast axis switches between (theme.opacity.disabled) — 0.80 (opacity.80) was added specifically for the contrast="more" fix.',
  'text-decoration': TIER1_SCALE('text-decoration') + ' Every emitter filters the -italic/-underline typography presets that would carry a non-none value out of the output set, so this family, while typed and derivable, has zero live var() consumers today by design — see the spec’s Out of Scope.',
  'z-index': TIER1_SCALE('stacking-order'),

  // ---- tier-1 color ramps ----
  //
  // RENAMED 2026-09-02. Three commits moved the ramps and every key in this
  // block missed the move: 87863eb0 renamed the hue-named ramps to ROLE names,
  // de6f51ff renumbered them to 100-900 and retired the `color.brand.*`
  // namespace, 307106f0 folded the base/space/icon/layout primitives into the
  // theme layer. The old keys (`color.brand.blue`, `color.neutral.dark`,
  // `color.shadow`, `color.transparent.dark`, `base`, `icon`, `space`,
  // `layout.max-width`, …) matched nothing afterwards, so 19 families / 184
  // tokens got NO `org.primer.llm.usage` at all — and the generator dropped
  // them without a word. `generate-token-metadata.mjs` now FAILS on an
  // unmatched family, so this block can no longer rot quietly.
  'color.danger': roleRamp('danger', 'error/destructive'),
  'color.info': roleRamp('info', 'informational'),
  'color.neutral': roleRamp('neutral', 'surface/ink/hairline') +
    ' ONE ramp serves BOTH modes: light reads it from the top (100 = page, 900 = ink), dark reads it from the bottom. It replaced the split neutral-light/neutral-dark pair — nothing in tier-2 references those two any more.',
  'color.primary': roleRamp('primary', 'brand-primary'),
  'color.secondary': roleRamp('secondary', 'brand-secondary'),
  'color.success': roleRamp('success', 'positive/confirmation'),
  'color.tertiary': roleRamp('tertiary', 'brand-tertiary'),
  'color.warning': roleRamp('warning', 'caution'),

  // Legacy split neutral ramps. Still EMITTED (so a v1 consumer's var() keeps
  // resolving) but referenced by ZERO tier-2 tokens since the role rename —
  // overriding one is a no-op on the semantic layer. Use `color.neutral`.
  'color.neutral-dark': legacyNeutralRamp('neutral-dark', 'ink half'),
  'color.neutral-light': legacyNeutralRamp('neutral-light', 'paper half'),

  // ---- tier-1 alpha overlays ----
  'color.neutral.alpha': alphaRamp('neutral'),
  'color.primary.alpha': alphaRamp('primary'),
  'color.secondary.alpha': alphaRamp('secondary'),
  'color.tertiary.alpha': alphaRamp('tertiary'),
  'color.transparent': 'Tier-1 fully-transparent colour (a single member, transparent.0). Exists so a semantic token can alias "no fill" instead of hard-coding `transparent`, which would break the alias chain. Consumed through theme.color.background.transparent-default.',

  // ---- tier-1 brand deltas (tier-2/brand/southleft) ----
  'color.southleft.primary': brandDelta('southleft', 'primary'),
  'color.southleft.neutral-light': brandDelta('southleft', 'neutral-light'),
  'color.southleft.neutral-dark': brandDelta('southleft', 'neutral-dark'),

  // ---- tier-1 typography presets ----
  'typography.preset.body-xs': typographyPreset(12),
  'typography.preset.body-sm': typographyPreset(14),
  'typography.preset.body-md': typographyPreset(16),
  'typography.preset.body-lg': typographyPreset(18),
  'typography.preset.heading-sm': typographyPreset(20),
  'typography.preset.heading-md': typographyPreset(24),
  'typography.preset.heading-lg': typographyPreset(36),
  'typography.preset.display-sm': typographyPreset(40),
  'typography.preset.display-md': typographyPreset(44),
  'typography.preset.display-lg': typographyPreset(48),

  // ---- tier-2 semantic color roles ----
  'theme.color.background': 'Fill colour for a surface (button/card/panel/etc. background). Legal CSS surface: background-color (mostly), background (shorthand contexts). 60 members spanning default/primary/secondary/tertiary/info/success/warning/danger/inverse/transparent/disabled roles across the altitude+southleft brand deltas and light+dark modes. The disabled-default member is DEPRECATED — see its own `com.atlassian.token` entry; disabled state is expressed via opacity everywhere else in this family, not a colour swap.',
  'theme.color.body': 'Tier-3 theme-level alias: the page canvas background, aliasing theme.color.background.neutral-weak. One member per mode (light/dark).',
  'theme.color.border': 'Border/divider colour. Legal CSS surface: border-color, border, outline-color. 80 members, every semantic family carrying faint/weak/default/strong/bold. inverse-default and secondary-default are currently dead (0 var() readers) per the audit, but NOT marked deprecated here — no evidence either is superseded, only unused; see spec Findings.',
  'theme.color.content': 'Text/icon foreground colour. Legal CSS surface: color, fill, stroke. 82 members, the mirror of theme.color.background. The disabled-default member is DEPRECATED — see its `com.atlassian.token` entry.',
  'theme.color.inverse': 'Tier-2 inverse neutral scale (100-900) — the neutral ramp read from the OPPOSITE end to the current mode, so a surface can be deliberately inverted (dark card on a light page, light tooltip on a dark one) without a component hard-coding which physical ramp end that is. Legal CSS surface: color, background-color, border-color. Nine members per mode.',
  'theme.color.header': 'Tier-3 theme-level alias: the <al-header> background colour, aliasing theme.color.background.neutral-strong. DEAD today (0 var() readers) not because it is redundant but because the header component invented its own --al-header-background hook instead of reading this token — a component bug, not a reason to deprecate the token. See spec Findings.',
  'theme.color.shadow': 'Tier-3/tier-2 theme-level shadow tint alias (theme.color.shadow.default). Structurally unreadable via var() for the same reason as tier-1 color.shadow: formatBoxShadowValue resolves and string-bakes it at build time before any component CSS runs.',
  'theme.icon': 'Icon sizing role scale (xs…lg), aliasing tier-1 icon.*. Legal CSS surface: width, height (both set together on <al-icon>).',
  'theme.layout.height': 'Single member (header) — a hand-authored 80px, not aliased to any tier-1 primitive. Legal CSS surface: height, min-height.',
  'theme.layout.max-width': 'Content-measure scale (xs…xxl), aliasing tier-1 layout.max-width.*. Legal CSS surface: max-width. layout.scss reads this tier directly as of this session (previously bypassed it — see spec Findings "tier bypass").',
  'theme.opacity': 'Single member (disabled): 0.40 at contrast="normal", raised to 0.80 (tier-1 opacity.80) at contrast="more" via a dedicated :host([contrast="more"]) reset — the R3 contrast-axis fix this session. Legal CSS surface: opacity, on any component signalling a disabled state.',
  'theme.size': 'Control heights for interactive form controls (button, input, select, search, stepper) — control-sm 32px / control 40px / control-lg 48px, aliasing tier-1 space.32/40/48. The v2 canvas sizes every control from this scale rather than from padding plus line-height, so a type-scale change cannot silently move a control height. Legal CSS surface: height, min-height, block-size.',
  'theme.space': 'Semantic spacing roles (not a 1:1 alias of the tier-1 space scale — has its own role names). Legal CSS surface: margin, padding, gap.',

  // ---- tier-2 typography roles ----
  'theme.typography.body.lg': typographyRole('body', 'lg'),
  'theme.typography.body.md': typographyRole('body', 'md'),
  'theme.typography.body.sm': typographyRole('body', 'sm'),
  'theme.typography.body.xs': typographyRole('body', 'xs'),
  'theme.typography.display.lg': typographyRole('display', 'lg'),
  'theme.typography.display.md': typographyRole('display', 'md'),
  'theme.typography.display.sm': typographyRole('display', 'sm'),
  'theme.typography.heading.lg': typographyRole('heading', 'lg'),
  'theme.typography.heading.md': typographyRole('heading', 'md'),
  'theme.typography.heading.sm': typographyRole('heading', 'sm'),

  // ---- tier-2 shape/motion/elevation roles ----
  'theme.border.radius': 'Semantic corner-radius roles (xs…lg, round), aliasing tier-1 border.radius.*. Wired into 28/30 component call sites this session via var(--role, var(--legacy)) (R3) — 2 defended exceptions (chip--squared, progress track) documented in the spec’s Completed tasks. Legal CSS surface: border-radius.',
  'theme.border.width': 'Semantic border-width roles, aliasing tier-1 border.width.*. Legal CSS surface: border-width, outline-width.',
  'theme.box-shadow': 'Semantic elevation roles (xs…xl), aliasing tier-1 box-shadow.*. Legal CSS surface: box-shadow.',
  'theme.animation.duration': 'Semantic motion-duration roles, wired into 22 component stylesheets this session via var(--role, var(--legacy)) (R3, full legacy call-site coverage). Legal CSS surface: animation-duration, transition-duration.',
  'theme.animation.timing': 'Single semantic easing-curve role, same var(--role, var(--legacy)) wiring as duration. Legal CSS surface: animation-timing-function, transition-timing-function.',

  // ---- tier-3 ----
  'theme.color': 'Tier-3 theme-level alias layer. Its one member today, focus-ring, is the brand/mode-restatable focus indicator colour (R4, this session) — consumed by the al-focus()/al-focus-inset() mixins as `outline: <width> solid var(--al-theme-color-focus-ring)`. Legal CSS surface: outline, outline-color, border-color.',
};

// ---------------------------------------------------------------------------
// 3. VERIFIED LIFECYCLE — individually-checked deprecations
// ---------------------------------------------------------------------------

/**
 * `file` is relative to `styles/tokens-dtcg/`. `path` is the dot-path within
 * that file. `replacement` is a dot-path INTO THE SAME TREE (may be a
 * different file) that `check-token-metadata.mjs` resolves and asserts
 * exists. `sameProperty: true` means a mechanical var()-name swap on the
 * SAME CSS property is a valid fix (what codemod-deprecated-tokens.mjs will
 * auto-rewrite with --write); `false` means the fix changes CSS property
 * (e.g. colour -> opacity) and must stay a manual/flagged migration.
 */
export const KNOWN_LIFECYCLE = [
  {
    file: 'tier-2/theme/dark/colors.json',
    path: 'theme.color.background.inverse-strong',
    replacement: 'theme.color.background.inverse-default',
    sameProperty: true,
    reason:
      'Byte-identical duplicate of background.inverse-default in the dark-mode build (both alias ' +
      'color.neutral.light.100 — verified in styles/dist/css/theme/tokens-dark.css:402-403) and the ' +
      'default :root export inherits dark, so the shipped tokens.json literally repeats the same ' +
      'value under two names. 0 var() readers in either mode (check-token-usage.mjs).',
  },
  {
    file: 'tier-2/theme/light/colors.json',
    path: 'theme.color.background.inverse-strong',
    replacement: 'theme.color.background.inverse-default',
    sameProperty: true,
    reason:
      'Not a literal duplicate in the light-mode build (aliases color.neutral.dark.800 vs ' +
      'inverse-default’s .900), but the emitted CSS custom-property NAME --al-theme-color-' +
      'background-inverse-strong is shared across both mode files and has 0 var() readers in EITHER ' +
      'mode (check-token-usage.mjs) — the name as a whole is dead, and the dark-mode duplicate above ' +
      'is the evidence that its distinct existence was never load-bearing.',
  },
  {
    file: 'tier-2/theme/dark/colors.json',
    path: 'theme.color.background.disabled-default',
    replacement: 'theme.opacity.disabled',
    sameProperty: false,
    reason:
      'SUPERSEDED, not renamed: disabled state is expressed by `opacity: var(--al-theme-opacity-' +
      'disabled)` at 26 real call sites (grep across libs/al-web-components/components), never by a ' +
      'colour swap. 0 var() readers of this token in either mode (check-token-usage.mjs). The ' +
      'replacement changes CSS PROPERTY (color -> opacity), so this is not a same-shape var() rename ' +
      '— codemod-deprecated-tokens.mjs flags it for manual migration rather than auto-rewriting it.',
  },
  {
    file: 'tier-2/theme/light/colors.json',
    path: 'theme.color.background.disabled-default',
    replacement: 'theme.opacity.disabled',
    sameProperty: false,
    reason:
      'Same finding as the dark-mode entry — disabled state is expressed via opacity, not colour, ' +
      'and this token has 0 var() readers in either mode.',
  },
  {
    file: 'tier-2/theme/dark/colors.json',
    path: 'theme.color.border.disabled-default',
    replacement: 'theme.opacity.disabled',
    sameProperty: false,
    reason: 'Same SUPERSEDED-by-opacity finding as background.disabled-default, for the border role. 0 var() readers (check-token-usage.mjs).',
  },
  {
    file: 'tier-2/theme/light/colors.json',
    path: 'theme.color.border.disabled-default',
    replacement: 'theme.opacity.disabled',
    sameProperty: false,
    reason: 'Same SUPERSEDED-by-opacity finding as background.disabled-default, for the border role. 0 var() readers (check-token-usage.mjs).',
  },
];
