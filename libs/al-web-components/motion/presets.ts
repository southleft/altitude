/**
 * Keyframe presets — named motion SHAPES, independent of timing.
 *
 * Ported from the Southleft WP starter kit's `motion-choreography.js`
 * (`MOTION_DESIGN.md` §4.3). Two changes on the way in:
 *
 * 1. Travel distances reference `--al-animation-distance-{sm,md,lg}` (added to
 *    `styles/tokens/tier-1/animations.json` by this spec) instead of the source
 *    system's `--motion-travel-*`. WAAPI resolves custom properties against the
 *    element being animated, so a wrapper can still retune intensity locally
 *    with `style="--al-animation-distance-md: 48px"` and no new preset.
 * 2. The scrim colour is an overridable custom property rather than a hardcoded
 *    rgba, matching Altitude's `var(--al-<thing>-<prop>, <fallback>)` escape
 *    hatch convention (see `button.scss:26`).
 *
 * Two authoring formats, both handled by `framesFromPreset()` in `run.ts`:
 *   - two-frame map    `{ cssProp: [from, to] }`
 *   - multi-frame array — WAAPI keyframe objects, for overshoot/settle shapes a
 *     two-frame pair cannot express (`offset`/`easing`/`composite` pass through)
 *
 * Kebab-case CSS property names are converted to camelCase at run time, so
 * write them the way CSS does.
 */

/** `{ cssProp: [fromValue, toValue] }` */
export type TwoFramePreset = Record<string, [string, string]>;

/** WAAPI keyframe objects, in order. */
export type MultiFramePreset = Array<Record<string, string | number>>;

export type KeyframePreset = TwoFramePreset | MultiFramePreset;

const SM = 'var(--al-animation-distance-sm, 8px)';
const MD = 'var(--al-animation-distance-md, 24px)';
const LG = 'var(--al-animation-distance-lg, 64px)';
const SCRIM = 'var(--al-motion-scrim-color, rgba(0, 0, 0, 0.34))';

export const keyframePresets: Record<string, KeyframePreset> = {
  // --- Core: functional UI ---------------------------------------------------
  'fade-in': { opacity: ['0', '1'] },
  'fade-out': { opacity: ['1', '0'] },
  rise: { opacity: ['0', '1'], transform: [`translateY(${SM})`, 'translateY(0)'] },
  sink: { opacity: ['1', '0'], transform: ['translateY(0)', `translateY(${SM})`] },

  /**
   * Mask reveal: a full line-height rise with NO opacity change. The reveal is
   * done by the hard clip edge of an `overflow: hidden` wall, so glyphs surface
   * from behind it rather than fading in. Pair ONLY with the wall structure —
   * `al-motion-text-reveal()` in `styles/core/mixins/motion.scss`.
   */
  unmask: { transform: ['translateY(100%)', 'translateY(0)'] },

  'glide-in': { opacity: ['0', '1'], transform: [`translateX(calc(-1 * ${SM}))`, 'translateX(0)'] },
  'glide-out': { opacity: ['1', '0'], transform: ['translateX(0)', `translateX(calc(-1 * ${SM}))`] },
  pop: { opacity: ['0', '1'], transform: ['scale(0.94)', 'scale(1)'] },
  shrink: { opacity: ['1', '0'], transform: ['scale(1)', 'scale(0.96)'] },
  'scrim-in': { 'background-color': ['rgba(0, 0, 0, 0)', SCRIM] },
  'scrim-out': { 'background-color': [SCRIM, 'rgba(0, 0, 0, 0)'] },

  // Drawers/panels — assume a clipped container.
  'slide-in-right': { transform: ['translateX(100%)', 'translateX(0)'] },
  'slide-out-right': { transform: ['translateX(0)', 'translateX(100%)'] },
  'slide-in-left': { transform: ['translateX(-100%)', 'translateX(0)'] },
  'slide-out-left': { transform: ['translateX(0)', 'translateX(-100%)'] },

  // --- The canon: entrances seen across modern sites -------------------------
  /** Arrive from above — the inverse of `rise`, at the medium travel distance. */
  'drop-in': { opacity: ['0', '1'], transform: [`translateY(calc(-1 * ${MD}))`, 'translateY(0)'] },

  /** The modern editorial fade: soft focus resolving to crisp, with a small rise. */
  'blur-up': {
    opacity: ['0', '1'],
    filter: ['blur(14px)', 'blur(0px)'],
    transform: [`translateY(${SM})`, 'translateY(0)'],
  },

  /** Media and cards settling back into place from slightly oversized. */
  'zoom-in': { opacity: ['0', '1'], transform: ['scale(1.08)', 'scale(1)'] },

  // Hard-edged mask reveals on the element ITSELF — clip-path needs no wall
  // structure, unlike `unmask`. No opacity: the moving edge does the reveal.
  'wipe-up': { 'clip-path': ['inset(100% 0 0 0)', 'inset(0 0 0 0)'] },
  'wipe-right': { 'clip-path': ['inset(0 100% 0 0)', 'inset(0 0 0 0)'] },
  'iris-in': { 'clip-path': ['circle(0% at 50% 50%)', 'circle(120% at 50% 50%)'] },

  // --- Signature: the off-the-wall set ---------------------------------------
  /** Editorial "lands with weight": rises with a skew that straightens late, overshooting a hair. */
  'skew-settle': [
    { opacity: '0', transform: `translateY(${MD}) skewY(3deg)` },
    { opacity: '1', transform: `translateY(calc(-0.08 * ${MD})) skewY(-0.6deg)`, offset: 0.72 },
    { opacity: '1', transform: 'translateY(0) skewY(0deg)' },
  ],

  /** Panel folds down flat from a top hinge. Embeds its own perspective — no parent needed. */
  unfold: {
    opacity: ['0', '1'],
    transform: ['perspective(900px) rotateX(-70deg)', 'perspective(900px) rotateX(0deg)'],
    'transform-origin': ['50% 0%', '50% 0%'],
  },

  /** Like `unfold`, but swings past flat and settles back — a screen-door arrival. */
  'swing-in': [
    { opacity: '0', transform: 'perspective(900px) rotateX(-55deg)', 'transform-origin': '50% 0%' },
    { opacity: '1', transform: 'perspective(900px) rotateX(6deg)', 'transform-origin': '50% 0%', offset: 0.75 },
    { opacity: '1', transform: 'perspective(900px) rotateX(0deg)', 'transform-origin': '50% 0%' },
  ],

  /** Long-exposure smear: arrives fast from the side, blurred, snapping crisp. */
  'blur-streak': {
    opacity: ['0', '1'],
    filter: ['blur(18px)', 'blur(0px)'],
    transform: [`translateX(calc(-1 * ${LG}))`, 'translateX(0)'],
  },

  /** Confident pop with a squash-and-stretch overshoot before settling. */
  'squash-pop': [
    { opacity: '0', transform: 'scale(0.9)' },
    { opacity: '1', transform: 'scale(1.04)', offset: 0.7 },
    { opacity: '1', transform: 'scale(1)' },
  ],

  /** Casual/zine energy: arrives slightly rotated and small, straightens on landing. */
  'tilt-in': {
    opacity: ['0', '1'],
    transform: [`rotate(-4deg) scale(0.97) translateY(${SM})`, 'rotate(0deg) scale(1) translateY(0)'],
  },

  /** Card turn: rotates flat from a side-on Y angle. */
  'flip-in': {
    opacity: ['0', '1'],
    transform: ['perspective(900px) rotateY(35deg)', 'perspective(900px) rotateY(0deg)'],
  },
};

export type KeyframePresetName = keyof typeof keyframePresets;
