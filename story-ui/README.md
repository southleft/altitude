# Story UI - AI-Powered Storybook Story Generator

Story UI is a flexible, AI-powered tool that generates Storybook stories for any React component library. It uses Claude AI to understand natural language prompts and create accurate, multi-column layouts using your existing components.

## Features

- 🤖 **AI-Powered Generation**: Uses Claude AI to generate stories from natural language prompts
- 🔧 **Component Library Agnostic**: Works with any React component library
- 📱 **Smart Layout Generation**: Automatically creates proper multi-column layouts
- 🔍 **Component Discovery**: Automatically discovers and analyzes your components
- ⚙️ **Flexible Configuration**: Highly customizable for different design systems
- 🚀 **MCP Server**: Integrates with Claude Desktop and other MCP clients
- 🗂️ **Git Integration**: Automatically manages .gitignore for ephemeral stories
- 🧹 **Cleanup Utilities**: Built-in cleanup for old generated stories

## Quick Start

### 1. Installation

```bash
npm install story-ui
# or
yarn add story-ui
```

### 2. API Key Setup

Create a `.env` file in your project root:

```bash
# Copy the sample environment file
cp node_modules/story-ui/.env.sample .env
```

Add your Claude API key:

```bash
# Get your API key from: https://console.anthropic.com/
CLAUDE_API_KEY=your-claude-api-key-here
```

**Important:** Keep your API key secure and never commit `.env` files to version control!

### 3. Basic Configuration

Create a `story-ui.config.js` file in your project root:

```javascript
export default {
  generatedStoriesPath: './src/stories/generated',
  componentsPath: './src/components',
  importPath: 'your-component-library',
  componentPrefix: 'UI', // e.g., UIButton, UICard
  storyPrefix: 'Generated/',
  layoutRules: {
    multiColumnWrapper: 'UILayout',
    columnComponent: 'UIColumn',
    layoutExamples: {
      twoColumn: `<UILayout>
  <UIColumn>
    <UICard>Left content</UICard>
  </UIColumn>
  <UIColumn>
    <UICard>Right content</UICard>
  </UIColumn>
</UILayout>`
    }
  }
};
```

### 4. Start the Server

```bash
npx story-ui start
```

### 5. Generate Stories

Send HTTP requests to generate stories:

```bash
curl -X POST http://localhost:4001/mcp/generate-story \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Create a three-column layout with different card types"}'
```

## Configuration Options

### Complete Configuration Interface

```typescript
interface StoryUIConfig {
  // File paths
  generatedStoriesPath: string;        // Where to save generated stories
  componentsPath?: string;             // Path to your components
  componentsMetadataPath?: string;     // Path to custom-elements.json (optional)

  // Story configuration
  storyPrefix: string;                 // Prefix for story titles
  defaultAuthor: string;               // Default author name
  importPath: string;                  // Import path for components

  // Component system configuration
  componentPrefix: string;             // Component naming prefix
  components: ComponentConfig[];       // Component definitions
  layoutRules: LayoutRules;           // Layout generation rules

  // Template configuration
  sampleStory?: string;               // Custom story template
  systemPrompt?: string;              // Custom AI system prompt
}
```

### Layout Rules Configuration

```typescript
interface LayoutRules {
  multiColumnWrapper?: string;        // Main layout component
  columnComponent?: string;           // Column/section component
  containerComponent?: string;        // Container wrapper component
  layoutExamples?: {
    twoColumn?: string;               // Two-column layout example
    threeColumn?: string;             // Three-column layout example
    grid?: string;                    // Grid layout example
  };
  prohibitedElements?: string[];      // HTML elements to avoid
}
```

## Configuration Methods

### 1. Configuration File

Create `story-ui.config.js`:

```javascript
export default {
  generatedStoriesPath: './src/stories/generated',
  componentsPath: './src/components',
  importPath: 'my-design-system',
  componentPrefix: 'DS',
  layoutRules: {
    multiColumnWrapper: 'DSLayout',
    columnComponent: 'DSColumn'
  }
};
```

### 2. Package.json Configuration

Add to your `package.json`:

```json
{
  "storyUI": {
    "generatedStoriesPath": "./src/stories/generated",
    "componentsPath": "./src/components",
    "importPath": "my-design-system",
    "componentPrefix": "DS"
  }
}
```

### 3. Auto-Detection

Story UI can automatically detect your project structure:

```bash
npx story-ui init --auto-detect
```

## Component Discovery

Story UI automatically discovers components using multiple methods:

1. **Directory Structure**: Scans component directories for `.tsx` files
2. **Story Files**: Extracts component information from existing `.stories.tsx` files
3. **Custom Elements**: Reads `custom-elements.json` for web components
4. **Package Exports**: Analyzes package.json exports and index files

## Design System Examples

### Material-UI

```javascript
export default {
  importPath: '@mui/material',
  componentPrefix: '',
  layoutRules: {
    multiColumnWrapper: 'Grid',
    columnComponent: 'Grid',
    layoutExamples: {
      twoColumn: `<Grid container spacing={2}>
  <Grid item xs={6}>
    <Card>Left content</Card>
  </Grid>
  <Grid item xs={6}>
    <Card>Right content</Card>
  </Grid>
</Grid>`
    }
  }
};
```

### Chakra UI

```javascript
export default {
  importPath: '@chakra-ui/react',
  componentPrefix: '',
  layoutRules: {
    multiColumnWrapper: 'SimpleGrid',
    columnComponent: 'Box',
    layoutExamples: {
      twoColumn: `<SimpleGrid columns={2} spacing={4}>
  <Box>
    <Card>Left content</Card>
  </Box>
  <Box>
    <Card>Right content</Card>
  </Box>
</SimpleGrid>`
    }
  }
};
```

### Ant Design

```javascript
export default {
  importPath: 'antd',
  componentPrefix: '',
  layoutRules: {
    multiColumnWrapper: 'Row',
    columnComponent: 'Col',
    layoutExamples: {
      twoColumn: `<Row gutter={16}>
  <Col span={12}>
    <Card>Left content</Card>
  </Col>
  <Col span={12}>
    <Card>Right content</Card>
  </Col>
</Row>`
    }
  }
};
```

## API Reference

### HTTP Endpoints

#### POST `/mcp/generate-story`

Generate a new story from a natural language prompt.

**Request Body:**
```json
{
  "prompt": "Create a three-column layout with different card types",
  "fileName": "optional-custom-filename.stories.tsx"
}
```

**Response:**
```json
{
  "success": true,
  "fileName": "generated-filename.stories.tsx",
  "outPath": "/path/to/generated/story",
  "title": "Generated Story Title",
  "story": "// Generated story content..."
}
```

### MCP Integration

Story UI includes an MCP (Model Context Protocol) server for integration with Claude Desktop:

1. Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "story-ui": {
      "command": "node",
      "args": ["/path/to/story-ui/dist/mcp-server/index.js"]
    }
  }
}
```

2. Use in Claude Desktop:
```
Generate a two-column layout with cards using Story UI
```

## CLI Commands

### Initialize Configuration

```bash
npx story-ui init
npx story-ui init --auto-detect
npx story-ui init --template=material-ui
```

### Start Server

```bash
npx story-ui start
npx story-ui start --port=4001
npx story-ui start --config=./custom-config.js
```

### Generate Sample Config

```bash
npx story-ui config --generate
npx story-ui config --generate --type=json
```

## Environment Variables

```bash
CLAUDE_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-3-opus-20240229  # Optional, defaults to opus
PORT=4001                            # Optional, defaults to 4001
```

## Production-Ready Deployment

Story UI is designed for **seamless deployment** across development and production environments, with automatic environment detection and appropriate story generation strategies.

### 🌐 **Environment Detection**

Story UI automatically detects your environment:

**Development Environment:**
- ✅ **File-system storage** - Stories written to configured directory
- ✅ **Automatic .gitignore** - Generated directory added to git ignore
- ✅ **Directory structure** - Creates necessary folders and README

**Production Environment (Vercel, Netlify, etc.):**
- ✅ **In-memory storage** - Stories stored in server memory
- ✅ **Read-only compatibility** - Works without file system write permissions
- ✅ **Memory management** - Automatic cleanup to prevent memory leaks
- ✅ **API endpoints** - RESTful API for story management

### 🔧 **Automatic Setup**

```bash
# Development setup
npx story-ui init --auto-detect
npx story-ui setup-gitignore

# Production deployment
# No additional setup needed - automatically detected!
```

### 🗂️ **Git Integration**

**Development:**
```bash
# Automatically adds to .gitignore:
./libs/your-components/src/components/generated/
./libs/your-components/src/components/generated/**
```

**Production:**
- Stories stored in memory only
- No file system writes required
- Perfect for read-only deployments

### 🎯 **Use Cases**

**Perfect for:**
- 🎨 **Layout Testing** - Test component arrangements without committing
- 👥 **Stakeholder Review** - Share layouts with product owners and designers
- 🔄 **Rapid Iteration** - Generate, test, and regenerate layouts quickly
- 📱 **Design Validation** - Validate designs before implementation
- 🌐 **Public Demos** - Deploy to Vercel/Netlify for team collaboration

**Example Production Workflow:**
1. Deploy Storybook + Story UI to Vercel/Netlify
2. Product owners generate layouts using natural language
3. Stories stored in server memory (ephemeral)
4. Share generated stories with team for feedback
5. Iterate and refine layouts
6. Implement approved layouts in actual codebase

### 📊 **Production Monitoring**

```bash
# Check server status and memory usage
curl http://your-server.vercel.app/mcp/stats

# Get all generated stories
curl http://your-server.vercel.app/mcp/stories

# Get specific story content
curl http://your-server.vercel.app/mcp/stories/story-abc123/content
```

### 🧹 **Memory Management**

Production environments automatically:
- 🔄 **Cleanup old stories** - Removes stories older than 24 hours
- 📊 **Memory limits** - Keeps maximum 50 stories in memory
- 📈 **Usage tracking** - Monitors memory usage and story access patterns

```javascript
import { ProductionGitignoreManager, getInMemoryStoryService } from 'story-ui';

// Manual cleanup if needed
const manager = new ProductionGitignoreManager(config);
manager.cleanupOldStories();

// Memory statistics
const storyService = getInMemoryStoryService(config);
const stats = storyService.getMemoryStats();
console.log(`${stats.storyCount} stories using ${stats.totalSizeMB}MB`);
```

## Contributing

Story UI is designed to be community-driven and extensible. Contributions are welcome!

### Development Setup

```bash
git clone https://github.com/your-org/story-ui
cd story-ui
yarn install
yarn build
yarn start
```

### Adding Design System Templates

1. Create a new configuration template in `templates/`
2. Add examples and documentation
3. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📖 [Documentation](https://story-ui.dev)
- 🐛 [Issues](https://github.com/your-org/story-ui/issues)
- 💬 [Discussions](https://github.com/your-org/story-ui/discussions)
