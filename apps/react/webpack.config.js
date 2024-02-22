const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  output: {
    publicPath: '/'
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