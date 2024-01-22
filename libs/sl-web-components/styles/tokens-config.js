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
      .filter(token => !token.name.includes('breakpoint'))
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
    const variables = dictionary.allTokens.map((token, index, array) => {
      let value = token.value;
      const comma = index === array.length - 1 ? '' : ',';
      return `  "${theme}-${token.name}": "${value}"${comma}`;
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

  // Add additional files/directories to exclude
  const excludedSources = [
    './styles/tokens/tier-1/typography.json',
    './styles/tokens/tier-2/typography.json',
  ];

  // Filter the source array to exclude files/directories
  const filteredSource = source.filter(sourcePath => {
    return !excludedSources.some(excludedPath => sourcePath.includes(excludedPath));
  });

  return {
    log: 'warn',
    source: filteredSource, // Use the filtered source
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
