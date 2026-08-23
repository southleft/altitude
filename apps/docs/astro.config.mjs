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
});
