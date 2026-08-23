/**
 * Custom-element registration for the Altitude design system.
 *
 * Two APIs:
 *   - Legacy: `register({ elements, prefix?, suffix? })`. Mirrors the
 *     pre-v2 behavior — registers each element under
 *     `<prefix>-<name>-<suffix>` if any of prefix/suffix is set, otherwise
 *     `<name>`. Returns a `Map<original, registered>` so callers can rebind
 *     templated tag names.
 *   - v2: `registerAltitude({ mode, suffix? }, [elements...])`. The
 *     explicit registry-modes API the plan defines at T4.6. Modes:
 *       - `stable`   — plain tag (`al-button`). `suffix` ignored.
 *       - `versioned`— suffixed tag (`al-button-1-2-3`). `suffix` required.
 *       - `manual`   — never calls `customElements.define`; the consumer
 *                      decides when to register.
 *     Emits a console diagnostic if a tag would collide with an existing
 *     `customElements` registration in dev mode (NODE_ENV !== 'production').
 *
 * The legacy `register` is preserved bit-for-bit so existing call sites
 * (theme-switcher, every React wrapper) keep working unchanged. T4.5 +
 * downstream codemods will migrate call sites to `registerAltitude`.
 */

type ElementTuple = [string, any];
type ElementsInput = ElementTuple | ElementTuple[];

const isDev = typeof process === 'undefined' || (process as any).env?.NODE_ENV !== 'production';

function normalizeElements(elements: ElementsInput): ElementTuple[] {
  return Array.isArray(elements[0]) ? (elements as ElementTuple[]) : [elements as ElementTuple];
}

function sanitize(part: string | undefined): string {
  return part ? part.replace(/[\W_]/g, '-') : '';
}

function defineSafely(alias: string, elementClass: any): void {
  // No DOM: bail out instead of throwing. Every al-react wrapper (and every
  // composite web component) calls register() at MODULE SCOPE, so without this
  // guard `import 'al-react'` in a Node process with no DOM shim — SSR, a unit
  // test runner, a Next.js server component — throws `customElements is not
  // defined` at import time, before any consumer code runs. Callers still get
  // their alias Map back; only the define() is skipped.
  if (typeof customElements === 'undefined') {
    return;
  }
  if (customElements.get(alias)) {
    if (isDev) {
      const existing = customElements.get(alias);
      if (existing !== elementClass) {
        console.warn(
          `[altitude] tag collision: '${alias}' is already registered to a different class. ` +
            `Use 'versioned' or 'manual' registry mode to coexist with another Altitude version.`
        );
      }
    }
    return;
  }
  try {
    customElements.define(alias, elementClass);
  } catch (error) {
    console?.error(`[altitude] error registering '${alias}'`, error);
  }
}

// ---------- legacy API (unchanged behavior) ----------

export default function register({
  elements,
  prefix,
  suffix,
}: {
  elements: ElementsInput;
  prefix?: string;
  suffix?: string;
}): Map<string, string> {
  const normalized = normalizeElements(elements);
  const sanitizedPrefix = sanitize(prefix);
  const sanitizedSuffix = sanitize(suffix);

  return normalized.reduce<Map<string, string>>((map, [name, elementClass]) => {
    let alias = sanitizedPrefix ? `${sanitizedPrefix}-${name}` : name;
    alias = sanitizedSuffix ? `${alias}-${sanitizedSuffix}` : alias;
    defineSafely(alias, elementClass);
    map.set(name, alias);
    return map;
  }, new Map());
}

// ---------- T4.6 — explicit modes ----------

export type RegistryMode = 'stable' | 'versioned' | 'manual';

export interface RegisterAltitudeOptions {
  mode: RegistryMode;
  /** Required when mode === 'versioned'. Sanitized to kebab. */
  suffix?: string;
  /** Optional prefix; sanitized to kebab. */
  prefix?: string;
}

/**
 * v2 registry entry-point. Behavior:
 *  - `stable`    → plain tag, `suffix` ignored (warns in dev if set).
 *  - `versioned` → `<prefix?>-<name>-<suffix>`. Throws in dev if `suffix`
 *                  is missing.
 *  - `manual`    → returns the alias map without touching
 *                  `customElements`. The caller decides when to define.
 */
export function registerAltitude(
  opts: RegisterAltitudeOptions,
  elements: ElementsInput
): Map<string, string> {
  const { mode } = opts;
  const sanitizedPrefix = sanitize(opts.prefix);
  const sanitizedSuffix = sanitize(opts.suffix);
  const normalized = normalizeElements(elements);

  if (mode === 'versioned' && !sanitizedSuffix) {
    const msg = `[altitude] registerAltitude({ mode: 'versioned' }) requires a non-empty 'suffix'.`;
    if (isDev) throw new Error(msg);
    console.error(msg);
    return new Map();
  }
  if (mode === 'stable' && opts.suffix) {
    if (isDev) {
      console.warn(`[altitude] registerAltitude({ mode: 'stable' }) ignores 'suffix' — got '${opts.suffix}'.`);
    }
  }

  return normalized.reduce<Map<string, string>>((map, [name, elementClass]) => {
    let alias = sanitizedPrefix ? `${sanitizedPrefix}-${name}` : name;
    if (mode === 'versioned') alias = `${alias}-${sanitizedSuffix}`;

    if (mode !== 'manual') defineSafely(alias, elementClass);
    map.set(name, alias);
    return map;
  }, new Map());
}
