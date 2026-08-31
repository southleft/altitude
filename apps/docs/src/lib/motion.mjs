/**
 * Motion data — generated from the motion system itself, never transcribed.
 *
 * The Motion page has to describe three layers that live in three different
 * kinds of file, so this module reads each of them where it actually is:
 *
 *   Tier 1  raw durations, easings and travel distances
 *           → the built token layer (`tokens.mjs` → `dist/css/tokens.json`),
 *             the same source Foundations reads.
 *   Tier 2  the `<al-theme motion>` axis
 *           → PARSED OUT OF `components/theme/theme.scss`. The role tokens
 *             (`--al-theme-animation-*-role-*`) deliberately have NO `:root`
 *             default (`.altitude/AXES.md` §2.3), so they are absent from
 *             tokens.json BY DESIGN and the stylesheet is the only place the
 *             axis matrix exists. Same technique as `brandOverrides()`.
 *   Tier 3  choreography tokens and keyframe presets
 *           → IMPORTED from the published runtime
 *             (`@southleft/al-web-components/motion`), so the page lists what
 *             the shipped module actually exports. A choreography added to
 *             `motion/choreography.ts` appears here with no edit.
 *
 * Nothing below hardcodes a duration, a curve, a preset name or a token name.
 */
import fs from 'node:fs';
import path from 'node:path';
import { choreography, keyframePresets } from '@southleft/al-web-components/motion';
import { repoRoot } from './repo-root.mjs';
import { TOKENS, brandOverrides, group, resolve } from './tokens.mjs';

const REPO_ROOT = repoRoot();

const THEME_SCSS = path.join(
  REPO_ROOT,
  'libs',
  'al-web-components',
  'components',
  'theme',
  'theme.scss'
);

/* ----------------------------------------------------------------- tier 1 */

/** CSS time string → milliseconds. `0.2s` → 200, `100ms` → 100. */
export function toMs(value) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  return String(value).includes('ms') ? n : n * 1000;
}

/** The duration rungs, ordered shortest first. */
export function durationScale() {
  return group('al-animation-duration')
    .map((token) => ({ ...token, ms: toMs(token.value) }))
    .sort((a, b) => a.ms - b.ms);
}

/**
 * `linear` and `ease` are CSS KEYWORDS, not `cubic-bezier()` literals, so their
 * control points are the ones the CSS Easing specification defines for them.
 * These are the only numbers on this page that are not read from a file,
 * because there is no file in this repo that states them.
 */
const KEYWORD_CURVES = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

/** `cubic-bezier(a,b,c,d)` or a CSS keyword → `[x1,y1,x2,y2]`; null when neither. */
export function bezierPoints(value) {
  const raw = String(value).trim();
  if (KEYWORD_CURVES[raw]) return KEYWORD_CURVES[raw];
  const m = /^cubic-bezier\(([^)]+)\)$/.exec(raw);
  if (!m) return null;
  const parts = m[1].split(',').map((n) => Number(n.trim()));
  return parts.length === 4 && parts.every((n) => Number.isFinite(n)) ? parts : null;
}

/** The easing curves, each with the control points needed to plot it. */
export function easingCurves() {
  return group('al-animation-timing').map((token) => {
    const points = bezierPoints(token.value);
    return {
      ...token,
      points,
      /** True when a control point leaves the 0..1 box — i.e. the curve overshoots. */
      overshoots: (points ?? []).some((n, i) => i % 2 === 1 && (n < 0 || n > 1)),
    };
  });
}

/** The travel distances, ordered shortest first. */
export function travelDistances() {
  return group('al-animation-distance')
    .map((token) => ({ ...token, px: parseFloat(token.value) || 0 }))
    .sort((a, b) => a.px - b.px);
}

/* ----------------------------------------------------------------- tier 2 */

/** Index of the `}` matching the `{` at `open`; -1 when unbalanced. */
function matchBrace(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Every `--al-*: value;` declaration in a rule body, in source order. */
function declarationsIn(body) {
  const out = new Map();
  for (const match of body.matchAll(/(--al-[a-z0-9-]+)\s*:\s*([^;}]+);/g)) {
    const property = match[1];
    if (out.has(property)) continue;
    const raw = match[2].trim();
    out.set(property, { raw, value: raw === 'initial' ? 'initial' : resolve(raw) });
  }
  return out;
}

/**
 * The four rules the `motion` axis is made of, in the order a reader meets
 * them in the stylesheet. `os-reduce` is the accessibility-first media-query
 * rule, which is why its selector is `:not([motion='full'])` rather than a
 * value of its own.
 */
const AXIS_RULES = [
  { id: 'reduced', label: 'reduced', selector: ":host([motion='reduced'])" },
  { id: 'expressive', label: 'expressive', selector: ":host([motion='expressive'])" },
  { id: 'os-reduce', label: 'OS reduce', selector: ":host(:not([motion='full']))" },
  { id: 'full', label: 'full', selector: ":host([motion='full'])" },
];

/**
 * The `<al-theme motion>` axis as a MATRIX: every animation property the axis
 * governs, against every value of the axis.
 *
 * Read from the stylesheet rather than restated. theme.scss's own comment
 * explains why each block asserts the COMPLETE token set (a partial block
 * silently inherits from an outer `<al-theme>`, which broke three nesting
 * cases), and a hand-written table here would be the first thing to fall out of
 * step with that rule.
 *
 * The `default` column is the UNSET axis: the legacy tier-2 pair resolves to its
 * `:root` value, while the role tokens are genuinely absent, so a component's
 * `var(--role, var(--legacy))` fallback wins. That absence is the design
 * (`.altitude/AXES.md` §2.3), not a gap, so it is reported as such.
 */
export function motionAxis() {
  if (!fs.existsSync(THEME_SCSS)) {
    return { available: false, values: [], properties: [], reason: `Not found: ${THEME_SCSS}` };
  }
  const source = fs.readFileSync(THEME_SCSS, 'utf8');

  const values = [];
  for (const rule of AXIS_RULES) {
    const at = source.indexOf(rule.selector);
    if (at === -1) continue;
    const open = source.indexOf('{', at);
    const close = open === -1 ? -1 : matchBrace(source, open);
    if (close === -1) continue;
    values.push({
      ...rule,
      declarations: declarationsIn(source.slice(open + 1, close)),
      /** True when the rule sits inside `@media (prefers-reduced-motion: reduce)`. */
      media: rule.id === 'os-reduce',
    });
  }

  // Property order comes from the first block that declares each — the
  // `reduced` rule, which asserts the complete set the axis governs.
  const properties = [];
  const seen = new Set();
  for (const value of values) {
    for (const property of value.declarations.keys()) {
      if (seen.has(property)) continue;
      seen.add(property);
      const rootValue = TOKENS[property.slice(2)];
      properties.push({
        name: property,
        role: /-role-/.test(property),
        /** What an unset `motion` resolves to; null when the token is absent by design. */
        base: rootValue === undefined ? null : resolve(rootValue),
        cells: values.map((v) => v.declarations.get(property) ?? null),
      });
    }
  }

  return { available: true, values, properties, reason: null };
}

/** The tier-2 legacy pair every component that predates the role tokens reads. */
export function themeMotionTokens() {
  return group('al-theme-animation');
}

/**
 * What ONE brand changes about the MOTION layer — nothing, at the time of
 * writing, and the page says so from a reading rather than from a promise.
 *
 * Why this exists. The axis matrix above is parsed from `theme.scss`, which is
 * brand-agnostic; the live probe on the page resolves at an element inside the
 * branded `<al-theme>`. Those two agree only for as long as no brand redeclares
 * an animation token. Today none does — no `tokens-brand-*.scss` partial
 * contains the string `animation` — so the matrix is what every brand actually
 * resolves, in both modes.
 *
 * But that is a fact about the current token sources, not a property of the
 * system, and `.altitude/BRANDS.md` §9.4 describes the shape of the failure it
 * would take: a brand with no `{theme, brand}` entry for a mode emits no
 * `:host` block for that mode, so an override could land asymmetrically across
 * light and dark. Rather than leave the page silently asserting a
 * brand-independence that a future token edit could falsify, it reads the
 * brand's own partial and reports what it finds. A brand that starts overriding
 * motion makes the page say so, instead of making the page wrong.
 *
 * Reuses `brandOverrides()` — the same parser Foundations uses for its brand
 * delta table — rather than re-reading the partials here.
 */
export function brandMotionOverrides(brand) {
  const all = brandOverrides(brand);
  return {
    available: all.available,
    reason: all.reason,
    properties: all.properties.filter((property) => /animation/.test(property.name)),
  };
}

/* ----------------------------------------------------------------- tier 3 */

/** `list-reveal` → `list`. The family a choreography token belongs to. */
const familyOf = (name) => name.split('-')[0];

/**
 * Which demo stage a choreography token needs, DERIVED from the token itself
 * rather than listed per name — a new token gets a working demo for free.
 *
 *   `lines`  the invisible-wall structure the `unmask` preset requires
 *   `rows`   tagged `[data-al-motion-row]` children
 *   `modal`  the scrim + card track pair
 *   `tiles`  plain children, collected from the root
 *   `card`   the root animated as one piece
 *   `none`   shared-element — `document.startViewTransition` captures the WHOLE
 *            document, so replaying it inline would animate this page
 */
export function stageKind(spec) {
  if (spec.pattern === 'shared-element') return 'none';
  if (spec.selector === '[data-al-motion-line]') return 'lines';
  if (spec.selector === '[data-al-motion-row]') return 'rows';
  if (spec.pattern === 'coordinated') {
    return spec.tracks.some((track) => track.selector?.includes('scrim')) ? 'modal' : 'card';
  }
  return 'tiles';
}

/** Every choreography token the runtime exports, flattened for display. */
export function choreographyTokens() {
  return Object.entries(choreography).map(([name, spec]) => ({
    name,
    family: familyOf(name),
    pattern: spec.pattern,
    stage: stageKind(spec),
    selector: spec.selector ?? null,
    keyframes: spec.childKeyframes ?? null,
    offset: spec.offset ?? null,
    delay: spec.delay ?? null,
    direction: spec.direction ?? null,
    max: spec.maxElements ?? null,
    motion: spec.childMotion ?? spec.motion ?? null,
    tracks:
      spec.pattern === 'coordinated'
        ? spec.tracks.map((track) => ({
            selector: track.selector ?? '(root)',
            keyframes: track.keyframes,
            delay: track.delay ?? '0ms',
          }))
        : null,
    shared:
      spec.pattern === 'shared-element'
        ? { from: spec.from, to: spec.to, properties: spec.properties }
        : null,
  }));
}

/** The families, in the order their tokens are declared. */
export function choreographyFamilies() {
  const families = new Map();
  for (const token of choreographyTokens()) {
    if (!families.has(token.family)) families.set(token.family, { id: token.family, tokens: [] });
    families.get(token.family).tokens.push(token);
  }
  return [...families.values()];
}

const FRAME_META = new Set(['offset', 'easing', 'composite']);

/**
 * Every keyframe preset, with the CSS properties it animates read off the
 * preset object — both authoring formats (two-frame map, multi-frame array)
 * reduced to the same summary.
 */
export function presetShapes() {
  return Object.entries(keyframePresets).map(([name, preset]) => {
    const frames = Array.isArray(preset) ? preset : null;
    const properties = frames
      ? [...new Set(frames.flatMap((frame) => Object.keys(frame)).filter((k) => !FRAME_META.has(k)))]
      : Object.keys(preset);
    return {
      name,
      multiFrame: Boolean(frames),
      frames: frames ? frames.length : 2,
      properties,
      /** Overshoot needs a third frame; a two-frame map cannot express one. */
      overshoot: Boolean(frames),
    };
  });
}

export const CHOREOGRAPHY_COUNT = Object.keys(choreography).length;
export const PRESET_COUNT = Object.keys(keyframePresets).length;

/** Every motion token in the built layer — the count the page leads with. */
export const MOTION_TOKEN_COUNT = Object.keys(TOKENS).filter(
  (key) => key.startsWith('al-animation-') || key.startsWith('al-theme-animation-')
).length;
