# ShadCN Test Environment Setup

This directory contains a test environment for Story UI using the shadcn/ui component library.

## Prerequisites

- Node.js 16+
- Your own Claude API key

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

1. Copy the sample environment file:
   ```bash
   cp .env.sample .env
   ```

2. Edit `.env` and add your Claude API key:
   ```bash
   # Get your API key from: https://console.anthropic.com/
   CLAUDE_API_KEY=your-actual-claude-api-key-here
   ```

   **Important:** Each person testing this should use their own API key!

### 3. Start the Services

#### Terminal 1: Start Storybook
```bash
npm run storybook
```

#### Terminal 2: Start MCP Server
```bash
# Run from this directory (story-ui-shadcn-test)
node ../story-ui/dist/mcp-server/index.js
```

### 4. Test Story UI

1. Open Storybook at http://localhost:6006
2. Navigate to "Story UI/UI Generator" in the sidebar
3. Try generating a component (e.g., "Create a login form")

## Environment Configuration

- ✅ **Local API Key**: Each environment has its own `.env` file
- ✅ **Isolated Testing**: Test environment doesn't affect main codebase
- ✅ **Component Integration**: Story UI appears as a story in Storybook

## Troubleshooting

**"Configuration validation failed" error?**
- Make sure you have a valid `CLAUDE_API_KEY` in your `.env` file
- Verify the MCP server is running from this directory

**Components appear unstyled?**
- Storybook should automatically import the shadcn styles
- Check that `.storybook/preview.ts` imports the CSS file
