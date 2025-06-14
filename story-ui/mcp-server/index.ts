import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from story-ui directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import express from 'express';
import cors from 'cors';
import { getComponents, getProps } from './routes/components.js';
import { claudeProxy } from './routes/claude.js';
import { generateStoryFromPrompt } from './routes/generateStory.js';
import {
  getStoriesMetadata,
  getStoryById,
  getStoryContent,
  deleteStory,
  clearAllStories,
  getMemoryStats
} from './routes/memoryStories.js';
import {
  getSyncedStories,
  deleteSyncedStory,
  clearAllSyncedStories,
  syncChatHistory,
  validateChatSession,
  getSyncedStoryById
} from './routes/storySync.js';
import { setupProductionGitignore, ProductionGitignoreManager } from '../story-generator/productionGitignoreManager.js';
import { getInMemoryStoryService } from '../story-generator/inMemoryStoryService.js';
import { STORY_UI_CONFIG } from '../story-ui.config.js';

const app = express();
app.use(cors());
app.use(express.json());

// Component discovery routes
app.get('/mcp/components', getComponents);
app.get('/mcp/props', getProps);

// AI generation routes
app.post('/mcp/claude', claudeProxy);
app.post('/mcp/generate-story', generateStoryFromPrompt);

// In-memory story management routes (production)
app.get('/mcp/stories', getStoriesMetadata);
app.get('/mcp/stories/:id', getStoryById);
app.get('/mcp/stories/:id/content', getStoryContent);
app.delete('/mcp/stories/:id', deleteStory);
app.delete('/mcp/stories', clearAllStories);
app.get('/mcp/memory-stats', getMemoryStats);

// Synchronized story management routes (works in both dev and production)
app.get('/mcp/sync/stories', getSyncedStories);
app.get('/mcp/sync/stories/:id', getSyncedStoryById);
app.delete('/mcp/sync/stories/:id', deleteSyncedStory);
app.delete('/mcp/sync/stories', clearAllSyncedStories);
app.get('/mcp/sync/chat-history', syncChatHistory);
app.get('/mcp/sync/validate/:id', validateChatSession);

const PORT = process.env.PORT || 4001;

// Set up production-ready gitignore and directory structure on startup
const gitignoreManager = setupProductionGitignore(STORY_UI_CONFIG);
const storyService = getInMemoryStoryService(STORY_UI_CONFIG);

// Add memory stats endpoint for production monitoring
app.get('/mcp/stats', (req, res) => {
  const memoryStats = storyService.getMemoryStats();
  const isProduction = gitignoreManager.isProductionMode();

  res.json({
    environment: isProduction ? 'production' : 'development',
    storyGeneration: isProduction ? 'in-memory' : 'file-system',
    memoryStats,
    uptime: process.uptime(),
    nodeVersion: process.version
  });
});

app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
  console.log(`Environment: ${gitignoreManager.isProductionMode() ? 'Production' : 'Development'}`);
  console.log(`Story generation: ${gitignoreManager.isProductionMode() ? 'In-memory' : 'File-system'}`);
});
