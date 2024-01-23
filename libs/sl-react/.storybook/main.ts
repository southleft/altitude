import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  stories: [
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  
  webpackFinal: (config) => {
    // Loop over each of module rules in our config. Module rules define the loaders
    // that Webpack will use. We're, specifically, looking for the CSS rule
    // config.module.rules.map((rule) => {
    //   // As we loop over the rules if the rule doesn't have a RegExp test or the
    //   // RegExp test doesn't match `.css` then we'll return the rule as-is with no
    //   // modifications being made.
    //   if (!rule.test || !rule.test.test || !rule.test.test('.css')) {
    //     return rule;
    //   }

    //   // If we're here then we're working with the CSS rule so we'll shift off the
    //   // first loader, which is the style-loader, since we want to manage styles
    //   // in lit-element, not via storybook/head injection
    //   rule.use.shift();

    //   // Return the modified CSS Webpack rule
    //   return rule;
    // });
    // Add SCSS support
    config.module.rules.push({
      test: /\.scss/,
      use: [
        'css-loader',
        {
          loader: 'sass-loader',
          options: {
            sassOptions: {
              importer: [
                function themeImport(url, prev, done) {
                  const matches = url.match(/^THEME\/(.*)/);
                  if (!matches) {
                    return null;
                  }

                  const node_modules = path.resolve(process.cwd(), 'node_modules');
                  const cachedThemePath = path.resolve(node_modules, './.cache/storybook-theme/theme');
                  if (fs.existsSync(cachedThemePath)) {
                    this.webpackLoaderContext.addDependency(fs.realpathSync(cachedThemePath));
                  }

                  const overridePath = fs.realpathSync(themePath(matches[1]));
                  this.webpackLoaderContext.addDependency(overridePath);
                  if (fs.existsSync(overridePath)) {
                    return {
                      file: overridePath
                    };
                  } else {
                    return {
                      contents: ''
                    };
                  }
                }
              ]
            }
          }
        }
      ]
    });

    // disable whatever is already set to load SVGs
    // config.module.rules.filter((rule) => rule.test.test('.svg')).forEach((rule) => (rule.exclude = /\.svg$/i));

    // add SVGR instead
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack'
        },
        {
          loader: 'file-loader',
          options: {
            name: 'static/media/[path][name].[ext]'
          }
        }
      ],
      type: 'javascript/auto',
      issuer: {
        and: [/\.(ts|tsx|js|jsx|md|mdx)$/]
      }
    });

    // config.resolve.alias = {
    // 	...config.resolve.alias,
    // 	"THEME": "en-web-components/tokens/en",
    //   "en-web-components": "../../en-web-components"
    // };
    return config;
  },

  // Adjust the Babel config before it gets to Storybook
  babel: async (options) => {
    // Ensure the babel config is setup to work with Lit. Bug here describes the break, https://github.com/lit/lit/issues/1914
    // The GH Issue indicates that the decorator plugin should be configured with `decoratorsBeforeExport`, which
    // Storybook does not do. So, we'll add that in here.
    //
    // Unfortunately the `decoratorsBeforeExport` also conflicts with the Storybook default config of `legacy: true` so
    // we'll need to remove that too.
    // https://lit.dev/docs/components/decorators/#avoiding-issues-with-class-fields
    options.plugins = options.plugins.map((plugin) => {
      if (plugin[0].includes('@babel/plugin-proposal-decorators')) {
        if (plugin[1].legacy) {
          delete plugin[1].legacy;
        }
        plugin[1].decoratorsBeforeExport = true;
      }

      return plugin;
    });

    return options;
  }
};

export default config;
