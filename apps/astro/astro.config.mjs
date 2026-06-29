import { defineConfig } from 'astro/config';

// Served under /astro on Cloudflare Pages (the monorepo publishes dist/ at the
// site root, so each example app lives at /<name>/). Output is written to the
// shared dist/ like the other example apps.
export default defineConfig({
  base: '/astro',
  outDir: '../../dist/astro',
  build: { assets: '_astro' },
});
