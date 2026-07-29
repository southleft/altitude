import { registerIcons } from './registry';
import type { ALIconWeight } from './types';

/**
 * SSR icon preloader.
 *
 * `@lit-labs/ssr` renders synchronously, so there is no await point inside
 * `render()`. That means the lazy resolver (./lazy.ts) cannot contribute glyphs
 * to server-rendered output — an `<al-icon name="...">` would serialize an empty
 * (correctly sized) placeholder into the Declarative Shadow DOM and only fill in
 * after hydration.
 *
 * Await this before rendering to make the synchronous `getIcon` fast path hit:
 *
 *   import { preloadIcons } from 'al-web-components/dist/components/icon/preload-node.js';
 *   await preloadIcons(['caret-down', 'x', 'magnifying-glass']);
 *   const ssrResult = render(template);
 *
 * The deprecated `<al-icon-*>` elements and any explicitly registered glyph
 * already render synchronously and need no preloading.
 */
export async function preloadIcons(names: readonly string[], weight: ALIconWeight = 'regular'): Promise<void> {
  const loaded = await Promise.all(
    names.map(async (name) => {
      try {
        const mod = await import(`./phosphor/${name}.js`);
        return [name, mod.default] as const;
      } catch {
        // Loud on the server: a missing preload is a build-time mistake, not a
        // runtime degradation the user should silently absorb.
        console.error(`[altitude] preloadIcons: no such icon "${name}" (${weight}).`);
        return undefined;
      }
    })
  );

  const defs = Object.fromEntries(loaded.filter(Boolean) as (readonly [string, never])[]);
  registerIcons(defs, weight);
}
