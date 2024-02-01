const path = require('path');
const glob = require('glob');
const fs = require('fs');
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
  // Note: is SLElement extension or icon file path.
  if (contents.indexOf('extends SLElement') >= 0 || isIcon) {
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
        import: path.resolve(__dirname, `./styles/head.scss`),
        // filename: 'theme.js'
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
              { from: `styles/head.scss`, to: 'scss' }
            ]
          })
        : null
    ],
    module: {
      rules: [
        {
          test: /head\.scss$/,
          use: ['css-loader', 'sass-loader'],
          type: 'asset/resource',
          generator: {
            filename: `css/head.css`
          }
        },
        {
          test: /\.scss$/,
          exclude: /head\.scss$/,
          use: ['css-loader', 'sass-loader'],
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