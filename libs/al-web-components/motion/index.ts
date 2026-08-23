/**
 * Altitude motion runtime — Tier 3 choreography.
 *
 * A dependency-free, framework-agnostic WAAPI executor, ported from the
 * Southleft WP starter kit's motion system and rewired onto Altitude's token
 * architecture. See `.mm/specs/2026-08-20-altitude-motion-library/spec.md`.
 *
 * THE THREE TIERS
 *
 *   Tier 1  raw durations, easings and travel distances
 *           `--al-animation-{duration,timing,distance}-*`
 *           (`styles/tokens/tier-1/animations.json`)
 *   Tier 2  the theme's role tokens, driven by the `<al-theme motion>` axis
 *           `--al-theme-animation-{duration,timing}-role-*`
 *           (`components/theme/theme.scss`)
 *   Tier 3  THIS MODULE — multi-element, multi-phase sequences
 *
 * Tiers 1 and 2 are pure CSS; reach for them (or the `al-motion-transition()`
 * Sass mixin) for simple state transitions like hover, focus and disclosure.
 * Use Tier 3 only when more than one element has to move in a coordinated way.
 *
 * REDUCED MOTION IS NOT THIS MODULE'S DECISION. Durations are resolved from the
 * CSS tokens at run time, so when a governing `<al-theme>` zeroes them — for
 * `motion="reduced"`, or via its own `prefers-reduced-motion` rule — every
 * animation here collapses to an instant, motion-free jump to its end state.
 * The runtime only adds what CSS cannot express: it flattens stagger offsets so
 * rows appear together, and ignores per-row overrides. See `reduced.ts` for the
 * one case CSS misses (content no `<al-theme>` governs).
 *
 * USAGE
 *
 * From a Lit component, prefer the reactive controller — it scopes to your host
 * and tears its observers down for you:
 *
 * ```ts
 * import { MotionController } from 'al-web-components/controllers/motion';
 *
 * export class ALThing extends ALElement {
 *   protected motion = new MotionController(this);
 *
 *   protected firstUpdated() {
 *     this.motion.reveal(this.renderRoot.querySelector('.grid'), 'grid-reveal');
 *   }
 * }
 * ```
 *
 * Or drive it directly from any JS:
 *
 * ```ts
 * import { run } from 'al-web-components/motion';
 * await run('modal-exit', dialogEl);   // then tear the dialog down
 * ```
 */

export { choreography } from './choreography.js';
export type {
  ChoreographyName,
  ChoreographySpec,
  CoordinatedSpec,
  CoordinatedTrack,
  MotionDirection,
  SharedElementSpec,
  StaggerSpec,
} from './choreography.js';

export { keyframePresets } from './presets.js';
export type { KeyframePreset, KeyframePresetName, MultiFramePreset, TwoFramePreset } from './presets.js';

export { animatePreset, framesFromPreset, run, runSpec } from './run.js';
export type { MotionRoot, RunOptions } from './run.js';

export { isReducedMotion } from './reduced.js';

export { createCache, resolveTransition, resolveValue, splitTopLevel, toMs, toMsResolved } from './resolve.js';
export type { TokenCache } from './resolve.js';
