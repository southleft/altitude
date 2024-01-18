import type { StorybookConfig } from '@storybook/web-components-webpack5';
const NormalModuleReplacementPlugin = require('webpack').NormalModuleReplacementPlugin;
const path = require('path');
const fs = require('fs');

const themePath = (file = '') => {
  let node_modules = path.resolve(process.cwd(), 'node_modules');
  const cacheFile = `${node_modules}/.cache/storybook-theme/theme`;
  let theme = 'sl';
  if (fs.existsSync(cacheFile)) {
    let cachedTheme = fs.readFileSync(cacheFile);
    cachedTheme = `${cachedTheme}`.replace(/\s+/, '');
    if (cachedTheme !== '') {
      theme = cachedTheme;
    }
  }

  return path.resolve(__dirname, `../tokens/${theme}/${file}`);
};

const config: StorybookConfig = {
  stories: [
    '../components/**/**/*.stories.@(js|jsx|ts|tsx|mdx)'
  ],
  addons: [
    "@storybook/addon-links",
    '@storybook/addon-essentials',
    //   {
    //     name: '@storybook/addon-styling',
    //     options: {
    //       sass: {
    //         // Require your Sass preprocessor here
    //         implementation: require('sass'),
    //       },
    //     },
    //   },
    // "@storybook/addon-a11y",
    // "@etchteam/storybook-addon-status"
  ],
  framework: {
    name: "@storybook/web-components-webpack5",
    options: {},
  },
  docs: {
    autodocs: true,
  },
  // Other Storybook options
  webpackFinal: async (config, { configType }) => {
    // Loop over each of module rules in our config. Module rules define the loaders
    // that Webpack will use. We're, specifically, looking for the CSS rule
    config.module.rules.map((rule) => {
      // As we loop over the rules if the rule doesn't have a RegExp test or the
      // RegExp test doesn't match `.css` then we'll return the rule as-is with no
      // modifications being made.
      if (!rule.test || !rule.test.test || !rule.test.test('.css')) {
        return rule;
      }

      // If we're here then we're working with the CSS rule so we'll shift off the
      // first loader, which is the style-loader, since we want to manage styles
      // in lit-element, not via storybook/head injection
      rule.use.shift();

      // Return the modified CSS Webpack rule
      return rule;
    });

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
                function themeImport(url) {
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

    // Add theo support
    config.module.rules.push({
      test: /\.yml$/,
      use: ['css-loader']
    });

    // Add svg support
    config.module.rules.push({
      test: /\.svg$/,
      type: 'asset/source'
    });

    // Add theme support to JS imports
    config.plugins.push(
      new NormalModuleReplacementPlugin(/(^|\!)THEME(.*)/, function (resource) {
        resource.request = resource.request.replace(/(^|\!)THEME/, '$1' + themePath());
      })
    );

    // Return the modified Webpack Config
    return config;
  }
};
export default config;
