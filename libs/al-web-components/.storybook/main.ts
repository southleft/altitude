import { dirname, join } from "path";
import type { StorybookConfig } from '@storybook/web-components-webpack5';

const config: StorybookConfig = {
  framework: {
    name: getAbsolutePath("@storybook/web-components-webpack5"),
    options: {},
  },

  stories: ['./docs/*.@(js|jsx|ts|tsx|mdx)', '../components/**/**/*.@(mdx|stories.@(js|jsx|ts|tsx))', './components/**/**/*.mdx', './components/**/*.@(mdx|stories.@(js|jsx|ts|tsx))', './recipes/**/*.@(mdx|stories.@(js|jsx|ts|tsx))', './templates/**/*.@(mdx|stories.@(js|jsx|ts|tsx))', './pages/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],

  addons: [
    getAbsolutePath("@storybook/addon-essentials"),
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@etchteam/storybook-addon-status"),
    getAbsolutePath("@storybook/addon-interactions"),
    getAbsolutePath("@storybook/blocks"),
    {
      name: '@storybook/addon-coverage',
      options: {
        istanbul: {
          include: ['**/components/**'],
          exclude: ['**/components/ALElement.ts', '**/components/icon/**'],
          excludeNodeModules: true
        }
      }
    },
    '@storybook/addon-webpack5-compiler-babel'
  ],

  staticDirs: ['./static'],

  // Other Storybook options
  webpackFinal: async (config) => {
    // Add SCSS support
    config.module.rules.push({
      test: /\.scss$/,
      use: [
        'css-loader',
        { loader: 'sass-loader' }
      ]
    });

    // Add svg support
    config.module.rules.push({
      test: /\.svg$/,
      type: 'asset/source'
    });

    // Return the modified Webpack Config
    return config;
  },

  docs: {
    autodocs: true
  }
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}