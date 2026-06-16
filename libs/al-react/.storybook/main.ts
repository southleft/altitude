// T2.4 — Storybook 10 + Vite builder for al-react.

import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: [
    'components/**/*.stories.@(js|jsx|ts|tsx)',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-a11y',
  ],
  staticDirs: ['../dist'],
  docs: { autodocs: true } as any,
  viteFinal: async (cfg) =>
    mergeConfig(cfg, {
      css: {
        preprocessorOptions: {
          scss: {
            // Use Sass's modern compiler API (Vite 5 still defaults to
            // the deprecated legacy JS API).
            api: 'modern-compiler',
          },
        },
      },
    }),
};

export default config;
