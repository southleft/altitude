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
import { rewriteScssImports } from './vite-plugins/rewrite-scss-imports.mjs';

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
      // Detect on `static el = `, not `extends ALElement`. Every registerable
      // component declares a tag name that way, whereas the superclass varies —
      // `ALIcon` extends `ALIconBase` (which extends ALElement), and a naive
      // superclass check silently dropped components/icon/icon.ts from the build.
      if (/static\s+el\s*=/.test(src)) out[name] = ts;
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

// Public entry points of the Phosphor icon system. These need stable dist paths
// because consumers import them directly:
//
//   import { caretDown } from 'al-web-components/dist/components/icon/glyphs.js';
//   import { registerIcons } from 'al-web-components/dist/components/icon/registry.js';
//
// `catalog.ts` and `all.ts` are deliberately NOT entries — they are consumed
// from source by the Storybook catalog page and must never reach an app bundle.
// `types.ts` is type-only; tsc emits its declaration without a runtime chunk.
const iconApiEntries = {
  'icon/registry': join(__dirname, 'components/icon/registry.ts'),
  'icon/icon-base': join(__dirname, 'components/icon/icon-base.ts'),
  'icon/icon-aliases': join(__dirname, 'components/icon/icon-aliases.ts'),
  'icon/glyphs': join(__dirname, 'components/icon/glyphs.ts'),
  'icon/lazy': join(__dirname, 'components/icon/lazy.ts'),
  'icon/preload-node': join(__dirname, 'components/icon/preload-node.ts'),
};

const entries = {
  ...componentEntries,
  ...iconEntries,
  ...iconApiEntries,
  _register: join(__dirname, 'directives/register.ts'),
  ALElement: join(__dirname, 'components/ALElement.ts'),
  'controllers/form': join(__dirname, 'controllers/form.ts'),
  // Tier 3 motion runtime + its Lit delivery surface. Both are entries because
  // both are public subpaths; the runtime's internal modules (resolve, presets,
  // choreography, run, reduced) are deliberately NOT entries and get bundled or
  // shared-chunked behind them.
  'motion/index': join(__dirname, 'motion/index.ts'),
  'controllers/motion': join(__dirname, 'controllers/motion.ts'),
  bundle: join(__dirname, 'components/bundle.ts'),
  'styles-theme': join(__dirname, 'styles/theme.ts'),
};

// ---------- SCSS import-rewrite plugin ----------
//
// Moved to `./vite-plugins/rewrite-scss-imports.mjs` so the al-react Storybook
// can import the SAME plugin — it now compiles the shared `Foundations/*`
// documentation elements, which use the bare `import styles from './x.scss'`
// form. Imported at the top of this file; see that module for the rationale.

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
          // Icon system public API: `icon/registry` -> components/icon/registry.js
          if (chunk.name.startsWith('icon/')) return `components/${chunk.name}.js`;
          if (chunk.name === '_register') return 'directives/register.js';
          if (chunk.name === 'ALElement') return 'components/ALElement.js';
          if (chunk.name.startsWith('controllers/')) return `${chunk.name}.js`;
          // `motion/index` -> motion/index.js, matching the "./motion" export.
          if (chunk.name.startsWith('motion/')) return `${chunk.name}.js`;
          if (chunk.name === 'bundle') return 'components/bundle/bundle.js';
          // The stylesheet entry emits an (empty) JS shim; its payload is the
          // css/main.css asset above. `components/theme/theme.js` belongs to
          // the <al-theme> COMPONENT entry and is emitted by the default rule.
          if (chunk.name === 'styles-theme') return 'styles/theme.js';
          if (chunk.name === 'theme') return 'components/theme/theme.js';
          return `components/${chunk.name}/${chunk.name}.js`;
        },
        // Route pure Phosphor glyph data to its own directory. This is what makes
        // the `sideEffects` allowlist in package.json able to mark glyph chunks
        // side-effect-free WITHOUT also marking component chunks (which contain
        // `customElements.define` calls) — webpack's `sideEffects` array has no
        // negation, so the split has to happen by path.
        //
        // Without this, importing one glyph from glyphs.js retains all 1,512.
        chunkFileNames: (chunk) => {
          const ids = chunk.moduleIds || [];
          const isGlyph =
            ids.length > 0 && ids.every((id) => id.replace(/\\/g, '/').includes('/components/icon/phosphor/'));
          return isGlyph ? 'icon-glyphs/[name]-[hash].js' : 'chunks/[name]-[hash].js';
        },
      },
    },
  },
});
