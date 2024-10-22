const path = require('path');
const glob = require('glob');
const fs = require('fs');
const purgecss = require('@fullhuman/postcss-purgecss')
const CopyPlugin = require('copy-webpack-plugin');

const components = glob.sync('./components/**/*.ts').reduce((acc, file) => {
  // Exclude icon because there are some specific things that need to happen based on the URL inclusion of `icon.js`
  // in order for routing to work correctly
  if (file.match(/icon\.ts$/)) {
    return acc;
  }

  const contents = fs.readFileSync(file);
  const isIcon = file.match(/icon\/icons\/.*\.ts$/);

  // Custom Components
  // Note: is ALElement extension or icon file path.
  if (contents.indexOf('extends ALElement') >= 0 || isIcon) {
    // Custom options for icons.
    acc[`${isIcon ? 'icon-' : ''}` + path.parse(file).name] = isIcon
      ? {
          import: file,
          filename: 'components/icon/icons/' + path.parse(file).name + '.js'
        }
      : file;
  }

  return acc;
}, {});

module.exports = (env) => {
  const entry = () => {
    let entryObj = {
      ...components,
      theme: {
        import: path.resolve(__dirname, `./styles/main.scss`),
        // filename: 'theme.js'
      },
      _register: './directives/register.ts',
      _setGlobalStyles: './directives/setGlobalStyles.ts',
      icon: './components/icon/icon.ts',
      bundle: Object.entries(components)
        // filter out icons.
        .filter((comp) => {
          return typeof comp[1] === 'string' ? true : false;
        })
        .map(([, file]) => file)
    };

    return entryObj;
  };

  return {
    entry: entry(),
    output: {
      publicPath: '',
      filename: (pathData) => {
        switch (pathData.chunk.name) {
          case '_register':
            return 'directives/register.js';
          case '_setGlobalStyles':
            return 'directives/setGlobalStyles.js';
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
      !env.entry || env.entry === 'all'
        ? new CopyPlugin({
            patterns: [
              { from: `icons/svgs/*`, to: 'icons/[name][ext]' },
              { from: `styles/dist/css/**/*`, to: 'css/[name][ext]' },
              { from: `.storybook/static/images/*`, to: 'images/[name][ext]' }
            ]
          })
        : null
    ],
    module: {
      rules: [
        {
          test: /main\.scss$/,
          use: ['sass-loader'],
          type: 'asset/resource',
          generator: {
            filename: `css/main.css`
          }
        },
        {
          test: /\.scss$/,
          exclude: [/main\.scss$/],
          use: [
            'css-loader',
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [
                    purgecss({
                      contentFunction: (sourceInputFileName) => {
                        if (/component\.scss$/.test(sourceInputFileName))
                          return [sourceInputFileName.replace(/scss$/, 'ts')]
                        else
                          return ['./components/**/*.ts']
                      },
                    }),
                  ],
                },
              },
            },
            'sass-loader'
          ],
        },
        {
          test: /\.css$/,
          use: ['css-loader']
        },
        {
          test: /\.(j|t)sx?$/,
          use: ['babel-loader']
        },
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'icons/svgs/'
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