// import type { StorybookConfig } from '@storybook/web-components-webpack5';

// import { join, dirname } from 'path';

// /**
//  * This function is used to resolve the absolute path of a package.
//  * It is needed in projects that use Yarn PnP or are set up within a monorepo.
//  */
// function getAbsolutePath(value: string): any {
//   return dirname(require.resolve(join(value, 'package.json')));
// }
// const config: StorybookConfig = {
//   stories: [
//     './components/**/*.mdx', 
//     './components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
//     '../components/**/*.stories.@(js|jsx|mjs|ts|tsx)',
//     './recipes/**/*.stories.@(js|jsx|ts|tsx|mdx)'
//   ],
//   addons: [getAbsolutePath('@storybook/addon-links'), getAbsolutePath('@storybook/addon-essentials')],
//   framework: {
//     name: getAbsolutePath('@storybook/web-components-webpack5')
//   },
//   docs: {
//     autodocs: 'tag'
//   }
// };
// export default config;

/** @type { import('@storybook/web-components-webpack5').StorybookConfig } */
const config = {
  stories: [
    '../components/**/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  addons: [
    "@storybook/addon-links",
    '@storybook/addon-essentials',
      {
        name: '@storybook/addon-styling',
        options: {
          sass: {
            // Require your Sass preprocessor here
            implementation: require('sass'),
          },
        },
      },
    "@storybook/addon-a11y",
    "@etchteam/storybook-addon-status"
  ],
  framework: {
    name: "@storybook/web-components-webpack5",
    options: {},
  },
  docs: {
    autodocs: true,
  },
  // Other Storybook options
  webpackFinal: async config => {
    // Add your custom webpack configuration file here
    config.module.rules.push({
      test: /\.(j|t)sx?$/,
      use: ['babel-loader']
    });

    // Resolve file extensions
    config.resolve.extensions.push('.js', '.ts', '.jsx', '.tsx', '.scss', '.yml');

    // Return the updated Storybook webpack configuration
    return config;
  },
};
export default config;
