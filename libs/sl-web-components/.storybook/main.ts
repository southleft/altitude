import type { StorybookConfig } from '@storybook/web-components-webpack5';

const config: StorybookConfig = {
  stories: [
    './components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    '../components/**/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './recipes/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    "@storybook/addon-a11y",
    "@etchteam/storybook-addon-status",
  ],
  framework: {
    name: "@storybook/web-components-webpack5",
    options: {},
  },
  staticDirs: ['./static'],
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