/**
 * Foundations data — generated from the library's built token layer
 * (`al-web-components/tokens.json`, emitted by Style Dictionary v5 from the
 * DTCG sources in `styles/tokens-dtcg/`).
 *
 * The design canvas's Foundations artboard typed its swatch hexes inline
 * (#4375FF, #F8F8F6, …). Every one of them turns out to be a token value, so
 * this module reads them instead: the ramps, their step names, the spacing
 * scale, the radii, the shadows and the type presets are all whatever the
 * pipeline currently emits. A retuned ramp updates the page with no edit here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './repo-root.mjs';

const REPO_ROOT = repoRoot();
const TOKENS_PATH = path.join(
  REPO_ROOT,
  'libs',
  'al-web-components',
  'dist',
  'css',
  'tokens.json'
);

/** @type {Record<string, string>} */
export const TOKENS = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));

export const TOKEN_COUNT = Object.keys(TOKENS).length;

/** Resolve `var(--al-x)` chains against the same map (bounded, cycle-safe). */
export function resolve(value, depth = 0) {
  if (typeof value !== 'string' || depth > 8) return value;
  const ref = value.match(/^var\(--([a-z0-9-]+)\)$/);
  if (!ref) return value;
  const next = TOKENS[ref[1]];
  return next === undefined ? value : resolve(next, depth + 1);
}

const entries = Object.entries(TOKENS);

/** Every token whose name starts with `prefix`, as `{name, key, value, raw}`. */
export function group(prefix) {
  return entries
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, raw]) => ({
      key,
      cssVar: `--${key}`,
      name: key.slice(prefix.length).replace(/^-/, '') || '(base)',
      raw,
      value: resolve(raw),
    }));
}

/**
 * Color ramps: `al-color-<family>-<step>` collapsed into one row per family.
 * Family and step names are read, never listed.
 */
export function colorRamps() {
  /** @type {Map<string, {family: string, prefix: string, steps: {name: string, value: string, key: string}[]}>} */
  const ramps = new Map();
  for (const [key, raw] of entries) {
    const m = /^al-color-(brand|neutral)-([a-z]+)-([a-z0-9]+)$/.exec(key);
    if (!m) continue;
    const family = `${m[1]}-${m[2]}`;
    if (!ramps.has(family)) {
      ramps.set(family, {
        family,
        label: `${m[1]} ${m[2]}`.replace(/\b\w/g, (c) => c.toUpperCase()),
        prefix: `--al-color-${family}-*`,
        steps: [],
      });
    }
    ramps.get(family).steps.push({ name: m[3], value: resolve(raw), key });
  }
  for (const ramp of ramps.values()) {
    ramp.steps.sort((a, b) => Number(a.name) - Number(b.name) || a.name.localeCompare(b.name));
  }
  return [...ramps.values()];
}

/** The spacing scale, ordered by resolved pixel value. */
export function spacingScale() {
  return group('al-theme-space')
    .map((token) => ({ ...token, px: parseFloat(token.value) || 0 }))
    .sort((a, b) => a.px - b.px);
}

/** Radii, ordered by resolved pixel value (`round`/`pill` sort last). */
export function radiusScale() {
  const px = (v) => (/^-?\d/.test(v) && v.endsWith('px') ? parseFloat(v) : 1e6);
  return group('al-border-radius')
    .filter((t) => !t.key.startsWith('al-theme-'))
    .sort((a, b) => px(a.value) - px(b.value));
}

/** Elevation, ordered by resolved blur depth. */
export function shadowScale() {
  return group('al-box-shadow').sort(
    (a, b) => (parseInt(a.name, 10) || 999) - (parseInt(b.name, 10) || 999)
  );
}

/** The type ramp — one row per `al-typography-preset-*`. */
export function typeScale() {
  return group('al-typography-preset')
    .map((token) => {
      const size = /(\d+(?:\.\d+)?)rem/.exec(token.value);
      return { ...token, px: size ? parseFloat(size[1]) * 16 : 0 };
    })
    .sort((a, b) => b.px - a.px || a.name.localeCompare(b.name));
}
