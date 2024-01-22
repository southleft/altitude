const fs = require('fs');
const path = require('path');

// Directory paths
const sourceDir = './components/icon/svgs';
const targetDir = './components/icon/svgs/files';

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Read .ts files from source directory
fs.readdir(sourceDir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  files.forEach((file) => {
    if (path.extname(file) === '.ts') {
      const filePath = path.join(sourceDir, file);

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          return;
        }

        // Regex to extract content between '`' characters
        const match = data.match(/`([^`]*)`/);
        if (match && match[1]) {
          const svgContent = match[1];
          const newFileName = path.basename(file, '.ts');
          const newFilePath = path.join(targetDir, newFileName);

          // Write the SVG content to a new file
          fs.writeFile(newFilePath, svgContent, (err) => {
            if (err) {
              console.error('Error writing file:', err);
            } else {
              console.log(`SVG file created: ${newFilePath}`);
            }
          });
        }
      });
    }
  });
});
