import type { StorybookConfig } from '@storybook/web-components-webpack5';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/web-components-webpack5',
    options: {},
  },
  stories: [
    './docs/*.@(js|jsx|ts|tsx|mdx)',
    '../components/**/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './components/**/**/*.mdx',
    './components/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './recipes/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './templates/**/*.stories.@(js|jsx|ts|tsx|mdx)',
    './pages/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@etchteam/storybook-addon-status',
    '@storybook/addon-interactions',
    '@storybook/blocks',
    {
      name: '@storybook/addon-coverage',
      options: {
        istanbul: {
          include: ['**/components/**'],
          exclude: ['**/components/ALElement.ts', '**/components/icon/**'],
          excludeNodeModules: true
        }
      }
    }
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
  }
};

export default config;