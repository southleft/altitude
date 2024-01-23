import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    "@etchteam/storybook-addon-status"
  ],

  webpackFinal: (config) => {
    // Add SCSS support
    config.module.rules.push({
      test: /\.scss/,
      use: [
        'css-loader',
        { loader: 'sass-loader' }
      ]
    });

    // disable whatever is already set to load SVGs
    // config.module.rules.filter((rule) => rule.test.test('.svg')).forEach((rule) => (rule.exclude = /\.svg$/i));

    // add SVGR instead
    // config.module.rules.push({
    //   test: /\.svg$/,
    //   use: [
    //     {
    //       loader: '@svgr/webpack'
    //     },
    //     {
    //       loader: 'file-loader',
    //       options: {
    //         name: 'static/media/[path][name].[ext]'
    //       }
    //     }
    //   ],
    //   type: 'javascript/auto',
    //   issuer: {
    //     and: [/\.(ts|tsx|js|jsx|md|mdx)$/]
    //   }
    // });

    return config;
  },

  // Adjust the Babel config before it gets to Storybook
  // babel: async (options) => {
    // Ensure the babel config is setup to work with Lit. Bug here describes the break, https://github.com/lit/lit/issues/1914
    // The GH Issue indicates that the decorator plugin should be configured with `decoratorsBeforeExport`, which
    // Storybook does not do. So, we'll add that in here.
    //
    // Unfortunately the `decoratorsBeforeExport` also conflicts with the Storybook default config of `legacy: true` so
    // we'll need to remove that too.
    // https://lit.dev/docs/components/decorators/#avoiding-issues-with-class-fields
  //   options.plugins = options.plugins.map((plugin) => {
  //     if (plugin[0].includes('@babel/plugin-proposal-decorators')) {
  //       if (plugin[1].legacy) {
  //         delete plugin[1].legacy;
  //       }
  //       plugin[1].decoratorsBeforeExport = true;
  //     }

  //     return plugin;
  //   });

  //   return options;
  // }
};

export default config;
