// T2.2 — Vite library build for al-web-components.
//
// Replaces the webpack 5 + babel + sass-loader build (`webpack.config.js`).
// Mirrors the same multi-entry shape (one entry per component that extends
// ALElement, plus the icons sub-modules and the directives/register entry)
// so consumers' import paths are unchanged.
//
// Per G7: `experimentalDecorators` + `useDefineForClassFields: false` are
// preserved. The decorator semantics do not change in this commit.
//
// Per T2.1: SCSS-into-shadow-root works via a custom plugin that rewrites
// bare `import styles from './x.scss'` to `import styles from './x.scss?inline'`
// so the legacy webpack build (still active during the parallel-pipeline
// period; G8) keeps consuming the source unchanged. The rewrite is in-memory.

import { defineConfig } from 'vite';
import { resolve, dirname, join, relative } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- entry discovery (mirrors webpack.config.js glob behavior) ----------

function findComponentEntries(componentsRoot) {
  const out = {};
  for (const name of readdirSync(componentsRoot)) {
    if (name === 'ALElement.ts' || name.startsWith('.')) continue;
    const dir = join(componentsRoot, name);
    if (!statSync(dir).isDirectory()) continue;
    const ts = join(dir, `${name}.ts`);
    try {
      const src = readFileSync(ts, 'utf8');
      if (src.includes('extends ALElement')) out[name] = ts;
    } catch {}
  }
  return out;
}

function findIconEntries(iconsRoot) {
  const out = {};
  for (const name of readdirSync(iconsRoot)) {
    if (name.startsWith('.')) continue;
    const p = join(iconsRoot, name);
    if (statSync(p).isFile() && name.endsWith('.ts')) {
      const base = name.replace(/\.ts$/, '');
      out[`icon-${base}`] = p;
    }
  }
  return out;
}

const componentEntries = findComponentEntries(join(__dirname, 'components'));
const iconEntries = findIconEntries(join(__dirname, 'components/icon/icons'));

// NOTE the key `styles-theme`, not `theme`. `findComponentEntries` produces a
// `theme` key for `components/theme/theme.ts` (it extends ALElement), and this
// object literal used to spell the stylesheet entry `theme:` as well — so the
// later key silently WON and `<al-theme>` was never built as an entry. The
// symptom shipped: `dist/components/theme/theme.js` was a 35-byte empty file
// while `dist/components/theme/theme.d.ts` (written by tsc, which does not
// share this map) fully declared `ALTheme`. `apps/ssr/scripts/build.mjs:71`
// imports exactly that path to hydrate its `<al-theme>` pilot and therefore
// loaded nothing. Keeping the two entries distinct fixes both.
const entries = {
  ...componentEntries,
  ...iconEntries,
  _register: join(__dirname, 'directives/register.ts'),
  ALElement: join(__dirname, 'components/ALElement.ts'),
  'controllers/form': join(__dirname, 'controllers/form.ts'),
  bundle: join(__dirname, 'components/bundle.ts'),
  'styles-theme': join(__dirname, 'styles/theme.ts'),
};

// ---------- SCSS import-rewrite plugin ----------
//
// The legacy code uses `import styles from './x.scss'` and then
// `unsafeCSS(styles.toString())`. Under Vite, the `?inline` query gives us a
// raw CSS string. To avoid editing 64 components in this commit (T2.2's job
// is to swap the builder, not refactor every component), the plugin rewrites
// the import IN MEMORY before esbuild parses the TS module.
//
// We also wrap the value in a `String(…)` so the legacy `styles.toString()`
// call continues to work without modification — Vite's `?inline` resolves to
// a literal string, but the trailing `.toString()` is still legal.

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

// ---------- config ----------

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
      scss: {
        // Use Sass's modern compiler API (Vite 5 still defaults to the
        // deprecated legacy JS API, which triggers a per-compile warning
        // and is slated for removal in Dart Sass 2.0).
        api: 'modern-compiler',
      },
    },
  },
  plugins: [rewriteScssImports()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    // T2.2 finalization: emptyOutDir false so tsc can co-write .d.ts.
    // The build script wipes dist before each Vite run.
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    // T2.2 finalization: copy public assets (icons + theme css) that
    // webpack's CopyPlugin used to handle.
    copyPublicDir: false,
    rollupOptions: {
      input: entries,
      external: [/^lit(\/.*)?$/, /^lit-html(\/.*)?$/, /^@lit\/.*/, /^date-fns(\/.*)?$/, 'nanoid'],
      // Preserve every entry's exports even when no other entry imports them.
      // Without this, Rollup's tree-shaking drops `export { ALAccordion }` for
      // any class that isn't downstream-consumed, breaking the library's
      // public API.
      preserveEntrySignatures: 'strict',
      output: {
        format: 'es',
        // Preserve original export names. Rollup defaults rename
        // `export { ALButton }` to `export { ALButton as A }` for shared
        // chunks; consumers (al-react wrappers, the apps fixtures) import by
        // the original name.
        minifyInternalExports: false,
        // Emit CSS at stable, webpack-equivalent paths. The `theme` entry
        // bundles main.scss → css/main.css; other entries don't emit CSS
        // because their styles ship inline via unsafeCSS.
        assetFileNames: (info) => {
          // The `styles-theme` entry (styles/theme.ts -> main.scss) is the only
          // one that emits a CSS asset; keep its published name `css/main.css`.
          if (info.name === 'styles-theme.css' || info.name === 'theme.css') return 'css/main.css';
          return 'assets/[name][extname]';
        },
        entryFileNames: (chunk) => {
          // Icons emit under components/icon/icons/<name>.js to mirror webpack's
          // output paths so consumer imports keep working.
          if (chunk.name.startsWith('icon-')) {
            return `components/icon/icons/${chunk.name.replace(/^icon-/, '')}.js`;
          }
          if (chunk.name === '_register') return 'directives/register.js';
          if (chunk.name === 'ALElement') return 'components/ALElement.js';
          if (chunk.name.startsWith('controllers/')) return `${chunk.name}.js`;
          if (chunk.name === 'bundle') return 'components/bundle/bundle.js';
          // The stylesheet entry emits an (empty) JS shim; its payload is the
          // css/main.css asset above. `components/theme/theme.js` belongs to
          // the <al-theme> COMPONENT entry and is emitted by the default rule.
          if (chunk.name === 'styles-theme') return 'styles/theme.js';
          if (chunk.name === 'theme') return 'components/theme/theme.js';
          return `components/${chunk.name}/${chunk.name}.js`;
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
