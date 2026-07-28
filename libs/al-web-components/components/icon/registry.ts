import type { AltitudeIconDef, ALIconWeight } from './types';

/**
 * The icon registry.
 *
 * A synchronous `Map` is the core of the design: `getIcon` is the only lookup
 * that works under `@lit-labs/ssr`, which renders without an await point. The
 * async path exists purely as an opt-in convenience (see ./lazy.ts).
 *
 * Note this is a module-level singleton, so two Altitude versions coexisting
 * via `registerAltitude({ mode: 'versioned' })` share one registry. That is
 * benign — glyph definitions are immutable path data and registration is
 * first-write-wins — but it is an asymmetry with the versioned-tag isolation
 * model worth knowing about.
 */

type Key = string;

const key = (name: string, weight: ALIconWeight): Key => `${weight}/${name}`;

const icons = new Map<Key, AltitudeIconDef>();
const inflight = new Map<Key, Promise<AltitudeIconDef | undefined>>();
const subscribers = new Set<() => void>();

export type IconResolver = (name: string, weight: ALIconWeight) => Promise<AltitudeIconDef | undefined>;

let resolver: IconResolver | undefined;

/**
 * Register glyphs synchronously. Called at module scope by the generated
 * element modules and by consumers wiring up explicit imports:
 *
 *   import { caretDown } from '.../icon/glyphs.js';
 *   registerIcons({ 'caret-down': caretDown });
 *
 * First write wins, so a legacy element module can never clobber an explicit
 * registration made earlier by the application.
 */
export function registerIcons(defs: Record<string, AltitudeIconDef>, weight: ALIconWeight = 'regular'): void {
  let added = false;
  for (const name of Object.keys(defs)) {
    const k = key(name, weight);
    if (!icons.has(k)) {
      icons.set(k, defs[name]);
      added = true;
    }
  }
  if (added) {
    for (const fn of subscribers) fn();
  }
}

/**
 * Install an async fallback for names that were never registered.
 *
 * SECURITY: a resolver is trusted-source-only. The built-in one (./lazy.ts)
 * imports pre-compiled lit templates from inside this package. Do NOT write a
 * resolver that fetches SVG text over the network and feeds it to `unsafeSVG` —
 * that is a markup-injection sink.
 */
export function setIconResolver(fn: IconResolver | undefined): void {
  resolver = fn;
}

export function hasIconResolver(): boolean {
  return resolver !== undefined;
}

/** Synchronous lookup. The only path that renders under SSR. */
export function getIcon(name: string, weight: ALIconWeight = 'regular'): AltitudeIconDef | undefined {
  return icons.get(key(name, weight));
}

/** Async lookup. Resolves immediately when the glyph is already registered. */
export function resolveIcon(name: string, weight: ALIconWeight = 'regular'): Promise<AltitudeIconDef | undefined> {
  const k = key(name, weight);
  const hit = icons.get(k);
  if (hit) return Promise.resolve(hit);
  if (!resolver) return Promise.resolve(undefined);

  // De-duplicate concurrent requests: 20 <al-icon name="x"> on one page must
  // trigger one dynamic import, not 20.
  let pending = inflight.get(k);
  if (!pending) {
    pending = resolver(name, weight)
      .then((def) => {
        if (def) registerIcons({ [name]: def }, weight);
        return def;
      })
      .finally(() => inflight.delete(k));
    inflight.set(k, pending);
  }
  return pending;
}

/**
 * Subscribe to registrations.
 *
 * Load-bearing: an `<al-icon name="x">` that renders *before* the module
 * registering `x` is imported would otherwise stay permanently blank. Any
 * registration race repaints instead.
 */
export function subscribeToIconRegistry(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Test/debug helper — the set of currently registered `weight/name` keys. */
export function registeredIconKeys(): string[] {
  return [...icons.keys()];
}
