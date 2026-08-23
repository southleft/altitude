/**
 * Reduced-motion detection, scoped to the element being animated.
 *
 * Altitude has TWO authorities for reduced motion and they do not always agree:
 *
 *   a. the `<al-theme motion>` axis — `components/theme/theme.scss:94-121`,
 *      which zeroes the role duration tokens for `motion="reduced"` and, via
 *      its own `@media (prefers-reduced-motion: reduce)` block, for any theme
 *      that has not explicitly opted back in with `motion="full"`;
 *   b. the OS `prefers-reduced-motion` query itself.
 *
 * (b) matters on its own because theme.scss only zeroes tokens on `:host` —
 * content that is NOT wrapped in an `<al-theme>` gets no reduced-motion
 * treatment from the token layer at all. Deciding from the OS query alone
 * would be wrong in the other direction: it would ignore an explicit
 * `motion="full"` opt-in and an explicit `motion="reduced"` on a machine with
 * no OS preference set.
 *
 * So the check reads the TOKENS first (which encodes theme.scss's whole
 * cascade, including its accessibility-first `:not([motion='full'])` rule,
 * without duplicating a single selector in JS) and only falls back to the raw
 * OS query for content no theme governs.
 */

import { resolveValue, toMs, type TokenCache } from './resolve.js';

/**
 * The role token whose resolved value encodes the axis decision. Its fallback
 * chain mirrors what a wired component stylesheet writes — see
 * `accordion-panel.scss:39`.
 */
const ROLE_BASE = 'var(--al-theme-animation-duration-role-base, var(--al-theme-animation-duration))';

/** Plain `al-theme`, or a version-suffixed alias from `registerAltitude({ mode: 'versioned' })`. */
const AL_THEME_TAG = /^al-theme(-\d+){0,3}$/;

function prefersReducedOS(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Walk the COMPOSED ancestry (hopping shadow boundaries via `ShadowRoot.host`)
 * looking for the nearest governing theme host. `Element.closest()` cannot do
 * this — it stops dead at a shadow root, and every Altitude component renders
 * into one.
 *
 * Returns true only when the nearest `<al-theme>` explicitly opted back in with
 * `motion="full"`. Nearest wins, matching how the CSS cascade resolves nested
 * theme hosts.
 */
function nearestThemeOptsIntoFullMotion(start: Element | null): boolean {
  let node: Node | null = start;
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE && AL_THEME_TAG.test((node as Element).localName)) {
      return (node as Element).getAttribute('motion') === 'full';
    }
    const parent: Node | null = node.parentNode;
    node = parent && (parent as ShadowRoot).host ? (parent as ShadowRoot).host : parent;
  }
  return false;
}

/**
 * Should this element animate without motion?
 *
 * Note the asymmetry: a zeroed token is treated as authoritative, but a
 * NON-zero token is not treated as "motion is fine" — because an unthemed
 * element resolves to the un-zeroed `:root` default no matter what the user's
 * OS preference says. Only an explicit `motion="full"` overrides the OS.
 */
export function isReducedMotion(scope: Element, cache: TokenCache): boolean {
  const themed = resolveValue(ROLE_BASE, scope, cache);
  if (themed && toMs(themed) === 0) return true;

  if (!prefersReducedOS()) return false;
  return !nearestThemeOptsIntoFullMotion(scope);
}
