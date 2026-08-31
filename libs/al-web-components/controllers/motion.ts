// Motion controller — delivers the Tier 3 choreography runtime to Lit components.
//
// This is Altitude's replacement for the WP starter kit's Alpine plugin
// (`motion-alpine.js`) and its global `data-motion-view` document scanner.
// Neither ports: Alpine is not in this stack, and a module-level
// `MutationObserver` over `document.body` cannot see into shadow roots, which
// is where every Altitude component's content actually lives.
//
// A controller instead scopes motion to ONE host. It owns its IntersectionObserver
// and disconnects it in `hostDisconnected()`, so a component that is added and
// removed repeatedly (a virtualized list row, a dialog) leaks nothing.
//
// ARMING — how a reveal avoids a flash of settled content before it runs.
// The source system hides `[data-motion-view]:not(.is-inview)` with CSS gated on
// `prefers-reduced-motion: no-preference`, then stamps a class. That needs a
// global stylesheet and a class contract. This controller uses WAAPI itself: it
// creates the animation immediately, `pause()`s it at time 0, and lets the
// BACKWARDS FILL hold the element at its first keyframe. Nothing is armed in
// CSS, no class is stamped, and there is no window in which the element is
// visible-but-not-yet-animating. On intersection it just calls `play()`.
//
// Under reduced motion nothing is armed at all — content is at rest from first
// paint, and the reveal resolves instantly.

import { isServer, type ReactiveController, type ReactiveControllerHost } from 'lit';
import { choreography } from '../motion/choreography.js';
import { keyframePresets } from '../motion/presets.js';
import { isReducedMotion } from '../motion/reduced.js';
import { createCache } from '../motion/resolve.js';
import { animatePreset, framesFromPreset, run, runSpec, type MotionRoot } from '../motion/run.js';

export interface MotionControllerHost extends ReactiveControllerHost, HTMLElement {}

export interface MotionControllerOptions {
  /** Fraction of the target that must be visible to fire. Default 0.25. */
  threshold?: number;
  /** Viewport inset for the observer. Default `'0px 0px -10% 0px'`. */
  rootMargin?: string;
}

export interface RevealOptions {
  /** `"<duration> <easing>"` override. Defaults to the preset's own timing. */
  motion?: string;
  /** Hold before the entrance starts. */
  delay?: string;
  /** Re-arm on exit and replay on every entry. Default false (one-shot). */
  repeat?: boolean;
  /** Cascade the target's children instead of animating it as one piece. */
  stagger?: boolean | string;
  /** Stagger order. Default `'forward'`. */
  direction?: 'forward' | 'reverse' | 'center-out' | 'edges-in';
  /** Cap on staggered children. Default 24. */
  max?: number;
}

/** Fired on the target when its entrance settles. Bubbles and is composed. */
export const AL_MOTION_REVEAL = 'al-motion-reveal';

const DEFAULT_STAGGER_OFFSET = '80ms';
const DEFAULT_MAX = 24;

/**
 * The entrance default: the theme's slow role duration on its emphasized curve,
 * each with its tier-1 fallback for content no `<al-theme>` governs.
 */
const DEFAULT_ENTRANCE_MOTION =
  'var(--al-theme-animation-duration-role-slow, var(--al-animation-duration-4)) ' +
  'var(--al-theme-animation-timing-role-emphasized, var(--al-animation-timing-emphasized))';

interface Registration {
  target: Element;
  name: string;
  options: RevealOptions;
  /** Paused animations holding the armed start state, if armed. */
  armed: Animation[];
  played: boolean;
}

export class MotionController implements ReactiveController {
  private host: MotionControllerHost;
  private opts: Required<MotionControllerOptions>;
  private observer: IntersectionObserver | null = null;
  private registrations = new Map<Element, Registration>();

  constructor(host: MotionControllerHost, opts: MotionControllerOptions = {}) {
    this.host = host;
    this.opts = {
      threshold: opts.threshold ?? 0.25,
      rootMargin: opts.rootMargin ?? '0px 0px -10% 0px',
    };
    host.addController(this);
  }

  hostConnected(): void {
    // Nothing to do until a reveal is registered — targets live in the host's
    // renderRoot, which does not exist yet at connect time. Components call
    // `reveal()` from `firstUpdated()`.
  }

  hostDisconnected(): void {
    this.observer?.disconnect();
    this.observer = null;
    // Release any armed animations so a re-connected host is not stuck holding
    // a paused first keyframe.
    for (const reg of this.registrations.values()) {
      reg.armed.forEach((a) => a.cancel());
      reg.armed = [];
    }
    this.registrations.clear();
  }

  // --- Imperative API --------------------------------------------------------

  /**
   * Run a named choreography token. `root` defaults to the host.
   * Never rejects — see the runtime contract in `motion/run.ts`.
   */
  run(name: string, root?: MotionRoot): Promise<unknown> {
    return run(name, root ?? this.host);
  }

  /** Animate one element with a named keyframe preset. */
  animate(el: Element, preset: string, options: { motion?: string; delay?: string } = {}): Promise<void> {
    return animatePreset(el, preset, options);
  }

  // --- Viewport reveal -------------------------------------------------------

  /**
   * Reveal `target` with `name` as it scrolls into view.
   *
   * `name` may be a choreography token (`'grid-reveal'`) or a keyframe preset
   * (`'blur-up'`). Call from `firstUpdated()`, once the renderRoot exists.
   *
   * Returns silently if the target is null, so a `querySelector` that finds
   * nothing is not a crash.
   */
  reveal(target: Element | null | undefined, name: string, options: RevealOptions = {}): void {
    if (isServer || !target) return;
    if (this.registrations.has(target)) return;

    const known = Boolean(choreography[name] || keyframePresets[name]);
    if (!known) {
      // Never leave content hidden behind an unknown name.
      console.warn(`[al-motion] Unknown preset or choreography token: ${name}`, target);
      return;
    }

    const reg: Registration = { target, name, options, armed: [], played: false };
    this.registrations.set(target, reg);

    // No IntersectionObserver (old browser, jsdom): reveal immediately rather
    // than leaving the element stuck.
    if (typeof IntersectionObserver === 'undefined') {
      void this.fire(reg);
      return;
    }

    this.arm(reg);
    this.getObserver().observe(target);
  }

  private getObserver(): IntersectionObserver {
    if (this.observer) return this.observer;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const reg = this.registrations.get(entry.target);
          if (!reg) continue;

          if (entry.isIntersecting) {
            if (reg.played && !reg.options.repeat) continue;
            if (!reg.options.repeat) this.observer?.unobserve(entry.target);
            void this.fire(reg);
          } else if (reg.options.repeat && reg.played) {
            this.rearm(reg);
          }
        }
      },
      { threshold: this.opts.threshold, rootMargin: this.opts.rootMargin }
    );
    return this.observer;
  }

  /**
   * Hold the target at its first keyframe using a paused, backwards-filled
   * animation. Skipped entirely under reduced motion, and for choreography
   * tokens (whose multi-element shape the controller does not model here — they
   * arm themselves via the runner's own `fill: 'both'` when fired).
   */
  private arm(reg: Registration): void {
    const { target, name, options } = reg;
    if (isReducedMotion(target, createCache())) return;
    if (!keyframePresets[name]) return;
    if (typeof target.animate !== 'function') return;

    const targets: Element[] = options.stagger ? Array.from(target.children) : [target];
    for (const el of targets.slice(0, options.max ?? DEFAULT_MAX)) {
      if (typeof el.animate !== 'function') continue;
      const animation = el.animate(framesFromPreset(name), { duration: 1, fill: 'both' });
      animation.pause();
      animation.currentTime = 0;
      reg.armed.push(animation);
    }
  }

  private rearm(reg: Registration): void {
    reg.armed.forEach((a) => a.cancel());
    reg.armed = [];
    reg.played = false;
    // Drop the finished reveal animations too, or their fill would keep the
    // element at its end state and the replay would be invisible.
    reg.target.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    this.arm(reg);
  }

  /** Release the armed state and run the real entrance. */
  private async fire(reg: Registration): Promise<void> {
    const { target, name, options } = reg;
    reg.played = true;

    // Cancel the arming animations only AFTER the real ones exist, so there is
    // no frame in which nothing controls the element and it flashes settled.
    const done = this.start(target, name, options);
    reg.armed.forEach((a) => a.cancel());
    reg.armed = [];

    await done;
    target.dispatchEvent(
      new CustomEvent(AL_MOTION_REVEAL, { bubbles: true, composed: true, detail: { name } })
    );
  }

  private start(target: Element, name: string, options: RevealOptions): Promise<unknown> {
    // A choreography token owns its own timing and shape.
    if (choreography[name]) return run(name, target);

    // A preset over the target's children — composed on the fly rather than
    // minting a token per combination.
    if (options.stagger) {
      return runSpec(
        {
          pattern: 'stagger',
          childMotion: options.motion ?? DEFAULT_ENTRANCE_MOTION,
          childKeyframes: name,
          offset: typeof options.stagger === 'string' ? options.stagger : DEFAULT_STAGGER_OFFSET,
          delay: options.delay ?? '0ms',
          direction: options.direction ?? 'forward',
          maxElements: options.max ?? DEFAULT_MAX,
        },
        target
      );
    }

    return animatePreset(target, name, { motion: options.motion, delay: options.delay });
  }
}
