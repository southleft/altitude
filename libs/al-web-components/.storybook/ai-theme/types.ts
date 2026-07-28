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
}

/** Payload pushed manager -> preview over the Storybook channel. */
export interface ApplyPayload {
  palette: Record<string, string>;
  mode: Mode;
}
