/**
 * CSS Color 4 OKLab/OKLCH math + WCAG contrast, zero dependencies.
 *
 * Ported from southleft.com's <theme.console>. Kept dependency-free on
 * purpose, and more so now that it ships in the package: `theme-engine` is
 * the one exported subpath a consumer can pull in without also pulling Lit,
 * and every dependency added here would become theirs.
 */

export type RGB = [number, number, number];

export function oklchToLinearSrgb(L: number, C: number, H: number): RGB {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: RGB) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** OKLCH -> hex, reducing chroma until the colour fits sRGB. */
export function toHex(L: number, C: number, H: number): string {
  let c = C;
  let rgb = oklchToLinearSrgb(L, c, H);
  while (!inGamut(rgb) && c > 0) {
    c = Math.max(0, c - 0.008);
    rgb = oklchToLinearSrgb(L, c, H);
  }
  const gamma = (v: number) => {
    const x = Math.min(1, Math.max(0, v));
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
  };
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round(gamma(v) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

export function luminance(hex: string): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const r = lin(parseInt(hex.slice(1, 3), 16) / 255);
  const g = lin(parseInt(hex.slice(3, 5), 16) / 255);
  const b = lin(parseInt(hex.slice(5, 7), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Rough OKLCH-L guess for a hex, good enough to seed the search bounds. */
export function luminanceGuess(hex: string): number {
  return Math.cbrt(luminance(hex));
}

/**
 * The solver: binary-search OKLCH lightness until the colour clears the
 * contrast target against `bgHex`. `dir` = 1 searches lighter, -1 darker.
 * Returns the closest-to-the-background colour that still passes, so an
 * accessible result never overshoots into needless glare.
 */
export function solve(C: number, H: number, bgHex: string, target: number, dir: 1 | -1): string {
  let lo = dir === 1 ? luminanceGuess(bgHex) : 0.05;
  let hi = dir === 1 ? 0.999 : luminanceGuess(bgHex);
  let best = toHex(dir === 1 ? hi : lo, C, H);
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const hex = toHex(mid, C, H);
    if (contrast(hex, bgHex) >= target) {
      best = hex;
      if (dir === 1) hi = mid;
      else lo = mid;
    } else {
      if (dir === 1) lo = mid;
      else hi = mid;
    }
  }
  return best;
}

/** Pick whichever of two inks reads better on `bg`. */
export function bestInk(bg: string, a: string, b: string): string {
  return contrast(a, bg) >= contrast(b, bg) ? a : b;
}
