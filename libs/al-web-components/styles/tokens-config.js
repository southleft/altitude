const StyleDictionary = require('style-dictionary');

/**
 * Define theme customizations
 */
const themePrefix = 'al';
const themeFontWeightRegular = '400';
const themeFontWeightBold = '600';
const themeFontBaseSize = 16;
const themeSpaceBaseSize = 16;
const themeFontFamilyFallback = 'sans-serif';
const comment = '\n\n/* This file is auto-generated by Style Dictionary. Do not edit directly. */\n';

/**
 * SCSS Global Variable Formatting
 * 1. Filter tokens related to breakpoints and create variables
 * 2. Convert JSON string to its original value
 * 3. Check if the token uses references
 * 4. Map and create variables for breakpoint-related tokens
 * 5. Setup the json output format
 * 6. Return the variables in the file
 */
StyleDictionary.registerFormat({
  name: 'scss/variables',
  formatter: function ({ dictionary, options }) {
    const breakpointVariables = dictionary.allTokens
      /* 1 */
      .filter(token => token.name.includes('breakpoint'))
      .map(token => {
        /* 2 */
        let value = JSON.stringify(token.value);
        value = JSON.parse(value);
        /* 3 */
        if (options.outputReferences && dictionary.usesReference(token.original.value)) {
          const refs = dictionary.getReferences(token.original.value);
          value = refs.map(ref => `breakpoint-${ref.name}`).join(', ');
        }
        /* 4 */
        return `$${themePrefix}-${token.name}: ${value};`;
      })
      .join('\n');
    /* 5 */
    const themeVariables = (themePrefix) => {
      return `$${themePrefix}-theme-prefix: '${themePrefix}';\n`;
    };
    const themeDeclaration = themeVariables(themePrefix);
    /* 6 */
    return comment + themeDeclaration + breakpointVariables;
  },
});

/**
 * Token Formatting
 * 1. Filter other specific tokens, format them, and create variables
 * 2. Convert JSON string to its original value
 * 3. Format font-weight tokens
 * 4. Format typography tokens
 * 5. Format box-shadow tokens
 * 5. Format space tokens
 * 6. Format all tokens
 * 7. Check if the token uses references and format accordingly
 * 8. Map and create variables for other tokens
 * 9. Format the token output
 * 10. Filter out undefined values and join with line breaks
 * 11. Wrap the variables inside :root{}
 */
StyleDictionary.registerFormat({
  name: 'tokens',
  formatter: function ({ dictionary, options }) {
    /* 1 */
    const otherVariables = dictionary.allTokens
      .filter(token =>
        !token.name.endsWith('-italic') &&
        !token.name.endsWith('-underline') &&
        !token.name.includes('breakpoint')
      )
      .map(token => {
        //console.log(token);
        let name;
        /* 2 */
        let value = JSON.stringify(token.value);
        value = JSON.parse(value);
        /* 3 */
        if (token.name.includes('font-weight')) {
          name = token.name;
          value = formatFontWeightValue(token.value);
        }
        /* 4 */
        else if (token.name.includes('typography')) {
          name = token.name.endsWith('-regular') ? token.name.replace('-regular', '') : token.name;
          value = formatTypographyValue(token.value);
        }
        /* 5 */
        else if (token.name.includes('box-shadow')) {
          name = token.name;
          value = formatBoxShadowValue(token.value);
        }
        /* 6 */
        else if (!token.name.includes('base') && token.name.includes('space')) {
          name = token.name;
          value = formatSpaceValue(token.value);
        }
        /* 7 */
        else {
          name = token.name;
          value = token.value;
        }
        /* 8 */
        if (token.name.includes('theme') && options.outputReferences) {
          if (dictionary.usesReference(token.original.value)) {
            const refs = dictionary.getReferences(token.original.value);
            refs.forEach(ref => {
              const refName = ref.name.endsWith('-regular') ? ref.name.replace('-regular', '') : ref.name;
              value = `var(--${themePrefix}-${refName})`;
            });
          }
        }
        /* 9 */
        const tokenOutput = `  --${themePrefix}-${name}: ${value};`;
        return tokenOutput;
      }).filter(Boolean).join('\n'); /* 10 */

    /* 11 */
    return comment + `:root {\n${otherVariables}\n}\n`;
  },
});

/**
 * JSON Formatting
 * 1. Filter out specific tokens
 * 2. Map and format tokens based on conditions
 * 3. Format font-weight tokens
 * 4. Format typography tokens
 * 5. Format box-shadow tokens
 * 6. Format all tokens
 * 7. Check if the token uses references and format accordingly
 * 8. Wrap the variables inside {}
 */
StyleDictionary.registerFormat({
  name: 'json/flat',
  formatter: function({ dictionary, options }) {
    const variables = dictionary.allTokens
    /* 1 */
    .filter(token => !token.name.endsWith('-italic') && !token.name.endsWith('-underline'))
    /* 2 */
    .map((token, index, array) => {
      let name;
      let value;
      /* 3 */
      if (token.name.includes('font-weight')) {
        name = token.name;
        value = formatFontWeightValue(token.value);
      }
      /* 4 */
      else if (token.name.includes('typography')) {
        name = token.name.endsWith('-regular') ? token.name.replace('-regular', '') : token.name;
        value = formatTypographyValue(token.value);
      }
      /* 5 */
      else if (token.name.includes('box-shadow')) {
        name = token.name;
        value = formatBoxShadowValue(token.value);
      }
      /* 6 */
      else {
        name = token.name;
        value = token.value;
      }
      /* 7 */
      if (token.name.includes('theme') && options.outputReferences) {
        if (dictionary.usesReference(token.original.value)) {
          const refs = dictionary.getReferences(token.original.value);
          refs.forEach(ref => {
            let refName = ref.name.endsWith('-regular') ? ref.name.replace('-regular', '') : ref.name;
            value = `var(--${themePrefix}-${refName})`;
          });
        }
      }
      const comma = index === array.length - 1 ? '' : ',';
      return `  "${themePrefix}-${name}": "${value}"${comma}`;
    }).join('\n');
    /* 8 */
    return `{\n${variables}\n}`;
  },
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
 * Format font-weight tokens into a value
 * 1. Convert text string values to number values for font-weights
 * 2. Return the string value
 */
function formatFontWeightValue(value) {
  /* 1 */
  let fontWeight = '';
  if (value === 'Bold') {
    fontWeight = themeFontWeightBold;
  } else {
    fontWeight = themeFontWeightRegular;
  }
  /* 2 */
  return `${fontWeight}`;
}

/**
 * Format typography tokens into a string
 * 1. Convert pixel values to rems
 * 2. Return the string value
 */
function formatTypographyValue(value) {
  /* 1 */
  const fontSize = `${parseFloat(value.fontSize) / themeFontBaseSize}rem`;
  const lineHeight = `${parseFloat(value.lineHeight) / themeFontBaseSize}rem`;
  return `${formatFontWeightValue(value.fontWeight)} ${fontSize}/${lineHeight} ${value.fontFamily}, ${themeFontFamilyFallback}`; /* 3 */
}

/**
 * Format space tokens into rems
 * 1. Convert pixel values to rems
 * 2. Return the string value
 */
function formatSpaceValue(value) {
  /* 1 */
  const space = `${parseFloat(value) / themeSpaceBaseSize}rem`;
  return `${space}`; /* 3 */
}

/**
 * Style dictionary theme specific config
 * This accepts a theme parameter, which is used to control which set of tokens to compile, and to define theme-specific compiled output.
 * @param {string} themeName
 */
const styleDictionaryThemeConfig = (themeName) => {
  const include = [
    `./styles/tokens/tier-1/*.json`,
    `./styles/tokens/tier-2/*.json`,
    `./styles/tokens/tier-2/theme/${themeName}/*.json`,
    `./styles/tokens/tier-3/theme/${themeName}/*.json`,
  ];

  return {
    include: include,
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: './',
        files: [
          {
            destination: `/styles/dist/css/theme/tokens-${themeName}.css`,
            format: 'tokens',
            options: {
              outputReferences: true,
            },
          },
        ],
      },
      scss: {
        transformGroup: 'scss',
        buildPath: './',
        files: [
          {
            destination: `/styles/dist/scss/theme/tokens-${themeName}.scss`,
            format: 'tokens',
            options: {
              outputReferences: true,
            },
          },
          {
            destination: `/styles/core/variables.scss`,
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
            destination: `/styles/dist/tokens.json`,
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

const styleDictionaryBuildTheme = (themeName) => {
  const styleDictionaryConfig = styleDictionaryThemeConfig(themeName);
  const StyleDictionaryExtended = StyleDictionary.extend(styleDictionaryConfig);
  StyleDictionaryExtended.buildAllPlatforms();
};

/**
 * Build each style dictionary theme
 */
styleDictionaryBuildTheme('light');
styleDictionaryBuildTheme('dark');

/**
 * Style dictionary brand specific config
 * This accepts a theme and brand parameter, which is used to control which set of tokens to compile, and to define brand-specific compiled output.
 * @param {string} themeName
 * @param {string} brandName
 */
const styleDictionaryBrandConfig = (themeName, brandName) => {
  const include = [
    `./styles/tokens/tier-1/*.json`,
    `./styles/tokens/tier-2/animations.json`,
    `./styles/tokens/tier-2/borders.json`,
    `./styles/tokens/tier-2/icons.json`,
    `./styles/tokens/tier-2/layout.json`,
    `./styles/tokens/tier-2/opacity.json`,
    `./styles/tokens/tier-2/shadows.json`,
    `./styles/tokens/tier-2/spacing.json`,
    `./styles/tokens/tier-2/typography.json`,
    `./styles/tokens/tier-2/theme/${themeName}/*.json`,
    `./styles/tokens/tier-3/theme/${themeName}/*.json`,
  ];

  const source = [
    `./styles/tokens/tier-2/brand/${brandName}/*.json`,
    `./styles/tokens/tier-3/brand/${brandName}/*.json`,
  ];

  return {
    include: include,
    source: source,
    platforms: {
      css: {
        transformGroup: 'css',
        buildPath: './',
        files: [
          {
            destination: `/styles/dist/css/brand/tokens-${brandName}.css`,
            format: 'tokens',
            options: {
              outputReferences: true,
            },
          },
        ],
      },
      scss: {
        transformGroup: 'scss',
        buildPath: './',
        files: [
          {
            destination: `/styles/dist/scss/brand/tokens-${brandName}.scss`,
            format: 'tokens',
            options: {
              outputReferences: true,
            },
          },
        ],
      },
    },
  };
};

const styleDictionaryBuildBrand = (themeName, brandName) => {
  const styleDictionaryConfig = styleDictionaryBrandConfig(themeName, brandName);
  const StyleDictionaryExtended = StyleDictionary.extend(styleDictionaryConfig);
  StyleDictionaryExtended.buildAllPlatforms();
};

/**
 * Build each style dictionary brand
 */
styleDictionaryBuildBrand('dark', 'altitude');
styleDictionaryBuildBrand('dark', 'southleft');
styleDictionaryBuildBrand('light', 'northright');
