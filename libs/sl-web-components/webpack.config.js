const NormalModuleReplacementPlugin = require('webpack').NormalModuleReplacementPlugin;

/**
 * The webpack config is a callback so that we may pass in `env` and set the Design System theme (which defaults
 * to the `sl` theme). Setting a theme affects the compilation in two ways. First, it replaces out
 * any JS imports with the proper theme path. So `import THEME/foo.scss` will try to import the passed
 * env theme's `foo.scss`. Secondly, we adjust the Sass importers so you can `@import THEME/foo.scss`.
 * The Sass adjustment works the same way and allows you to import theme overrides during compilation.
 */
module.exports = (env) => {
  const theme = env.theme || 'sl';

  const themePath = (file = '') => path.resolve(__dirname, `./tokens/${theme}/${file}`);

  const entry = () => {
    let entryObj = {
      ...components,
      theme: {
        import: path.resolve(__dirname, `./tokens/${theme}/head.scss`)
      },
      _register: './directives/register.ts',
      icon: './components/icon/icon.ts',
      bundle: Object.entries(components)
        // filter out icons.
        .filter((comp) => {
          return typeof comp[1] === 'string' ? true : false;
        })
        .map(([, file]) => file)
    };

    return !env.entry || env.entry === 'all' ? entryObj : { _scopeStyles: './directives/scope-styles.ts' };
  };

  const sassLoader = {
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
  };

  return {
    entry: entry(),
    output: {
      publicPath: '',
      path: path.resolve(__dirname, 'dist', theme),
      filename: (pathData) => {
        switch (pathData.chunk.name) {
          case '_register':
            return 'directives/register.js';
          case '_scopeStyles':
            return 'directives/scoped-styles.js';
          default:
            return 'components/[name]/[name].js';
        }
      },
      library: {
        type: 'module'
      }
    },
    experiments: {
      outputModule: true
    },
    mode: 'production',
    plugins: [
      new NormalModuleReplacementPlugin(/(^|!)THEME(.*)/, function (resource) {
        resource.request = resource.request.replace(/(^|!)THEME/, '$1' + themePath());
      }),
      !env.entry || env.entry === 'all'
        ? new CopyPlugin({
            patterns: [
              { from: `icons/svgs/*.svg`, to: path.resolve(__dirname, 'dist', `${theme}`, 'icons', '[name][ext]') },
              { from: `tokens/${theme}/data/tokens.json`, to: 'tokens' },
              { from: `tokens/${theme}/head.scss`, to: 'scss' }
            ]
          })
        : null
    ],
    module: {
      rules: [
        {
          test: /\.(j|t)sx?$/,
          use: ['babel-loader']
        },
        {
          test: /\.css$/,
          use: ['css-loader']
        },
        {
          test: /head\.scss$/,
          use: [sassLoader],
          type: 'asset/resource',
          generator: {
            filename: `${theme}.css`
          }
        },
        {
          test: /variables\.scss$/,
          use: [
            sassLoader,
            {
              options: {
                name: '[name].[ext]',
                outputPath: 'fonts/'
              }
            }
          ],
          generator: {
            filename: `variables.css`
          }
        },
        {
          test: /\.scss$/,
          exclude: /head\.scss$/,
          use: ['css-loader', sassLoader]
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'svgs/'
              }
            }
          ]
        },
        {
          test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'fonts/'
              }
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.scss', '.yml']
    }
  };
};