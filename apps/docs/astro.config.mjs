import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Served under /docs on Cloudflare Pages, the same convention every other
// example app in this monorepo uses (apps/southleft/astro.config.mjs:20) —
// the repo publishes dist/ at the site root, so each app lives at /<name>/.
export default defineConfig({
  site: 'https://altitude.pages.dev',
  base: '/docs',
  outDir: '../../dist/docs',
  build: { assets: '_astro' },
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  // A docs site is the product here, not a scratch fixture; the dev toolbar
  // overlays the sidebar's theme control at the bottom-left.
  devToolbar: { enabled: false },

  vite: {
    optimizeDeps: {
      /*
       * NEVER PRE-BUNDLE THE WORKSPACE LIBRARIES.
       *
       * Vite copies a pre-bundled dep into node_modules/.vite/deps and keys the
       * cache on the dependency's package metadata, not on its build output. So
       * rebuilding `libs/al-web-components` leaves the dev server serving the
       * PREVIOUS dist indefinitely: the page keeps rendering the old component
       * while dist/ on disk is already correct.
       *
       * That is not a cosmetic staleness. It was measured mid-session on
       * al-table: the built file declared `property({ type: Array })` and the
       * live element's `observedAttributes` still carried neither `columns`
       * nor `data`, so an attribute-driven table rendered empty and looked
       * like a component bug rather than a stale cache.
       *
       * These are `workspace:*` source deps rebuilt constantly during
       * development — excluding them costs a little cold-start time and makes
       * the dev server always reflect the last library build.
       */
      exclude: ['@southleft/al-web-components', '@southleft/sl-web-components'],
    },
  },
});
