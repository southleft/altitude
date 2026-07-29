/**
 * prompt (+ optional AI direction) -> a full Altitude token override map.
 *
 * The engine is deterministic and works with no network: a prompt hash seeds
 * a PRNG and a small keyword dictionary produces a complete direction. When
 * the AI answers, its fields override the seeded ones and the theme is
 * re-derived. Either way the same solver runs, so the WCAG guarantees hold
 * whether or not the endpoint was reachable.
 */

import { bestInk, contrast, solve, toHex } from './oklch';
import {
  ACCENT_C,
  ACCENT_L,
  ACCENT_PEAK_C,
  MODE_SEMANTICS,
  NEUTRAL_DARK_L,
  NEUTRAL_LIGHT_L,
  ROLE_STOPS,
  SECONDARY_C,
  SECONDARY_L,
  SECONDARY_PEAK_C,
  STOPS,
  TARGETS,
  stopIndex,
} from './ramps';
import {
  BORDER_SCALES,
  ELEVATION_SCALES,
  MOTION_SCALES,
  PERSONALITY_PRESETS,
  RADIUS_SCALES,
} from './personalities';
import {
  PERSONALITIES,
  type Direction,
  type Mode,
  type Personality,
  type Receipt,
  type Theme,
} from './types';

/* ------------------------------------------------------------------ seed */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HUES: Record<string, number> = {
  ocean: 235, sea: 225, water: 220, sky: 215, midnight: 260, navy: 255,
  forest: 145, moss: 130, sage: 140, mint: 165, jungle: 150,
  sunset: 35, ember: 30, fire: 28, rust: 30, terracotta: 35,
  desert: 65, sand: 75, gold: 85, amber: 75, honey: 80, mustard: 90,
  violet: 295, grape: 290, lavender: 285, plum: 320, orchid: 310,
  rose: 350, blush: 355, coral: 20, salmon: 25, crimson: 15, wine: 5,
  lime: 120, chartreuse: 110, olive: 105,
  teal: 190, cyan: 195, aqua: 185, lagoon: 200,
  slate: 240, storm: 245, graphite: 250,
  cyber: 195, matrix: 140, space: 265, cosmic: 280, retro: 40,
};

const MOODS: Record<string, number> = {
  calm: -0.06, soft: -0.05, quiet: -0.05, muted: -0.07, misty: -0.06,
  pastel: -0.05, faded: -0.06, gentle: -0.04, minimal: -0.07, clean: -0.05,
  simple: -0.05, elegant: -0.04, zen: -0.06, noir: -0.06,
  electric: 0.07, neon: 0.09, loud: 0.06, vivid: 0.06, bold: 0.04,
  hot: 0.05, punchy: 0.06, saturated: 0.07, candy: 0.05, circus: 0.06,
};

const PERSONALITY_WORDS: Record<string, Personality> = {
  print: 'editorial', editorial: 'editorial', literary: 'editorial', quiet: 'editorial',
  raw: 'brutalist', concrete: 'brutalist', industrial: 'brutalist', terminal: 'brutalist',
  brutal: 'brutalist', technical: 'brutalist',
  minimal: 'geometric', clean: 'geometric', modern: 'geometric', bauhaus: 'geometric',
  futuristic: 'geometric', stark: 'geometric',
  luxury: 'luxe', fashion: 'luxe', velvet: 'luxe', couture: 'luxe', opulent: 'luxe',
  fun: 'playful', candy: 'playful', arcade: 'playful', toy: 'playful', bubble: 'playful',
};

const LIGHT_WORDS = ['paper', 'daylight', 'sunrise', 'snow', 'linen', 'bright', 'morning', 'chalk', 'ivory', 'porcelain'];
const DARK_WORDS = ['midnight', 'noir', 'night', 'shadow', 'deep', 'cave', 'space', 'eclipse', 'obsidian', 'ink'];

/** "minimalist" -> "minimal", so dictionaries hit on inflected words too. */
function stems(word: string): string[] {
  const out = [word];
  for (const suffix of ['ist', 'istic', 'ing', 'ed', 'y', 'ic', 'al', 's']) {
    if (word.length > suffix.length + 3 && word.endsWith(suffix)) {
      out.push(word.slice(0, -suffix.length));
    }
  }
  return out;
}

/* ------------------------------------------------------- ramp generation */

/** Build a 9-stop ramp from measured L/C curves at a given hue. */
function ramp(prefix: string, Ls: number[], Cs: number[], H: number): Record<string, string> {
  const out: Record<string, string> = {};
  STOPS.forEach((stop, i) => {
    out[`${prefix}-${stop}`] = toHex(Ls[i], Cs[i], H);
  });
  return out;
}

/** Scale a measured chroma curve so its 500 stop lands on `target`. */
function scaleChroma(curve: number[], peak: number, target: number): number[] {
  const k = peak > 0 ? target / peak : 0;
  return curve.map((c) => Math.max(0, c * k));
}

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}

/* -------------------------------------------------------------- derivation */

export interface BuildOptions {
  prompt: string;
  variant?: number;
  direction?: Direction;
}

export function buildTheme({ prompt, variant = 0, direction }: BuildOptions): Theme {
  const words = prompt.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const rng = mulberry32(hash(prompt) + variant * 7919);

  /* ---- seeded fallbacks (used wherever the AI said nothing) ---- */
  let seedHue = Math.floor(rng() * 360);
  let seedChroma = 0.14 + (rng() - 0.5) * 0.05;
  let seedPersonality: Personality = PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)];
  let seedMode: Mode = 'dark';

  for (const word of words) {
    for (const stem of stems(word)) {
      if (HUES[stem] !== undefined) seedHue = HUES[stem];
      if (MOODS[stem] !== undefined) seedChroma += MOODS[stem];
      if (PERSONALITY_WORDS[stem]) seedPersonality = PERSONALITY_WORDS[stem];
      if (LIGHT_WORDS.includes(stem)) seedMode = 'light';
      if (DARK_WORDS.includes(stem)) seedMode = 'dark';
    }
  }

  /* ---- merge the AI direction over the seed ---- */
  const accentHue = ((direction?.accentHue ?? seedHue) + variant * 23) % 360;
  const personality: Personality =
    direction?.personality && PERSONALITY_PRESETS[direction.personality]
      ? direction.personality
      : seedPersonality;
  const preset = PERSONALITY_PRESETS[personality];
  const mode: Mode = direction?.mode ?? seedMode;

  const chroma = Math.min(
    0.27,
    Math.max(0.02, (direction?.chroma ?? seedChroma) + preset.chromaBias)
  );
  // A complementary-ish companion unless the AI named one.
  const secondaryHue = direction?.secondaryHue ?? (accentHue + 145) % 360;
  const neutralHue = direction?.neutralHue ?? accentHue;

  const bgTint = direction?.bgTint ?? 'neutral';
  const tint = bgTint === 'vivid' ? 0.045 : bgTint === 'tinted' ? 0.02 : 0.004;

  const radius = direction?.radius ?? preset.radius;
  const elevation = direction?.elevation ?? preset.elevation;
  const motion = direction?.motion ?? preset.motion;
  const borderWeight = direction?.borderWeight ?? preset.borderWeight;

  /* ---- colour ramps ---- */
  // Neutrals carry the tint; the light ramp gets a touch less so paper stays
  // paper even at `vivid`.
  const neutralLightC = NEUTRAL_LIGHT_L.map((_, i) => tint * (0.5 + i / 16));
  const neutralDarkC = NEUTRAL_DARK_L.map((_, i) => tint * (1.2 - i / 20));

  const palette: Record<string, string> = {
    ...ramp('--al-color-neutral-light', NEUTRAL_LIGHT_L, neutralLightC, neutralHue),
    ...ramp('--al-color-neutral-dark', NEUTRAL_DARK_L, neutralDarkC, neutralHue),
    ...ramp('--al-color-brand-blue', ACCENT_L, scaleChroma(ACCENT_C, ACCENT_PEAK_C, chroma), accentHue),
    ...ramp(
      '--al-color-brand-taupe',
      SECONDARY_L,
      scaleChroma(SECONDARY_C, SECONDARY_PEAK_C, Math.min(chroma * 0.55, 0.12)),
      secondaryHue
    ),
    // Status hues stay semantically legible (red/green/orange) but take the
    // theme's saturation so they sit in the same world as the accent.
    ...ramp('--al-color-brand-red', ACCENT_L, scaleChroma(ACCENT_C, ACCENT_PEAK_C, Math.max(chroma, 0.12)), 25),
    ...ramp('--al-color-brand-green', ACCENT_L, scaleChroma(ACCENT_C, ACCENT_PEAK_C, Math.max(chroma, 0.11)), 148),
    ...ramp('--al-color-brand-orange', ACCENT_L, scaleChroma(ACCENT_C, ACCENT_PEAK_C, Math.max(chroma, 0.13)), 62),
  };

  // Pin the semantic layer to the derived mode. Only one theme sheet is ever
  // loaded, so without this the ramps are solved for one mode while the page
  // still reads the other's mapping — see MODE_SEMANTICS.
  Object.assign(palette, MODE_SEMANTICS[mode]);

  /* ---- enforce WCAG on the pairings this mode actually renders ---- */
  const receipts: Receipt[] = [];
  const roles = ROLE_STOPS[mode];
  const rampKey = (r: string) =>
    r === 'neutralLight' ? '--al-color-neutral-light' : '--al-color-neutral-dark';

  const bgVar = `${rampKey(roles.bg.ramp)}-${roles.bg.stop}`;
  const bg = palette[bgVar];

  const record = (label: string, hex: string, vs: string, target: number) =>
    receipts.push({ label, hex, vs, ratio: Math.round(contrast(hex, vs) * 100) / 100, target });

  /** Re-solve a stop against `bg` if it misses its target. */
  const enforce = (varName: string, target: number, label: string, C: number, H: number) => {
    const current = palette[varName];
    if (contrast(current, bg) < target) {
      const dir: 1 | -1 = luminanceOf(current) >= luminanceOf(bg) ? 1 : -1;
      palette[varName] = solve(C, H, bg, target, dir);
    }
    record(label, palette[varName], bg, target);
  };

  const contentVar = `${rampKey(roles.content.ramp)}-${roles.content.stop}`;
  const contentWeakVar = `${rampKey(roles.contentWeak.ramp)}-${roles.contentWeak.stop}`;
  const contentIdx = stopIndex(roles.content.stop);
  const contentWeakIdx = stopIndex(roles.contentWeak.stop);
  const contentC =
    roles.content.ramp === 'neutralLight' ? neutralLightC[contentIdx] : neutralDarkC[contentIdx];
  const contentWeakC =
    roles.contentWeak.ramp === 'neutralLight'
      ? neutralLightC[contentWeakIdx]
      : neutralDarkC[contentWeakIdx];

  enforce(contentVar, TARGETS.content, 'content/default', contentC, neutralHue);
  enforce(contentWeakVar, TARGETS.contentWeak, 'content/weak', contentWeakC, neutralHue);
  enforce('--al-color-brand-blue-500', TARGETS.accent, 'primary/500', chroma, accentHue);

  // The ink that rides on top of a filled accent surface.
  const accent = palette['--al-color-brand-blue-500'];
  const inkDark = palette['--al-color-neutral-dark-900'];
  const inkLight = palette['--al-color-neutral-light-100'];
  let onAccent = bestInk(accent, inkDark, inkLight);
  if (contrast(onAccent, accent) < TARGETS.onAccent) {
    // Push the accent itself until its best ink clears AA.
    const idx = stopIndex(500);
    let L = ACCENT_L[idx];
    const step = onAccent === inkDark ? 0.015 : -0.015;
    for (let i = 0; i < 24 && contrast(onAccent, palette['--al-color-brand-blue-500']) < TARGETS.onAccent; i++) {
      L = Math.min(0.98, Math.max(0.08, L + step));
      palette['--al-color-brand-blue-500'] = toHex(L, chroma, accentHue);
      onAccent = bestInk(palette['--al-color-brand-blue-500'], inkDark, inkLight);
    }
  }
  record('on-accent', onAccent, palette['--al-color-brand-blue-500'], TARGETS.onAccent);

  /* ---- shape ---- */
  const [r2, r4, r6, r8, rRound] = RADIUS_SCALES[radius];
  palette['--al-border-radius-2'] = r2;
  palette['--al-border-radius-4'] = r4;
  palette['--al-border-radius-6'] = r6;
  palette['--al-border-radius-8'] = r8;
  palette['--al-border-radius-round'] = rRound;

  const [w1, w2, w4] = BORDER_SCALES[borderWeight];
  palette['--al-border-width-1'] = w1;
  palette['--al-border-width-2'] = w2;
  palette['--al-border-width-4'] = w4;

  /* ---- elevation (shadows sit in the theme's hue, not generic black) ---- */
  const shadowBase = toHex(mode === 'light' ? 0.45 : 0.02, tint * 2, neutralHue);
  const shadowDark = rgba(shadowBase, preset.shadowAlpha);
  const shadowLight = rgba(shadowBase, preset.shadowAlpha * 0.35);
  palette['--al-color-shadow-dark'] = shadowDark;
  palette['--al-color-shadow-light'] = shadowLight;

  const shadowColour = mode === 'light' ? shadowLight : shadowDark;
  const shadows = ELEVATION_SCALES[elevation];
  ['2', '4', '8', '16', '32', '48'].forEach((step, i) => {
    palette[`--al-box-shadow-${step}`] = shadows[i].split('SHADOW').join(shadowColour);
  });

  /* ---- motion ---- */
  const [d2, d4, d6, d8, timing] = MOTION_SCALES[motion];
  palette['--al-animation-duration-2'] = d2;
  palette['--al-animation-duration-4'] = d4;
  palette['--al-animation-duration-6'] = d6;
  palette['--al-animation-duration-8'] = d8;
  palette['--al-animation-timing-cubic-bezier'] = timing;

  return {
    prompt,
    variant,
    mode,
    personality,
    name: direction?.name || prompt,
    quip: direction?.quip || '',
    palette,
    receipts,
    direction,
  };
}

/** Local copy so `enforce` can compare lightness without importing luminance. */
function luminanceOf(hex: string): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return (
    0.2126 * lin(parseInt(hex.slice(1, 3), 16) / 255) +
    0.7152 * lin(parseInt(hex.slice(3, 5), 16) / 255) +
    0.0722 * lin(parseInt(hex.slice(5, 7), 16) / 255)
  );
}
