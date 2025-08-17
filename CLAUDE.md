# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Altitude is a design system created by Southleft.com. The documentation is available at [ZeroHeight](https://zeroheight.com/809ab055e).

This is a monorepo using Yarn workspaces with two main library packages (`al-web-components` and `al-react`) and multiple example apps (Angular, React, Svelte, Enhance, Knapsack).

## Key Development Commands

### Development
- Start a specific workspace: `yarn workspace WORKSPACE_NAME start`
- Web components Storybook: `yarn workspace al-web-components start` (port 6006)
- React Storybook: `yarn workspace al-react start` (port 9009)
- React app: `yarn workspace al-app-react start`
- Angular app: `yarn workspace al-app-angular start`
- Svelte app: `yarn workspace al-app-svelte start`

### Building
- Build all: `yarn build:all`
- Build libraries: `yarn build` (builds both al-web-components and al-react)
- Build specific workspace: `yarn workspace WORKSPACE_NAME build`

### Component Generation
- Generate new web component: `yarn workspace al-web-components plop`
- Generate new React component: `yarn workspace al-react plop`

### Testing (Web Components)
- Run tests: `yarn workspace al-web-components test`

## Architecture

### Component Libraries

**al-web-components** (`libs/al-web-components/`):
- Built with Lit 3 for web components
- All components extend `ALElement` base class
- Components live in `components/[component-name]/`
- Each component has: `.ts` (logic), `.scss` (styles), `.stories.ts` (Storybook)
- Global styles and design tokens in `styles/`

**al-react** (`libs/al-react/`):
- React wrapper components using `@lit/react`
- Components wrap the web components from al-web-components
- Located in `src/components/[ComponentName]/`
- Each has: `.tsx` (component), `.stories.tsx` (Storybook)

### Design Tokens
- Source tokens defined in `libs/al-web-components/styles/tokens/`
- Build process generates CSS custom properties
- Token tiers: tier-1 (base values), tier-2 (semantic tokens), tier-3 (component tokens)

### Component Patterns
All components follow consistent patterns:
- Props interface extends from base interfaces
- Event dispatching through custom events
- Slot-based content projection
- Style modifiers through `styleModifier` prop
- Theme support via CSS custom properties

### Deployments
- Automatic deployments to Cloudflare Pages on PR/merge to main
- Production URL: https://altitude.pages.dev
- All workspaces build to root `/dist` folder

## Important Implementation Details

- The base class `ALElement` provides common functionality like event dispatching, slot checking, and theme integration
- All web components use shadow DOM with adopted stylesheets for theming
- The React components are auto-generated wrappers that forward props and events to the underlying web components
- Use the plop generators when creating new components to ensure consistency