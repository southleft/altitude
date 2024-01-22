const StyleDictionary = require('style-dictionary');

// Look for args passed on the command line
const args = require('minimist')(process.argv.slice(2));

// If no theme arg was passed, default to Primary theme
const theme = 'sl';

console.log(`🚧 Compiling tokens with the ${theme.toUpperCase()} theme`);

StyleDictionary.registerFormat({
  name: 'scss/variables',
  formatter: function({ dictionary, options }) {
    const theme = 'sl'; // Assuming you have a theme variable

    const breakpointVariables = dictionary.allTokens
      .filter(token => token.name.includes('breakpoint'))
      .map(token => {
        let value = JSON.stringify(token.value);
        value = JSON.parse(value); // Convert JSON string to its original value

        if (options.outputReferences) {
          if (dictionary.usesReference(token.original.value)) {
            const refs = dictionary.getReferences(token.original.value);
            refs.forEach(ref => {
              value = `breakpoint-${ref.name}`;
            });
          }
        }

        return `${`$`}${theme}-${token.name}: ${value};`;
      })
      .join('\n');

    const otherVariables = dictionary.allTokens
      // Filter out any tokens that include breakpoint and ends with italic or underline
      .filter(token => !token.name.includes('breakpoint') && !token.name.includes('typography'))
      .map(token => {
        let value = JSON.stringify(token.value);
        value = JSON.parse(value); // Convert JSON string to its original value

        if (options.outputReferences) {
          if (dictionary.usesReference(token.original.value)) {
            const refs = dictionary.getReferences(token.original.value);
            refs.forEach(ref => {
              value = `var(--${theme}-${ref.name})`;
            });
          }
        }

        return `  --${theme}-${token.name}: ${value};`;
      })
      .join('\n');

    // Wrap the variables inside :root{}
    return `:root {\n${otherVariables}\n}\n\n${breakpointVariables}`;
  }
});

StyleDictionary.registerFormat({
  name: 'json/flat',
  formatter: function({ dictionary }) {
    const variables = dictionary.allTokens
    // Filter out any tokens that ends with italic or underline
    .filter(token => !token.name.endsWith('-figma') && !token.name.endsWith('-italic') && !token.name.endsWith('-underline'))
    .map((token, index, array) => {
      let tokenName = token.name.includes('typography') && token.name.endsWith('-regular') ? token.name.replace('-regular', '') : token.name;
      let value = token.value;
      const comma = index === array.length - 1 ? '' : ',';
      return `  "${theme}-${tokenName}": "${value}"${comma}`;
    }).join('\n');

    // Wrap the variables inside {}
    return `{\n${variables}\n}`;
  }
});

/**
 * Generate a Theme-Specific Config
 * This accepts a theme parameter, which is used to control which set of
 * tokens to compile, and to define theme-specific compiled output.
 * @param {string} theme
 */
const generateStyleDictionaryConfig = (theme) => {
  const source = [
    `./styles/tokens/tier-1/*.json`,
    `./styles/tokens/tier-2/*.json`,
    `./styles/tokens/tier-3/*.json`,
  ];

  return {
    log: 'warn',
    source: source,
    platforms: {
      scss: {
        transformGroup: 'scss',
        buildPath: './',
        files: [
          {
            destination: `/styles/tokens.scss`,
            format: 'scss/variables',
            options: {
              outputReferences: true,
            },
          },
        ],
      },
      json: {
        transformGroup: 'scss',
        buildPath: './',
        files: [
          {
            destination: `/styles/tokens.json`,
            format: 'json/flat',
          },
        ],
      },
    },
  };
};

const generateAndBuildStyleDictionary = (theme) => {
  const styleDictionaryConfig = generateStyleDictionaryConfig(theme);
  const StyleDictionaryExtended = StyleDictionary.extend(styleDictionaryConfig);
  StyleDictionaryExtended.buildAllPlatforms();
};

// Generate and build
generateAndBuildStyleDictionary(theme);
