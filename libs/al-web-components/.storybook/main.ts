// T2.4 — Storybook 10 with the Vite builder.
//
// Replaces the legacy `@storybook/web-components-webpack5` + webpackFinal
// SCSS shim. The Vite builder consumes our existing vite.config.mjs via
// `viteFinal`; SCSS handling is native through Vite's built-in sass support.

import type { StorybookConfig } from '@storybook/web-components-vite';
import { mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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
  staticDirs: ['../dist'],
  docs: {
    autodocs: true,
  } as any,
  viteFinal: async (cfg) => {
    return mergeConfig(cfg, {
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
      resolve: {
        alias: {
          'al-web-components': resolve(__dirname, '..'),
        },
      },
    });
  },
};

export default config;
