/**
 * Shared contract between the AI endpoint (functions/api/theme.js), the
 * derivation engine, the manager panel and the preview applicator.
 *
 * The endpoint returns a `Direction` — never colors, never CSS. The local
 * solver in `engine.ts` turns that direction into real token values and
 * enforces WCAG AA, so nothing the model returns can ship an inaccessible
 * palette.
 */

export const PERSONALITIES = ['editorial', 'brutalist', 'geometric', 'luxe', 'playful'] as const;
export const RADII = ['sharp', 'subtle', 'rounded', 'pill'] as const;
export const ELEVATIONS = ['flat', 'subtle', 'lifted', 'deep'] as const;
export const MOTIONS = ['snappy', 'smooth', 'springy', 'stately'] as const;
export const BORDER_WEIGHTS = ['hairline', 'standard', 'thick'] as const;
export const BG_TINTS = ['neutral', 'tinted', 'vivid'] as const;
export const MODES = ['light', 'dark'] as const;

export type Personality = (typeof PERSONALITIES)[number];
export type Radius = (typeof RADII)[number];
export type Elevation = (typeof ELEVATIONS)[number];
export type Motion = (typeof MOTIONS)[number];
export type BorderWeight = (typeof BORDER_WEIGHTS)[number];
export type BgTint = (typeof BG_TINTS)[number];
export type Mode = (typeof MODES)[number];

/**
 * Layout vocabulary — spec 2026-08-20-southleft-example-app, T5. Additive:
 * Storybook's console never reads these (it has no page to lay out), only
 * the southleft app's `src/lib/layout-resolver.ts` does. Kept here, next to
 * the color/shape/motion vocabulary, so `functions/api/theme.js`'s SCHEMA
 * and this client contract describe the exact same fields under one glance
 * — mirroring the existing (deliberate) duplication between this file and
 * that one rather than introducing a new sharing mechanism for five fields.
 *
 * `SECTION_ORDER_IDS` is intentionally NOT `hero` + `footer` — the resolver
 * enforces "hero always first, footer always last" structurally by never
 * including them in the reorderable set at all, not by validating a rule.
 */
export const HERO_COMPOSITIONS = ['centered', 'split', 'poster'] as const;
export const SECTION_ORDER_IDS = ['logos', 'services', 'work', 'testimonials', 'insights', 'cta'] as const;
export const GRID_DENSITIES = ['airy', 'regular', 'dense'] as const;
export const CONTENT_WIDTHS = ['narrow', 'regular', 'wide'] as const;
export const SECTION_EMPHASIS = ['services', 'work', 'none'] as const;

export type HeroComposition = (typeof HERO_COMPOSITIONS)[number];
export type SectionId = (typeof SECTION_ORDER_IDS)[number];
export type GridDensity = (typeof GRID_DENSITIES)[number];
export type ContentWidth = (typeof CONTENT_WIDTHS)[number];
export type SectionEmphasis = (typeof SECTION_EMPHASIS)[number];

/** What the AI returns. Every field is optional client-side: the seed engine
 *  fills any gap, so an unreachable endpoint still produces a full theme. */
export interface Direction {
  accentHue?: number;
  secondaryHue?: number;
  neutralHue?: number;
  chroma?: number;
  personality?: Personality;
  mode?: Mode;
  bgTint?: BgTint;
  radius?: Radius;
  elevation?: Elevation;
  motion?: Motion;
  borderWeight?: BorderWeight;
  name?: string;
  quip?: string;
  heroComposition?: HeroComposition;
  /** A permutation of `SECTION_ORDER_IDS` — validated by the engine, not trusted as-is. */
  sectionOrder?: SectionId[];
  gridDensity?: GridDensity;
  contentWidth?: ContentWidth;
  sectionEmphasis?: SectionEmphasis;
}

/** The fully-resolved layout half of a theme — seed-filled the same way the
 *  palette is, so it is always complete even when the AI said nothing. */
export interface ResolvedLayout {
  heroComposition: HeroComposition;
  sectionOrder: SectionId[];
  gridDensity: GridDensity;
  contentWidth: ContentWidth;
  sectionEmphasis: SectionEmphasis;
}

/** One solved contrast pair, printed in the console log as a receipt. */
export interface Receipt {
  label: string;
  hex: string;
  vs: string;
  ratio: number;
  target: number;
}

/** A fully derived theme: a flat map of CSS custom property -> value. */
export interface Theme {
  prompt: string;
  variant: number;
  mode: Mode;
  personality: Personality;
  name: string;
  quip: string;
  /** `--al-*` custom property -> value. Applied as inline props. */
  palette: Record<string, string>;
  receipts: Receipt[];
  direction?: Direction;
  /** T5 — always present, seed-filled like every other dial. Ignored by
   *  every consumer except the southleft app's layout resolver. */
  layout: ResolvedLayout;
}

/** Payload pushed manager -> preview over the Storybook channel. */
export interface ApplyPayload {
  palette: Record<string, string>;
  mode: Mode;
}
