import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CHRONICLE_CONFIG = {
  generatedStoriesPath: path.resolve(__dirname, '../../libs/al-react/src/components/generated/'),
  componentsMetadataPath: path.resolve(__dirname, '../../libs/al-web-components/custom-elements.json'),
  storyPrefix: 'Chronicle/',
  defaultAuthor: 'Chronicle AI',
};
