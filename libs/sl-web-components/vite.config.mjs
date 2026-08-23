// Vite library build for sl-web-components — the Southleft brand layer.
//
// Deliberately much smaller than `libs/al-web-components/vite.config.mjs`: this
// package has no icon system, no motion runtime, no token pipeline and no
// stylesheet entry. It is components and nothing else. What it DOES share is
// the two non-obvious pieces, and both are IMPORTED from Altitude rather than
// restated, so they cannot drift:
//
//   1. `rewriteScssImports()` — rewrites bare `import styles from './x.scss'`
//      to `?inline` so SCSS lands in the shadow root as a string instead of
//      being side-effected into <head>. Every component here relies on it.
//   2. The esbuild decorator settings (`experimentalDecorators`,
//      `useDefineForClassFields: false`). Lit's `@property accessor` breaks
//      silently without them.
//
// NOTE this build is not yet wired into the root `build:all` — see the
// `//build` note in package.json.

import { defineConfig } from 'vite';
import { dirname, join } from 'node:path';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rewriteScssImports } from '../al-web-components/vite-plugins/rewrite-scss-imports.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * One entry per component directory that declares a tag.
 *
 * Detected on `static el =` rather than `extends ALElement`, matching
 * Altitude's own discovery — the superclass can legitimately be an
 * intermediate base, and a naive superclass check silently drops entries.
 */
function findComponentEntries(componentsRoot) {
  const out = {};
  for (const name of readdirSync(componentsRoot)) {
    if (name.startsWith('.') || name.endsWith('.ts')) continue;
    const dir = join(componentsRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    const ts = join(dir, `${name}.ts`);
    if (existsSync(ts)) out[name] = ts;
  }
  return out;
}

const entries = {
  ...findComponentEntries(join(__dirname, 'components')),
  bundle: join(__dirname, 'components/bundle.ts'),
};

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
  css: {
    preprocessorOptions: {
      scss: { api: 'modern-compiler' },
    },
  },
  plugins: [rewriteScssImports()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    // tsc co-writes .d.ts into the same dist; the build script wipes it first.
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    copyPublicDir: false,
    rollupOptions: {
      input: entries,
      // Lit stays external — this package composes it, it does not vendor it.
      //
      // KNOWN LIMITATION, deliberate for now. Components here import Altitude
      // by RELATIVE SOURCE PATH (`../../../al-web-components/components/…`)
      // rather than by package specifier, because the specifier resolves three
      // different ways depending on who is compiling: tsc follows `exports` to
      // `dist/**/*.d.ts`, plain Vite follows `exports` to built `dist/*.js`,
      // and the Storybook config aliases the bare name to the PACKAGE ROOT
      // (`.storybook/main.ts:196`), under which `al-web-components/ALElement`
      // does not exist at all. A relative source path resolves identically in
      // all three.
      //
      // The cost is that this build inlines the Altitude modules it touches
      // (ALElement, layout, chip, heading) instead of leaving them external.
      // That is acceptable while nothing consumes `dist` — the build is not in
      // `build:all` and the Storybook compiles from source. Switch to package
      // specifiers plus a matching `external` entry at the same time as wiring
      // apps/southleft to the package (spec T11); doing it now would mean
      // shipping a resolution scheme no consumer exercises.
      external: [/^lit(\/.*)?$/, /^lit-html(\/.*)?$/, /^@lit\/.*/],
      preserveEntrySignatures: 'strict',
      output: {
        format: 'es',
        minifyInternalExports: false,
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: (chunk) =>
          chunk.name === 'bundle' ? 'components/bundle/bundle.js' : `components/${chunk.name}/${chunk.name}.js`,
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
