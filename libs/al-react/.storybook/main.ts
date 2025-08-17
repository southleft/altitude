import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      builder: {
        options: {
          fsCache: false,
          stats: {
            warningsFilter: [
              /Deprecation/,
              /legacy.*API/,
              /@import.*deprecated/,
              /mixed-decls/,
              /sass-loader/
            ]
          }
        }
      }
    },
  },
  stories: [
    'components/**/*.stories.@(js|jsx|ts|tsx)',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@etchteam/storybook-addon-status'
  ],
  staticDirs: ['../dist'],
  docs: {
    autodocs: false
  },

  // Other Storybook options
  webpackFinal: async (config, { configType }) => {
    // Configure webpack stats to filter out Sass warnings
    config.stats = {
      ...config.stats,
      warnings: false,  // Disable all warnings
      warningsFilter: [
        /Deprecation/,
        /legacy.*API/,
        /@import.*deprecated/,
        /mixed-decls/,
        /sass-loader/
      ]
    };

    // Suppress client-side warnings using webpack 5's ignoreWarnings
    config.ignoreWarnings = [
      (warning) => {
        if (!warning.message) return false;
        const message = warning.message;
        return (
          message.includes('Module Warning') ||
          message.includes('Deprecation') ||
          message.includes('legacy') ||
          message.includes('@import') ||
          message.includes('mixed-decls') ||
          message.includes('sass-loader') ||
          message.includes("Sass's behavior") ||
          message.includes('sass') ||
          message.includes('Sass')
        );
      }
    ];

    // Override client configuration to suppress warnings in browser
    config.performance = {
      ...config.performance,
      hints: false
    };

    // Update all sass-loader instances to suppress warnings
    config.module.rules.forEach(rule => {
      if (rule.oneOf) {
        rule.oneOf.forEach(oneOfRule => {
          if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
            oneOfRule.use.forEach(loader => {
              if (typeof loader === 'object' && loader.loader && loader.loader.includes('sass-loader')) {
                loader.options = {
                  ...loader.options,
                  sassOptions: {
                    ...loader.options?.sassOptions,
                    quietDeps: true,
                    verbose: false,
                    logger: {
                      warn: () => {} // Suppress all Sass warnings
                    }
                  },
                  warnRuleAsWarning: false
                };
              }
            });
          }
        });
      } else if (rule.use && Array.isArray(rule.use)) {
        rule.use.forEach(loader => {
          if (typeof loader === 'object' && loader.loader && loader.loader.includes('sass-loader')) {
            loader.options = {
              ...loader.options,
              sassOptions: {
                ...loader.options?.sassOptions,
                quietDeps: true,
                verbose: false,
                logger: {
                  warn: () => {} // Suppress all Sass warnings
                }
              },
              warnRuleAsWarning: false
            };
          }
        });
      }
    });

    // Add SCSS support with warning suppression
    config.module.rules.push({
      test: /\.scss$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'sass-loader',
          options: {
            sassOptions: {
              quietDeps: true,
              verbose: false,
              logger: {
                warn: () => {} // Suppress all Sass warnings
              }
            },
            warnRuleAsWarning: false
          }
        }
      ]
    });

    // Add svg support
    config.module.rules.push({
      test: /\.svg$/,
      type: 'asset/source'
    });

    // Set client logging level to errors only
    config.infrastructureLogging = {
      level: 'error'
    };

    // Return the modified Webpack Config
    return config;
  }
};

export default config;
