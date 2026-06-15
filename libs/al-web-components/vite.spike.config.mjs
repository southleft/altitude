// T2.1 — Vite SCSS spike, scoped to a single component (button).
//
// Proves the highest-risk landmine of T2.2: Lit components import SCSS as
// strings and feed them to `unsafeCSS` to land in the shadow root. Webpack +
// sass-loader compile the SCSS to a CSS module whose `.toString()` returns
// the source. Vite handles raw CSS differently — `?inline` is the canonical
// way to get the string back.
//
// Acceptance (per T2.1):
//   - SCSS compiles to a constructable stylesheet that lands in the shadow
//     root identically to the P0 baseline.
//   - VRT of the component matches P0 within tolerance.
//
// Output: libs/al-web-components/dist-vite-spike/

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        target: 'es2022',
        useDefineForClassFields: false,
        experimentalDecorators: true,
      },
    },
  },
  build: {
    target: 'es2022',
    lib: {
      // Spike copy with `?inline` SCSS import — see button.vite.ts.
      entry: resolve(import.meta.dirname, 'components/button/button.vite.ts'),
      formats: ['es'],
      fileName: 'button',
    },
    outDir: 'dist-vite-spike',
    emptyOutDir: true,
    rollupOptions: {
      // T2.1 spike: bundle lit IN so the test can load the file standalone
      // without an importmap dance. The T2.2 production build will externalize
      // lit per normal library conventions.
      external: [],
      output: { preserveModules: false },
    },
    sourcemap: true,
    minify: false,
  },
});
