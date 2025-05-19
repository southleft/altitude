import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getComponents, getProps } from './routes/components.js';
import { claudeProxy } from './routes/claude.js';
import { generateStoryFromPrompt } from './routes/generateStory.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/mcp/components', getComponents);
app.get('/mcp/props', getProps);
app.post('/mcp/claude', claudeProxy);
app.post('/mcp/generate-story', generateStoryFromPrompt);

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
});
