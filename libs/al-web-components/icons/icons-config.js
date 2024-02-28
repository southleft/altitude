// Import the filesystem module
const fs = require('fs');
const path = require('path');
const { scale } = require('scale-that-svg');
const webfontsGenerator = require('@vusion/webfonts-generator');
const DatauriParser = require('datauri/parser');

// Directory names
const directory_name = './icons/svgs';
const dest_directory_name = './components/icon/svgs';
const dest_large_svg_directory_name = dest_directory_name + '/iconFontFiles';
const dest_ts_directory_name = './components/icon/icons';
const dest_iconfonts_directory_name = 'components/icon/fonts';
const dest_dist_iconfonts_directory_name = 'dist/fonts';
const dest_tsx_index = path.join(__dirname, '../../al-react/src/index.ts');
const dest_tsx_directory_name = path.join(__dirname, '../../al-react/src/components/Icons');

// Templates
const svgTsTemplate = './icons/templates/icon-component.svg.ts.hbs';
const tsTemplate = './icons/templates/icon-component.ts.hbs';
const tsxTemplate = './icons/templates/IconComponent.tsx.hbs';
const tsxIndexTemplate = './icons/templates/index.tsx.hbs';

// Main svg vars
const filenames = fs.readdirSync(directory_name);
const iconFontFiles = [];
const iconFontName = 'iconfont';

/*
 * Helper functions
 */
const toPascalCase = (text) => {
  return text.replace(/(^\w|-\w)/g, (s) => s.replace(/-/, '').toUpperCase());
};
const camelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

// Ensure directory existence
function ensureDirectoryExistence(filePath) {
  const md = fs.mkdirSync(filePath, { recursive: true });
}

// Function to convert a file to data-uri
function fileToDataUri(filePath) {
  const parser = new DatauriParser();
  return parser.format(path.extname(filePath), fs.readFileSync(filePath)).content;
}

// Resize SVG
async function resizeSVG(filePath, outputPath) {
  try {
    const svgData = await fs.promises.readFile(filePath, 'utf8');

    // Scale the SVG
    const scaledSvg = await scale(svgData, { scale: 10 });

    // Write the scaled SVG to the output path
    await fs.promises.writeFile(outputPath, scaledSvg);
    //console.log(`Successfully resized ${filePath} and saved to ${outputPath}`);
  } catch (err) {
    console.error(`Error resizing SVG file ${filePath}:`, err);
    throw err;
  }
}

// Process each file and resize
const resizePromises = filenames.map((file) => {
  if (path.extname(file) === '.svg') {
    const fileNamePath = path.join(directory_name, file);
    const IconFontSvgPath = path.join(dest_large_svg_directory_name, file);
    iconFontFiles.push(IconFontSvgPath); // Add resized file path

    return resizeSVG(fileNamePath, IconFontSvgPath);
  } else {
    return Promise.resolve();
  }
});

// Primary Process function
function processTemplate(templatePath, outputPath, svgData, plainFileName = '', pascalCaseName = '') {
  fs.readFile(templatePath, 'utf8', (err, templateData) => {
    if (err) {
      return console.error('Error reading template file:', err);
    }

    let result = templateData
      .replace(/{{SVGCONTENT}}/g, svgData)
      .replace(/{{pascalCase name}}/g, pascalCaseName)
      .replace(/{{dashCase name}}/g, plainFileName)
      .replace(/{{camelCase name}}/g, camelCase(plainFileName));

    const dirPath = path.dirname(outputPath);

    // Check if the directory exists
    if (!fs.existsSync(dirPath)) {
      // Ensure directory existence
      ensureDirectoryExistence(dirPath);
    }

    fs.writeFile(outputPath, result, 'utf8', (err) => {
      if (err) {
        return console.error('Error writing output file:', err);
      } else {
        //console.log('Successfully created:', outputPath);
      }
    });
  });
}

// Append to storybook
function appendToStorybook(plainFileName) {
  const importStatement = `import '../../../components/icon/icons/${plainFileName}';`;
  const filePath = './.storybook/components/icon-svgs/icons.ts';

  fs.readFile(filePath, 'utf8', (readErr, data) => {
    if (readErr) {
      return console.error('Error reading Storybook file:', readErr);
    }

    // Check if the import statement already exists in the file
    if (data.includes(importStatement)) {
      return;
    }

    // Append the import statement to the file
    fs.appendFile(filePath, importStatement + `\n`, (appendErr) => {
      if (appendErr) {
        return console.error('Error appending to Storybook:', appendErr);
      }
      //console.log('Import statement added to Storybook.');
    });
  });
}

// Append to index for exporting
function appendToIndex(indexFilePath, pascalCaseName) {
  const exportStatement = `\n` + `export * from './components/Icons/${pascalCaseName}';`;

  fs.readFile(indexFilePath, 'utf8', (readErr, data) => {
    if (readErr) {
      return console.error('Error reading index file:', readErr);
    }

    // Check if the export statement already exists in the file
    if (data.includes(exportStatement)) {
      return;
    }

    // Append the export statement to the file
    fs.appendFile(indexFilePath, exportStatement, (appendErr) => {
      if (appendErr) {
        return console.error('Error appending to index:', appendErr);
      }
      //console.log('Export statement added to index.');
    });
  });
}

// Copying icons files to storybook, etc.
function copyIconFiles(srcDir, destDir) {
  fs.readdir(srcDir, (err, files) => {
    if (err) {
      console.error('Error reading source directory:', err);
      return;
    }

    files.forEach((file) => {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join(destDir, file);

      fs.copyFile(srcFile, destFile, (err) => {
        if (err) {
          console.error(`Error copying ${file}:`, err);
        } else {
          //console.log(`${file} was copied to ${destFile}`);
        }
      });
    });
  });
}

// Create icon font for alternate usage
function createIconFont(files) {
  webfontsGenerator(
    {
      files,
      fontName: iconFontName,
      dest: dest_iconfonts_directory_name,
      types: ['woff2']
    },
    function (error, result) {
      if (error) {
        console.log('creating iconfont fail!', error);
      } else {
        // Define the CSS file path
        const cssFilePath = path.join(dest_iconfonts_directory_name, `${iconFontName}.css`);

        // Generate data-uri for font file
        const urls = {
          woff2: fileToDataUri(path.join(dest_iconfonts_directory_name, `${iconFontName}.woff2`))
        };

        // Generate CSS
        const cssContent = result.generateCss(urls);
        fs.writeFileSync(cssFilePath, cssContent);

        // Copy icon font files to dist
        copyIconFiles(dest_iconfonts_directory_name, dest_dist_iconfonts_directory_name);
        console.log('All SVG files have been processed.');
      }
    }
  );
}

/*
 * Main scripts
 */

// Create necessary directories
[dest_directory_name, dest_dist_iconfonts_directory_name, dest_large_svg_directory_name, dest_ts_directory_name, dest_tsx_directory_name].forEach(
  (dir) => {
    ensureDirectoryExistence(dir);
  }
);

// Process each svg  in directory
filenames.forEach((file) => {
  if (path.extname(file) === '.svg') {
    const fileNamePath = path.join(directory_name, file);
    const plainFileName = file.slice(0, -4);
    const pascalCaseName = toPascalCase(plainFileName);

    // Define paths
    const destNamePath = path.join(dest_directory_name, `${plainFileName}.svg.ts`);
    const destTsNamePath = path.join(dest_ts_directory_name, `${plainFileName}.ts`);
    const destTsxNamePath = path.join(dest_tsx_directory_name, `${pascalCaseName}`, `${pascalCaseName}.tsx`);
    const destTsxIndexNamePath = path.join(dest_tsx_directory_name, `${pascalCaseName}`, 'index.tsx');

    // Read the SVG file
    fs.readFile(fileNamePath, 'utf8', (err, svgData) => {
      if (err) {
        return console.error('Error reading SVG file:', err);
      }

      // Process templates
      processTemplate(svgTsTemplate, destNamePath, svgData);
      processTemplate(tsTemplate, destTsNamePath, svgData, plainFileName, pascalCaseName);
      processTemplate(tsxTemplate, destTsxNamePath, svgData, plainFileName, pascalCaseName);
      processTemplate(tsxIndexTemplate, destTsxIndexNamePath, svgData, plainFileName, pascalCaseName);

      // Append to storybook and index
      appendToStorybook(plainFileName);
      appendToIndex(dest_tsx_index, pascalCaseName);
    });
  }
});

// Wait for all SVGs to be resized
Promise.all(resizePromises)
  .then(() => {
    createIconFont(iconFontFiles); // Now call createIconFont
  })
  .catch((err) => {
    console.error('Error resizing SVG files:', err);
  });
