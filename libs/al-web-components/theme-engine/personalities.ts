/**
 * The shape + motion half of a theme.
 *
 * Every knob routes through a tier-1 primitive that Altitude's tier-2 tokens
 * already reference, so setting these re-shapes every component:
 *   --al-border-radius-{2,4,6,8}  ->  --al-theme-border-radius{,-sm,-md,-lg}
 *   --al-border-width-{1,2,4}     ->  --al-theme-border-width{,-md,-lg}
 *   --al-box-shadow-{2..48}       ->  --al-theme-box-shadow{-xs..-xl}
 *   --al-animation-duration-{2..8}->  --al-theme-animation-duration{,-long}
 */

import type { BorderWeight, Elevation, Motion, Personality, Radius } from './types';

/** radius scale: [xs(2), sm(4), md(6), lg(8), round] */
export const RADIUS_SCALES: Record<Radius, [string, string, string, string, string]> = {
  sharp: ['0px', '0px', '0px', '0px', '0px'],
  subtle: ['2px', '3px', '4px', '6px', '999px'],
  rounded: ['4px', '8px', '12px', '16px', '999px'],
  pill: ['8px', '14px', '20px', '28px', '999px'],
};

/** border widths: [1, 2, 4] */
export const BORDER_SCALES: Record<BorderWeight, [string, string, string]> = {
  hairline: ['1px', '1px', '2px'],
  standard: ['1px', '2px', '4px'],
  thick: ['2px', '3px', '6px'],
};

/**
 * Elevation ramps. `SHADOW` is the colour placeholder — the engine swaps it
 * for the derived shadow colour so shadows sit in the theme's hue instead of
 * a generic black.
 */
export const ELEVATION_SCALES: Record<Elevation, [string, string, string, string, string, string]> = {
  // 2, 4, 8, 16, 32, 48
  flat: ['none', 'none', 'none', 'none', 'none', 'none'],
  subtle: [
    '0px 1px 2px 0px SHADOW',
    '0px 2px 4px 0px SHADOW',
    '0px 3px 6px 0px SHADOW',
    '0px 6px 12px 0px SHADOW',
    '0px 12px 24px 0px SHADOW',
    '0px 18px 36px 0px SHADOW',
  ],
  lifted: [
    '0px 2px 4px 0px SHADOW',
    '0px 4px 8px 0px SHADOW',
    '0px 8px 16px 0px SHADOW',
    '0px 16px 28px 0px SHADOW',
    '0px 28px 48px 0px SHADOW',
    '0px 40px 64px 0px SHADOW',
  ],
  deep: [
    '0px 3px 6px 0px SHADOW',
    '0px 6px 14px 0px SHADOW',
    '0px 14px 28px 0px SHADOW',
    '0px 24px 48px 0px SHADOW',
    '0px 40px 72px 0px SHADOW',
    '0px 56px 96px 0px SHADOW',
  ],
};

/** Motion: [duration-2, duration-4, duration-6, duration-8, timing] */
export const MOTION_SCALES: Record<Motion, [string, string, string, string, string]> = {
  snappy: ['0.06s', '0.12s', '0.18s', '0.24s', 'cubic-bezier(0.7, 0, 0.3, 1)'],
  smooth: ['0.15s', '0.3s', '0.45s', '0.6s', 'cubic-bezier(0.22, 1, 0.36, 1)'],
  springy: ['0.22s', '0.4s', '0.6s', '0.8s', 'cubic-bezier(0.34, 1.56, 0.64, 1)'],
  stately: ['0.35s', '0.65s', '0.95s', '1.25s', 'cubic-bezier(0.16, 1, 0.3, 1)'],
};

/**
 * A personality is a coherent default for every dial above plus a chroma
 * bias. The AI may override any individual dial; the personality is the
 * fallback so a partial direction still lands as a complete art direction.
 */
export interface PersonalityPreset {
  label: string;
  radius: Radius;
  elevation: Elevation;
  motion: Motion;
  borderWeight: BorderWeight;
  /** Nudge applied to the direction's chroma. */
  chromaBias: number;
  /** Multiplier on shadow alpha — luxe wants deep-but-soft, brutalist hard. */
  shadowAlpha: number;
}

export const PERSONALITY_PRESETS: Record<Personality, PersonalityPreset> = {
  editorial: {
    label: 'editorial — hairline rules, flat surfaces, quiet colour',
    radius: 'subtle',
    elevation: 'flat',
    motion: 'smooth',
    borderWeight: 'hairline',
    chromaBias: -0.04,
    shadowAlpha: 0.18,
  },
  brutalist: {
    label: 'brutalist — square corners, thick rules, hard shadows',
    radius: 'sharp',
    elevation: 'subtle',
    motion: 'snappy',
    borderWeight: 'thick',
    chromaBias: 0.01,
    shadowAlpha: 0.9,
  },
  geometric: {
    label: 'geometric — soft corners, crisp subtle elevation',
    radius: 'subtle',
    elevation: 'subtle',
    motion: 'smooth',
    borderWeight: 'standard',
    chromaBias: 0,
    shadowAlpha: 0.35,
  },
  luxe: {
    label: 'luxe — hushed palette, deep soft shadows, generous radii',
    radius: 'rounded',
    elevation: 'deep',
    motion: 'stately',
    borderWeight: 'hairline',
    chromaBias: -0.05,
    shadowAlpha: 0.5,
  },
  playful: {
    label: 'playful — big radii, chunky borders, cartoon drop shadows',
    radius: 'pill',
    elevation: 'lifted',
    motion: 'springy',
    borderWeight: 'thick',
    chromaBias: 0.05,
    shadowAlpha: 0.6,
  },
};
