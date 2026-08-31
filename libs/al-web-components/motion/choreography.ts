/**
 * Choreography tokens — named multi-element, multi-phase SEQUENCES.
 *
 * Ported from the WP starter kit's `motion-choreography.js`
 * (`MOTION_DESIGN.md` sections 4.2 and 10). Three changes on the way in:
 *
 * 1. TIMING REFS ARE RETARGETED onto Altitude's role tokens, each with a
 *    tier-1 fallback: `var(--al-theme-animation-duration-role-base,
 *    var(--al-animation-duration-2))`. That fallback shape is not decoration —
 *    Altitude's role tokens deliberately have NO `:root` default
 *    (`.altitude/AXES.md` section 2.3), so the tier-1 value is what an unthemed
 *    element actually gets, and the role token only wins when an `<al-theme>`
 *    declares it. The payoff: `motion="reduced"` zeroes the role duration and
 *    every sequence here collapses to instant, and `motion="expressive"`
 *    lengthens them and swaps in the spring curve — all without this file
 *    knowing the axis exists.
 *
 *    This also gives `--al-theme-animation-timing-role-emphasized` its first
 *    consumer; it was declared at `theme.scss:106` and read by nothing.
 *
 * 2. THE `choreography-` KEY PREFIX IS DROPPED. In the source it disambiguated
 *    entries in a flat multi-type token file, and the Alpine / `data-motion`
 *    delivery layers re-added it at every call site. This is a typed module
 *    with one kind of entry, so `run('list-reveal', el)` says it plainly.
 *
 * 3. MODAL TRACK SELECTORS are `[data-al-motion="..."]` data hooks rather than
 *    the source's `.modal-root` / `.modal-card` classes — Altitude components
 *    own their `.al-c-*` class names, and a data hook does not collide with
 *    BEM or get renamed by a component refactor.
 *
 * NAMING RULE (preserved): entrances end `-enter`, exits `-exit`; discrete
 * list sequences use `-reveal` / `-dismiss`.
 */

// --- Duration refs: role token first, tier-1 default as the fallback ---------

/** Micro-feedback. Unthemed: 0.1s. */
const FAST = 'var(--al-theme-animation-duration-role-fast, var(--al-animation-duration-1))';

/** Standard UI transitions. Unthemed: 0.2s. */
const BASE = 'var(--al-theme-animation-duration-role-base, var(--al-animation-duration-2))';

/** Large surface open/close. Unthemed: 0.4s. */
const SLOW = 'var(--al-theme-animation-duration-role-slow, var(--al-animation-duration-4))';

/**
 * Grand, deliberate reveals. Unthemed: 1.2s — the rung this spec added to
 * tier-1. Rides `role-slow` so the axis still governs it; note that under
 * `motion="expressive"` that resolves to 0.8s, i.e. slightly QUICKER than the
 * unthemed default. That is the honest consequence of a three-slot role
 * vocabulary, and it is preferable to leaving the token axis-blind — which
 * would mean it kept animating for a full 1.2s under `motion="reduced"`.
 */
const CINEMATIC = 'var(--al-theme-animation-duration-role-slow, var(--al-animation-duration-12))';

// --- Easing refs -------------------------------------------------------------

const ENTRANCE = 'var(--al-theme-animation-timing-role-standard, var(--al-animation-timing-entrance))';
const EXIT = 'var(--al-theme-animation-timing-role-standard, var(--al-animation-timing-exit))';
const GENTLE = 'var(--al-theme-animation-timing-role-standard, var(--al-animation-timing-gentle))';
const EMPHASIZED = 'var(--al-theme-animation-timing-role-emphasized, var(--al-animation-timing-emphasized))';

export type MotionDirection = 'forward' | 'reverse' | 'center-out' | 'edges-in';

export interface StaggerSpec {
  pattern: 'stagger' | 'parallel';
  /** `"<duration> <easing>"`, each a token ref or a literal. */
  childMotion: string;
  /** A key in `keyframePresets`. */
  childKeyframes: string;
  /** Per-item incremental delay. Forced to 0 for `parallel` and under reduced motion. */
  offset?: string;
  /** Holds the whole group before it starts. */
  delay?: string;
  direction?: MotionDirection;
  /** Perf guard for long lists. Default `Infinity`. */
  maxElements?: number;
  /** Collect tagged descendants in DOM order instead of `root.children`. */
  selector?: string;
  /** Opt in to per-row `data-motion-{keyframes,duration,gap}` overrides. */
  overrideRow?: boolean;
}

export interface CoordinatedTrack {
  /** Resolved within the root; the root itself when omitted. */
  selector?: string;
  keyframes: string;
  motion: string;
  delay?: string;
}

export interface CoordinatedSpec {
  pattern: 'coordinated';
  tracks: CoordinatedTrack[];
}

export interface SharedElementSpec {
  pattern: 'shared-element';
  from: string;
  to: string;
  motion: string;
  properties: string[];
  /** Used when `document.startViewTransition` is unavailable. */
  fallback?: CoordinatedSpec;
}

export type ChoreographySpec = StaggerSpec | CoordinatedSpec | SharedElementSpec;

export const choreography: Record<string, ChoreographySpec> = {
  // --- Lists -----------------------------------------------------------------
  'list-reveal': {
    pattern: 'stagger',
    childMotion: `${BASE} ${ENTRANCE}`,
    childKeyframes: 'rise',
    offset: '100ms',
    direction: 'forward',
    maxElements: 8,
  },
  'list-dismiss': {
    pattern: 'stagger',
    childMotion: `${FAST} ${EXIT}`,
    childKeyframes: 'sink',
    offset: '60ms',
    direction: 'reverse',
    maxElements: 8,
  },

  // --- Editorial text mask ---------------------------------------------------
  /**
   * Text rises out from behind an invisible wall. Unlike `rise`, the mover
   * travels a full line-height with NO fade — the wall's hard clip edge does
   * the reveal. Requires the wall structure; see `al-motion-text-reveal()` in
   * `styles/core/mixins/motion.scss`.
   */
  'text-reveal': {
    pattern: 'stagger',
    selector: '[data-al-motion-line]',
    childMotion: `${CINEMATIC} ${GENTLE}`,
    childKeyframes: 'unmask',
    offset: '80ms',
    direction: 'forward',
    maxElements: 8,
  },
  /** Word-cascade sibling of `text-reveal` — tighter offset, higher cap. */
  'text-reveal-words': {
    pattern: 'stagger',
    selector: '[data-al-motion-line]',
    childMotion: `${CINEMATIC} ${GENTLE}`,
    childKeyframes: 'unmask',
    offset: '45ms',
    direction: 'forward',
    maxElements: 40,
  },

  // --- Popovers / menus ------------------------------------------------------
  'popover-enter': {
    pattern: 'coordinated',
    tracks: [{ keyframes: 'pop', motion: `${BASE} ${ENTRANCE}`, delay: '0ms' }],
  },
  'popover-exit': {
    pattern: 'coordinated',
    tracks: [{ keyframes: 'shrink', motion: `${FAST} ${EXIT}`, delay: '0ms' }],
  },

  // --- Drawers ---------------------------------------------------------------
  /** The panel fades in as one piece — no slide — so the interior can cascade on top. */
  'drawer-enter': {
    pattern: 'coordinated',
    tracks: [{ keyframes: 'fade-in', motion: `${BASE} ${GENTLE}`, delay: '0ms' }],
  },
  /**
   * The panel HOLDS for one beat (backwards fill keeps it opaque) before it
   * fades, so the reverse cascade of `drawer-dismiss` is actually seen. Without
   * the delay the fade masks it.
   */
  'drawer-exit': {
    pattern: 'coordinated',
    tracks: [{ keyframes: 'fade-out', motion: `${BASE} ${GENTLE}`, delay: BASE }],
  },
  /** Interior rows glide in from the left after the panel has settled. */
  'drawer-reveal': {
    pattern: 'stagger',
    selector: '[data-al-motion-row]',
    delay: BASE,
    childMotion: `${SLOW} ${EMPHASIZED}`,
    childKeyframes: 'glide-in',
    offset: '40ms',
    direction: 'forward',
    maxElements: 12,
    overrideRow: true,
  },
  /** Reverse micro-cascade on close, during `drawer-exit`'s held beat. */
  'drawer-dismiss': {
    pattern: 'stagger',
    selector: '[data-al-motion-row]',
    childMotion: `${FAST} ${EXIT}`,
    childKeyframes: 'sink',
    offset: '35ms',
    direction: 'reverse',
    maxElements: 12,
  },

  // --- Grids -----------------------------------------------------------------
  /** Cards pop in from the centre outward. The reference block-cascade token. */
  'grid-reveal': {
    pattern: 'stagger',
    childMotion: `${BASE} ${EMPHASIZED}`,
    childKeyframes: 'pop',
    offset: '60ms',
    direction: 'center-out',
    maxElements: 12,
  },

  // --- Modals ----------------------------------------------------------------
  'modal-enter': {
    pattern: 'coordinated',
    tracks: [
      {
        selector: '[data-al-motion="scrim"]',
        keyframes: 'fade-in',
        motion: `${BASE} ${ENTRANCE}`,
        delay: '0ms',
      },
      {
        selector: '[data-al-motion="card"]',
        keyframes: 'pop',
        motion: `${SLOW} ${EMPHASIZED}`,
        delay: FAST,
      },
    ],
  },
  'modal-exit': {
    pattern: 'coordinated',
    tracks: [
      {
        selector: '[data-al-motion="card"]',
        keyframes: 'shrink',
        motion: `${BASE} ${EXIT}`,
        delay: '0ms',
      },
      {
        selector: '[data-al-motion="scrim"]',
        keyframes: 'fade-out',
        motion: `${BASE} ${EXIT}`,
        delay: '0ms',
      },
    ],
  },

  // --- Shared element --------------------------------------------------------
  'detail-transition': {
    pattern: 'shared-element',
    from: '[data-al-motion="thumbnail"]',
    to: '[data-al-motion="detail"]',
    motion: `${SLOW} ${EMPHASIZED}`,
    properties: ['transform', 'border-radius'],
    fallback: {
      pattern: 'coordinated',
      tracks: [
        {
          selector: '[data-al-motion="detail"]',
          keyframes: 'pop',
          motion: `${BASE} ${ENTRANCE}`,
          delay: '0ms',
        },
      ],
    },
  },
};

export type ChoreographyName = keyof typeof choreography;
