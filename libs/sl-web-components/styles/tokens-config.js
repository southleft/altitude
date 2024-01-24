const StyleDictionary = require('style-dictionary');

/**
 * Define theme prefix
 */
const theme = 'sl';

/**
 * SCSS Formatting
 * 1. Filter tokens related to breakpoints and create variables
 *    1.1. Convert JSON string to its original value
 *    1.2. Check if the token uses references
 *    1.3. Map and create variables for breakpoint-related tokens
 * 2. Filter other specific tokens, format them, and create variables
 *    2.1. Convert JSON string to its original value
 *    2.2. Format typography tokens
 *    2.3. Format box-shadow tokens
 *    2.4. Format all tokens
 *    2.5. Check if the token uses references and format accordingly
 *    2.6. Map and create variables for other tokens
 * 3. Wrap the variables inside :root{}
 */
StyleDictionary.registerFormat({
  name: 'scss/variables',
  formatter: function ({ dictionary, options }) {
    /* 1 */
    const breakpointVariables = dictionary.allTokens
      .filter(token => token.name.includes('breakpoint'))
      .map(token => {
        /* 1.1 */
        let value = JSON.stringify(token.value);
        value = JSON.parse(value);
        /* 1.2 */
        if (options.outputReferences) {
          if (dictionary.usesReference(token.original.value)) {
            const refs = dictionary.getReferences(token.original.value);
            refs.forEach(ref => {
              value = `breakpoint-${ref.name}`;
            });
          }
        }
        /* 1.3 */
        return `${`$`}${theme}-${token.name}: ${value};`;
      })
      .join('\n');

    /* 2 */
    const otherVariables = dictionary.allTokens
      .filter(token => !token.name.endsWith('-figma') && !token.name.endsWith('-italic') && !token.name.endsWith('-underline'))
      .map(token => {
        let name;
        /* 2.1 */
        let value = JSON.stringify(token.value);
        value = JSON.parse(value);
        /* 2.2 */
        if (token.name.includes('typography')) {
          name = token.name.endsWith('-regular') ? token.name.replace('-regular', '') : token.name;
          value = formatTypographyValue(token.value);
        }
        /* 2.3 */
        else if (token.name.includes('box-shadow')) {
          name = token.name;
          value = formatBoxShadowValue(token.value);
        }
        /* 2.4 */
        else {
          name = token.name;
          value = token.value;
        }
        /* 2.5 */
        if (token.name.includes('theme') && options.outputReferences) {
          if (dictionary.usesReference(token.original.value)) {
            const refs = dictionary.getReferences(token.original.value);
            refs.forEach(ref => {
              let refName = ref.name.endsWith('-regular') ? ref.name.replace('-regular', '') : ref.name;
              value = `var(--${theme}-${refName})`;
            });
          }
        }
        /* 2.6 */
        return `  --${theme}-${name}: ${value};`;
      })
      .join('\n');

    /* 3 */
    return `:root {\n${otherVariables}\n}\n\n${breakpointVariables}`;
  }
});

/**
 * JSON Formatting
 * 1. Filter out specific tokens
 * 2. Map and format tokens based on conditions
 * 3. Format typography tokens
 * 4. Format box-shadow tokens
 * 5. Format all tokens
 * 6. Check if the token uses references and format accordingly
 * 7. Wrap the variables inside {}
 */
StyleDictionary.registerFormat({
  name: 'json/flat',
  formatter: function({ dictionary, options }) {
    const variables = dictionary.allTokens
    /* 1 */
    .filter(token => !token.name.endsWith('-figma') && !token.name.endsWith('-italic') && !token.name.endsWith('-underline'))
    /* 2 */
    .map((token, index, array) => {
      let name;
      let value;
      /* 3 */
      if (token.name.includes('typography')) {
        name = token.name.endsWith('-regular') ? token.name.replace('-regular', '') : token.name;
        value = formatTypographyValue(token.value);
      }
      /* 4 */
      else if (token.name.includes('box-shadow')) {
        name = token.name;
        value = formatBoxShadowValue(token.value);
      }
      /* 5 */
      else {
        name = token.name;
        value = token.value;
      }
      /* 6 */
      if (token.name.includes('theme') && options.outputReferences) {
        if (dictionary.usesReference(token.original.value)) {
          const refs = dictionary.getReferences(token.original.value);
          refs.forEach(ref => {
            let refName = ref.name.endsWith('-regular') ? ref.name.replace('-regular', '') : ref.name;
            value = `var(--${theme}-${refName})`;
          });
        }
      }
      const comma = index === array.length - 1 ? '' : ',';
      return `  "${theme}-${name}": "${value}"${comma}`;
    }).join('\n');
    /* 7 */
    return `{\n${variables}\n}`;
  }
});

/**
 * Format box-shadow tokens into a string
 * 1. Check if value is an array and join with a comma
 * 2. Handle single box-shadow object
 */
function formatBoxShadowValue(value) {
  if (Array.isArray(value)) {
    return value.map(shadow => `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`).join(', '); /* 1 */
  } else {
    return `${value.x}px ${value.y}px ${value.blur}px ${value.spread}px ${value.color}`; /* 2 */
  }
}

/**
 * Format typography tokens into a string
 * 1. Convert fontFamily to lowercase and dash case
 * 2. Return the string value
 */
function formatTypographyValue(value) {
  const formattedFontFamily = value.fontFamily.toLowerCase().replace(/\s+/g, '-'); /* 1 */
  return `${value.fontWeight} ${value.fontSize}/${value.lineHeight} ${formattedFontFamily}, sans-serif`; /* 2 */
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

/**
 * Generate and build
 */
generateAndBuildStyleDictionary(theme);
