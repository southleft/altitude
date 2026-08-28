# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Altitude is a design system created by Southleft.com. Documentation is generated from the code and published at [altitude.pages.dev/docs](https://altitude.pages.dev/docs) (source: `apps/docs`).

This is a monorepo using **pnpm workspaces** (pnpm 9, Node 22 LTS) with two main library packages (`@southleft/al-web-components` and `@southleft/al-react`) and the example apps in `apps/`: `angular`, `astro` (replaced the retired Enhance fixture), `home` (the public homepage), `mfe` (micro-frontend/versioned-registry fixture), `react`, `ssr`, `svelte`, and `web-components` (vanilla). Workspace filter names are `al-app-*` (e.g. `pnpm --filter al-app-astro`). (`apps/knapsack` was retired 2026-08-24 — see `.mm/notes/`.)

The toolchain is **Vite 5** for library + Storybook builds, **Sass 1.101** with the modern compiler API and the modern `@use`/`@forward` module system, **Lit 3.3** for the web components, **React 19** for the React wrappers, and **ESLint 9** flat config + typescript-eslint 8 for linting.

## Key Development Commands

### Development
- Start a specific workspace: `pnpm --filter WORKSPACE_NAME start`
- Altitude MCP (streamable-HTTP): `pnpm --filter @southleft/al-web-components start` — runs the
  MCP on port 6017 (`POST /mcp`, `GET /parity.json`, `GET /healthz`). Storybook was retired
  2026-08-25; there is no `start:sb`.
- React wrapper tests: `pnpm --filter @southleft/al-react start` (runs vitest, react project)
- React app: `pnpm --filter al-app-react start`
- Angular app: `pnpm --filter al-app-angular start`
- Svelte app: `pnpm --filter al-app-svelte start`

### Building
- Build all: `pnpm run build:all`
- Build libraries: `pnpm run build` (builds @southleft/al-web-components, then
  @southleft/sl-web-components — the Southleft brand layer — then @southleft/al-react)
- Build specific workspace: `pnpm --filter WORKSPACE_NAME build`
- Build a specific Storybook: `pnpm --filter @southleft/al-web-components build:storybook --output-dir ../../dist/storybook/web-components`

### Component Generation
- Generate new web component: `pnpm --filter @southleft/al-web-components plop`
- Generate new React component: `pnpm --filter @southleft/al-react plop`

### Testing
- Visual regression: `pnpm test:vrt`
- Gate self-test: `pnpm gate:self-test`
- Lint: `pnpm lint`

### Figma ↔ code parity
- Storybook was retired 2026-08-25; the live surfaces are the `altitude_check_parity` MCP
  tool and the `audit_component_parity` MCP prompt (green = 1:1 with Figma, yellow = that side drifted, red =
  missing on the other side, each entry carrying a ready-to-paste `aiPrompt` reconciliation
  string), `GET /parity.json`, and each docs page's read-only `ParityPanel` (no interactive
  actions — reconciliation is agent-driven via the MCP tool, not a docs-page button).
- **Parity is multi-project.** One component library backs several design systems, each
  checked against its own Figma file. The registry is `.altitude/ds-projects.json`
  (schema alongside it) — see `.altitude/DS-PROJECTS.md`. `altitude` is the default;
  `southleft` targets the "Southleft V5" Figma file and the `southleft` brand.
  Select with `--project <id>` on any parity CLI, or the `DS_PROJECT` env var.
- Manifests: `.altitude/figma-sync/parity-manifest.json` (altitude) and
  `.altitude/figma-sync/southleft/parity-manifest.json` — both tracked. Engine:
  `libs/altitude-mcp/src/lib/parity.mjs`; project resolution:
  `libs/altitude-mcp/src/lib/ds-project.mjs`. MCP tools: `altitude_check_parity`
  (takes `project`), `altitude_list_ds_projects`.
- `pnpm run parity:projects` (what's what) / `parity:seed` / `parity:synced <tag>` /
  `parity:refresh`, plus `:sl` variants — see `.altitude/PARITY.md`.

## Architecture

### Component Libraries

**@southleft/al-web-components** (`libs/al-web-components/`):
- Built with Lit 3.3 for web components
- All components extend `ALElement` base class
- Components live in `components/[component-name]/`
- Each component has: `.ts` (logic), `.scss` (styles), `.stories.ts` (Storybook)
- Global styles and design tokens in `styles/`
- Cascade layers: `@layer al.reset, al.base, al.theme, al.component, al.override` — declared once in `styles/core/layers.scss`

**@southleft/al-react** (`libs/al-react/`):
- React 19 wrapper components using `@lit/react`
- Components wrap the web components from @southleft/al-web-components via `workspace:*` dep
- Located in `src/components/[ComponentName]/`
- Each has: `.tsx` (component), `.stories.tsx` (Storybook)

### Design Tokens
- **Edit `libs/al-web-components/styles/tokens-dtcg/**.json`** — the tracked,
  hand-authored **DTCG** tree (`$value`/`$type`). This is the only token source you edit.
  It is also published (`./tokens-dtcg/*` subpath export), so it is public API.
- The legacy Tokens Studio tree (`styles/tokens/`, `value`/`type` shape) and its converter
  `scripts/convert-tokens-to-dtcg.js` were **deleted** — Tokens Studio is no longer part of
  this pipeline. Figma Variables are generated FROM these tokens
  (`scripts/build-figma-payload.mjs` — manually invoked, no `pnpm run` alias or CI step),
  never the reverse.
- **Every token carries two types, and they answer different questions:**
  - `$type` — the DTCG standard type. Deliberately coarse: `sizing`, `spacing`,
    `borderRadius`, `borderWidth`, `fontSizes` and `lineHeights` all collapse to `dimension`.
  - `$extensions["org.altitude.token"].cssType` — the CSS surface the token is authored
    for. Finer than `$type` and **not** recoverable from it. It drives the
    `cssProperties` allow-list; a token without one gets no allow-list.
  See `scripts/lib/dtcg-token.mjs` — use `authoredType()` when you need what a token is
  FOR, `dtcgType()` when you need standards conformance. Getting this backwards silently
  degrades 163 of 555 tokens.
- When adding a token by hand, set `$value`, `$type` **and** the `cssType` extension;
  then run `pnpm run generate:token-metadata` to fill in the derived metadata.
- Built via **Style Dictionary v5** to CSS custom properties, JSON, and TypeScript types
- Token tiers: tier-1 (base values), tier-2 (semantic tokens), tier-3 (brand/theme tokens)
- See `.altitude/TOKENS.md` § Overview for the stage-by-stage table, and `llms.txt`
  for the consumer-facing view — all three must keep naming `tokens-dtcg/` as the source.

### Theming
- Scoped `<al-theme brand mode density contrast motion>` host (Phase 4) — sets tokens on `:host`, not `:root`
- `brand` and `mode` come from generated `:host([brand])` / `:host([mode])` partials
  (`styles/dist-v5/scss/host/`, emitted by `tokens-config.v5.mjs`, pulled into `theme.scss`);
  `density`, `contrast` and `motion` are hand-written rules in `theme.scss`
- Those partials are **deltas** over the base `:root` bundle — `<al-theme>` composes on top of
  `dist/css/main.css`, it does not replace it
- Multiple brands can coexist in the same page. Proof: `pnpm test:scoped-theming` +
  `.altitude/visual-compare/brands.scoped.png` (two brands — altitude, southleft — one document,
  one `:root`)
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
- **Arrangement belongs to `<al-layout>`, not to new components.** `al-layout` is
  the single layout primitive (`direction`, `gap`, `align`, `justify`, `wrap`,
  `grow`, `stretchItems`, `responsive`, `fullHeight`, `noCollapse`, plus the
  `constrained` / `grid` / `bento` variants with `size` / `gutter` / `columns`). When building a new component **or page section**, nest
  slotted content in `<al-layout>` instead of adding your own
  `orientation`/`gap`/`alignment` prop or hand-rolling flex/grid for slotted
  children. **Do not create new `*-group` wrapper components** — a wrapper that
  owns no behavior, ARIA relationship, or state is `<al-layout>` with props.
  Groups that survive (`checkbox-group`, `radio-group`) exist for their
  semantics — fieldset / legend, roving keyboard selection — not their spacing.
  `al-button-group`, `al-layout-container`, `al-layout-section`,
  `al-bento-grid`, `al-split-content`, `al-chip-group`, `al-toast-group` and
  `al-toggle-button-group` have been **removed**, along with the `sidebar-*` variants — a page declares
  its own track list via `--al-layout-template`. See "Arrangement vs. semantics" in AGENTS.md.

### Registry (T4.6)
- `registerAltitude({ mode: 'stable' | 'versioned' | 'manual' }, elements)` is the explicit API
- `stable` — plain tags (`al-button`); default for new apps
- `versioned` — suffixed tags (`al-button-1-2-3`); for micro-frontends / multi-version coexistence
- `manual` — caller owns `customElements.define`; for tests / SSR
- Three consumer registration paths (see `.altitude/REGISTRATION.md` for the full model):
  template frameworks set `window.alAutoRegistry = true` **inline in `<head>`** so deep imports
  self-register; React apps skip the flag (every `@southleft/al-react` wrapper registers its element with a
  version suffix); micro-frontends skip it and call `registerAltitude({ mode: 'versioned' })`.
  Composites read the flag at module-eval time to pick their sub-component suffix — it is
  load-bearing, not a boot convenience

### SSR (T5.2)
- `@lit-labs/ssr` with Declarative Shadow DOM
- `apps/ssr/` is the reference fixture
- See `.altitude/SSR.md` for the browser matrix and the four-step DSD hydration sequence
  (template parse → inline registry flag → `customElements.define` upgrade → `data-hydration` flip)
- Known cost (`.altitude/SSR.md`): `<al-theme>` serializes every scoped brand/mode block into each
  host's DSD template (~19.6KB per element) — acceptable with a single root `<al-theme>`, a real
  cost if rendering many themed islands server-side

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

## Repo hygiene — search scoping

`.claude/worktrees/` contains full session worktrees and stale directory snapshots of the entire
repo. **Scope all searches to `apps/`, `libs/`, `scripts/`, `functions/`, `.altitude/`, and
`.claude/` (skills/agents/commands — but never `.claude/worktrees/`)** —
an unscoped grep returns duplicated hits from those mirrors and makes findings look like new code.
Do not delete worktrees without checking `git worktree list` and dirty state first; some belong to
live sessions.

## Plan + status

- `NEXT-GEN-UPGRADE-PLAN.md` — the 7-phase plan (P0–P6) drove the v2 refactor; phases are complete on `feature/v2` and being merged via the PR referenced in `pull_request_template.md`.
- `.altitude/migration.json` — per-component migration state (`legacy` / `dual` / `scoped-complete`).
- `.altitude/targets.json` — pinned target versions.
- `AGENTS.md` — agent contract (guardrails G1–G8, where to look for things).
