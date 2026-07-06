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

// SCSS import-rewrite plugin — mirrors the main vite.config.mjs. Components
// (e.g. ALElement.ts) use bare `import styles from './x.scss'`; Vite needs the
// `?inline` query to hand back the raw CSS string. Without this, the spike
// build fails with `"default" is not exported by "…scss"`.
function rewriteScssImports() {
  const importRe = /(import\s+\w+\s+from\s+['"][^'"]+\.scss)(['"])/g;
  return {
    name: 'altitude-rewrite-scss',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.tsx?$/.test(id)) return null;
      if (!/\.scss['"]/.test(code)) return null;
      const out = code.replace(importRe, (m, before, quote) => `${before}?inline${quote}`);
      return out === code ? null : { code: out, map: null };
    },
  };
}

export default defineConfig({
  plugins: [rewriteScssImports()],
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
      // Externalize lit (production library shape). The spike acceptance is
      // about the SCSS-into-shadow-root pipeline, not about runtime loading.
      external: [/^lit(\/.*)?$/],
      output: { preserveModules: false, minifyInternalExports: false },
    },
    sourcemap: true,
    minify: false,
  },
});
