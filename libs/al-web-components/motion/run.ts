/**
 * The WAAPI executor — the heart of Tier 3.
 *
 * Zero dependencies beyond the Web Animations API. Ported from the WP starter
 * kit's `motion-choreography.js` (`MOTION_DESIGN.md` section 4.1) with the
 * resolution layer swapped for Altitude's element-scoped one (`resolve.ts`) and
 * the reduced-motion check swapped for the theme-axis-aware one (`reduced.ts`).
 *
 * RUNTIME CONTRACT (preserved from the source, and worth keeping):
 *
 * - Every returned promise RESOLVES, never rejects. Each animation's
 *   `.finished` is `.catch()`-guarded, so a cancelled or interrupted animation
 *   settles quietly. `await` unconditionally; a resolved promise means
 *   "animations done or cancelled", not "succeeded".
 * - `fill: 'both'` is applied to every animation, so an element holds its end
 *   state and does not flash back to its start value. If you re-show an element
 *   after an exit, run the inverse token or clear the inline styles — WAAPI's
 *   fill persists.
 * - `stagger` animates `root.children` by default, so the root you pass must be
 *   the immediate parent of the items — unless the spec sets `selector`, which
 *   collects tagged descendants in DOM order instead.
 */

import { isServer } from 'lit';
import {
  choreography,
  type ChoreographySpec,
  type CoordinatedSpec,
  type MotionDirection,
  type StaggerSpec,
} from './choreography.js';
import { keyframePresets } from './presets.js';
import { isReducedMotion } from './reduced.js';
import { createCache, resolveTransition, toMs, toMsResolved, type TokenCache } from './resolve.js';

/** What a stagger can animate: a parent, or an explicit set of elements. */
export type MotionRoot = Element | readonly Element[] | NodeListOf<Element>;

export interface RunOptions {
  /**
   * The DOM-mutating callback handed to `document.startViewTransition` for
   * `shared-element` specs — the state change the transition captures. Without
   * it a shared-element transition is a visual no-op.
   */
  update?: () => void;
}

const NOOP = (): Promise<void> => Promise.resolve();

const camelize = (prop: string): string => prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** These WAAPI keyframe fields are not CSS properties and must not be camelized. */
const PASSTHROUGH = new Set(['offset', 'easing', 'composite']);

/** Turn a named preset into a WAAPI keyframe array. Throws on an unknown name. */
export function framesFromPreset(name: string): Keyframe[] {
  const preset = keyframePresets[name];
  if (!preset) throw new Error(`[al-motion] Unknown keyframe preset: ${name}`);

  // Multi-frame array — pass offset/easing/composite through, camelize the rest.
  if (Array.isArray(preset)) {
    return preset.map((frame) => {
      const out: Record<string, unknown> = {};
      for (const prop of Object.keys(frame)) {
        out[PASSTHROUGH.has(prop) ? prop : camelize(prop)] = frame[prop];
      }
      return out as Keyframe;
    });
  }

  // Two-frame map — { prop: [from, to] } becomes [{...from}, {...to}].
  const from: Record<string, unknown> = {};
  const to: Record<string, unknown> = {};
  for (const prop of Object.keys(preset)) {
    const camel = camelize(prop);
    from[camel] = preset[prop][0];
    to[camel] = preset[prop][1];
  }
  return [from as Keyframe, to as Keyframe];
}

/** Index orders for the four stagger directions. */
const ORDER: Record<MotionDirection, (n: number) => number[]> = {
  forward: (n) => [...Array(n).keys()],
  reverse: (n) => [...Array(n).keys()].reverse(),
  'center-out': (n) => {
    const c = (n - 1) / 2;
    return [...Array(n).keys()].sort((a, b) => Math.abs(a - c) - Math.abs(b - c));
  },
  'edges-in': (n) => {
    const c = (n - 1) / 2;
    return [...Array(n).keys()].sort((a, b) => Math.abs(b - c) - Math.abs(a - c));
  },
};

/** Can this element actually be animated here? (False under the SSR dom-shim.) */
const animatable = (el: Element): el is Element & { animate: Element['animate'] } =>
  typeof (el as Element).animate === 'function';

/** Await an animation without ever rejecting. */
const settled = (animation: Animation): Promise<void> => animation.finished.then(NOOP, NOOP);

/** Resolve the element whose computed style governs token lookup for this run. */
function scopeOf(root: MotionRoot): Element | null {
  if (root instanceof Element) return root;
  const list = Array.from(root as ArrayLike<Element>);
  return list[0] ?? null;
}

function runStaggerOrParallel(spec: StaggerSpec, root: MotionRoot, cache: TokenCache): Promise<unknown> {
  const scope = scopeOf(root);
  if (!scope) return NOOP();

  // The pool is either an explicit element list (reveal only the items a
  // "load more" just appended, say), the spec's tagged descendants in DOM
  // order, or the root's direct children.
  const explicit = Array.isArray(root) || (typeof NodeList !== 'undefined' && root instanceof NodeList);
  const pool: Element[] = explicit
    ? Array.from(root as ArrayLike<Element>)
    : spec.selector
      ? Array.from((root as Element).querySelectorAll(spec.selector))
      : Array.from((root as Element).children);

  const items = pool.slice(0, spec.maxElements ?? Infinity);
  if (!items.length) return NOOP();

  const { duration, easing } = resolveTransition(spec.childMotion, scope, cache);
  const baseDurationMs = toMs(duration);
  const frames = framesFromPreset(spec.childKeyframes);
  const reduced = isReducedMotion(scope, cache);

  // Durations already resolve to 0 under a reduced theme; collapse the
  // structural timing too so rows appear together rather than one-by-one.
  const offset = reduced || spec.pattern === 'parallel' ? 0 : toMsResolved(spec.offset ?? '0ms', scope, cache);
  const base = reduced ? 0 : toMsResolved(spec.delay ?? '0ms', scope, cache);
  const order = (ORDER[spec.direction ?? 'forward'] ?? ORDER.forward)(items.length);

  // A per-row trailing gap ACCUMULATES: a pause after one row pushes every
  // later row, so a single stagger can express group boundaries. Opt-in per
  // token via `overrideRow`, and ignored under reduced motion.
  let runningGap = 0;
  const delays = order.map((idx, i) => {
    const delay = base + i * offset + runningGap;
    const el = items[idx] as HTMLElement;
    if (spec.overrideRow && !reduced && el.dataset?.motionGap) {
      runningGap += toMsResolved(el.dataset.motionGap, scope, cache);
    }
    return delay;
  });

  return Promise.all(
    order.map((idx, i) => {
      const el = items[idx] as HTMLElement;
      if (!animatable(el)) return NOOP();

      // A row may override its preset and duration, but only for tokens that
      // opted in — so e.g. a drawer CTA's slower `pop` applies on reveal but
      // NOT on the reverse dismiss, where replaying it would flash it back in.
      // Reduced motion always wins.
      const canOverride = Boolean(spec.overrideRow && !reduced && el.dataset);
      const presetName = (canOverride && el.dataset.motionKeyframes) || spec.childKeyframes;
      const itemFrames = presetName === spec.childKeyframes ? frames : framesFromPreset(presetName);
      const durationMs =
        canOverride && el.dataset.motionDuration
          ? toMsResolved(el.dataset.motionDuration, scope, cache)
          : baseDurationMs;

      return settled(el.animate(itemFrames, { duration: durationMs, easing, delay: delays[i], fill: 'both' }));
    })
  );
}

function runCoordinated(spec: CoordinatedSpec, root: Element, cache: TokenCache): Promise<unknown> {
  const reduced = isReducedMotion(root, cache);

  return Promise.all(
    spec.tracks.map((track) => {
      // A track selector may match the root itself or a descendant; falling
      // back to the root keeps a single-track token working on a bare element.
      const target: Element = track.selector
        ? root.matches?.(track.selector)
          ? root
          : (root.querySelector(track.selector) ?? root)
        : root;

      if (!animatable(target)) return NOOP();

      const { duration, easing } = resolveTransition(track.motion, target, cache);
      const delay = reduced ? 0 : toMsResolved(track.delay ?? '0ms', target, cache);

      return settled(
        target.animate(framesFromPreset(track.keyframes), {
          duration: toMs(duration),
          easing,
          delay,
          fill: 'both',
        })
      );
    })
  );
}

/**
 * Animate ONE element with a named keyframe preset — the single-element
 * complement to the choreography tokens. `motion` and `delay` use the same
 * grammar as token fields, so the theme axis governs them identically.
 */
export function animatePreset(
  el: Element,
  presetName: string,
  options: { motion?: string; delay?: string } = {}
): Promise<void> {
  if (isServer || !animatable(el)) return NOOP();

  const cache = createCache();
  const motion =
    options.motion ??
    'var(--al-theme-animation-duration-role-slow, var(--al-animation-duration-4)) ' +
      'var(--al-theme-animation-timing-role-emphasized, var(--al-animation-timing-emphasized))';

  const { duration, easing } = resolveTransition(motion, el, cache);
  const delay = isReducedMotion(el, cache) ? 0 : toMsResolved(options.delay ?? '0ms', el, cache);

  return settled(
    el.animate(framesFromPreset(presetName), { duration: toMs(duration), easing, delay, fill: 'both' })
  );
}

/**
 * Run an ad-hoc spec object — the same shape as a choreography token, minus
 * `shared-element`. Lets a caller compose a stagger without minting a token for
 * every combination.
 */
export function runSpec(spec: StaggerSpec | CoordinatedSpec, root: MotionRoot): Promise<unknown> {
  if (isServer) return NOOP();
  const cache = createCache();

  switch (spec.pattern) {
    case 'stagger':
    case 'parallel':
      return runStaggerOrParallel(spec, root, cache);
    case 'coordinated': {
      const scope = scopeOf(root);
      return scope ? runCoordinated(spec, scope, cache) : NOOP();
    }
    default:
      throw new Error(`[al-motion] Unknown pattern: ${(spec as ChoreographySpec).pattern}`);
  }
}

/**
 * Run a named choreography token against a root.
 *
 * For stagger/parallel tokens `root` may instead be an explicit list of
 * elements to animate directly, rather than collecting from one root's
 * children.
 *
 * Never rejects. No-ops on the server.
 */
export function run(name: string, root: MotionRoot, options: RunOptions = {}): Promise<unknown> {
  const spec = choreography[name];
  if (!spec) throw new Error(`[al-motion] Unknown choreography: ${name}`);
  if (isServer) return NOOP();

  const cache = createCache();

  if (spec.pattern === 'shared-element') {
    const startViewTransition = (
      document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }
    ).startViewTransition;

    if (typeof startViewTransition === 'function') {
      return startViewTransition.call(document, options.update ?? NOOP).finished.then(NOOP, NOOP);
    }

    // Unsupported: apply the DOM change anyway, then run the fallback spec so
    // the state change is still visible.
    options.update?.();
    const scope = scopeOf(root);
    if (spec.fallback && scope) return runCoordinated(spec.fallback, scope, cache);
    return NOOP();
  }

  if (spec.pattern === 'coordinated') {
    const scope = scopeOf(root);
    return scope ? runCoordinated(spec, scope, cache) : NOOP();
  }

  return runStaggerOrParallel(spec, root, cache);
}
