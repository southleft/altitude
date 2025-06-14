# Chronicle

Chronicle is an AI-powered UI generation tool for Altitude's design system. It enables product owners and project managers to generate working Storybook stories from natural language prompts, using Altitude Web Components.

## Setup

1. Create a `.env` file in the `chronicle/` directory:

   ```bash
   # Copy the sample file and edit it
   cp .env.sample .env

   # Then edit .env and add your API key:
   CLAUDE_API_KEY=your-claude-api-key-here
   ```

   Get your Claude API key from [Anthropic Console](https://console.anthropic.com/).

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

1. **Build and start the MCP server:**
   ```
   cd chronicle
   yarn mcp
   ```
   (This will build the server and start it. Make sure your `.env` file is set up with your Claude API key.)

2. **Start the Storybook instance for React components:**
   ```
   cd ../libs/al-react
   yarn start
   ```
   (This runs Storybook locally, typically at http://localhost:9009)

3. **Open Storybook in your browser and go to the Chronicle panel.**

4. **Enter a prompt** (e.g., "Sign up form with name, email, and a submit button").

5. Chronicle will generate a new Storybook story using your React components, with a clean, AI-generated title. The story will appear instantly under the "Chronicle Pages/" section in Storybook navigation.

Generated stories are saved in `libs/al-react/src/components/generated/` and picked up by Storybook automatically for hot-reload.
