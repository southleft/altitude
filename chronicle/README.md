# Chronicle

Chronicle is an AI-powered UI generation tool for Altitude's design system. It enables product owners and project managers to generate working Storybook stories from natural language prompts, using Altitude Web Components.

## Setup

1. Create a `.env` file in the `chronicle/` directory:

   ```
   CLAUDE_API_KEY=your-claude-api-key-here
   ```

   (The `.env` file is gitignored by default.)

## Local Development

1. Install dependencies:

   ```
   cd chronicle
   yarn install
   ```

2. Start the MCP server:

   ```
   yarn mcp
   ```

3. The React UI is embedded in Storybook and does not require a separate dev server. Open Storybook and navigate to the Chronicle page.

## Architecture

- **React-based UI**: Embedded in Storybook as a custom page, provides a prompt input and preview.
- **MCP Server**: Node.js Express server that exposes metadata about Web Components via `/mcp/components` and `/mcp/props`.
- **Story Generator**: Converts AI output into `.stories.ts` files using Web Components syntax.
- **Config**: `chronicle.config.ts` for base paths and conventions.

## Usage

1. Start the MCP server: `yarn chronicle:mcp`
2. Open Storybook and navigate to the Chronicle page.
3. Enter a prompt (e.g., "Build a login form with two fields and a button").
4. Chronicle generates and displays a new story using Altitude Web Components.

Generated stories are saved in `.storybook/generated/` and picked up by Storybook automatically.
