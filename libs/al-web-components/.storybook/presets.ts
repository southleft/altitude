// The Storybook theme preset — brand + mode, as one named tuple.
//
// A preset is nothing more than a NAMED TUPLE OF VALUES `<al-theme>` already
// accepts. No "preset" concept exists in the token layer, the emitter, the DTCG
// source, or the component API — the tuples live here and nowhere else. Both
// Storybooks read this one array: the web-components manager renders it as a
// light/dark toggle (`.storybook/manager.js`), al-react renders it as a
// toolbar dropdown, and both share the `withPreset` decorator shape.
//
// SCOPE: this list is deliberately just Altitude light and Altitude dark.
// Storybook documents the design system; it is not the showcase for every
// brand x axis combination the token pipeline can emit. Other brands
// (southleft) and the density / contrast / shape / motion axes are still fully
// supported by `<al-theme>` and are documented in `.altitude/AXES.md` and
// `.altitude/BRANDS.md` — they are just not toolbar switches.

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

/** The two modes of the reference brand. Order matters: `manager.js` toggles between index 0 and 1. */
export const PRESETS: Preset[] = [
  { id: 'altitude-light', label: 'Light', brand: 'altitude', mode: 'light' },
  { id: 'altitude-dark', label: 'Dark', brand: 'altitude', mode: 'dark' },
];

/** Ids the mode toggle flips between, so `manager.js` never hardcodes a string. */
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
// The SCOPE note at the top of this file still holds for the ALTITUDE
// Storybook: its toolbar is altitude-light / altitude-dark and nothing else.
// The pairs below exist for the SECOND Storybook (`.storybook-sl/`, port
// 6007), which documents the same components under the `southleft` brand.
//
// WHY A SEPARATE ARRAY RATHER THAN TWO MORE ENTRIES IN `PRESETS`:
// `manager.js` does not read `PRESETS` as a list at all — it imports
// `LIGHT_PRESET_ID` / `DARK_PRESET_ID` and toggles between those two strings
// (`manager.js:212-220`), and al-react renders `PRESET_TOOLBAR_ITEMS`, which is
// `PRESETS.map(...)`. So appending here would silently grow al-react's dropdown
// to four entries and put two brands in a Storybook that documents one. Keeping
// `PRESETS` byte-identical means every existing consumer — `manager.js`,
// `preview.ts`, `with-preset.ts`, al-react's dropdown — is provably unchanged,
// and the SL config opts in explicitly by importing the `SOUTHLEFT_*` names.
//
// (The earlier `PRESETS[0]` / `PRESETS[1]` reading of "manager toggles between
// index 0 and 1" is not what the code does; it is id-based. Either way, an
// append would have been the risky move.)

/** The two modes of the Southleft brand. Consumed only by `.storybook-sl/`. */
export const SOUTHLEFT_PRESETS: Preset[] = [
  { id: 'southleft-light', label: 'Light', brand: 'southleft', mode: 'light' },
  { id: 'southleft-dark', label: 'Dark', brand: 'southleft', mode: 'dark' },
];

/** Ids the SL mode toggle flips between (`.storybook-sl/manager.js`). */
export const SOUTHLEFT_LIGHT_PRESET_ID = 'southleft-light';
export const SOUTHLEFT_DARK_PRESET_ID = 'southleft-dark';

/**
 * The SL default. Dark, because southleft.com's own canvas is the warm `ink`
 * neutral and that is the identity the brand is recognised by.
 */
export const SOUTHLEFT_DEFAULT_PRESET_ID = SOUTHLEFT_DARK_PRESET_ID;

/** Every preset either Storybook can select. Lookup surface for `getPreset`. */
export const ALL_PRESETS: Preset[] = [...PRESETS, ...SOUTHLEFT_PRESETS];

/**
 * Resolve a `globals.alPreset` value, falling back to `fallbackId`.
 *
 * The lookup spans `ALL_PRESETS` so the one shared `withPreset` decorator can
 * serve both Storybooks; ids are unique across the two arrays, so for every
 * value the Altitude Storybook can produce this returns exactly what it
 * returned before. `fallbackId` defaults to `DEFAULT_PRESET_ID` — the SL
 * preview passes `SOUTHLEFT_DEFAULT_PRESET_ID` so an unrecognised global there
 * lands on a Southleft preset rather than silently on Altitude.
 */
export function getPreset(id: unknown, fallbackId: string = DEFAULT_PRESET_ID): Preset {
  const found = typeof id === 'string' ? ALL_PRESETS.find((p) => p.id === id) : undefined;
  return found ?? ALL_PRESETS.find((p) => p.id === fallbackId) ?? PRESETS[0];
}

/** Toolbar items, derived — never hand-written. Consumed by al-react's dropdown. */
export const PRESET_TOOLBAR_ITEMS = PRESETS.map((p) => ({ value: p.id, title: p.label }));
