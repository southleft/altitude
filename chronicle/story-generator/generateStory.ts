import fs from 'fs';
import path from 'path';
import { CHRONICLE_CONFIG } from '../chronicle.config.js';

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateStory({ fileContents, fileName }: { fileContents: string; fileName: string }) {
  const outPath = path.join(CHRONICLE_CONFIG.generatedStoriesPath, fileName);
  fs.writeFileSync(outPath, fileContents, 'utf-8');
  return outPath;
}

// Mock usage:
// generateStory({
//   title: 'Login Form',
//   jsx: '<al-input label="Email"></al-input>\n<al-input label="Password" type="password"></al-input>\n<al-button>Login</al-button>'
// });
