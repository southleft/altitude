/**
 * Element-scoped CSS token resolution for the motion runtime.
 *
 * WHY THIS DIFFERS FROM THE SOURCE SYSTEM
 * ---------------------------------------
 * The WP starter kit's runtime reads its duration/easing tokens off
 * `document.documentElement` and memoizes them in a module-global cache. That
 * works there because `:root` is the only scope in play.
 *
 * Altitude scopes tokens on `<al-theme>` hosts (`components/theme/theme.scss`),
 * not just `:root` — multiple brands and multiple `motion` axis values can
 * coexist in one document. Reading from `documentElement` would make the JS
 * layer theme-blind: an `<al-theme motion="reduced">` subtree would still
 * animate at full duration.
 *
 * So resolution here is relative to the ELEMENT BEING ANIMATED. Custom
 * properties inherit through shadow boundaries, so `getComputedStyle(el)` sees
 * whatever the nearest governing `<al-theme>` declared, for free.
 *
 * Two further departures, both deliberate:
 *
 * 1. `var(--a, var(--b))` FALLBACK CHAINS are walked here. Altitude's role
 *    tokens (`--al-theme-animation-duration-role-*`) have no `:root` default by
 *    design — see `.altitude/AXES.md` §2.3 for the proof that giving them one
 *    makes them brand-blind. A component reads them as
 *    `var(--role, var(--legacy))`; this module has to do the same, because
 *    `getPropertyValue()` returns '' for an undeclared property rather than
 *    following the fallback.
 *
 * 2. NO CROSS-CALL CACHE. The source memoizes globally and clears the cache on
 *    the `prefers-reduced-motion` change event. That misses every other way a
 *    resolved value can go stale in Altitude: an `<al-theme>` attribute flip,
 *    a brand switch, or two different `<al-theme>` scopes wanting different
 *    answers for the same token name. A cache is created per `run()` call
 *    instead — long enough to matter (one run resolves 2-4 tokens), short
 *    enough that staleness is structurally impossible.
 */

/** Per-invocation memo. Created by `createCache()`, discarded when a run ends. */
export type TokenCache = Map<string, string>;

export const createCache = (): TokenCache => new Map();

/** Index of the `)` matching the `(` at `open`; -1 when unbalanced. */
function matchParen(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split on whitespace that sits OUTSIDE any parentheses.
 *
 * `"var(--a, var(--b)) var(--c, cubic-bezier(0, 0, 0.2, 1))"` has to split into
 * exactly two parts. A naive `.split(/\s+/)` shatters both the fallback chain
 * and the bezier's argument list.
 */
export function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && /\s/.test(ch)) {
      if (current) {
        out.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current) out.push(current);
  return out;
}

/** Read one custom property off `scope`'s computed style. '' when undeclared. */
function readCustomProperty(scope: Element, name: string, cache: TokenCache): string {
  const hit = cache.get(name);
  if (hit !== undefined) return hit;
  let value = '';
  try {
    value = getComputedStyle(scope).getPropertyValue(name).trim();
  } catch {
    // Non-DOM environment, or a detached node with no view. Fall through to ''
    // so the caller's fallback chain takes over.
    value = '';
  }
  cache.set(name, value);
  return value;
}

/**
 * Resolve a single token expression against `scope`.
 *
 * - `var(--a)`              → the computed value of `--a`, or '' when undeclared
 * - `var(--a, var(--b))`    → `--a` if declared, else recurse into `--b`
 * - `var(--a, 240ms)`       → `--a` if declared, else the literal `240ms`
 * - `240ms` / `cubic-bezier(...)` → returned verbatim
 */
export function resolveValue(raw: string, scope: Element, cache: TokenCache): string {
  const input = String(raw).trim();
  if (!input.startsWith('var(')) return input;

  const close = matchParen(input, 3);
  if (close === -1) return input; // unbalanced — hand it back untouched

  const inner = input.slice(4, close);
  const comma = inner.indexOf(',');
  const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
  const fallback = comma === -1 ? '' : inner.slice(comma + 1).trim();

  const value = readCustomProperty(scope, name, cache);
  // Browsers substitute var() inside custom-property values at computed-value
  // time, so `value` is normally already literal. Recurse anyway: a browser
  // that hands back an unsubstituted reference must not break the runtime.
  if (value) return value.startsWith('var(') ? resolveValue(value, scope, cache) : value;

  return fallback ? resolveValue(fallback, scope, cache) : '';
}

/** `"<duration> <easing>"` → WAAPI timing parts, each resolved against `scope`. */
export function resolveTransition(
  raw: string,
  scope: Element,
  cache: TokenCache
): { duration: string; easing: string } {
  const parts = splitTopLevel(String(raw).trim());
  const duration = resolveValue(parts[0] ?? '', scope, cache) || '0s';
  const easing = parts.length > 1 ? resolveValue(parts.slice(1).join(' '), scope, cache) || 'linear' : 'linear';
  return { duration, easing };
}

/** CSS time string → milliseconds. `0.2s` → 200, `100ms` → 100, junk → 0. */
export function toMs(value: string): number {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  return String(value).includes('ms') ? n : n * 1000;
}

/** Resolve a duration-ish field (token ref or literal) straight to milliseconds. */
export function toMsResolved(raw: string, scope: Element, cache: TokenCache): number {
  return toMs(resolveValue(raw, scope, cache));
}
