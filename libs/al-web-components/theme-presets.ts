/**
 * The shipped THEME RECIPES — every brand x mode pair the token pipeline emits,
 * plus the vocabulary of the other `<al-theme>` axes.
 *
 * Lived at `.storybook/presets.ts` until 2026-08-25, where it powered the
 * Storybook toolbar. Both Storybooks were deleted; this file was NOT, because
 * two things outside them read it:
 *
 *   * `apps/home/scripts/generate-stats.js` counts `PRESETS` for the homepage's
 *     "recipes shipped" KPI — a number on the public site, generated rather
 *     than hardcoded.
 *   * `story-fixture/src/main.ts` takes the brand and mode the accessibility
 *     sweep renders under, which MUST stay `DEFAULT_PRESET_ID` or every
 *     committed accessibility number silently changes meaning.
 *
 * The Storybook-only `PRESET_TOOLBAR_ITEMS` export went with the toolbar.
 *
 * The brand x mode UNION below is the load-bearing part, and a compile-time
 * guard rather than decoration: `brand` is a `:host` rule, so a brand with no
 * build for a mode has no scoped block for it either, and the pair would render
 * that brand's mode-independent identity over the wrong mode's colours. Keep it
 * in step with the `brands` array in `styles/tokens-config.v5.mjs`.
 */

/** `<al-theme density>` values (`components/theme/theme.scss`). */
export type PresetDensity = 'compact' | 'cozy' | 'comfortable';
/** `<al-theme contrast>` values (`components/theme/theme.scss`). */
export type PresetContrast = 'normal' | 'more';
/** `<al-theme shape>` values. Repoints `theme.border.radius.role.*`. */
export type PresetShape = 'default' | 'sharp' | 'pill';
/** `<al-theme motion>` values. `reduced` still wins under OS `prefers-reduced-motion` unless `full` is set. */
export type PresetMotion = 'full' | 'reduced' | 'expressive';

/**
 * The brand x mode pairs the token pipeline emits, from the `brands` array in
 * `styles/tokens-config.v5.mjs`. This is a compile-time guard: `brand` is a
 * `:host` rule, so a brand with no build for a mode has no scoped block for it
 * either, and the pair would render that brand's mode-independent identity over
 * the wrong mode's colours.
 */
export type PresetBundle =
  | { brand: 'altitude'; mode: 'light' | 'dark' }
  | { brand: 'southleft'; mode: 'light' | 'dark' };

export type Preset = PresetBundle & {
  /** Stable id — the value stored in `globals.alPreset`. Do not rename casually. */
  id: string;
  /** Toolbar label. */
  label: string;
  /** OPTIONAL. Omitting it and writing `comfortable` are equivalent; `compact` / `cozy` shrink from there. */
  density?: PresetDensity;
  /** OPTIONAL. `contrast="normal"` matches no rule, so only `'more'` is worth setting. */
  contrast?: PresetContrast;
  /** OPTIONAL. `shape="default"` matches no rule, so only `'sharp'` / `'pill'` are worth setting. */
  shape?: PresetShape;
  /** OPTIONAL. `motion="full"` matches no rule, so only `'reduced'` / `'expressive'` are worth setting. */
  motion?: PresetMotion;
};

/** The two modes of the reference brand. Counted by the homepage's recipes KPI. */
export const PRESETS: Preset[] = [
  { id: 'altitude-light', label: 'Light', brand: 'altitude', mode: 'light' },
  { id: 'altitude-dark', label: 'Dark', brand: 'altitude', mode: 'dark' },
];

/** Named ids, so a consumer selecting a mode never hardcodes the string. */
export const LIGHT_PRESET_ID = 'altitude-light';
export const DARK_PRESET_ID = 'altitude-dark';

/**
 * The default. `altitude` + `dark` reproduces the baseline: `main.scss` already
 * puts the altitude-dark `:root` block on screen through `style#al-theme-sheet`.
 */
export const DEFAULT_PRESET_ID = DARK_PRESET_ID;

// ---------------------------------------------------------------------------
// SOUTHLEFT
// ---------------------------------------------------------------------------
// `PRESETS` above is the REFERENCE brand only. The pairs below are Southleft's,
// kept in their own array so the two are countable and selectable separately.
//
// WHY A SEPARATE ARRAY RATHER THAN TWO MORE ENTRIES IN `PRESETS`:
// originally because the Storybook toolbars rendered `PRESETS` directly, so
// appending here would have put two brands in a Storybook that documented one.
// Those toolbars are gone (2026-08-25), but the split still earns its keep:
// `PRESETS` is what the homepage counts as "recipes shipped" for the REFERENCE
// brand, and folding Southleft in would change a published number to mean
// something else. A consumer that wants everything imports `ALL_PRESETS`.
//
// NOTE `PRESETS[0]` is LIGHT and looks like the default. It is not:
// `DEFAULT_PRESET_ID` is DARK, and reading the array order instead cost a full
// re-measure of the accessibility baseline once already.

/** The two modes of the Southleft brand. */
export const SOUTHLEFT_PRESETS: Preset[] = [
  { id: 'southleft-light', label: 'Light', brand: 'southleft', mode: 'light' },
  { id: 'southleft-dark', label: 'Dark', brand: 'southleft', mode: 'dark' },
];

/** Named ids for the Southleft modes. */
export const SOUTHLEFT_LIGHT_PRESET_ID = 'southleft-light';
export const SOUTHLEFT_DARK_PRESET_ID = 'southleft-dark';

/**
 * The SL default. Dark, because southleft.com's own canvas is the warm `ink`
 * neutral and that is the identity the brand is recognised by.
 */
export const SOUTHLEFT_DEFAULT_PRESET_ID = SOUTHLEFT_DARK_PRESET_ID;

/** Every shipped recipe, across brands. Lookup surface for `getPreset`. */
export const ALL_PRESETS: Preset[] = [...PRESETS, ...SOUTHLEFT_PRESETS];

/**
 * Resolve a `globals.alPreset` value, falling back to `fallbackId`.
 *
 * The lookup spans `ALL_PRESETS`, and ids are unique across both arrays, so one
 * resolver serves either brand. `fallbackId` defaults to `DEFAULT_PRESET_ID`; a
 * Southleft caller passes `SOUTHLEFT_DEFAULT_PRESET_ID` so an unrecognised value
 * lands on a Southleft recipe rather than silently on Altitude.
 */
export function getPreset(id: unknown, fallbackId: string = DEFAULT_PRESET_ID): Preset {
  const found = typeof id === 'string' ? ALL_PRESETS.find((p) => p.id === id) : undefined;
  return found ?? ALL_PRESETS.find((p) => p.id === fallbackId) ?? PRESETS[0];
}
