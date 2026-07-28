# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Altitude is a design system created by Southleft.com. The documentation is available at [ZeroHeight](https://zeroheight.com/809ab055e).

This is a monorepo using **pnpm workspaces** (pnpm 9, Node 22 LTS) with two main library packages (`al-web-components` and `al-react`) and multiple example apps (Angular, React, Svelte, Enhance, Knapsack).

The toolchain is **Vite 5** for library + Storybook builds, **Sass 1.101** with the modern compiler API and the modern `@use`/`@forward` module system, **Lit 3.3** for the web components, **React 19** for the React wrappers, and **ESLint 9** flat config + typescript-eslint 8 for linting.

## Key Development Commands

### Development
- Start a specific workspace: `pnpm --filter WORKSPACE_NAME start`
- Web components Storybook: `pnpm --filter al-web-components start` (port 6006)
- React Storybook: `pnpm --filter al-react start` (port 9009)
- React app: `pnpm --filter al-app-react start`
- Angular app: `pnpm --filter al-app-angular start`
- Svelte app: `pnpm --filter al-app-svelte start`

### Building
- Build all: `pnpm run build:all`
- Build libraries: `pnpm run build` (builds both al-web-components and al-react)
- Build specific workspace: `pnpm --filter WORKSPACE_NAME build`
- Build a specific Storybook: `pnpm --filter al-web-components build:storybook --output-dir ../../dist/storybook/web-components`

### Component Generation
- Generate new web component: `pnpm --filter al-web-components plop`
- Generate new React component: `pnpm --filter al-react plop`

### Testing
- Visual regression: `pnpm test:vrt`
- Gate self-test: `pnpm gate:self-test`
- Lint: `pnpm lint`

## Architecture

### Component Libraries

**al-web-components** (`libs/al-web-components/`):
- Built with Lit 3.3 for web components
- All components extend `ALElement` base class
- Components live in `components/[component-name]/`
- Each component has: `.ts` (logic), `.scss` (styles), `.stories.ts` (Storybook)
- Global styles and design tokens in `styles/`
- Cascade layers: `@layer al.reset, al.base, al.theme, al.component, al.override` — declared once in `styles/core/layers.scss`

**al-react** (`libs/al-react/`):
- React 19 wrapper components using `@lit/react`
- Components wrap the web components from al-web-components via `workspace:*` dep
- Located in `src/components/[ComponentName]/`
- Each has: `.tsx` (component), `.stories.tsx` (Storybook)

### Design Tokens
- DTCG source in `libs/al-web-components/styles/tokens-dtcg/` (auto-generated from `tokens/`)
- Built via **Style Dictionary v5** to CSS custom properties, JSON, and TypeScript types
- Token tiers: tier-1 (base values), tier-2 (semantic tokens), tier-3 (brand/theme tokens)
- See `.altitude/TOKENS.md` for the parallel-pipeline rationale

### Theming
- Scoped `<al-theme brand mode density contrast motion>` host (Phase 4) — sets tokens on `:host`, not `:root`
- `brand` and `mode` come from generated `:host([brand])` / `:host([mode])` partials
  (`styles/dist-v5/scss/host/`, emitted by `tokens-config.v5.mjs`, pulled into `theme.scss`);
  `density`, `contrast` and `motion` are hand-written rules in `theme.scss`
- Those partials are **deltas** over the base `:root` bundle — `<al-theme>` composes on top of
  `dist/css/main.css`, it does not replace it
- Multiple brands can coexist in the same page. Proof: `pnpm test:scoped-theming` +
  `.altitude/visual-compare/brands.scoped.png` (four brands, one document, one `:root`)
- See `MIGRATION.md` for the v1→v2 theming migration and `.altitude/BRANDS.md` for what a brand
  may override

### Component Patterns
All components follow consistent patterns:
- Props via Lit `@property accessor foo: T`
- Event dispatching through `this.dispatch({ eventName, detailObj })`
- Slot-based content projection
- Style modifiers through `styleModifier` prop
- Theme support via CSS custom properties
- SCSS imported as `import styles from './X.scss'` (Vite rewrites to `?inline`)

### Registry (T4.6)
- `registerAltitude({ mode: 'stable' | 'versioned' | 'manual' }, elements)` is the explicit API
- `stable` — plain tags (`al-button`); default for new apps
- `versioned` — suffixed tags (`al-button-1-2-3`); for micro-frontends / multi-version coexistence
- `manual` — caller owns `customElements.define`; for tests / SSR

### SSR (T5.2)
- `@lit-labs/ssr` with Declarative Shadow DOM
- `apps/ssr/` is the reference fixture
- See `.altitude/SSR.md` for the browser matrix

### Deployments
- Automatic deployments to Cloudflare Pages on PR/merge to main
- Production URL: https://altitude.pages.dev
- All workspaces build to root `/dist` folder

## Important Implementation Details

- The base class `ALElement` provides common functionality like event dispatching, slot checking, and theme integration
- All web components use shadow DOM with adopted stylesheets for theming
- `ALElement.getSharedThemeSheet()` adopts the shared utility CSS (`styles/shadow-utilities.scss` → `.al-u-*` classes) into every component's shadow root, so components that accept utility classes via `styleModifier` work without needing the entire main.scss
- The React components are auto-generated wrappers that forward props and events to the underlying web components
- Use the plop generators when creating new components to ensure consistency

## Plan + status

- `NEXT-GEN-UPGRADE-PLAN.md` — the 7-phase plan (P0–P6) drove the v2 refactor; phases are complete on `feature/v2` and being merged via the PR referenced in `pull_request_template.md`.
- `.altitude/migration.json` — per-component migration state (`legacy` / `dual` / `scoped-complete`).
- `.altitude/targets.json` — pinned target versions.
- `AGENTS.md` — agent contract (guardrails G1–G8, where to look for things).
