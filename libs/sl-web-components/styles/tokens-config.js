const StyleDictionary = require('style-dictionary');

// Look for args passed on the command line
const args = require('minimist')(process.argv.slice(2));

// If no theme arg was passed, default to Primary theme
const theme = 'sl';

console.log(`🚧 Compiling tokens with the ${theme.toUpperCase()} theme`);

StyleDictionary.registerFormat({
  name: 'scss/variables',
  formatter: function({ dictionary, options }) {
    const breakpointVariables = dictionary.allTokens
      .filter(token => token.name.includes('breakpoint'))
      .map(token => {
        let value = JSON.stringify(token.value);
        value = JSON.parse(value); // Convert JSON string to its original value

        // Check if the token uses references
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
      // Filter out specific tokens
      .filter(token => !token.name.includes('breakpoint') && !token.name.includes('typography'))
      .map(token => {
        let value = JSON.stringify(token.value);
        value = JSON.parse(value); // Convert JSON string to its original value

        // Format box-shadow tokens
        if (token.name.includes('box-shadow')) {
          value = formatBoxShadowValue(value);
        }

        // Check if the token uses references
        if (token.name.includes('theme') && options.outputReferences) {
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
  formatter: function({ dictionary, options }) {
    const variables = dictionary.allTokens
    // Filter out specific tokens
    .filter(token => !token.name.endsWith('-figma') && !token.name.endsWith('-italic') && !token.name.endsWith('-underline'))
    .map((token, index, array) => {
      let name;
      let value;

      // Format typography tokens
      if (token.name.includes('typography')) {
        name = token.name.endsWith('-regular') ? token.name.replace('-regular', '') : token.name;
        value = formatTypographyValue(token.value);
      }
      // Format box-shadow tokens
      else if (token.name.includes('box-shadow')) {
        name = token.name;
        value = formatBoxShadowValue(token.value);
      }
      // Format all tokens
      else {
        name = token.name;
        value = token.value;
      }

      // Check if the token uses references
      if (token.name.includes('theme') && options.outputReferences) {
        if (dictionary.usesReference(token.original.value)) {
          const refs = dictionary.getReferences(token.original.value);
          refs.forEach(ref => {
            value = `var(--${theme}-${ref.name})`;
          });
        }
      }

      const comma = index === array.length - 1 ? '' : ',';
      return `  "${theme}-${name}": "${value}"${comma}`;
    }).join('\n');

    // Wrap the variables inside {}
    return `{\n${variables}\n}`;
  }
});

// Custom function to format box-shadow value into a string
function formatBoxShadowValue(value) {
  // Check if value is an array of box-shadow objects
  if (Array.isArray(value)) {
    return value.map(shadow => `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`).join(', ');
  } else {
    // Handle single box-shadow object
    return `${value.x}px ${value.y}px ${value.blur}px ${value.spread}px ${value.color}`;
  }
}

// Custom function to format typography value into a string
function formatTypographyValue(value) {
  // Convert fontFamily to lowercase and dash case
  const formattedFontFamily = value.fontFamily.toLowerCase().replace(/\s+/g, '-');

  return `${value.fontWeight} ${value.fontSize}/${value.lineHeight} ${formattedFontFamily} ${value.letterSpacing} ${value.textDecoration}`;
}

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
            options: {
              outputReferences: true,
            },
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
