import { defineConfig } from 'vite';

// The landing page is published at the site root on Cloudflare Pages, so it
// builds straight into the shared dist/ root. emptyOutDir:false because the
// sibling app/storybook builds and copy:components have already populated
// dist/ by the time this runs (it's the last step of build:all).
//
// AI Showcase Homepage (2026-08-20-ai-showcase-homepage, descoped 2026-08-20
// — see spec.md's Tasks note) — this app composes already-built
// @southleft/al-web-components components (imported from `dist/`, plain JS, no
// decorators to transpile) plus a page-level SCSS file for layout, so no
// esbuild decorator config is needed here (unlike @southleft/al-web-components' own
// vite.config.mjs, which compiles `@property() accessor foo` source).
export default defineConfig({
  base: '/',
  css: {
    preprocessorOptions: {
      scss: {
        // Sass's modern compiler API — matches al-web-components/vite.config.mjs
        // (Vite 5 in that package still defaults to the deprecated legacy JS
        // API; harmless to set here too even though this app's Vite 7 already
        // defaults to it).
        api: 'modern-compiler',
      },
    },
  },
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
  },
});
