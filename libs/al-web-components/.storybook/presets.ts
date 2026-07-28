// Curated theme presets for the Storybook toolbar.
// Spec: 2026-07-28-storybook-preset-toolbar-switcher.
//
// A preset is nothing more than a NAMED TUPLE OF VALUES `<al-theme>` already
// accepts (`brand` + `mode` + `density` + `contrast`). No "preset" concept
// exists in the token layer, the emitter, the DTCG source, or the component
// API — the tuples live here and nowhere else. Both the toolbar dropdown
// (`preview.ts` -> `globalTypes.alPreset`) and the decorator
// (`with-preset.ts`) read this one array.
//
// ADDING A PRESET — append one entry to `PRESETS`. Everything else (the
// toolbar item, the decorator, the docs table) is derived. The `brand` + `mode`
// pair must have an emitted bundle; the `PresetBundle` union below is the
// compile-time guard for that. Full docs: `.storybook/docs/THEMING.mdx`.

/** `<al-theme density>` values (`components/theme/theme.scss:20-34`). */
export type PresetDensity = 'compact' | 'cozy' | 'comfortable';
/** `<al-theme contrast>` values (`components/theme/theme.scss:37-39`). */
export type PresetContrast = 'normal' | 'more';

/**
 * The brand x mode pairs the token pipeline actually emits, from the `brands`
 * array in `styles/tokens-config.v5.mjs`. Odyssey and Southleft are
 * deliberately dark-only; naming `{ brand: 'southleft', mode: 'light' }` in
 * `PRESETS` is a *compile* error rather than a runtime surprise.
 *
 * Still a compile-time guard now that `brand` is a `:host` rule: a brand with
 * no build for a mode has no scoped block for it either, so the pair would
 * render the brand's mode-independent identity over the wrong mode's colours.
 */
export type PresetBundle =
  | { brand: 'altitude'; mode: 'light' | 'dark' }
  | { brand: 'northright'; mode: 'light' | 'dark' }
  | { brand: 'odyssey'; mode: 'dark' }
  | { brand: 'southleft'; mode: 'dark' };

export type Preset = PresetBundle & {
  /** Stable id — the value stored in `globals.alPreset`. Do not rename casually. */
  id: string;
  /** Toolbar label. */
  label: string;
  /**
   * OPTIONAL. `comfortable` no longer needs to be avoided: it used to write
   * `--al-theme-space-md: 1rem` where the bundle says 1.25rem, so naming the
   * axis at its own default silently reflowed the story. That rule is gone
   * (`components/theme/theme.scss`) — the base ramp IS comfortable — so
   * `density` is now safe to write on any preset. Omitting it and writing
   * `comfortable` are equivalent; `compact` / `cozy` shrink from there.
   */
  density?: PresetDensity;
  /** OPTIONAL. `contrast="normal"` matches no rule, so only `'more'` is worth setting. */
  contrast?: PresetContrast;
};

/**
 * The curated list. Six entries — one per emitted brand x mode bundle, so this
 * list stays legibly parallel with `BRANDS` in
 * `components/theme-switcher/theme-switcher.ts:51-58`.
 *
 * The density/contrast choices are not decoration: each one is the axis that
 * matches that brand's archetype in `.altitude/BRANDS.md` §7, so the two
 * host-only axes are demonstrated by the brands they actually suit.
 *   - northright is the "dense operational" brand -> `density: 'compact'`.
 *   - southleft is the "high-contrast utilitarian" brand -> `contrast: 'more'`.
 *   - odyssey is "airy editorial" and already ships a wider space ramp of its
 *     own; a density attribute would only fight it (it can *only* shrink
 *     space-md), so it is left off.
 */
export const PRESETS: Preset[] = [
  { id: 'altitude-dark', label: 'Altitude · Dark', brand: 'altitude', mode: 'dark' },
  { id: 'altitude-light', label: 'Altitude · Light', brand: 'altitude', mode: 'light' },
  { id: 'northright-dark', label: 'Northright · Dark · Compact', brand: 'northright', mode: 'dark', density: 'compact' },
  { id: 'northright-light', label: 'Northright · Light · Compact', brand: 'northright', mode: 'light', density: 'compact' },
  { id: 'odyssey-dark', label: 'Odyssey · Dark', brand: 'odyssey', mode: 'dark' },
  { id: 'southleft-dark', label: 'Southleft · Dark · High contrast', brand: 'southleft', mode: 'dark', contrast: 'more' },
];

/**
 * The default. `altitude` + `dark` reproduces today's baseline: `main.scss:7`
 * (`@use './dist/scss/theme/tokens-dark.scss'`) already puts the altitude-dark
 * `:root` block on screen through `style#al-theme-sheet`, and
 * `brand/tokens-altitude-dark.scss` is byte-identical to
 * `theme/tokens-dark.scss` (asserted by `check-brand-distinctiveness.js`).
 */
export const DEFAULT_PRESET_ID = 'altitude-dark';

// `presetTokens()` / `presetBundleSpecifier()` and the `import.meta.glob` over
// `../styles/dist/scss/brand/*.scss` lived here until
// `2026-07-28-scoped-token-emission-brand-wiring`. They existed for one reason:
// `brand` could only be delivered by swapping a whole `:root` stylesheet,
// because no `:host([brand])` rule existed. Now the emitter writes those rules
// into `<al-theme>`'s own styles, the decorator sets one attribute, and there
// is nothing to glob — so they are gone rather than left as dead coupling to a
// gitignored artifact.

/** Resolve a `globals.alPreset` value, falling back to the default. */
export function getPreset(id: unknown): Preset {
  const found = typeof id === 'string' ? PRESETS.find((p) => p.id === id) : undefined;
  return found ?? PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? PRESETS[0];
}

/** Toolbar items, derived — never hand-written (R2). */
export const PRESET_TOOLBAR_ITEMS = PRESETS.map((p) => ({ value: p.id, title: p.label }));
