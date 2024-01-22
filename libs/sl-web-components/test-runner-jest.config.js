const { getJestConfig } = require('@storybook/test-runner');

module.exports = {
  // The default configuration comes from @storybook/test-runner
  ...getJestConfig(),
  /** Add your own overrides below
   * @see https://jestjs.io/docs/configuration
   */
  // Ignore the following components for now.
  // modulePathIgnorePatterns: ['<rootDir>/components/data-grid/data-grid/**'],
};
