/**
 * Foundations data — generated from the library's built token layer
 * (`@southleft/al-web-components/tokens.json`, emitted by Style Dictionary v5 from the
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

/*
 * THE FIVE SCALES BELOW restore what `.storybook/components/tokens/` used to
 * show. Foundations already rendered colour, typography, spacing, radius and
 * shadow; border-width, breakpoints, layout widths, opacity and z-index had
 * their only visual home in Storybook, which was deleted 2026-08-25. The DATA
 * was never lost — every one of these was already in `llms-tokens.txt` — so
 * this is a rendering gap, and each is four lines because `group()` does the
 * work.
 *
 * All five sort NUMERICALLY on the resolved value, not lexically. A lexical
 * sort puts `al-z-index-1000` before `al-z-index-200` and makes a scale look
 * arbitrary, which is the one thing a scale must not do.
 */

/** Border widths, thinnest first. */
export function borderWidthScale() {
  return group('al-border-width').sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
}

/** Responsive breakpoints, narrowest first. */
export function breakpointScale() {
  return group('al-breakpoint').sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
}

/** Layout max-widths, narrowest first. */
export function layoutScale() {
  return group('al-layout').sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
}

/** Opacity steps, 0 to 100. */
export function opacityScale() {
  return group('al-opacity').sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
}

/** Stacking order, lowest first. */
export function zIndexScale() {
  return group('al-z-index').sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
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

/* ---------------------------------------------------------- brand overrides */

/**
 * What ONE brand changes about the token layer.
 *
 * `tokens.json` above is the base `:root` bundle — the neutral reference every
 * brand composes on top of. A brand is a DELTA over it, emitted by
 * `styles/tokens-config.v5.mjs` as a scoped `:host([brand='<id>'])` partial in
 * `styles/dist-v5/scss/host/`. This reads that partial so a brand's Foundations
 * page can say which properties it actually moves, rather than restating the
 * base bundle under a different name.
 *
 * The neutral reference brand emits NO partial (it IS the base), so an absent
 * file means "this brand overrides nothing" — not an error. The directory is a
 * gitignored build artifact, so a missing directory means the same thing for a
 * checkout that has not run `build:tokens`; both are reported as `available:
 * false` with the reason rather than as zero.
 */
export function brandOverrides(brand) {
  const dir = path.join(
    REPO_ROOT,
    'libs',
    'al-web-components',
    'styles',
    'dist-v5',
    'scss',
    'host'
  );
  if (!fs.existsSync(dir)) {
    return {
      available: false,
      brand,
      properties: [],
      reason:
        'The scoped token partials have not been built in this checkout (styles/dist-v5/scss/host is a build artifact of `pnpm --filter @southleft/al-web-components build:tokens`), so what this brand overrides cannot be reported.',
    };
  }

  // One brand emits up to three blocks: the mode-independent one and a
  // light/dark pair. They are read together because a reader asking "what does
  // this brand change" means all of it, not the third of it that happens to be
  // mode-independent.
  const files = fs
    .readdirSync(dir)
    .filter((name) => new RegExp(`^tokens-brand-${brand}(-light|-dark)?\\.scss$`).test(name));

  if (files.length === 0) {
    return {
      available: true,
      brand,
      properties: [],
      reason:
        'This brand emits no scoped override block — it is the neutral reference the base token bundle already publishes.',
    };
  }

  const byName = new Map();
  for (const name of files.sort()) {
    const block = /-light\.scss$/.test(name) ? 'light' : /-dark\.scss$/.test(name) ? 'dark' : 'base';
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    for (const match of source.matchAll(/^\s*(--al-[a-z0-9-]+)\s*:\s*([^;]+);/gm)) {
      const [, property, raw] = match;
      const existing = byName.get(property);
      if (existing) {
        if (!existing.blocks.includes(block)) existing.blocks.push(block);
        continue;
      }
      byName.set(property, {
        name: property,
        blocks: [block],
        raw: raw.trim(),
        value: resolve(raw.trim()),
        base: TOKENS[property.slice(2)] ?? null,
      });
    }
  }

  return {
    available: true,
    brand,
    properties: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
    reason: null,
  };
}
