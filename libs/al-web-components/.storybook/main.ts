// T2.4 — Storybook 10 with the Vite builder.
//
// Replaces the legacy `@storybook/web-components-webpack5` + webpackFinal
// SCSS shim. The Vite builder consumes our existing vite.config.mjs via
// `viteFinal`; SCSS handling is native through Vite's built-in sass support.

import type { StorybookConfig } from '@storybook/web-components-vite';
import { mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Explicit extension: Storybook warns on extensionless imports in main.ts,
// and its ESM config loader resolves this path directly rather than through
// TypeScript's resolver.
import { themeApiPlugin } from './ai-theme/vite-plugin-theme-api.ts';

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
      // themeApiPlugin serves /api/theme during `storybook dev`, mirroring the
      // Cloudflare Pages Function that serves it in production. Without it the
      // AI panel would only work in the deployed build.
      plugins: [fileUrlResolver, themeApiPlugin()],
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
