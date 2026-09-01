/**
 * Altitude's tier-1 tonal skeleton, measured in OKLCH from the committed
 * token baseline (.altitude/baselines/tokens/snapshot.json).
 *
 * A derived theme re-hues these ramps rather than inventing its own. That is
 * the whole trick: every tier-2/tier-3 semantic token already indirects
 * through `var(--al-color-{primary,secondary,danger,success,warning}-*)` / `var(--al-color-neutral-*)`, so
 * overriding the 36 primitives below re-skins all 48 semantic colour tokens
 * for free — and because the lightness curve is preserved, every semantic
 * pairing keeps the contrast relationship the design system was built on.
 *
 * Ramps run light -> dark as the stop number increases (100 = lightest).
 */

/** L, C and H sampled from the shipped ramps. Index 0 = stop 100. */
export const STOPS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** neutral-light: a paper ramp, deliberately compressed near white. */
export const NEUTRAL_LIGHT_L = [1.0, 0.979, 0.964, 0.958, 0.943, 0.928, 0.921, 0.907, 0.769];

/** neutral-dark: an ink ramp, evenly spread to black. */
export const NEUTRAL_DARK_L = [0.885, 0.757, 0.633, 0.493, 0.348, 0.301, 0.209, 0.173, 0.0];

/** Accent (shipped as brand-blue). Chroma peaks at the 500/600 stops. */
export const ACCENT_L = [0.922, 0.834, 0.758, 0.684, 0.606, 0.551, 0.496, 0.367, 0.162];
export const ACCENT_C = [0.037, 0.082, 0.123, 0.165, 0.213, 0.219, 0.186, 0.171, 0.066];

/** Secondary (shipped as brand-taupe) — a muted companion, low chroma. */
export const SECONDARY_L = [0.951, 0.891, 0.834, 0.765, 0.686, 0.611, 0.513, 0.394, 0.19];
export const SECONDARY_C = [0.02, 0.036, 0.042, 0.047, 0.036, 0.064, 0.063, 0.054, 0.026];

/** The 500 stop is the "brand" value every semantic token points at. */
export const ACCENT_PEAK_C = ACCENT_C[4]; // 0.213
export const SECONDARY_PEAK_C = SECONDARY_C[4]; // 0.036

/** Index of a stop number within a ramp array. */
export const stopIndex = (stop: number) => STOPS.indexOf(stop as (typeof STOPS)[number]);

/**
 * Which stops carry the load, per mode. Derived from the tier-2 mapping in
 * styles/tokens/tier-2/theme/{light,dark}/colors.json:
 *
 *   dark  -> background.default = neutral-dark-700, content.default = neutral-light-200
 *   light -> background.default = neutral-light-600, content.default = neutral-dark-800
 */
export const ROLE_STOPS = {
  dark: {
    bg: { ramp: 'neutralDark', stop: 700 },
    bgWeak: { ramp: 'neutralDark', stop: 800 },
    bgStrong: { ramp: 'neutralDark', stop: 600 },
    content: { ramp: 'neutralLight', stop: 200 },
    contentWeak: { ramp: 'neutralLight', stop: 900 },
    border: { ramp: 'neutralDark', stop: 300 },
  },
  light: {
    bg: { ramp: 'neutralLight', stop: 600 },
    bgWeak: { ramp: 'neutralLight', stop: 800 },
    bgStrong: { ramp: 'neutralLight', stop: 400 },
    content: { ramp: 'neutralDark', stop: 800 },
    contentWeak: { ramp: 'neutralDark', stop: 500 },
    border: { ramp: 'neutralDark', stop: 200 },
  },
} as const;

/**
 * The 16 semantic tokens whose tier-1 target differs between the light and
 * dark sheets (diffed from the token baseline).
 *
 * Re-pointing tier-1 primitives is mode-agnostic, but *which* primitive a
 * semantic token reads is not — and only one sheet is loaded at a time
 * (Storybook's `main.scss` hard-codes the dark one). Without these, a theme
 * that derives for light mode has its ramps solved against light role stops
 * while the page still reads the dark mapping, and renders inverted: dark
 * canvas, light ink, and receipts vouching for pairs nobody sees.
 *
 * The engine emits the whole block for the chosen mode every time, rather
 * than only on a mismatch, so a derived theme is self-contained — it lands
 * the same way whichever sheet a consumer happens to have loaded.
 */
export const MODE_SEMANTICS = {
  dark: {
    '--al-theme-color-background-default': 'var(--al-color-neutral-dark-700)',
    '--al-theme-color-background-default-strong': 'var(--al-color-neutral-dark-600)',
    '--al-theme-color-background-default-stronger': 'var(--al-color-neutral-dark-500)',
    '--al-theme-color-background-default-weak': 'var(--al-color-neutral-dark-800)',
    '--al-theme-color-background-inverse-default': 'var(--al-color-neutral-light-100)',
    '--al-theme-color-background-success-default': 'var(--al-color-success-500)',
    '--al-theme-color-background-transparent-strong': 'var(--al-color-transparent-dark-80)',
    '--al-theme-color-border-default': 'var(--al-color-neutral-dark-300)',
    '--al-theme-color-border-default-weak': 'var(--al-color-neutral-dark-400)',
    '--al-theme-color-border-inverse-default': 'var(--al-color-neutral-dark-300)',
    '--al-theme-color-content-default': 'var(--al-color-neutral-light-200)',
    '--al-theme-color-content-default-weak': 'var(--al-color-neutral-light-900)',
    '--al-theme-color-content-inverse-default': 'var(--al-color-neutral-dark-800)',
    '--al-theme-color-content-inverse-strong': 'var(--al-color-neutral-dark-700)',
    '--al-theme-color-header-background': 'var(--al-theme-color-background-default)',
    '--al-theme-color-shadow-default': 'var(--al-color-shadow-dark)',
  },
  light: {
    '--al-theme-color-background-default': 'var(--al-color-neutral-light-600)',
    '--al-theme-color-background-default-strong': 'var(--al-color-neutral-light-400)',
    '--al-theme-color-background-default-stronger': 'var(--al-color-neutral-light-300)',
    '--al-theme-color-background-default-weak': 'var(--al-color-neutral-light-800)',
    '--al-theme-color-background-inverse-default': 'var(--al-color-neutral-dark-900)',
    '--al-theme-color-background-success-default': 'var(--al-color-success-400)',
    '--al-theme-color-background-transparent-strong': 'var(--al-color-transparent-dark-60)',
    '--al-theme-color-border-default': 'var(--al-color-neutral-dark-200)',
    '--al-theme-color-border-default-weak': 'var(--al-color-neutral-dark-100)',
    '--al-theme-color-border-inverse-default': 'var(--al-color-neutral-dark-100)',
    '--al-theme-color-content-default': 'var(--al-color-neutral-dark-800)',
    '--al-theme-color-content-default-weak': 'var(--al-color-neutral-dark-500)',
    '--al-theme-color-content-inverse-default': 'var(--al-color-neutral-light-100)',
    '--al-theme-color-content-inverse-strong': 'var(--al-color-neutral-light-200)',
    '--al-theme-color-header-background': 'var(--al-theme-color-background-default-strong)',
    '--al-theme-color-shadow-default': 'var(--al-color-shadow-light)',
  },
} as const;

/**
 * WCAG targets the solver enforces, per role pairing.
 *
 * `content`, `contentWeak`, `accent` and `onAccent` were reverse-engineered
 * from the committed baseline (see the module comment) rather than lifted
 * directly off a single Success Criterion — they are stricter than the SC
 * minimums they're closest to (AA normal text is 4.5:1; AAA is 7:1; these
 * ship at 12 and 5.2). `border` is the one pre-existing exception: 1.5:1 is
 * BELOW every WCAG threshold on purpose — it is a "still visibly a line, not
 * invisible" floor for a decorative content divider, not a claim that
 * `border/default` satisfies SC 1.4.11. Measured light-mode output sits at
 * ~1.75:1 (real headroom above 1.5, still well under 1.4.11's 3:1) — see
 * engine.ts's `border/default` receipt. Bumping this to a true 3:1 would be a
 * real, opinionated visual change to every shipped light-mode divider and is
 * left as a design decision, not made unilaterally here.
 *
 * `statusText` and `focusRing` are new (2026-08-25): both map to a real SC
 * with a real threshold, both apply to tokens the engine already derives,
 * and both were confirmed against real generated palettes to be new,
 * previously-unchecked risk (see the pairing's call site in engine.ts for
 * the receipt and the spec's before/after diff for measured numbers).
 */
export const TARGETS = {
  content: 12,
  contentWeak: 5.2,
  accent: 4.5,
  border: 1.5,
  onAccent: 4.5,
  /**
   * WCAG SC 1.4.3 Contrast (Minimum) — normal text, 4.5:1. Applies to
   * `content/{danger,warning,success}-default` (tier-2), which alias the
   * same red/orange/green-500 ramp peaks the engine already derives for
   * `background/{danger,warning,success}-default`. Unenforced, these peaks
   * measured as low as 2.97:1 in light mode across sampled prompts — below
   * even the 3:1 non-text floor, on a token whose primary job is to render
   * as legible status TEXT.
   */
  statusText: 4.5,
  /**
   * WCAG SC 1.4.11 Non-text Contrast (matches the 3:1 floor SC 2.4.11 Focus
   * Appearance also sets for a focus indicator's area). Applies to
   * `theme.color.focus-ring`, which aliases `border.primary-default` ->
   * `color.brand.blue.500` — the SAME token already solved for `accent`
   * (4.5, stricter) against the page background. This target covers the
   * SECOND surface a focus ring is drawn against in practice: a control
   * sitting on `background.default-weak` (cards, inputs) rather than the
   * page background directly.
   */
  focusRing: 3,
} as const;
