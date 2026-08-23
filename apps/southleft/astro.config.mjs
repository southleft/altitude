import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
// T6 (spec 2026-08-20-southleft-example-app) — serves POST /api/theme during
// `astro dev`, mirroring the Cloudflare Pages Function that serves it in
// production (functions/api/theme.js). Dev-server-only Node middleware, so it
// is NOT part of the browser `@southleft/al-web-components/theme-engine` export and is
// deliberately imported by relative path: it lives alongside the library's
// other build-time plugins and is never packed into the published tarball.
import { themeApiPlugin } from '../../libs/al-web-components/vite-plugins/theme-api.mjs';
// T11 — dev-only local media middleware (serves southleft-v5's real
// public/media/ at /media when present; see src/lib/vite-plugin-local-media.mjs).
import { localMediaPlugin } from './src/lib/vite-plugin-local-media.mjs';

// Served under /southleft on Cloudflare Pages, same convention as the other
// example apps (apps/astro/astro.config.mjs) — the monorepo publishes dist/
// at the site root, so each example app lives at /<name>/.
//
// `site` is the eventual production origin (southleft.com) — used by
// @astrojs/sitemap and the RSS/JSON-LD surfaces to emit absolute URLs; it is
// NOT where this playground build is actually served (that's /southleft/,
// via `base` below). Both facts matter: sitemap.xml and rss.xml should
// advertise the real go-live URLs even while the app previews at /southleft.
export default defineConfig({
  site: 'https://southleft.com',
  base: '/southleft',
  outDir: '../../dist/southleft',
  build: { assets: '_astro' },
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  // This is a demo/production-bound app, not a scratch fixture — the dev
  // toolbar has no audience here and was getting captured mid-page in
  // full-page screenshots (T8 verification), overlapping page content.
  devToolbar: { enabled: false },
  vite: {
    plugins: [themeApiPlugin(), localMediaPlugin()],
  },
  // Media references (`/media/<file>`) were rewritten once, directly in the
  // migrated markdown, by scripts/rewrite-media-base.mjs — see that file and
  // src/lib/media.mjs for why a build-time rehype pass was NOT used
  // (Astro 7's default markdown compiler does not walk raw-HTML img tags
  // embedded in markdown before this integration point runs).
  // Legacy URL redirects carried over from southleft-v5's astro.config.mjs
  // (spec T4-1) — southleft-v5 is the source of truth for these; see
  // https://github.com/southleft/southleft-v5 astro.config.mjs.
  redirects: {
    '/resources': '/insights',
    '/site-map': '/',
    '/cat-grooming-services': '/',
    '/maintenance-support-package-calculator': '/contact',
    '/referral-program': '/contact',
    '/altitude': '/tools/altitude',
    '/services/web-design-development': '/services',
    '/services/advanced-development-solutions': '/services/team-augmentation',
    '/services/front-end-development-consulting': '/services/team-augmentation',
    '/services/digital-design-system-development': '/services/design-systems',
  },
});
