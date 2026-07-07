import { defineConfig } from 'vite';

// The landing page is published at the site root on Cloudflare Pages, so it
// builds straight into the shared dist/ root. emptyOutDir:false because the
// sibling app/storybook builds and copy:components have already populated
// dist/ by the time this runs (it's the last step of build:all).
export default defineConfig({
  base: '/',
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
  },
});
