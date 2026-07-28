// T2.4 — Storybook 10 with the Vite builder.
//
// Replaces the legacy `@storybook/web-components-webpack5` + webpackFinal
// SCSS shim. The Vite builder consumes our existing vite.config.mjs via
// `viteFinal`; SCSS handling is native through Vite's built-in sass support.

import type { StorybookConfig } from '@storybook/web-components-vite';
import { mergeConfig } from 'vite';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Under pnpm's symlinked layout, @storybook/addon-docs's MDX loader injects
// an `import` whose specifier is a `file:///…` absolute URL pointing into
// the pnpm virtual store. Rollup cannot resolve `file:` URIs, so the
// preview build crashes on any MDX file. This plugin strips the prefix so
// Rollup sees an absolute filesystem path it can load.
const fileUrlResolver = {
  name: 'al-mdx-file-url-resolver',
  enforce: 'pre' as const,
  resolveId(id: string) {
    if (id.startsWith('file://')) return fileURLToPath(id);
    return null;
  },
};

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-flight for the toolbar preset switcher (R6).
//
// `.storybook/presets.ts` reads the emitted brand token bundles out of
// `styles/dist/scss/brand/`, which is a GENERATED, GITIGNORED build artifact
// (`libs/al-web-components/.gitignore:7`) produced by `build:tokens`. A fresh
// clone does not have it. Failing here, in Node, before the dev server boots,
// turns "the whole Storybook is broken" into one actionable line in the
// terminal.
//
// CI is fine as-is: the root `build:storybook-web-components`
// (`package.json:20`) is preceded by `pnpm run build`, and
// `libs/al-web-components/package.json` chains `build:tokens` first inside
// `build`.
const BRAND_BUNDLE_DIR = resolve(__dirname, '../styles/dist/scss/brand');
const brandBundles = existsSync(BRAND_BUNDLE_DIR)
  ? readdirSync(BRAND_BUNDLE_DIR).filter((f) => f.endsWith('.scss'))
  : [];
if (brandBundles.length === 0) {
  throw new Error(
    [
      '',
      '[al-storybook] Missing generated token bundles.',
      `  Expected *.scss in: ${BRAND_BUNDLE_DIR}`,
      '  styles/dist/ is a gitignored BUILD ARTIFACT — a fresh clone does not have it,',
      '  and .storybook/presets.ts (the toolbar preset switcher) needs it.',
      '',
      '  Fix:  pnpm --filter al-web-components build:tokens',
      '',
    ].join('\n'),
  );
}

const config: StorybookConfig = {
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  stories: [
    './docs/*.@(js|jsx|ts|tsx|mdx)',
    '../components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './components/**/*.mdx',
    './components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './recipes/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './templates/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './pages/**/*.stories.@(js|jsx|ts|tsx|mdx)',
  ],
  // Storybook 10 dropped addon-essentials (the docs/controls/measure/outline/
  // backgrounds/viewport modules now ship with core). a11y stays. interactions
  // is replaced by @storybook/test wiring (T2.4 sub-step).
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
  ],
  // '../dist' serves the built component modules; './static' serves the
  // manager brand assets (images/logo.svg referenced by theme.js brandImage).
  // Without './static' the sidebar logo 404s (Cloudflare then serves the SPA
  // fallback HTML for it, so the brand image is broken).
  staticDirs: ['../dist', './static'],
  docs: {
    autodocs: true,
  } as any,
  viteFinal: async (cfg) => {
    return mergeConfig(cfg, {
      plugins: [fileUrlResolver],
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
      // SCSS imports inside component .ts files use the bare form
      // `import styles from './x.scss'`. Vite returns a CSSResult-friendly
      // string already; no extra loader needed.
      css: {
        preprocessorOptions: {
          scss: {
            // Use Sass's modern compiler API (Vite 5 still defaults to
            // the deprecated legacy JS API).
            api: 'modern-compiler',
          },
        },
      },
      resolve: {
        alias: {
          'al-web-components': resolve(__dirname, '..'),
        },
      },
    });
  },
};

export default config;
