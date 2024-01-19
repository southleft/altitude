const path = require('path');
const glob = require('glob');
const fs = require('fs');

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
          use: ['sass-loader'],
          type: 'asset/resource'
        },
        {
          test: /variables\.scss$/,
          use: [
            'sass-loader',
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
          use: ['css-loader', 'sass-loader']
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