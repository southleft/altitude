module.exports = {
  presets: [
    "@babel/preset-env",
    "@babel/preset-react",
    "@babel/preset-typescript"
  ],
  plugins: [
    [
      "@babel/plugin-proposal-decorators",
      {
        "version": "2023-05",
        "decoratorsBeforeExport": true
      }
    ]
  ]
};