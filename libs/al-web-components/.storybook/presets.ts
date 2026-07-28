/// <reference types="vite/client" />
//
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
 * array at `styles/tokens-config.v5.mjs:335-341`. Odyssey and Southleft are
 * deliberately dark-only; naming `{ brand: 'southleft', mode: 'light' }` in
 * `PRESETS` is a *compile* error rather than a runtime 404 on a bundle.
 *
 * Adding a light build for those brands belongs to
 * `2026-07-28-complete-brand-build-matrix`, not here.
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
   * OPTIONAL, and omitted on purpose for most presets.
   *
   * `:host([density])` hardcodes `--al-theme-space-{sm,md,lg}`
   * (`components/theme/theme.scss:20-34`) and those hardcodes do NOT match the
   * emitted bundle: the bundle ships `sm: 0.75rem / md: 1.25rem / lg: 1.5rem`
   * (`styles/dist/scss/theme/tokens-dark.scss:265-268`) while
   * `density="comfortable"` writes `0.75 / 1 / 1.5rem`. So writing
   * `density="comfortable"` is NOT a no-op — it silently shrinks
   * `--al-theme-space-md`. A preset that leaves `density` undefined renders
   * exactly what the bundle says. See `.altitude/BRANDS.md` §4.
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

/**
 * Every brand bundle, keyed by module specifier, pulled in with one glob
 * instead of six import lines. Two reasons this is a glob and not
 * `import x from '../styles/dist/scss/brand/…?inline'`:
 *
 *   1. Adding a preset stays a genuinely ONE-LINE change (R1) — no second
 *      edit to add an import and wire it into the entry.
 *   2. `styles/dist/` is a GITIGNORED BUILD ARTIFACT
 *      (`libs/al-web-components/.gitignore:7`) that does not exist in a fresh
 *      clone. A static `?inline` import of a missing file is an unhandleable
 *      Vite "failed to resolve import" that takes the whole preview down; a
 *      glob that matches nothing just yields `{}`, which lets
 *      `presetTokens()` throw the actionable message below instead (R6).
 */
const BUNDLES = import.meta.glob('../styles/dist/scss/brand/*.scss', {
  query: '?inline',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Module specifier of the bundle a preset needs. */
export function presetBundleSpecifier(preset: PresetBundle): string {
  return `../styles/dist/scss/brand/tokens-${preset.brand}-${preset.mode}.scss`;
}

/**
 * The raw `:root { --al-*: … }` CSS text for a preset.
 *
 * Throws with an actionable message when the build artifact is missing (R6).
 * `.storybook/main.ts` runs the same check in Node before the dev server
 * boots, so this is the second line of defence, not the first.
 */
export function presetTokens(preset: Preset): string {
  const specifier = presetBundleSpecifier(preset);
  const css = BUNDLES[specifier];
  if (typeof css !== 'string') {
    throw new Error(
      [
        `[al-storybook] No token bundle for preset "${preset.id}" (${preset.brand}/${preset.mode}).`,
        `  Expected: libs/al-web-components/styles/dist/scss/brand/tokens-${preset.brand}-${preset.mode}.scss`,
        `  styles/dist/ is a gitignored BUILD ARTIFACT — a fresh clone does not have it.`,
        ``,
        `  Fix:  pnpm --filter al-web-components build:tokens`,
        ``,
        `  Bundles currently resolved: ${Object.keys(BUNDLES).length === 0 ? '(none)' : Object.keys(BUNDLES).map((k) => k.split('/').pop()).join(', ')}`,
        `  If the file really is not emitted, the brand x mode pair is not in the`,
        `  \`brands\` array at styles/tokens-config.v5.mjs:335-341.`,
      ].join('\n'),
    );
  }
  return css;
}

/** Resolve a `globals.alPreset` value, falling back to the default. */
export function getPreset(id: unknown): Preset {
  const found = typeof id === 'string' ? PRESETS.find((p) => p.id === id) : undefined;
  return found ?? PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? PRESETS[0];
}

/** Toolbar items, derived — never hand-written (R2). */
export const PRESET_TOOLBAR_ITEMS = PRESETS.map((p) => ({ value: p.id, title: p.label }));
