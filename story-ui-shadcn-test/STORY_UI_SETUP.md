# Story UI Setup Guide

## Quick Start

Story UI works with your existing Storybook setup and styled components. No additional CSS configuration needed!

### 1. Install Story UI

```bash
npm install story-ui
```

### 2. Configure API Key

Create a `.env` file in your project root:

```bash
# Copy from node_modules/story-ui/.env.sample
cp node_modules/story-ui/.env.sample .env
```

Add your Claude API key:

```bash
# Get your API key from: https://console.anthropic.com/
CLAUDE_API_KEY=your-claude-api-key-here
```

### 3. Configure Your Components

```javascript
// story-ui.config.js
module.exports = {
  "importPath": "@/components/ui", // Your component import path
  "storyPrefix": "Generated/",
  "defaultAuthor": "Story UI AI"
}
```

### 4. Add Story UI to Storybook

The StoryUI component will appear in your Storybook navigation, allowing non-developers to generate stories using your existing styled components.

## How It Works

- ✅ **Uses your existing components** - No component changes needed
- ✅ **Uses your existing styles** - Components render with their current styling
- ✅ **Works with any CSS approach** - Tailwind, CSS Modules, styled-components, etc.
- ✅ **Design system agnostic** - Works with shadcn, Material-UI, Chakra, custom libraries

## Supported Project Types

- **Next.js** (App Router or Pages Router)
- **Vite + React**
- **Create React App**
- **Custom React setups**

## Component Libraries

Story UI works with any React component library:
- shadcn/ui
- Material-UI
- Chakra UI
- Ant Design
- Custom component libraries
- Any styled React components

## Why No CSS Configuration?

Story UI generates stories using your existing components. Since your components already work in Storybook with proper styling, Story UI inherits that styling automatically. No additional setup required!
