import { Request, Response } from 'express';
import fetch from 'node-fetch';
import { generateStory } from '../../story-generator/generateStory.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-opus-20240229';

const COMPONENT_LIST = [
  'ALInput', 'ALButton', 'ALToast', 'ALToastGroup', 'ALIconSuccess',
  // ... (add more as needed, or generate from index.ts)
];

const SAMPLE_STORY = `import type { StoryObj } from '@storybook/react-webpack5';\nimport { ALToastGroup, ALToast, ALButton, ALIconSuccess } from 'al-react/src';\n\nexport default {\n  title: 'Molecules/Toast Group',\n  component: ALToastGroup,\n  subcomponents: { ALToast },\n};\n\nexport const Default: StoryObj<typeof ALToastGroup> = {\n  args: {\n    isActive: true,\n    children: (\n      <>\n        <ALToast description=\"This is a toast\" isActive=\"true\">\n          Toast title A\n          <ALButton slot=\"actions\" variant=\"tertiary\"><ALIconSuccess slot=\"before\"></ALIconSuccess>Label</ALButton>\n        </ALToast>\n      </>\n    )\n  }\n};`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMPONENTS_DIR = path.resolve(__dirname, '../../../../libs/al-react/src/components');
console.log('Resolved COMPONENTS_DIR:', COMPONENTS_DIR);

function getComponentReference() {
  const dirs = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  let reference = '';
  for (const dir of dirs) {
    const storyFile = path.join(COMPONENTS_DIR, dir, `${dir}.stories.tsx`);
    let props: string[] = [];
    if (fs.existsSync(storyFile)) {
      const content = fs.readFileSync(storyFile, 'utf-8');
      const argTypesMatch = content.match(/argTypes:\s*{([\s\S]*?)}[,\n]/);
      if (argTypesMatch) {
        const argTypesBlock = argTypesMatch[1];
        props = Array.from(argTypesBlock.matchAll(/([a-zA-Z0-9_]+):/g)).map(m => m[1]);
      }
    }
    reference += `- ${'AL' + dir}: Props: ${props.join(', ') || 'none'}\n`;
  }
  return reference;
}

const COMPONENT_REFERENCE = getComponentReference();

function buildClaudePrompt(userPrompt: string) {
  return [
    `You are an expert UI developer. Use only the following React components from the Altitude design system to build the UI. Do not use plain HTML elements except for layout (e.g., <div>).`,
    '',
    'Available components:',
    COMPONENT_REFERENCE,
    '',
    'Output a complete Storybook story file in TypeScript, using the format below. Import components from "al-react/src". Use the following sample as a template. Respond ONLY with a single code block containing the full file, and nothing else.',
    '',
    'Sample story:',
    SAMPLE_STORY,
    '',
    'User request:',
    userPrompt
  ].join('\n');
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractCodeBlock(text: string): string | null {
  const codeBlock = text.match(/```(?:tsx|jsx|typescript)?([\s\S]*?)```/i);
  return codeBlock ? codeBlock[1].trim() : null;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Claude API key not set');
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await response.json();
  // Try to extract the main content
  return data?.content?.[0]?.text || data?.completion || '';
}

export async function generateStoryFromPrompt(req: Request, res: Response) {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  try {
    const fullPrompt = buildClaudePrompt(prompt);
    console.log('Claude prompt:', fullPrompt);
    const aiText = await callClaude(fullPrompt);
    console.log('Claude raw response:', aiText);
    let fileContents = extractCodeBlock(aiText);
    if (!fileContents) {
      // Fallback: try to extract from first import statement onward
      const importIdx = aiText.indexOf('import');
      if (importIdx !== -1) {
        fileContents = aiText.slice(importIdx).trim();
      }
    }
    if (!fileContents || !fileContents.startsWith('import')) {
      console.error('No valid code block or import found in Claude response. Skipping file write.');
      return res.status(500).json({ error: 'Claude did not return a valid code block.' });
    }
    // Ensure the export default title is always prefixed with 'Chronicle Pages/'
    const fixedFileContents = fileContents.replace(
      /(export default \{\s*\n\s*title:\s*['"])([^'"]+)(['"])/,
      (match, p1, p2, p3) => {
        let title = p2;
        if (!title.startsWith('Chronicle Pages/')) {
          title = 'Chronicle Pages/' + title.replace(/^Chronicle\/?/, '');
        }
        return p1 + title + p3;
      }
    );
    // Use a hash of the prompt for uniqueness
    const hash = crypto.createHash('sha1').update(prompt).digest('hex').slice(0, 8);
    const baseTitle = prompt.split(' ').slice(0, 6).join(' ');
    const fileName = `${slugify(baseTitle)}-${hash}.stories.tsx`;
    const outPath = generateStory({ fileContents: fixedFileContents, fileName });
    console.log('Story written to:', outPath);
    res.json({ success: true, fileName, outPath });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Story generation failed' });
  }
}
