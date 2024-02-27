const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => {
  return {
    output: {
      path: path.resolve(__dirname, 'demo'),
      filename: "main.js",
      publicPath: argv.mode ==="production" ? "./" : "/"
    },
    module: {
      rules: [
        {
          test: [ /\.js$/, /\.jsx$/, /\.ts$/, /\.tsx$/ ],
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        { test: [/\.css$/, /\.scss$/],
          exclude: /node_modules/,
          use: ['style-loader', 'css-loader', 'sass-loader'] 
        },
      ],
    },
    devServer: {
      historyApiFallback: true
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./public/index.html",
        filename: "./index.html",
      }),
    ]
  };
};