import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  stories: [
    'components/**/*.stories.@(js|jsx|ts|tsx)',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    "@storybook/addon-a11y",
    "@etchteam/storybook-addon-status"

  ],
  staticDirs: ['static'],
  docs: {
    autodocs: true
  },

  // Other Storybook options
  webpackFinal: async (config, { configType }) => {
    // Add SCSS support
    config.module.rules.push({
      test: /\.scss/,
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
  }
};

export default config;