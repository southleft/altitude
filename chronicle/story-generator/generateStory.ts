import fs from 'fs';
import path from 'path';
import { CHRONICLE_CONFIG } from '../chronicle.config.js';

export function generateStory({ title, html }: { title: string; html: string }) {
  const storyFile = `import { html as litHtml } from 'lit';\n\nexport default {\n  title: '${CHRONICLE_CONFIG.storyPrefix}${title}',\n};\n\nexport const Default = () => litHtml` + '`' + `${html}` + '`' + `;\n`;
  const outPath = path.join(CHRONICLE_CONFIG.generatedStoriesPath, `${title.replace(/\s+/g, '-')}.stories.ts`);
  fs.writeFileSync(outPath, storyFile, 'utf-8');
  return outPath;
}

// Mock usage:
// generateStory({
//   title: 'Login Form',
//   html: '<al-input label="Email"></al-input>\n<al-input label="Password" type="password"></al-input>\n<al-button>Login</al-button>'
// });
