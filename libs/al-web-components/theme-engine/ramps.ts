/**
 * Altitude's tier-1 tonal skeleton, measured in OKLCH from the CURRENT emitted
 * token set (`styles/dist/tokens.json`, rebuilt from `styles/tokens-dtcg/`).
 *
 * A derived theme re-hues these ramps rather than inventing its own. That is
 * the whole trick: every tier-2/tier-3 semantic token already indirects
 * through `var(--al-color-{primary,secondary,tertiary,danger,success,warning}-*)`
 * / `var(--al-color-neutral-*)`, so overriding the primitives below re-skins the
 * semantic layer for free — and because the lightness curve is preserved, every
 * semantic pairing keeps the contrast relationship the design system was built on.
 *
 * RENAME NOTE (2026-09-02). Three commits moved the tree out from under this
 * file and nothing here was updated, so the engine spent that window writing
 * custom properties that either did not exist or that no tier-2 token read:
 *
 *   - 87863eb0 renamed the hue-named ramps to ROLE names.
 *   - de6f51ff renumbered the ramps to 100-900 and retired the `brand` namespace.
 *   - 307106f0 folded the base/space/icon/layout primitives into the theme layer.
 *
 * Concretely: the split `neutral-light` / `neutral-dark` pair collapsed into a
 * SINGLE `neutral` ramp (100 = lightest, 900 = darkest, used by BOTH modes);
 * `--al-color-transparent-dark-{60,80}` became `--al-color-neutral-alpha-900-{60,80}`;
 * and `--al-color-shadow-{dark,light}` became `--al-theme-color-shadow-{dark,light}`.
 * `--al-color-neutral-{light,dark}-*` still EXIST as emitted primitives, but as of
 * the rename tier-2 references them ZERO times — writing them is a silent no-op,
 * which is why the retarget below moves to the plain `neutral` ramp rather than
 * merely keeping names that happen to resolve.
 *
 * `theme-engine/tokens-exist.test.ts` is the guard: every custom property the
 * engine emits must be a name `tokens.json` actually ships.
 *
 * Ramps run light -> dark as the stop number increases (100 = lightest).
 */

/** L, C and H sampled from the shipped ramps. Index 0 = stop 100. */
export const STOPS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/**
 * The single `neutral` ramp, measured from `--al-color-neutral-{100..900}`.
 * Replaces the old NEUTRAL_LIGHT_L / NEUTRAL_DARK_L pair: one ramp now serves
 * both modes (light mode reads its top, dark mode its bottom — see ROLE_STOPS).
 */
export const NEUTRAL_L = [1.0, 0.954, 0.922, 0.714, 0.578, 0.56, 0.354, 0.23, 0.186];

/**
 * The measured chroma SHAPE of that ramp, normalised so its peak is 1. The
 * engine multiplies this by the direction's `tint`, so a `neutral` background
 * stays near-achromatic and a `vivid` one carries the theme hue — with the
 * mid-ramp peak the real ramp has, instead of the monotone slope the two old
 * split ramps each faked.
 */
export const NEUTRAL_C_SHAPE = [0.0, 0.44, 0.56, 0.78, 0.83, 1.0, 0.67, 0.33, 0.22];

/** Accent. Chroma peaks at the 500/600 stops. */
export const ACCENT_L = [0.922, 0.834, 0.758, 0.684, 0.606, 0.551, 0.496, 0.367, 0.162];
export const ACCENT_C = [0.037, 0.082, 0.123, 0.165, 0.213, 0.219, 0.186, 0.171, 0.066];

/** Secondary — a muted companion, low chroma. */
export const SECONDARY_L = [0.951, 0.891, 0.834, 0.765, 0.686, 0.611, 0.513, 0.394, 0.19];
export const SECONDARY_C = [0.02, 0.036, 0.042, 0.047, 0.036, 0.064, 0.063, 0.054, 0.026];

/**
 * Tertiary, measured from `--al-color-tertiary-*`. New here because tier-2 now
 * references `{color.tertiary.*}` 32 times (background/content/border), so a
 * derived theme that emitted no tertiary ramp left a third of the semantic
 * colour layer sitting on the stock hue.
 */
export const TERTIARY_L = [0.952, 0.898, 0.849, 0.791, 0.738, 0.649, 0.533, 0.399, 0.176];
export const TERTIARY_C = [0.009, 0.017, 0.026, 0.034, 0.043, 0.057, 0.046, 0.033, 0.01];

/** The 500 stop is the anchor `scaleChroma()` normalises each curve against. */
export const ACCENT_PEAK_C = ACCENT_C[4]; // 0.213
export const SECONDARY_PEAK_C = SECONDARY_C[4]; // 0.036
export const TERTIARY_PEAK_C = TERTIARY_C[4]; // 0.043

/** Index of a stop number within a ramp array. */
export const stopIndex = (stop: number) => STOPS.indexOf(stop as (typeof STOPS)[number]);

/**
 * Which stops carry the load, per mode. Read off the tier-2 mapping in
 * styles/tokens-dtcg/tier-2/theme/{light,dark}/colors.json:
 *
 *   dark  -> background.neutral-default = neutral.800, content.neutral-default = neutral.200,
 *            border.neutral-default = neutral.700, border.primary-default = primary.400,
 *            content.{danger,warning,success}-default = <status>.400
 *   light -> background.neutral-default = neutral.100, content.neutral-default = neutral.800,
 *            border.neutral-default = neutral.300, border.primary-default = primary.500,
 *            content.{danger,warning,success}-default = <status>.600
 *
 * `accent` and `status` are new fields: before the rename both were hard-coded
 * to stop 500 in engine.ts, which is now the wrong stop in BOTH modes — the
 * WCAG solver was enforcing a contrast target on a stop nothing renders.
 */
export const ROLE_STOPS = {
  dark: {
    bg: { ramp: 'neutral', stop: 800 },
    bgWeak: { ramp: 'neutral', stop: 900 },
    bgStrong: { ramp: 'neutral', stop: 700 },
    content: { ramp: 'neutral', stop: 200 },
    contentWeak: { ramp: 'neutral', stop: 400 },
    border: { ramp: 'neutral', stop: 700 },
    /** border.primary-default / theme.color.focus-ring */
    accent: { ramp: 'primary', stop: 400 },
    /** content.{danger,warning,success}-default */
    status: 400,
  },
  light: {
    bg: { ramp: 'neutral', stop: 100 },
    bgWeak: { ramp: 'neutral', stop: 200 },
    bgStrong: { ramp: 'neutral', stop: 200 },
    content: { ramp: 'neutral', stop: 800 },
    contentWeak: { ramp: 'neutral', stop: 600 },
    border: { ramp: 'neutral', stop: 300 },
    accent: { ramp: 'primary', stop: 500 },
    status: 600,
  },
} as const;

/**
 * The semantic tokens whose tier-1 target differs between the light and dark
 * sheets (diffed from tier-2/theme/{light,dark}/colors.json).
 *
 * Re-pointing tier-1 primitives is mode-agnostic, but *which* primitive a
 * semantic token reads is not — and only one sheet is loaded at a time. Without
 * these, a theme that derives for light mode has its ramps solved against light
 * role stops while the page still reads the dark mapping, and renders inverted:
 * dark canvas, light ink, and receipts vouching for pairs nobody sees.
 *
 * The engine emits the whole block for the chosen mode every time, rather than
 * only on a mismatch, so a derived theme is self-contained — it lands the same
 * way whichever sheet a consumer happens to have loaded.
 */
export const MODE_SEMANTICS = {
  dark: {
    '--al-theme-color-background-neutral-default': 'var(--al-color-neutral-800)',
    '--al-theme-color-background-neutral-strong': 'var(--al-color-neutral-700)',
    '--al-theme-color-background-neutral-bold': 'var(--al-color-neutral-600)',
    '--al-theme-color-background-neutral-weak': 'var(--al-color-neutral-900)',
    '--al-theme-color-background-inverse-default': 'var(--al-color-neutral-100)',
    '--al-theme-color-background-success-default': 'var(--al-color-success-400)',
    '--al-theme-color-background-transparent-strong': 'var(--al-color-neutral-alpha-900-80)',
    '--al-theme-color-border-neutral-default': 'var(--al-color-neutral-700)',
    '--al-theme-color-border-neutral-weak': 'var(--al-color-neutral-700)',
    '--al-theme-color-border-inverse-default': 'var(--al-color-neutral-700)',
    '--al-theme-color-content-neutral-default': 'var(--al-color-neutral-200)',
    '--al-theme-color-content-neutral-weak': 'var(--al-color-neutral-400)',
    '--al-theme-color-content-inverse-default': 'var(--al-color-neutral-800)',
    '--al-theme-color-content-inverse-strong': 'var(--al-color-neutral-800)',
    '--al-theme-color-header-background': 'var(--al-theme-color-background-neutral-default)',
    // The engine paints one shadow colour per mode (see engine.ts's elevation
    // block); tier-2 dark routes shadow.default through shadow.dark, so the
    // alias below matches the shipped sheet exactly.
    '--al-theme-color-shadow-default': 'var(--al-theme-color-shadow-dark)',
  },
  light: {
    '--al-theme-color-background-neutral-default': 'var(--al-color-neutral-100)',
    '--al-theme-color-background-neutral-strong': 'var(--al-color-neutral-200)',
    '--al-theme-color-background-neutral-bold': 'var(--al-color-neutral-300)',
    '--al-theme-color-background-neutral-weak': 'var(--al-color-neutral-200)',
    '--al-theme-color-background-inverse-default': 'var(--al-color-neutral-800)',
    '--al-theme-color-background-success-default': 'var(--al-color-success-600)',
    '--al-theme-color-background-transparent-strong': 'var(--al-color-neutral-alpha-900-60)',
    '--al-theme-color-border-neutral-default': 'var(--al-color-neutral-300)',
    '--al-theme-color-border-neutral-weak': 'var(--al-color-neutral-300)',
    '--al-theme-color-border-inverse-default': 'var(--al-color-neutral-700)',
    '--al-theme-color-content-neutral-default': 'var(--al-color-neutral-800)',
    '--al-theme-color-content-neutral-weak': 'var(--al-color-neutral-600)',
    '--al-theme-color-content-inverse-default': 'var(--al-color-neutral-100)',
    '--al-theme-color-content-inverse-strong': 'var(--al-color-neutral-100)',
    '--al-theme-color-header-background': 'var(--al-theme-color-background-neutral-strong)',
    // Tier-2 light routes shadow.default through shadow.NEUTRAL rather than
    // shadow.light. The engine writes a single derived colour for the mode and
    // aliases BOTH names to it (see engine.ts), so this points at the one the
    // engine solved for light mode; `--al-theme-color-shadow-neutral` is written
    // alongside it so the tier-2 chain lands on the same value either way.
    '--al-theme-color-shadow-default': 'var(--al-theme-color-shadow-light)',
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
 * `border/default` satisfies SC 1.4.11. Bumping this to a true 3:1 would be a
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
   * same red/orange/green ramp stops the engine already derives for
   * `background/{danger,warning,success}-default`. Unenforced, these peaks
   * measured as low as 2.97:1 in light mode across sampled prompts — below
   * even the 3:1 non-text floor, on a token whose primary job is to render
   * as legible status TEXT. The STOP those semantics read is mode-dependent
   * (light 600 / dark 400) — see ROLE_STOPS.status.
   */
  statusText: 4.5,
  /**
   * WCAG SC 1.4.11 Non-text Contrast (matches the 3:1 floor SC 2.4.11 Focus
   * Appearance also sets for a focus indicator's area). Applies to
   * `theme.color.focus-ring`, which aliases `border.primary-default` — the
   * SAME stop already solved for `accent` (4.5, stricter) against the page
   * background. This target covers the SECOND surface a focus ring is drawn
   * against in practice: a control sitting on `background.neutral-weak`
   * (cards, inputs) rather than the page background directly.
   */
  focusRing: 3,
} as const;
